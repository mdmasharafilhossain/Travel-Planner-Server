// src/modules/payments/payment.route.ts
import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middlewares/auth";
import {
  initSubscriptionHandler,
  successHandler,
  failHandler,
  cancelHandler,
  validatePaymentHandler,
  getPaymentStatusHandler
} from "./payment.controller";

const router = Router();

router.post("/init-subscription", requireAuth, initSubscriptionHandler);

// allow both GET & POST for redirect endpoints (gateway may use either)
router.get("/success", successHandler);
router.post("/success", express.urlencoded({ extended: true }), successHandler);

router.get("/fail", failHandler);
router.post("/fail", express.urlencoded({ extended: true }), failHandler);

router.get("/cancel", cancelHandler);
router.post("/cancel", express.urlencoded({ extended: true }), cancelHandler);

// IPN: SSLCommerz POSTs form urlencoded
router.post("/validate-payment", express.urlencoded({ extended: true }), validatePaymentHandler);

// status endpoint
router.get("/status/:transactionId", getPaymentStatusHandler);

export default router;
