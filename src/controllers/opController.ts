import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";

export default class opController {
  private router: Router = express.Router();

  constructor(private app: Application) {
    app.use("/api/op", this.router);

    this.router.post("/BillInsert", this.generateBillInsert.bind(this));
    
  }

  
  async generateBillInsert(req: Request, res: Response): Promise<void> {
    const input = req.body;
    
    const sql = `SELECT DosageId, DosageName, DosageCount, STATUS FROM INV_DOSAGEMST`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

  
}