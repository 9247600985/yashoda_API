// app.ts

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import DosageController from "./controllers/dosage";
import PatientQuries from "./controllers/PatientQuries";
import { logInfo } from "./utilities/logger";
import { conpool } from "./db";
import reportsController from "./controllers/reportsController";
import mastersController from "./controllers/mastersController";
import opController from "./controllers/opController";

const app: Application = express();

// Enable CORS for all routes
app.use(cors());

// Optional: Fine-tune CORS if needed

// app.use(cors({
//   origin: "http://localhost:53120", // Replace with your frontend URL
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true
// }));


// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logInfo(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Health check route
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const r = await conpool.request().query("SELECT 1 AS dbStatus");
    logInfo("Health check passed: DB Connected");
    res.status(200).json({ status: "OK, DB Connected", dbStatus: r.recordset[0].dbStatus });
  } catch (err: any) {
    logInfo(`Health check failed: ${err.message}`);
    res.status(500).json({ status: "FAIL", error: err.message });
  }
});

// Load API controllers
new DosageController(app);
new PatientQuries(app);
new reportsController(app);
new mastersController(app);
new opController(app);

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logInfo(`Unhandled Error on ${req.method} ${req.url}: ${err.message}`);
  res.status(500).json({ status: "error", message: err.message });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  logInfo(`Server is running on port ${PORT}`);
});
