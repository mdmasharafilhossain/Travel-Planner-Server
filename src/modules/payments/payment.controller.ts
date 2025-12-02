// src/modules/payments/payment.controller.ts
import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import {
  initSubscriptionPayment,
  handleSubscriptionSuccess,
  handleSubscriptionFail,
  handleSubscriptionCancel,
  validateIPN
} from "./payment.service";

export async function initSubscriptionHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: "Authentication required" });

    const { plan } = req.body;
    if (!plan) return res.status(400).json({ ok: false, message: "Plan required" });

    const result = await initSubscriptionPayment(userId, plan);
    return res.status(201).json({ ok: true, data: result });
  } catch (err: any) {
    console.error("initSubscriptionHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "init failed" });
  }
}

export async function successHandler(req: Request, res: Response) {
  try {
    const query = req.query as Record<string,string>;
    const out = await handleSubscriptionSuccess(query);
    const q = new URLSearchParams({
      transactionId: query.transactionId || "",
      message: out.message || "success",
      amount: query.amount || "",
      status: query.status || "success"
    });
    return res.redirect(`${process.env.SSL_SUCCESS_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("successHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "success failed" });
  }
}

export async function failHandler(req: Request, res: Response) {
  try {
    const query = req.query as Record<string,string>;
    const out = await handleSubscriptionFail(query);
    const q = new URLSearchParams({
      transactionId: query.transactionId || "",
      message: out.message || "failed",
      amount: query.amount || "",
      status: query.status || "fail"
    });
    return res.redirect(`${process.env.SSL_FAIL_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("failHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "fail failed" });
  }
}

export async function cancelHandler(req: Request, res: Response) {
  try {
    const query = req.query as Record<string,string>;
    const out = await handleSubscriptionCancel(query);
    const q = new URLSearchParams({
      transactionId: query.transactionId || "",
      message: out.message || "cancel",
      amount: query.amount || "",
      status: query.status || "cancel"
    });
    return res.redirect(`${process.env.SSL_CANCEL_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("cancelHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "cancel failed" });
  }
}

// IPN validate route: SSLCommerz POSTs form urlencoded
export async function validatePaymentHandler(req: Request, res: Response) {
  try {
    const payload = req.body;
    const out = await validateIPN(payload);
    // SSLCommerz expects 200 OK
    return res.status(200).json({ ok: true, data: out });
  } catch (err: any) {
    console.error("validatePaymentHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "validate failed" });
  }
}
