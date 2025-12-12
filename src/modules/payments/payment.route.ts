import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middlewares/auth";
import {
  initSubscriptionHandler,
  successHandler,
  failHandler,
  cancelHandler,
  validatePaymentHandler,
  getPaymentStatusHandler,
  getAllTransactionsHandler,
  getUserTransactionsHandler
} from "./payment.controller";

const router = Router();

router.post("/init-subscription", requireAuth, initSubscriptionHandler);


router.get("/success", successHandler);
router.post("/success", express.urlencoded({ extended: true }), successHandler);

router.get("/fail", failHandler);
router.post("/fail", express.urlencoded({ extended: true }), failHandler);

router.get("/cancel", cancelHandler);
router.post("/cancel", express.urlencoded({ extended: true }), cancelHandler);
router.get("/my-transactions", requireAuth, getUserTransactionsHandler);
// IPN: SSLCommerz POSTs form urlencoded
router.post("/validate-payment", express.urlencoded({ extended: true }), validatePaymentHandler);

// status endpoint
router.get("/status/:transactionId", getPaymentStatusHandler);
router.get("/admin/transactions", requireAuth, getAllTransactionsHandler);
export default router;
