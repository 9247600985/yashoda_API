import express, { Application, Request, Response, NextFunction, Router } from "express";
import cors from "cors";
import DosageController from "./controllers/dosage";
import PatientQuries from "./controllers/PatientQuries";
import { logInfo } from "./utilities/logger";
import { conpool } from "./db";
import reportsController from "./controllers/reportsController";
import mastersController from "./controllers/mastersController";
import opController from "./controllers/opController";
import numberGenController from "./controllers/numberGenController";

const app: Application = express();
const apiRouter: Router = Router(); // ✅ Correctly typed as Router

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

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logInfo(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await conpool;
    const r = await conpool.request().query("SELECT 1 AS dbStatus");
    res.status(200).json({ status: "OK, DB Connected", dbStatus: r.recordset[0].dbStatus });
  } catch (err: any) {
    res.status(500).json({ status: "FAIL", error: err.message });
  }
});

new DosageController(apiRouter);
new PatientQuries(apiRouter);
new reportsController(apiRouter);
new mastersController(apiRouter);
new opController(apiRouter);
new numberGenController(apiRouter);

// Mount all API routes under /api
app.use("/api", apiRouter);

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logInfo(`Unhandled Error on ${req.method} ${req.url}: ${err.message}`);
  res.status(500).json({ status: "error", message: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
  logInfo(`Server is running on port ${PORT}`);
});
