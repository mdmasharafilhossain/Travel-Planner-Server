/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import * as userDashboardService from "./userDashboard.service";

export async function getUserDashboard(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await userDashboardService.getUserDashboard(userId);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    console.error(err);
    return res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Failed" });
  }
}
