import { Request, Response } from "express";
import * as userService from "./user.service";
import { AuthRequest } from "../../middlewares/auth";

export async function getProfile(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const user = await userService.getUserById(id);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const id = req.params.id;
    
    if (req.user?.id !== id && req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const updated = await userService.updateUser(id, req.body);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const take = Number(req.query.take) || 20;
    const skip = Number(req.query.skip) || 0;
    const users = await userService.listUsers(take, skip);
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (req.user?.id !== id) return res.status(403).json({ success: false, message: "Forbidden" });
    const { oldPassword, newPassword } = req.body;
    const result = await userService.changePassword(id, oldPassword, newPassword);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    console.log("DEBUG /me - req.user:", req.user);

    const userId = req.user?.id;
    if (!userId) {
      console.log("DEBUG /me - no user id in request");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await userService.getMe(userId);
    return res.json({ success: true, user });
  } catch (err: any) {
    console.error("getMe error:", err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}


// New Functionality


export async function deleteUser(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await userService.deleteUser(id);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}


export async function changeRole(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { role } = req.body;
    const result = await userService.changeUserRole(id, role);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed" });
  }
}