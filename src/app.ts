import express, { Request, Response } from "express";
import 'dotenv/config';
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/users/user.route'
import { errorHandler } from "./middlewares/errorHandler";
import travelPlanRoute from './modules/travelPlans/travelPlan.route'
import reviewRoute from './modules/reviews/review.routes'
import paymentRoute from './modules/payments/payment.route'

const app = express();

/* --------------------------------------------
   FIX: Guard middleware – handles JSON safely
---------------------------------------------- */
app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const contentLength = req.headers["content-length"];
  const contentType = (req.headers["content-type"] || "").toLowerCase();

  // GET / HEAD must NEVER try to parse JSON
  if (method === "GET" || method === "HEAD") {
    req.body = {};
    return next();
  }

  // Empty body → skip JSON parser
  if (contentLength === "0") {
    req.body = {};
    return next();
  }

  // Form or multipart → let urlencoded/multipart handle it
  if (contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")) {
    return next();
  }

  // No content-type → skip
  if (!contentType) {
    req.body = {};
    return next();
  }

  // Only parse when content-type is JSON AND non-empty body
  if (contentType.includes("application/json")) {
    return express.json({ limit: "1mb" })(req, res, next);
  }

  return next();
});

/* --------------------------------------------
   FIX: DO NOT add express.json() again ❌
   (this was causing the crash)
---------------------------------------------- */
// ❌ REMOVE this line:
// app.use(express.json());

app.use(express.urlencoded({ extended: true })); // for IPN + forms
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/travel-plans", travelPlanRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/payments", paymentRoute);

// Error handling
app.use(errorHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Portfolio Builder Website");
});

export default app;
