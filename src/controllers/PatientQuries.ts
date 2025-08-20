import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
export default class PatientQuries{
    private router: Router = express.Router();

    constructor(private app: Router) {
      app.use("/PatientQuries", this.router); 
      
      // this.router.get("/getOPDetailsByMobile", this.getOPDetailsById.bind(this));
      // this.router.get("/getOPPHDetailsByMobile", this.getOPPHDetailsById.bind(this));
      this.router.post("/insertMachineData", this.InsertMachineData.bind(this));
      
    }


    async getOPDetailsByMobile(req: Request, res: Response): Promise<void> {
        const { Mobileno } = req.query;
        const sql = `SELECT CASE WHEN OP.BILLTYPE='OC' THEN 'CONSULTATION RECEIPT' WHEN  OP.BILLTYPE='OB' THEN 'INVESTIGATION RECEIPT' END AS RECEIPT_TYPE ,PM.PATIENT_NAME,PM.Mobile,PM.Age,PM.Gender,DM.Firstname AS DOCTOR,
        PM.PATIENTMR_NO AS MRNO,OP.BILLNO,OP.BILLDATE,ISNULL(BP.WHATSAPP_URL,'')  AS WHATSAPP_URL FROM OPD_BILLMST OP
        INNER JOIN PATIENT_MASTER PM ON PM.PATIENTMR_NO=OP.MEDRECNO
        INNER JOIN Mst_DoctorMaster DM ON DM.CODE=OP.DOCTCD
        INNER JOIN OPBILL_PRINT BP ON BP.TRANNO=OP.BILLNO
        WHERE PM.MOBILE like @Mobile
        ORDER BY OP.BILLTYPE`;
        const params = { Mobile:`%${Mobileno}%` };
    
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
      async getOPPHDetailsByMobile(req: Request, res: Response): Promise<void> {
        const { Mobileno } = req.query;
        const sql = `SELECT'PHARMACY RECEIPT' RECEIPT_TYPE ,PM.PATIENT_NAME,PM.Mobile,PM.Age,PM.Gender,DM.Firstname AS DOCTOR,
        PM.PATIENTMR_NO AS MRNO,OP.TRANNO,OP.TRANDATE,ISNULL(BP.WHATSAPP_URL,'')  AS WHATSAPP_URL  FROM INV_CASHSALEMST OP
        INNER JOIN PATIENT_MASTER PM ON PM.PATIENTMR_NO=OP.MEDRECNO
        INNER JOIN Mst_DoctorMaster DM ON DM.CODE=OP.PRESCBY
        INNER JOIN CASHSALE_PRINT BP ON BP.TRANNO=OP.TRANNO
        WHERE PM.MOBILE LIKE @Mobile`;
        const params = { Mobile: `%${Mobileno}%` };
    
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

      async InsertMachineData(req: Request, res: Response): Promise<void> {
        const { MACHINEID, SAMPLENO, TESTCODE, INVESTCODE, RESULT} = req.body;
       
        const insertSql = `INSERT INTO DGMCHRSLT (MACHINEID, SAMPLENO, TESTCODE, INVESTCODE, RESULT,RUNDATE,CREATEDON) VALUES (@MACHINEID,@SAMPLENO, @TESTCODE, @INVESTCODE, @RESULT, getdate(),getdate())`;
        const params = { MACHINEID, SAMPLENO, TESTCODE, INVESTCODE, RESULT };
    
        try {
        
    
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
}