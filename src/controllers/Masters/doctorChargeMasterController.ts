import express, { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class doctorChargeMasterController {
  private router: Router = Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);
    this.router.get("/getTariff", authenticateToken, this.getTariff.bind(this));
    this.router.get("/getCountries",authenticateToken,this.getCountries.bind(this),);
    this.router.get("/getCurrency",authenticateToken,this.getCurrency.bind(this),);
    this.router.get("/getClinics", authenticateToken, this.getClinics.bind(this),);
    this.router.get("/getConsultationTypes", authenticateToken, this.getConsultationTypes.bind(this),);
  }


  async getConsultationTypes(req: Request, res: Response): Promise<void> {
    const sql = `SELECT CONS_TYPEID, CONS_TYPE FROM DOCTOR_CONSULTATIONTYPE WHERE STATUS = 'A' ORDER BY CONS_TYPE`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getClinics(req: Request, res: Response): Promise<void> {
    const sql = `select ISNULL(USERID,'')as USERID,SHORTNAME,CLINIC_CODE,CLINIC_NAME,ADDRESS,COUNTRY,STATE,DISTRICT,CITY,EMAIL,PHONE,CONVERT(VARCHAR(10),CONTRACTSDATE,103)StartDate,CONVERT(VARCHAR(10),CONTRACTEDATE,103)EndDate,STATUS from TM_CLINICS`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
  async getCurrency(req: Request, res: Response): Promise<void> {
    const input = req.body || req.query;
    const Country_ID = input.Country_ID;

    const sql = `select CURRENCY from Mst_Country where Country_ID=@Country_ID`;
    const params = {
      Country_ID: Country_ID,
    };
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
  async getTariff(req: Request, res: Response) {
    const sql = `
    SELECT 
      TARIFFID AS Code,
      TARIFFDESC AS Name
    FROM MST_TARIFFCATGORY
    WHERE STATUS = 'A'
    ORDER BY TARIFFID
  `;

    try {
      const { records } = await executeDbQuery(sql);

      res.json({
        status: 0,
        d: records,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        status: 1,
        message: err.message,
      });
    }
  }

  async getCountries(req: Request, res: Response): Promise<void> {
    const sql = `select Country_ID,Country_Name,STATUS from Mst_Country order by Country_Name`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
}
