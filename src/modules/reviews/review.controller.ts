// src/modules/reviews/review.controller.ts
import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import * as reviewService from "./review.service";

export async function createReview(req: AuthRequest, res: Response) {
  try {
    const authorId = req.user?.id;
    const { targetId, rating, comment } = req.body;

    if (!authorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!targetId || typeof rating !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "targetId and rating required" });
    }

    const reviewData = await reviewService.addReview(
      authorId,
      targetId,
      rating,
      comment
    );
    return res.json({ success: true, review: reviewData });
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .json({ success: false, message: err?.message || "Failed" });
  }
}

// ✅ UPDATED: user reviews + avgRating + totalReviews
export async function getUserReviews(req: any, res: Response) {
  try {
    const list = await reviewService.getUserReviews(req.params.id);

    const totalReviews = list.length;
    const avgRating =
      totalReviews > 0
        ? list.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
        : null;

    return res.json({
      success: true,
      reviews: list,
      totalReviews,
      avgRating,
    });
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .json({ success: false, message: err?.message || "Failed" });
  }
}
export async function createReviewForTravelPlan(
  req: AuthRequest,
  res: Response
) {
  try {
    const authorId = req.user?.id;
    const { planId } = req.params;
    const { rating, comment } = req.body;

    if (!authorId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    if (typeof rating !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "Rating is required" });
    }

    const review = await reviewService.createReviewForPlan(
      planId,
      authorId,
      rating,
      comment
    );

    return res.json({ success: true, review });
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .json({ success: false, message: err?.message || "Failed" });
  }
}