
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
    const userId = req.params.id;

    const reviews = await reviewService.getUserReviews(userId);

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : null;

    return res.json({
      success: true,
      reviews,
      totalReviews,
      avgRating,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to fetch reviews",
    });
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

// ✅ NEW: updateReview
export async function updateReview(req: AuthRequest, res: Response) {
  try {
    const authorId = req.user?.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!authorId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const updated = await reviewService.updateReview(
      id,
      authorId,
      rating,
      comment
    );

    return res.json({ success: true, review: updated });
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .json({ success: false, message: err?.message || "Failed" });
  }
}

// ✅ NEW: deleteReview
export async function deleteReview(req: AuthRequest, res: Response) {
  try {
    const authorId = req.user?.id;
    const { id } = req.params;

    if (!authorId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const result = await reviewService.deleteReview(id, authorId);

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .json({ success: false, message: err?.message || "Failed" });
  }
}
// ✅ ADMIN: get all reviews
export async function getAllReviewsHandler(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const reviews = await reviewService.getAllReviews();
    return res.json({ success: true, reviews });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch reviews",
    });
  }
}

// ✅ ADMIN: delete review
export async function adminDeleteReviewHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { id } = req.params;
    const result = await reviewService.adminDeleteReview(id);

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to delete review",
    });
  }
}
