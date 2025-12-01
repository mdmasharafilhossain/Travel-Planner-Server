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
  return prisma.review.findMany({ where: { targetId: userId }, include: { author: true }});
}
