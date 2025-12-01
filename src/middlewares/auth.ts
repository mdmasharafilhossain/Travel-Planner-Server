import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../config/jwt";
import { AppError } from "../utils/AppError";


export interface AuthRequest extends Request {
  user?: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || "tb_access"] || req.header("Authorization")?.replace("Bearer ", "");
    if (!token){ return next(AppError.unauthorized("No token provided"))
    } 
    const payload = verifyJwt(token);
    req.user = payload;
    return next();
  } catch (err) {
    return next(AppError.unauthorized("Invalid or expired token"));
  }
}

export function requireRole(role: "ADMIN" | "USER") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user){
        return next(AppError.unauthorized("Authentication required! No user found..."));
    }
    if (req.user.role !== role){
        
        return next(AppError.forbidden("Forbidden"));
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
 


 if (!req.user) {
    return next(AppError.unauthorized("Authentication required! No user found."));
  }

  if (!req.user.role) {
    return next(AppError.unauthorized("Invalid token payload: role missing"));
  }

  if (req.user.role !== "ADMIN") {
    return next(AppError.forbidden("Only admins can access this resource"));
  }

  next();
}
