import { Request, Response } from "express";
import * as travelService from "./travelPlan.service";
import { prisma } from "../../config/db";

export async function createPlan(req: Request, res: Response) {
  try {
    const hostId = req.user?.id;
    if (!hostId) return res.status(401).json({ success: false, message: "Authentication required" });
    const plan = await travelService.createPlan(hostId, req.body);
    res.json({ success: true, plan });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function getPlan(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const plan = await travelService.getPlan(id);
    res.json({ success: true, plan });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function listPlans(req: Request, res: Response) {
  try {
    const take = Number(req.query.take) || 20;
    const skip = Number(req.query.skip) || 0;
    const plans = await travelService.listPlans(skip, take);
    res.json({ success: true, plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function match(req: Request, res: Response) {
  try {
    const FilterQuery = {
      destination: req.query.destination
        ? String(req.query.destination)
        : undefined,
      startDate: req.query.startDate
        ? String(req.query.startDate)
        : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      travelType: req.query.travelType
        ? String(req.query.travelType)
        : undefined,
    };

    const matches = await travelService.matchPlans(FilterQuery);

    return res.json({ success: true, matches });
  } catch (err: any) {
    console.error("Match error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Failed to match plans" });
  }
}

export async function removePlan(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    const result = await travelService.deletePlan(id, userId, isAdmin);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const result = await travelService.updatePlan(id, userId, req.body, isAdmin);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Failed" });
  }
}
export async function requestToJoin(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const planId = req.params.id;
    const result = await travelService.requestToJoinPlan(planId, userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Failed" });
  }
}

// 👇 NEW: host accept/reject/cancel
export async function respondParticipant(req: Request, res: Response) {
  try {
    const hostId = (req as any).user?.id;
    if (!hostId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { planId, participantId } = req.params;
    const { status } = req.body; // ACCEPTED | REJECTED | CANCELLED

    if (!["ACCEPTED", "REJECTED", "CANCELLED"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const result = await travelService.respondToJoinRequest(
      planId,
      hostId,
      participantId,
      status
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Failed" });
  }
}
export async function getMyPlans(req: any, res: any) {
  try {
    const userId = req.user.id;

    const plans = await prisma.travelPlan.findMany({
      where: { hostId: userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load plans",
    });
  }
}

export async function userUpdatePlan(req: any, res: any) {
  try {
    const userId = req.user.id;
    const planId = req.params.id;
    const data = req.body;

    const updated = await travelService.updatePlan(planId, userId, data);

    return res.json({
      success: true,
      message: "Plan updated successfully",
      plan: updated.plan,
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update plan",
    });
  }
}