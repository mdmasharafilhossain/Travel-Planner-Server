import { Router } from "express";
import * as travelController from "./travelPlan.controller";
import { requireAuth } from "../../middlewares/auth";
import { createPlanSchema, updatePlanSchema } from "./travelPlan.schema";
import { validateBody } from "../../middlewares/validate";


const router = Router();

router.get("/", travelController.listPlans);
router.post("/", requireAuth, validateBody(createPlanSchema), travelController.createPlan);
router.get("/match", travelController.match);
router.get("/:id", travelController.getPlan);
router.delete("/:id", requireAuth, travelController.removePlan);
router.patch(
  "/:id",
  requireAuth,
  validateBody(updatePlanSchema),
  travelController.updatePlan
);

export default router;
