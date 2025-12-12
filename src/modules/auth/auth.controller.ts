import { Request, Response } from "express";
import * as authService from "./auth.service";
import { cookieOptions } from "../../utils/cookie";
import { LoginInput, RegisterInput } from "./auth.schema";



export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body as RegisterInput;
    const { user, token } = await authService.registerUser({ email, password, fullName });
    res.cookie(process.env.COOKIE_NAME || "tb_access", token, cookieOptions);
    res.json({ success: true, user });
  } catch (err: any) {
    console.log(err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Registration failed" });
  }
  
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as LoginInput;
    const { user, token } = await authService.loginUser({ email, password });
    res.cookie(process.env.COOKIE_NAME || "tb_access", token, cookieOptions);
    res.json({ success: true, user,token });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Login failed" });
  }
}


export async function logout(req: Request, res: Response) {
  const cookieName = process.env.COOKIE_NAME || "tb_access";
  
  const clearOptions = { ...cookieOptions };
  delete (clearOptions as any).maxAge;
  res.clearCookie(cookieName, clearOptions);
  res.json({ success: true, message: "Logged out" });
}
