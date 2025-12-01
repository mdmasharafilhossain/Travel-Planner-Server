import { Router } from "express";
import * as controller from "./user.controller";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { changePasswordSchema, updateUserSchema } from "./user.schema";


const router = Router();
router.get("/me",requireAuth, controller.getMe);
router.get("/",requireAuth,requireAdmin, controller.list);
router.get("/:id",requireAuth, controller.getProfile);

router.patch("/:id", requireAuth, validateBody(updateUserSchema), controller.updateProfile);
router.post("/:id/change-password", requireAuth, validateBody(changePasswordSchema), controller.changePassword);

export default router;
