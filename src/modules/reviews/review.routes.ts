// src/modules/reviews/review.routes.ts
import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import * as reviewController from "./review.controller";

const router = Router();


router.post("/", requireAuth, reviewController.createReview);


router.post(
  "/travel-plans/:planId",
  requireAuth,
  reviewController.createReviewForTravelPlan
);


router.get("/user/:id", reviewController.getUserReviews);

router.patch("/:id", requireAuth, reviewController.updateReview);


router.delete("/:id", requireAuth, reviewController.deleteReview);
router.get("/admin/all", requireAuth,requireAdmin, reviewController.getAllReviewsHandler);
router.delete(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  reviewController.adminDeleteReviewHandler
);
export default router;
