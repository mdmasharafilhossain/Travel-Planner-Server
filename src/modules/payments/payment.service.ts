
import dotenv from "dotenv";
dotenv.config();

import { AppError } from "../../utils/AppError";
import { prisma } from "../../config/db";
import SSLService from "../../sslCommerz/sslCommerz.service";

type Plan = "monthly" | "yearly" | "verified_badge";

function generateTransactionId() {
  return `TB_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}


export async function initSubscriptionPayment(userId: string, plan: string, phoneNumber?: string) {
  const PLAN = (plan || "").toLowerCase() as Plan;
  let amount: number;
  if (PLAN === "monthly") amount = Number(process.env.PRICE_MONTHLY || 0);
  else if (PLAN === "yearly") amount = Number(process.env.PRICE_YEARLY || 0);
  else if (PLAN === "verified_badge") amount = Number(process.env.PRICE_VERIFIED_BADGE || 0);
  else throw AppError.badRequest("Invalid plan");

  if (!amount || amount <= 0) throw AppError.badRequest("Invalid amount for the selected plan");

  const transactionId = generateTransactionId();
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentGatewayData: { error: "user_not_found" } }
    }).catch(() => {});
    throw AppError.notFound("User not found");
  }

  const phone =
    (phoneNumber && String(phoneNumber).trim()) ||
    ((user as any).phone ? String((user as any).phone).trim() : "") ||
    "";

  if (!phone) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentGatewayData: { initError: "missing_phone" } }
    }).catch(() => {});
    throw AppError.badRequest("User phone number is required for SSLCommerz payment. Provide 'phone' in request body or add phone to user profile.");
  }

  const sslPayload = {
    name: user.fullName ?? user.email,
    email: user.email,
    phoneNumber: phone,
    address: user.currentLocation ?? "",
    amount: payment.amount,
    transactionId: payment.transactionId!,
    productName: `TravelBuddy ${PLAN}`
  };

  let result: any = null;
  try {
    result = await SSLService.sslPaymentInit(sslPayload as any);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentGatewayData: { initError: errMsg } }
    }).catch(() => {});
    throw AppError.internalError("Failed to initiate payment with SSLCommerz");
  }


  const sessionKey = result?.sessionkey || result?.SESSIONKEY || null;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentGatewayData: result as any,
      sessionKey: sessionKey
    }
  }).catch((e) => console.error("Failed to update payment with gateway data:", e));

  if (!result || !result.GatewayPageURL) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentGatewayData: result ?? null }
    }).catch(() => {});
    const bodySnippet = result ? JSON.stringify(result).slice(0, 2000) : "no body";
    throw AppError.internalError(`SSLCommerz did not return GatewayPageURL. Response: ${bodySnippet}`);
  }

  return { paymentUrl: result.GatewayPageURL, paymentId: payment.id, transactionId: payment.transactionId };
}


export async function handleSubscriptionSuccess(query: Record<string, string>) {
  const txId = query.transactionId || query.tran_id || query.tranId || query.tranid || "";
  const sessionKey = query.sessionkey || query.sessionKey || query.SESSIONKEY || "";
  const valId = query.val_id || query.valId || "";


  let payment = null;
  if (txId) {
    payment = await prisma.payment.findUnique({ where: { transactionId: txId } });
  }


  if (!payment && sessionKey) {
    payment = await prisma.payment.findFirst({ where: { sessionKey: sessionKey } });
  }

  if (!payment && sessionKey) {
    const candidates = await prisma.payment.findMany({
      where: { paymentGateway: "sslcommerz" },
      take: 100
    });
    payment = candidates.find((p) => {
      const d: any = p.paymentGatewayData as any;
      if (!d) return false;
      return (d.sessionkey === sessionKey || d.SESSIONKEY === sessionKey || d.sessionKey === sessionKey);
    }) ?? null;
  }

  if (!payment) {
    console.warn("[payments] Could not map redirect to a payment record. txId:", txId, "sessionKey:", sessionKey, "val_id:", valId);
    return { success: false, message: "No matching payment found; awaiting IPN" };
  }

  if (payment.status === "PAID") {
    return { success: true, message: "Already processed", payment };
  }

 
  const desc = payment.description ?? "";
  let plan: Plan = "monthly";
  if (desc.includes("subscription:yearly")) plan = "yearly";
  else if (desc.includes("subscription:monthly")) plan = "monthly";
  else if (desc.includes("verified_badge")) plan = "verified_badge";
  else if (desc.includes("subscription:verified_badge")) plan = "verified_badge";

  const updated = await prisma.$transaction(async (tx) => {
    const paymentUpdated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paymentGatewayData: { ...((payment.paymentGatewayData as any) || {}), successQuery: query, updatedAt: new Date() },
        updatedAt: new Date()
      }
    });

    if (plan === "monthly" || plan === "yearly") {
      const now = new Date();
      const addMonths = plan === "monthly" ? 1 : 12;
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

  return { success: true, message: "Payment successful (optimistic)", payment: updated };
}

export async function handleSubscriptionFail(query: Record<string, string>) {
  const txId = query.transactionId || query.tran_id || query.tranId || query.tranid || "";
  const sessionKey = query.sessionkey || query.sessionKey || "";


  if (txId) {
    await prisma.payment.updateMany({
      where: { transactionId: txId },
      data: { status: "FAILED", paymentGatewayData: { failQuery: query } }
    });
  } else if (sessionKey) {
    await prisma.payment.updateMany({
      where: { sessionKey },
      data: { status: "FAILED", paymentGatewayData: { failQuery: query } }
    });
  } else {
    console.warn("[payments] handleSubscriptionFail: no txId or sessionKey in query", query);
  }

  return { success: false, message: "Payment failed" };
}

export async function handleSubscriptionCancel(query: Record<string, string>) {
  const txId = query.transactionId || query.tran_id || query.tranId || query.tranid || "";
  const sessionKey = query.sessionkey || query.sessionKey || "";

  if (txId) {
    await prisma.payment.updateMany({
      where: { transactionId: txId },
      data: { status: "UNPAID", paymentGatewayData: { cancelQuery: query } }
    });
  } else if (sessionKey) {
    await prisma.payment.updateMany({
      where: { sessionKey },
      data: { status: "UNPAID", paymentGatewayData: { cancelQuery: query } }
    });
  } else {
    console.warn("[payments] handleSubscriptionCancel: no txId or sessionKey in query", query);
  }

  return { success: false, message: "Payment cancelled" };
}


export async function validateIPN(payload: any) {
  const response = await SSLService.validatePayment(payload);

  const tranId = payload.tran_id || payload.tranId || payload.tranid || "";
  if (!tranId) throw AppError.badRequest("tran_id missing in IPN payload");

  const statusFromResponse = (response?.status || "").toString().toUpperCase();
  const statusToStore = statusFromResponse === "VALID" || statusFromResponse === "VALIDATED" || statusFromResponse === "PAID" ? "PAID" : "UNPAID";

  const gatewayTranIdFromResponse = response?.tran_id || response?.tranId || null;

  await prisma.payment.updateMany({
    where: { transactionId: tranId },
    data: {
      paymentGatewayData: response,
      status: statusToStore,
      gatewayTranId: gatewayTranIdFromResponse
    }
  });

  if (statusToStore === "PAID") {
    const payments = await prisma.payment.findMany({ where: { transactionId: tranId } });
    for (const p of payments) {
      const desc = p.description ?? "";
      if (desc.includes("subscription:yearly") || desc.includes("subscription:monthly")) {
        const now = new Date();
        const addMonths = desc.includes("yearly") ? 12 : 1;
        const user = await prisma.user.findUnique({ where: { id: p.userId } });
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



export async function getPaymentStatus(transactionId: string) {
  if (!transactionId) throw AppError.badRequest("transactionId required");

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          isPremium: true,
          premiumExpiresAt: true,
          isVerifiedBadge: true,
          paymentStatus: true,
        }
      }
    }
  });

  if (!payment) {
    return { payment: null, user: null };
  }

  return {
    payment: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId,
      description: payment.description,
      paymentGateway: payment.paymentGateway,
      paymentGatewayData: payment.paymentGatewayData,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    },
    user: payment.user
  };
}

/**
 * Admin: get paginated transaction history with filtering
 * query: { page, limit, status, userId, fromDate, toDate, search, sortBy, sortOrder }
 */
export async function getAllTransactionHistory(opts: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;    
  sortOrder?: "asc" | "desc";
}) {
  const page = Math.max(1, Number(opts.page || 1));
  const limit = Math.min(100, Math.max(1, Number(opts.limit || 20)));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (opts.status) {
    where.status = opts.status.toUpperCase();
  }
  if (opts.userId) {
    where.userId = opts.userId;
  }
  if (opts.fromDate || opts.toDate) {
    where.createdAt = {};
    if (opts.fromDate) where.createdAt.gte = new Date(opts.fromDate);
    if (opts.toDate) where.createdAt.lte = new Date(opts.toDate);
  }
  if (opts.search) {
    
    where.OR = [
      { transactionId: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
 
      {
        user: {
          some: {
            email: { contains: opts.search, mode: "insensitive" }
          }
        }
      } as any
    ];

  }


  const orderBy = {};
  const sortBy = opts.sortBy || "createdAt";
  const sortOrder = opts.sortOrder || "desc";
  (orderBy as any)[sortBy] = sortOrder;


  let payments: any[] = [];
  let total = 0;


  const wherePrimary = { ...where };
  if (wherePrimary.OR) {

    wherePrimary.OR = wherePrimary.OR.filter((clause: any) => {
      const keys = Object.keys(clause || {});
      if (keys.length === 1 && keys[0] === "user") return false;
      return true;
    });
    if (wherePrimary.OR.length === 0) delete wherePrimary.OR;
  }

  total = await prisma.payment.count({ where: wherePrimary });

  payments = await prisma.payment.findMany({
    where: wherePrimary,
    include: {
      user: { select: { id: true, email: true, fullName: true } }
    },
    orderBy: orderBy as any,
    skip,
    take: limit
  });


  if (opts.search) {

    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: opts.search, mode: "insensitive" } },
          { fullName: { contains: opts.search, mode: "insensitive" } }
        ]
      },
      select: { id: true }
    });

    if (matchedUsers.length > 0) {
      const userIds = matchedUsers.map((u) => u.id);
     
      const whereWithUsers = { ...wherePrimary, OR: [{ userId: { in: userIds } }, ...(wherePrimary.OR || [])] };

      total = await prisma.payment.count({ where: whereWithUsers });

      payments = await prisma.payment.findMany({
        where: whereWithUsers,
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: orderBy as any,
        skip,
        take: limit
      });
    }
  }

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages
    },
    data: payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: p.user,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      description: p.description,
      transactionId: p.transactionId,
      paymentGateway: p.paymentGateway,
      paymentGatewayData: p.paymentGatewayData,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))
  };
}

export async function getUserPaymentHistory(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      transactionId: true,
      description: true,
      paymentGateway: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}