import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as reviewController from "../reviews/review.controller"; 

const router = Router();


router.post("/", requireAuth, reviewController.createReview);
router.get("/user/:id", reviewController.getUserReviews);

export default router;
