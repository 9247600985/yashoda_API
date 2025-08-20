import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";

export default class DosageController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/dosage", this.router);

    this.router.get("/", this.getAll.bind(this));
    this.router.get("/byid", this.getById.bind(this));
    this.router.post("/", this.create.bind(this));
    this.router.put("/", this.update.bind(this));
  }

  // GET ALL DOSAGES
  async getAll(req: Request, res: Response): Promise<void> {
    const sql = `SELECT DosageId, DosageName, DosageCount, STATUS FROM INV_DOSAGEMST`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

  // GET DOSAGE BY ID
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.query;
    const sql = `SELECT DosageId, DosageName, DosageCount, STATUS FROM INV_DOSAGEMST WHERE DosageId = @DosageId`;
    const params = { DosageId: id };

    try {
      const { records } = await executeDbQuery(sql, params, { query: sql, params });
      if (!records.length) {
        res.json({ status: 2, result: "No record found" });
        return;
      }
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

  // CREATE NEW DOSAGE (with duplicate check)
  async create(req: Request, res: Response): Promise<void> {
    const { DosageName, DosageCount, CREATED_BY, STATUS = "A" } = req.body;

    if (!DosageName) {
      res.json({ status: 1, result: "DosageName is required." });
      return;
    }

    const checkSql = `SELECT COUNT(1) as count FROM INV_DOSAGEMST WHERE DosageName = @DosageName`;
    const insertSql = `INSERT INTO INV_DOSAGEMST (DosageName, DosageCount, CREATED_BY, CREATED_ON, STATUS) VALUES (@DosageName, @DosageCount, @CREATED_BY, GETDATE(), @STATUS)`;
    const params = { DosageName, DosageCount, CREATED_BY, STATUS };

    try {
      // Check for duplicates
      const { records: checkRecords } = await executeDbQuery(checkSql, { DosageName });
      const exists = checkRecords[0]?.count > 0;

      if (exists) {
        res.json({ status: 1, result: "Duplicate record found. Insert aborted." });
        return;
      } 

      // Insert new record
      const { rowsAffected } = await executeDbQuery(insertSql, params);
      
      if (rowsAffected[0] === 1) {
        res.json({ status: 0, result: "Inserted successfully" });
      } else {
        res.json({ status: 1, result: "Insert failed" });
      }
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

  // UPDATE DOSAGE
  async update(req: Request, res: Response): Promise<void> {
    const { DosageId, DosageName, DosageCount, EDITED_BY, STATUS } = req.body;

    // Validate required fields
    if (!DosageId) {
      res.json({ status: 1, result: "DosageId are required." });
      return;
    }

    const sql = `UPDATE INV_DOSAGEMST SET DosageName = @DosageName, DosageCount = @DosageCount, EDITED_BY = @EDITED_BY, EDITED_ON = GETDATE(), STATUS = @STATUS WHERE DosageId = @DosageId`;

    const params = { DosageId, DosageName, DosageCount, EDITED_BY, STATUS };

    try {
      // First check if record exists
      const checkSql = `SELECT COUNT(1) as count FROM INV_DOSAGEMST WHERE DosageId = @DosageId`;
      const { records: checkRecords } = await executeDbQuery(checkSql, { DosageId });
      
      if (checkRecords[0]?.count === 0) {
        res.json({ status: 2, result: "No record found with provided DosageId" });
        return;
      }

      // Proceed with update
      const { rowsAffected } = await executeDbQuery(sql, params, { query: sql, params });

      if (rowsAffected[0] === 1) {
        res.json({ status: 0, result: "Updated successfully" });
      } else {
        res.json({ status: 1, result: "Update failed" });
      }
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }
}