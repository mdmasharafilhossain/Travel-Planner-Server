import { Request, Response } from "express";
import * as authService from "./auth.service";
import { cookieOptions } from "../../utils/cookie";



export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;
    const { user, token } = await authService.registerUser({ email, password, fullName });
    res.cookie(process.env.COOKIE_NAME || "tb_access", token, cookieOptions);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ ok: false, message: err.message || "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser({ email, password });
    res.cookie(process.env.COOKIE_NAME || "tb_access", token, cookieOptions);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ ok: false, message: err.message || "Login failed" });
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie(process.env.COOKIE_NAME || "tb_access", { httpOnly: true });
  res.json({ success: true, message: "Logged out" });
}
