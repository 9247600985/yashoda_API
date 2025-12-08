import express, { Application, Request, Response, NextFunction, Router } from "express";
import cors from "cors";
import DosageController from "./controllers/Masters/dosage";
import PatientQuries from "./controllers/PatientQuries";
import reportsController from "./controllers/Reports/reportsController";
import mastersController from "./controllers/Masters/mastersController";
import consultationController from "./controllers/OP/consultationController";
import numberGenController from "./controllers/Masters/numberGenController";
import { logInfo, logError } from "./utilities/logger";
import { conpool, getPool } from "./db";
import UserController from "./controllers/userController";
import investigationController from "./controllers/OP/investigationController";
import creditNoteController from "./controllers/OP/creditNoteController";
import dueCollectionController from "./controllers/OP/dueCollectionController";
import sampleCollectionController from "./controllers/Laboratory/sampleCollection";
import resultEntryController from "./controllers/Laboratory/resultEntry";
import accessRightsController from "./controllers/Security/accessRights";
import modulesController from "./controllers/Security/modules";
import rolesController from "./controllers/Security/roles";
import activitiesController from "./controllers/Security/activities";
import clinicToUserLinkController from "./controllers/Security/clinicToUserLink";


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

// -- Health check --
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();                
    const { recordset } = await pool.request().query("SELECT 1 AS dbStatus");
    res.status(200).json({ status: 0, message: "DB Connected", dbStatus: recordset[0].dbStatus, });
  } catch (err: any) {
    res.status(500).json({ status: 1, error: err.message });
  }
});


// --- Controllers ---
new UserController(apiRouter);
new DosageController(apiRouter);
new PatientQuries(apiRouter);
new reportsController(apiRouter);
new mastersController(apiRouter);
new numberGenController(apiRouter);
new consultationController(apiRouter);
new investigationController(apiRouter);
new creditNoteController(apiRouter);
new dueCollectionController(apiRouter);
new sampleCollectionController(apiRouter);
new resultEntryController(apiRouter);
new accessRightsController(apiRouter);
new modulesController(apiRouter);
new rolesController(apiRouter);
new activitiesController(apiRouter);
new clinicToUserLinkController(apiRouter);

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