import express, { Request, Response } from "express";
import 'dotenv/config';
import cors from "cors";
import cookieParser from "cookie-parser";
// import blogRoutes from './modules/blog/blog.routes'
import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/users/user.route'
import { errorHandler } from "./middlewares/errorHandler";
import travelPlanRoute from './modules/travelPlans/travelPlan.route'
// import aboutRoutes from './modules/about/about.route'
// import { errorHandler } from "./middleware/errorHandler";
// import { seedAdmin } from "./utils/seedAdmin";




 const app = express();
app.use(express.json());
app.use(cookieParser());
// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true
  })
);




// Routes
// app.use("/api/blogs", blogRoutes);
app.use('/api/auth', authRoutes);
// app.use('/api/projects', projectRoutes);
// app.use('/api/about', aboutRoutes);
// app.use("/api/auth", authRoute);
app.use("/api/users", userRoutes);
app.use("/api/travel-plans", travelPlanRoute);
// app.use("/api/reviews", reviewRoute);
// app.use("/api/payments", paymentRoute);



// seedAdmin()
// // Global error handling middleware
// app.use(errorHandler);
app.use(errorHandler);
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to Portfolio Builder Website');
});


export default app;