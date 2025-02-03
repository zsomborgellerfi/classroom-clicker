import cors from "cors";
import express, { Express, Request, Response } from "express";

import adminRoutes from "./routes/admin";
// Add route imports
import authRoutes from "./routes/auth";
import studentRoutes from "./routes/student";
import teacherRoutes from "./routes/teacher";

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

// Basic health check route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
