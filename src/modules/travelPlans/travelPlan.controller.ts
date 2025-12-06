import { Request, Response } from "express";
import * as travelService from "./travelPlan.service";

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
      destination: (req.query.destination as string) || undefined,
      startDate: (req.query.startDate as string) || undefined,
      endDate: (req.query.endDate as string) || undefined,
      travelType: (req.query.travelType as string) || undefined
    };
    const matches = await travelService.matchPlans(FilterQuery);
    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Failed" });
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

