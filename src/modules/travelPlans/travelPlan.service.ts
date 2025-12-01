import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";


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
  const searchPlan = await prisma.travelPlan.findUnique({ where: { id }, include: { host: true }});
  if (!searchPlan) {
throw AppError.notFound("Travel plan not found");
  }
  return searchPlan;
}

export async function listPlans(skip = 0, take = 20) {
  return prisma.travelPlan.findMany({ skip, take, include: { host: true }, orderBy: { startDate: 'asc' }});
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
