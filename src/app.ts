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
import userDashboardRoutes from './modules/dashboard/userDashboard.routes'

const app = express();


app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const contentLength = req.headers["content-length"];
  const contentType = (req.headers["content-type"] || "").toLowerCase();


  if (method === "GET" || method === "HEAD") {
    req.body = {};
    return next();
  }

  if (contentLength === "0") {
    req.body = {};
    return next();
  }


  if (contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")) {
    return next();
  }


  if (!contentType) {
    req.body = {};
    return next();
  }


  if (contentType.includes("application/json")) {
    return express.json({ limit: "1mb" })(req, res, next);
  }

  return next();
});



app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(
  cors({
    origin:[ "http://localhost:3000","https://travel-planning-client.vercel.app"],
    credentials: true,
  })
);


app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/travel-plans", travelPlanRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/dashboard", userDashboardRoutes);


app.use(errorHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Travel Planning Website");
});

export default app;
