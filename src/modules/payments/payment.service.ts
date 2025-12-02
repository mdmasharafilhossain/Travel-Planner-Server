

import Stripe from "stripe";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { stripe } from "../../utils/helper/stripe";
import dotenv from 'dotenv';
dotenv.config();

export async function createCheckoutSession(params: {
  userId: string;
  amountCents: number;
  currency?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  transactionId?: string | null; // optional initial transaction id
}) {
  const {
    userId,
    amountCents,
    currency = "bdt",
    description,
    successUrl,
    cancelUrl,
    transactionId = null
  } = params;

  // 1) create DB payment record (PENDING)
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: amountCents,
      currency,
      status: PaymentStatus.PENDING,
      paymentGateway: "stripe",
      paymentGatewayData: {},
      transactionId: transactionId ?? null,
      description: description ?? null
    }
  });

  // 2) create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: description ?? "TravelBuddy Payment"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    metadata: {
      paymentId: payment.id,
      userId
    },
    success_url:
      successUrl ||
      process.env.CLIENT_SUCCESS_URL ||
      "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url:
      cancelUrl || process.env.CLIENT_CANCEL_URL || "https://example.com/cancel"
  });

  // 3) update payment with session object
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentGatewayData: session as any
    }
  });

  return { payment, session };
}

/**
 * Handle Stripe webhook events and update Payment.transactionId where possible.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // session.payment_status and session.payment_intent may be present
      const paymentId = session.metadata?.paymentId as string | undefined;
      const userId = session.metadata?.userId as string | undefined;

      // Determine transaction id: prefer payment_intent id (string) or charge id inside payment_intent object
      let transactionId: string | null = null;
      if (session.payment_intent) {
        // session.payment_intent is often a string id
        transactionId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : // sometimes stripe may embed object
            (session.payment_intent as any).id ?? null;
      } else if ((session as any).payment_intent && typeof (session as any).payment_intent === "object") {
        transactionId = (session as any).payment_intent.id ?? null;
      }

      const status = session.payment_status === "paid" ? PaymentStatus.PAID : PaymentStatus.UNPAID;

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status,
            transactionId,
            paymentGatewayData: session as any
          }
        });
      }

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { paymentStatus: status }
        });
      }

      return { ok: true, event: event.type, paymentId, transactionId };
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const metadata = (pi.metadata || {}) as Record<string, any>;
      const paymentId = metadata.paymentId as string | undefined;
      const userId = metadata.userId as string | undefined;
      const transactionId = pi.id;

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.PAID,
            transactionId,
            paymentGatewayData: pi as any
          }
        });
      }

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { paymentStatus: PaymentStatus.PAID }
        });
      }

      return { ok: true, event: event.type, paymentId, transactionId };
    }

    case "payment_intent.payment_failed":
    case "checkout.session.async_payment_failed": {
      const obj = event.data.object as any;
      const metadata = (obj.metadata || {}) as Record<string, any>;
      const paymentId = metadata.paymentId as string | undefined;
      const userId = metadata.userId as string | undefined;
      const transactionId = obj.id ?? null;

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            transactionId,
            paymentGatewayData: obj
          }
        });
      }

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
      }

      return { ok: true, event: event.type, paymentId, transactionId };
    }

    default:
      // ignore other events
      return { ok: false, event: event.type };
  }
}
