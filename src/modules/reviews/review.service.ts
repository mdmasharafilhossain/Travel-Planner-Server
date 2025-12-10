// import { prisma } from "../../config/db";
// import { AppError } from "../../utils/AppError";

import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";


export async function addReview(authorId: string, targetId: string, rating: number, comment?: string) {
  if (authorId === targetId) throw AppError.badRequest("Cannot review yourself");
  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      authorId,
      targetId
    }
  });
  return review;
}

export async function getUserReviews(userId: string) {
  return prisma.review.findMany({
    where: {
      targetId: userId, 
    },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function createReviewForPlan(
  travelPlanId: string,
  authorId: string,
  rating: number,
  comment?: string
) {
  if (rating < 1 || rating > 5) {
    throw AppError.badRequest("Rating must be between 1 and 5");
  }

  const plan = await prisma.travelPlan.findUnique({
    where: { id: travelPlanId },
  });

  if (!plan) {
    throw AppError.notFound("Travel plan not found");
  }

  const now = new Date();
  if (plan.endDate > now) {
    throw AppError.badRequest("You can only review after the trip is completed");
  }

  // 🔐 শুধু ACCEPTED participant-রা review দিতে পারবে
  const participant = await prisma.travelPlanParticipant.findFirst({
    where: {
      travelPlanId,
      userId: authorId,
      status: "ACCEPTED",
    },
  });

  if (!participant) {
    throw AppError.forbidden(
      "Only accepted participants can review this host"
    );
  }

  const targetId = plan.hostId;

  const existing = await prisma.review.findFirst({
    where: {
      authorId,
      targetId,
    },
  });

  if (existing) {
    throw AppError.badRequest("You have already reviewed this host");
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      authorId,
      targetId,
    },
    include: {
      author: {
        select: { id: true, fullName: true, profileImage: true },
      },
    },
  });

  return review;
}


// New Function
export async function updateReview(
  reviewId: string,
  authorId: string,
  rating?: number,
  comment?: string
) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw AppError.notFound("Review not found");

  if (review.authorId !== authorId) {
    throw AppError.forbidden("You can only edit your own review");
  }

  const data: any = {};
  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      throw AppError.badRequest("Rating must be between 1 and 5");
    }
    data.rating = rating;
  }
  if (comment !== undefined) {
    data.comment = comment;
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data,
    include: {
      author: {
        select: { id: true, fullName: true, profileImage: true },
      },
    },
  });

  return updated;
}

// ✅ NEW: Delete review
export async function deleteReview(reviewId: string, authorId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw AppError.notFound("Review not found");

  if (review.authorId !== authorId) {
    throw AppError.forbidden("You can only delete your own review");
  }

  await prisma.review.delete({ where: { id: reviewId } });

  return { message: "Review deleted" };
}