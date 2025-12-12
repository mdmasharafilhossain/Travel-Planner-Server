import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  initSubscriptionPayment,
  handleSubscriptionSuccess,
  handleSubscriptionFail,
  handleSubscriptionCancel,
  validateIPN,
  getPaymentStatus ,
  getAllTransactionHistory,
  getUserPaymentHistory
} from "./payment.service";
function extractTransactionId(req: Request): string | null {
  const q = req.query || {};
  console.log(q,"Query............");
  const b = (req.body && typeof req.body === "object") ? req.body as Record<string, any> : {};

  const candidates = [
    q.transactionId, q.transactionid, q.tran_id, q.tranId, q.tranid, q.tranID,
    b.tran_id, b.tranId, b.transactionId, b.transaction_id, b.transactionid, b.transactionID
  ];
 

  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "") return c.trim();
    if (typeof c === "number") return String(c);
  }
  return null;
}
export async function initSubscriptionHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: "Authentication required" });

    const { plan, phone } = req.body;
    if (!plan) return res.status(400).json({ ok: false, message: "Plan required" });

    const result = await initSubscriptionPayment(userId, plan, phone);
    return res.status(201).json({ ok: true, data: result });
  } catch (err: any) {
    console.error("initSubscriptionHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "init failed" });
  }
}
export async function successHandler(req: Request, res: Response) {
  try {
   
    const tx = extractTransactionId(req);

    if (!tx) {
     
      console.warn("[payments] /success missing transactionId. query:", req.query, "body:", req.body);
     
      return res.status(400).send("<h3>Missing transactionId in gateway return. Check server logs.</h3>");
    }

    const normalizedQuery: Record<string,string> = { ...(req.query as Record<string,string>) };
    normalizedQuery.transactionId = tx;

    const out = await handleSubscriptionSuccess(normalizedQuery);
    const q = new URLSearchParams({
      transactionId: tx,
      message: out.message || "success",
      amount: normalizedQuery.amount || (req.body && (req.body as any).amount) || "",
      status: normalizedQuery.status || (req.body && (req.body as any).status) || "success"
    });

    return res.redirect(`${process.env.SSL_SUCCESS_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("successHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "success failed" });
  }
}


export async function failHandler(req: Request, res: Response) {
  try {
    const tx = extractTransactionId(req);
    if (!tx) {
      console.warn("[payments] /fail missing transactionId. query:", req.query, "body:", req.body);
      return res.status(400).send("<h3>Missing transactionId in gateway return. Check server logs.</h3>");
    }

    const normalizedQuery: Record<string,string> = { ...(req.query as Record<string,string>) };
    normalizedQuery.transactionId = tx;

    const out = await handleSubscriptionFail(normalizedQuery);
    const q = new URLSearchParams({
      transactionId: tx,
      message: out.message || "failed",
      amount: normalizedQuery.amount || (req.body && (req.body as any).amount) || "",
      status: normalizedQuery.status || (req.body && (req.body as any).status) || "fail"
    });

    return res.redirect(`${process.env.SSL_FAIL_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("failHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "fail failed" });
  }
}


export async function cancelHandler(req: Request, res: Response) {
  try {
    const tx = extractTransactionId(req);
    if (!tx) {
      console.warn("[payments] /cancel missing transactionId. query:", req.query, "body:", req.body);
      return res.status(400).send("<h3>Missing transactionId in gateway return. Check server logs.</h3>");
    }

    const normalizedQuery: Record<string,string> = { ...(req.query as Record<string,string>) };
    normalizedQuery.transactionId = tx;

    const out = await handleSubscriptionCancel(normalizedQuery);
    const q = new URLSearchParams({
      transactionId: tx,
      message: out.message || "cancel",
      amount: normalizedQuery.amount || (req.body && (req.body as any).amount) || "",
      status: normalizedQuery.status || (req.body && (req.body as any).status) || "cancel"
    });

    return res.redirect(`${process.env.SSL_CANCEL_FRONTEND_URL}?${q.toString()}`);
  } catch (err: any) {
    console.error("cancelHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "cancel failed" });
  }
}


export async function validatePaymentHandler(req: Request, res: Response) {
  try {

    const payload = req.body || {};
    console.info("[payments] /validate-payment ipn received:", JSON.stringify(payload).slice(0,2000));
    const out = await validateIPN(payload);
  
    return res.status(200).json({ ok: true, data: out });
  } catch (err: any) {
    console.error("validatePaymentHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "validate failed" });
  }
}


export async function getPaymentStatusHandler(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    if (!transactionId) return res.status(400).json({ ok: false, message: "transactionId required" });
    const data = await getPaymentStatus(transactionId);
    return res.status(200).json({ ok: true, data });
  } catch (err: any) {
    console.error("getPaymentStatusHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "Failed to get status" });
  }
}

export async function getAllTransactionsHandler(req: Request, res: Response) {
  try {
    const authUser = (req as any).user;
   

    const {
      page,
      limit,
      status,
      userId,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder
    } = req.query;

    const result = await getAllTransactionHistory({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status ? String(status) : undefined,
      userId: userId ? String(userId) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      search: search ? String(search) : undefined,
      sortBy: sortBy ? String(sortBy) : undefined,
      sortOrder: sortOrder === "asc" ? "asc" : "desc"
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (err: any) {
    console.error("getAllTransactionsHandler error:", err);
    return res.status(err.statusCode || 500).json({ ok: false, message: err.message || "Failed to fetch transactions" });
  }
}

export async function getUserTransactionsHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const transactions = await getUserPaymentHistory(userId);
    return res.json({ ok: true, data: transactions });
  } catch (err: any) {
    console.error("getUserTransactionsHandler error:", err);
    return res
      .status(err.statusCode || 500)
      .json({ ok: false, message: err.message || "Failed" });
  }
}