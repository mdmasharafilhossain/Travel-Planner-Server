// src/modules/payments/payment.route.ts
import { Router } from "express";
 // protect init
import express from "express";
import { requireAuth } from "../../middlewares/auth";
import { cancelHandler, failHandler, initSubscriptionHandler, successHandler, validatePaymentHandler } from "./payment.controller";

const router = Router();

router.post("/init-subscription", requireAuth, initSubscriptionHandler);

// SSLCommerz redirects to these (GET)
router.get("/success", successHandler);
router.get("/fail", failHandler);
router.get("/cancel", cancelHandler);

// IPN: SSLCommerz POSTs form urlencoded
router.post("/validate-payment", express.urlencoded({ extended: true }), validatePaymentHandler);

export default router;
