import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as userDashboardController from "./userDashboard.controller";

const router = Router();

// User dashboard data
router.get("/user", requireAuth, userDashboardController.getUserDashboard);

export default router;
