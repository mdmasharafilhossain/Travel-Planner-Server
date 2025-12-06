-- CreateTable
CREATE TABLE "TravelPlanParticipant" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TravelPlanParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelPlanParticipant_travelPlanId_userId_key" ON "TravelPlanParticipant"("travelPlanId", "userId");

-- AddForeignKey
ALTER TABLE "TravelPlanParticipant" ADD CONSTRAINT "TravelPlanParticipant_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanParticipant" ADD CONSTRAINT "TravelPlanParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
