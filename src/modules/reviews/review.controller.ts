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
      return res.status(400).json({ success: false, message: "targetId and rating required" });
    }

    const r = await reviewService.addReview(authorId, targetId, rating, comment);
    return res.json({ success: true, review: r });
  } catch (err: any) {
    return res.status(err?.statusCode || 500).json({ success: false, message: err?.message || "Failed" });
  }
}

export async function getUserReviews(req: any, res: Response) {
  try {
    const list = await reviewService.getUserReviews(req.params.id);
    return res.json({ success: true, reviews: list });
  } catch (err: any) {
    return res.status(err?.statusCode || 500).json({ success: false, message: err?.message || "Failed" });
  }
}
