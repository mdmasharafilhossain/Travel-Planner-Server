import { Router } from "express";
import * as travelController from "./travelPlan.controller";
import { requireAuth } from "../../middlewares/auth";
import { createPlanSchema, updatePlanSchema } from "./travelPlan.schema";
import { validateBody } from "../../middlewares/validate";


const router = Router();

router.get("/", travelController.listPlans);
router.post("/", requireAuth, validateBody(createPlanSchema), travelController.createPlan);
router.get("/my", requireAuth, travelController.getMyPlans);
router.get("/match", travelController.match);
router.post("/:id/join", requireAuth, travelController.requestToJoin);

// ✅ host respond (accept/reject/cancel)
router.patch(
  "/:planId/participants/:participantId",
  requireAuth,
  travelController.respondParticipant
);
router.get("/:id", travelController.getPlan);
router.delete("/:id", requireAuth, travelController.removePlan);
router.patch("/user/update/:id", requireAuth, travelController.updatePlan);
router.patch(
  "/:id",
  requireAuth,
  validateBody(updatePlanSchema),
  travelController.updatePlan
);

export default router;
