import express, { Application, Request, Response, NextFunction, Router } from "express";
import cors from "cors";
import DosageController from "./controllers/dosage";
import PatientQuries from "./controllers/PatientQuries";
import reportsController from "./controllers/reportsController";
import mastersController from "./controllers/mastersController";
import opController from "./controllers/opController";
import numberGenController from "./controllers/numberGenController";
import { logInfo, logError } from "./utilities/logger";
import { conpool } from "./db";
import UserController from "./controllers/userController";

const app: Application = express();
const apiRouter: Router = Router();

// --- CORS ---
app.use(cors());

// --- Body Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Request Logger (runs once per request) ---
app.use((req: Request, _res: Response, next: NextFunction) => {
  logInfo(`${req.method} ${req.url}`);
  next();
});

// --- Health check ---
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await conpool;
    const r = await conpool.request().query("SELECT 1 AS dbStatus");
    res.status(200).json({
      status: "OK, DB Connected",
      dbStatus: r.recordset[0].dbStatus
    });
  } catch (err: any) {
    logError(`DB Connection FAIL: ${err.message}`);
    res.status(500).json({ status: "FAIL", error: err.message });
  }
});

// --- Controllers ---
new UserController(apiRouter);
new DosageController(apiRouter);
new PatientQuries(apiRouter);
new reportsController(apiRouter);
new mastersController(apiRouter);
new opController(apiRouter);
new numberGenController(apiRouter);

app.use("/api", apiRouter);

// --- Global Error Handler (only one) ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err); // Let Express handle it
  }
  logError(`Error on ${req.method} ${req.url}: ${err.message}`);
  res.status(500).json({ status: "error", message: err.message });
});

// --- Start server ---
const PORT = 3000;
app.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});