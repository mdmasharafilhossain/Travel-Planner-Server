import { prisma } from "../../config/db";

export async function getUserDashboard(userId: string) {
  const now = new Date();


  const hostedPlans = await prisma.travelPlan.findMany({
    where: { hostId: userId },
    include: {
      host: true,
      travelPlanParticipants: {
        include: {
          user: {
            select: { id: true, fullName: true, profileImage: true }
          }
        }
      }
    },
    orderBy: { startDate: "asc" },
  });


  const joinedParticipants = await prisma.travelPlanParticipant.findMany({
    where: { userId, status: "ACCEPTED" },
    include: {
      travelPlan: {
        include: {
          host: true,
          travelPlanParticipants: {
            include: {
              user: {
                select: { id: true, fullName: true, profileImage: true }
              }
            }
          }
        }
      }
    },
    orderBy: { requestedAt: "asc" },
  });

  const joinedPlans = joinedParticipants.map(p => p.travelPlan);

 
  const planMap = new Map<string, any>();
  for (const p of hostedPlans) {
    if (p.startDate >= now) {
      planMap.set(p.id, p);
    }
  }
  for (const jp of joinedPlans) {
    if (jp.startDate >= now) {
      planMap.set(jp.id, jp);
    }
  }
  const upcomingPlans = Array.from(planMap.values());


  const matchesByPlan: Record<string, any[]> = {};
  for (const plan of upcomingPlans) {
    const matches = await prisma.travelPlan.findMany({
      where: {
        id: { not: plan.id },
        destination: plan.destination,
        travelType: plan.travelType,
        visibility: "PUBLIC",
        AND: [
          { startDate: { lte: plan.endDate } },
          { endDate: { gte: plan.startDate } }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            isVerifiedBadge: true
          }
        }
      },
      take: 20,
    });
    matchesByPlan[plan.id] = matches;
  }


  const finishedJoined = joinedPlans.filter(p => p.endDate < now);

  const hostIds = Array.from(new Set(finishedJoined.map(p => p.hostId)));
  const existingReviews = await prisma.review.findMany({
    where: {
      authorId: userId,
      targetId: { in: hostIds },
    },
    select: { targetId: true },
  });
  const reviewedHostIds = new Set(existingReviews.map(r => r.targetId));

  const reviewableTrips = finishedJoined
    .filter(p => !reviewedHostIds.has(p.hostId))
    .map(p => ({
      id: p.id,
      title: p.title,
      destination: p.destination,
      startDate: p.startDate,
      endDate: p.endDate,
      host: p.host,
    }));

  return {
    hostedPlans,
    joinedPlans,
    upcomingPlans,
    reviewableTrips,
    matchesByPlan,
  };
}
