import dotenv from "dotenv";
import { AppError } from "../../utils/AppError";
import { prisma } from "../../config/db";
import SSLService from "../../sslCommerz/sslCommerz.service";
dotenv.config();

export async function initSubscriptionPayment(userId: string, plan: string) {
  // validate plan and amount
  const PLAN = plan?.toLowerCase();
  let amount: number;
  if (PLAN === "monthly") amount = Number(process.env.PRICE_MONTHLY || 0);
  else if (PLAN === "yearly") amount = Number(process.env.PRICE_YEARLY ||  0);
  else if (PLAN === "verified_badge") amount = Number(process.env.PRICE_VERIFIED_BADGE || 0);
  else throw AppError.badRequest("Invalid plan");

  if (!amount || amount <= 0) throw AppError.badRequest("Invalid amount for the selected plan");

  // create payment record
  const transactionId = `TB_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: Math.round(amount), 
      currency: "bdt",
      status: "PENDING",
      paymentGateway: "sslcommerz",
      transactionId,
      description: `subscription:${PLAN}`
    }
  });

  // fetch user (for name/email/phone) - ensure user has profile info
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");

  // prepare SSL payload
  const sslPayload = {
    name: user.fullName ?? user.email,
    email: user.email,
    phoneNumber: "", // If you have phone in user profile, add it. Prisma user model currently has no phone.
    address: user.currentLocation ?? "",
    amount: payment.amount,
    transactionId: payment.transactionId,
    productName: `TravelBuddy ${PLAN}`
  };

  // call SSLCommerz
  const result = await SSLService.sslPaymentInit(sslPayload as any);
  if (!result || !result.GatewayPageURL) {
    // update payment with gateway data if present
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentGatewayData: result ?? null }
    });
    throw AppError.internalError("Failed to initiate payment with SSLCommerz");
  }

  // store gateway response
  await prisma.payment.update({
    where: { id: payment.id },
    data: { paymentGatewayData: result as any }
  });

  return { paymentUrl: result.GatewayPageURL, paymentId: payment.id, transactionId: payment.transactionId };
}

/**
 * Called on redirect success (customer returns)
 */
export async function handleSubscriptionSuccess(query: Record<string,string>) {
  const txId = query.transactionId;
  if (!txId) throw AppError.badRequest("transactionId missing");

  // find payment
  const payment = await prisma.payment.findUnique({ where: { transactionId: txId }});
  if (!payment) throw AppError.notFound("Payment not found");

  if (payment.status === "PAID") {
    // already processed
    return { success: true, message: "Already processed" , payment };
  }

  // Determine plan from description
  const desc = payment.description ?? "";
  let plan = "monthly";
  if (desc.includes("subscription:yearly")) plan = "yearly";
  else if (desc.includes("subscription:monthly")) plan = "monthly";
  else if (desc.includes("verified_badge")) plan = "verified_badge";
  else if (desc.includes("subscription:verified_badge")) plan = "verified_badge";

  // Update payment and user in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    const paymentUpdated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paymentGatewayData: { successQuery: query, updatedAt: new Date() },
        updatedAt: new Date()
      }
    });

    // set user premium and expiry based on plan
    if (plan === "monthly" || plan === "yearly") {
      const now = new Date();
      const addMonths = plan === "monthly" ? 1 : 12;
      // if user has existing premium expiry in future, extend from that date; else from now
      const user = await tx.user.findUnique({ where: { id: payment.userId } });
      let baseDate = now;
      if (user?.premiumExpiresAt && user.premiumExpiresAt > now) baseDate = user.premiumExpiresAt;
      const expiry = new Date(baseDate);
      expiry.setMonth(expiry.getMonth() + addMonths);

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          isPremium: true,
          paymentStatus: "PAID",
          premiumExpiresAt: expiry
        }
      });
    } else if (plan === "verified_badge") {
      await tx.user.update({
        where: { id: payment.userId },
        data: {
          isVerifiedBadge: true,
          paymentStatus: "PAID"
        }
      });
    }

    return paymentUpdated;
  });

  return { success: true, message: "Payment successful", payment: updated };
}

export async function handleSubscriptionFail(query: Record<string,string>) {
  const txId = query.transactionId;
  if (!txId) throw AppError.badRequest("transactionId missing");
  await prisma.payment.updateMany({
    where: { transactionId: txId },
    data: { status: "FAILED", paymentGatewayData: { failQuery: query } }
  });
  return { success: false, message: "Payment failed" };
}

export async function handleSubscriptionCancel(query: Record<string,string>) {
  const txId = query.transactionId;
  if (!txId) throw AppError.badRequest("transactionId missing");
  await prisma.payment.updateMany({
    where: { transactionId: txId },
    data: { status: "UNPAID", paymentGatewayData: { cancelQuery: query } }
  });
  return { success: false, message: "Payment cancelled" };
}

/**
 * IPN validation (SSLCommerz hits this)
 */
export async function validateIPN(payload: any) {
  const response = await SSLService.validatePayment(payload);
  // update payment by tran_id
  const tranId = payload.tran_id;
  if (!tranId) throw AppError.badRequest("tran_id missing in IPN payload");

  // set status according to validation response (adapt mapping if needed)
  const statusFromResponse = (response?.status || "").toUpperCase();
  const statusToStore = statusFromResponse === "VALID" || statusFromResponse === "VALIDATED" || statusFromResponse === "PAID" ? "PAID" : "UNPAID";

  await prisma.payment.updateMany({
    where: { transactionId: tranId },
    data: { paymentGatewayData: response, status: statusToStore }
  });

  // If VALID and PAID, also mark user premium or badge — derive plan from description if available
  if (statusToStore === "PAID") {
    const payments = await prisma.payment.findMany({ where: { transactionId: tranId }});
    for (const p of payments) {
      // same logic: derive plan
      const desc = p.description ?? "";
      if (desc.includes("subscription:yearly") || desc.includes("subscription:monthly")) {
        // extend premium (reuse handleSubscriptionSuccess but careful to not double-update payment)
        // We'll set user premium (safe)
        const now = new Date();
        const addMonths = desc.includes("yearly") ? 12 : 1;
        const user = await prisma.user.findUnique({ where: { id: p.userId }});
        let baseDate = now;
        if (user?.premiumExpiresAt && user.premiumExpiresAt > now) baseDate = user.premiumExpiresAt;
        const expiry = new Date(baseDate);
        expiry.setMonth(expiry.getMonth() + addMonths);
        await prisma.user.update({
          where: { id: p.userId },
          data: { isPremium: true, paymentStatus: "PAID", premiumExpiresAt: expiry }
        });
      } else if (desc.includes("verified_badge")) {
        await prisma.user.update({
          where: { id: p.userId },
          data: { isVerifiedBadge: true, paymentStatus: "PAID" }
        });
      }
    }
  }

  return response;
}
