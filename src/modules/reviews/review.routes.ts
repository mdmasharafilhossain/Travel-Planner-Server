// src/modules/reviews/review.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as reviewController from "./review.controller";

const router = Router();

// generic (optional)
router.post("/", requireAuth, reviewController.createReview);

// ✅ travel plan specific review
router.post(
  "/travel-plans/:planId",
  requireAuth,
  reviewController.createReviewForTravelPlan
);

// ✅ user reviews (used by profile & plan details)
router.get("/user/:id", reviewController.getUserReviews);

export default router;
