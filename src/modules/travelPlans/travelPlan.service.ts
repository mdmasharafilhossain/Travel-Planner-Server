import { th } from "zod/v4/locales";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { TravelType, Visibility } from "@prisma/client";

export async function createPlan(hostId: string, data: any) {
  const CreateNewPlan = await prisma.travelPlan.create({
    data: {
      title: data.title,
      destination: data.destination,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
      travelType: data.travelType,
      description: data.description ?? null,
      visibility: data.visibility ?? "PUBLIC",
      hostId
    }
  });
  return CreateNewPlan;
}

export async function getPlan(id: string) {
  const searchPlan = await prisma.travelPlan.findUnique({
    where: { id },
    include: {
      host: true,
      travelPlanParticipants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!searchPlan) {
    throw AppError.notFound("Travel plan not found");
  }
  return searchPlan;
}


export async function listPlans(skip = 0, take = 20) {
  return prisma.travelPlan.findMany({
    skip,
    take,
    where: {
      visibility: Visibility.PUBLIC,      
      
     
    },
    include: { host: true },
    orderBy: { startDate: "asc" },
  });
}

export async function matchPlans(query: { destination?: string; startDate?: string; endDate?: string; travelType?: string }) {
  const where: any = { visibility: "PUBLIC" };
  if (query.destination) where.destination = { contains: query.destination, mode: "insensitive" };
  if (query.travelType) where.travelType = query.travelType;
  if (query.startDate && query.endDate) {
    const sDate = new Date(query.startDate);
    const eDate = new Date(query.endDate);
    where.AND = [
      { endDate: { gte: sDate } },
      { startDate: { lte: eDate } }
    ];
  }
  const results = await prisma.travelPlan.findMany({ where, include: { host: true }});
  return results;
}

export async function deletePlan(id: string, userId: string, isAdmin = false) {
  const plan = await prisma.travelPlan.findUnique({ where: { id }});
  if (!plan) throw AppError.notFound("Travel plan not found");
  if (plan.hostId !== userId && !isAdmin) throw { statusCode: 403, message: "Forbidden" };
  await prisma.travelPlan.delete({ where: { id }});
  return { message: "Deleted" };
}



export async function updatePlan(
  id: string,
  userId: string,
  data: any,
  isAdmin = false
) {
  const plan = await prisma.travelPlan.findUnique({ where: { id } });
  if (!plan) throw AppError.notFound("Travel plan not found");
  if (plan.hostId !== userId && !isAdmin)
   throw  AppError.forbidden("You do not have permission to update this plan");

  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.startDate !== undefined)
    updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.budgetMin !== undefined) updateData.budgetMin = data.budgetMin;
  if (data.budgetMax !== undefined) updateData.budgetMax = data.budgetMax;
  if (data.travelType !== undefined) updateData.travelType = data.travelType;
  if (data.description !== undefined)
    updateData.description = data.description ?? null;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;

  const updated = await prisma.travelPlan.update({
    where: { id },
    data: updateData,
  });

  return { message: "Plan updated", plan: updated };
}



export async function requestToJoinPlan(planId: string, userId: string) {
  const plan = await prisma.travelPlan.findUnique({ where: { id: planId } });
  if (!plan) throw AppError.notFound("Travel plan not found");

  if (plan.hostId === userId) {
    throw AppError.badRequest("You cannot request to join your own plan");
  }

  
  const existing = await prisma.travelPlanParticipant.findFirst({
    where: { travelPlanId: planId, userId },
  });

  if (existing) {
    throw AppError.badRequest(`You already have a request with status: ${existing.status}`);
  }

  const participant = await prisma.travelPlanParticipant.create({
    data: {
      travelPlanId: planId,
      userId,
      status: "PENDING",
    },
  });

  return { message: "Join request sent", participant };
}


export async function respondToJoinRequest(
  planId: string,
  hostId: string,
  participantId: string,
  status: "ACCEPTED" | "REJECTED" | "CANCELLED"
) {
  const plan = await prisma.travelPlan.findUnique({ where: { id: planId } });
  if (!plan) throw AppError.notFound("Travel plan not found");

  if (plan.hostId !== hostId) {
    throw AppError.forbidden("Only host can manage join requests");
  }

  const participant = await prisma.travelPlanParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.travelPlanId !== planId) {
    throw AppError.notFound("Join request not found");
  }

  const updated = await prisma.travelPlanParticipant.update({
    where: { id: participantId },
    data: {
      status,
      respondedAt: new Date(),
    },
  });

  return { message: "Status updated", participant: updated };
}
export async function listPlansWithPagination(query: {
  page?: number;
  limit?: number;
  destination?: string;
  travelType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(20, Number(query.limit || 6));
  const skip = (page - 1) * limit;

  const where: any = {
    visibility: "PUBLIC",
  };

  if (query.destination) {
    where.destination = {
      contains: query.destination,
      mode: "insensitive",
    };
  }

  if (query.travelType) {
    where.travelType = query.travelType;
  }

  if (query.startDate && query.endDate) {
    where.AND = [
      { startDate: { lte: new Date(query.endDate) } },
      { endDate: { gte: new Date(query.startDate) } },
    ];
  }

  const [plans, total] = await Promise.all([
    prisma.travelPlan.findMany({
      where,
      skip,
      take: limit,
      include: { host: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.travelPlan.count({ where }),
  ]);

  return {
    data: plans,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
