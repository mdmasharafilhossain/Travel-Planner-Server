import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, errors: err.format() });
      }
      next(err);
    }
  };
}
