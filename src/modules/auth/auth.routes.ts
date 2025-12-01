import { Router } from "express";
import * as authController from "./auth.controller";
import { validateBody } from "../../middlewares/validate";
import { loginSchema, registerSchema } from "./auth.schema";
const router = Router();

router.post("/register",validateBody(registerSchema), authController.register);
router.post("/login",validateBody(loginSchema), authController.login);
router.post("/logout", authController.logout);

export default router;
