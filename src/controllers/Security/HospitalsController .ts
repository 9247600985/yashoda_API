import express, { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class HospitalsController {

  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/hospitals", this.router);

    this.router.get("/getHospitals",    authenticateToken, this.getHospitals.bind(this));
    this.router.post("/insertHospital", authenticateToken, this.insertHospital.bind(this));
    this.router.put("/updateHospital",  authenticateToken, this.updateHospital.bind(this));
    this.router.put("/cancelHospital",  authenticateToken, this.cancelHospital.bind(this));
    this.router.get("/getCompCode",     authenticateToken, this.getCompCode.bind(this));
  }

  async getHospitals(req: Request, res: Response) {
    try {
      const { records } = await executeDbQuery(`
        SELECT Hospital_Id, HospitalName, Address, STATUS, Phone_No, AllowSMS
        FROM HospitalsList
        ORDER BY HospitalName
      `);

      const data = records.map((r: any) => ({
        CODE:     r.Hospital_Id,
        NAME:     r.HospitalName,
        ADDRESS1: r.Address   || '',
        ADDRESS2: r.Phone_No  || '',
        AllowSMS: r.AllowSMS  || '',
        STATUS:   r.STATUS === 'A' ? 'Active' : 'Inactive'
      }));

      res.json({ status: 0, d: data });
    } catch (error: any) {
      console.error("Error in getHospitals:", error);
      res.status(500).json({ status: 1, message: error.message || "Failed to fetch hospitals" });
    }
  }

  async insertHospital(req: Request, res: Response) {
    try {
      const d    = req.body;
      const user = (req as any).user?.userId || (req as any).user?.username || 'system';
      const s    = (val: any, len: number) => (val || '').toString().trim().substring(0, len);

      const HospitalId   = s(d.HospitalId,   12);
      const HospitalName = s(d.HospitalName, 50);
      const ShortName    = s(d.HospitalName,  3);
      const Phone_No     = s(d.Phone_No,     50);
      const Address      = s(d.Address,     200);
      const STATUS       = s(d.STATUS,        1);
      const AllowSMS     = s(d.AllowSMS,      1);

     
      const { records: dupCheck } = await executeDbQuery(`
        SELECT COUNT(*) as CNT FROM HospitalsList
        WHERE Hospital_Id = @HospitalId AND Address = @Address
      `, { HospitalId, Address });

      if (dupCheck[0]?.CNT > 0) {
        res.json({ status: 0, d: 0 });
        return;
      }

      
      await executeDbQuery(`
        INSERT INTO HospitalsList (
          Hospital_Id,
          HospitalName,
          SHORTNAME,
          Phone_No,
          Address,
          STATUS,
          AllowSMS
        ) VALUES (
          @HospitalId,
          @HospitalName,
          @ShortName,
          @Phone_No,
          @Address,
          @STATUS,
          @AllowSMS
        )
      `, { HospitalId, HospitalName, ShortName, Phone_No, Address, STATUS, AllowSMS });

     
      try {
        const { records: finYearRec } = await executeDbQuery(`
          SELECT FinYear FROM Mst_AccYear
          WHERE CurrentFinancialYear = 'y' AND OpenStatus = 'o'
        `, {});

        const FinYear = (finYearRec[0]?.FinYear || '').toString().trim();
        if (FinYear) {
          await executeDbQuery(`
            EXEC USB_CLINIC_DOCNO_INSERT @CLNORGCODE, @FINYEAR
          `, { CLNORGCODE: HospitalId, FINYEAR: FinYear });
        }
      } catch (spErr: any) {
        console.warn("USB_CLINIC_DOCNO_INSERT skipped:", spErr.message);
      }

      res.json({ status: 0, d: 1 });

    } catch (error: any) {
      console.error("Error in insertHospital:", error);
      res.status(500).json({ status: 1, message: error.message || "Failed to insert hospital" });
    }
  }

  async updateHospital(req: Request, res: Response) {
    try {
      const d = req.body;
      const s = (val: any, len: number) => (val || '').toString().trim().substring(0, len);

      await executeDbQuery(`
        UPDATE HospitalsList SET
          HospitalName = @HospitalName,
          SHORTNAME    = @ShortName,
          Phone_No     = @Phone_No,
          Address      = @Address,
          Status       = @STATUS,
          AllowSMS     = @AllowSMS
        WHERE Hospital_Id = @HospitalId
      `, {
        HospitalId:   s(d.HospitalId,   12),
        HospitalName: s(d.HospitalName, 50),
        ShortName:    s(d.HospitalName,  3),
        Phone_No:     s(d.Phone_No,     50),
        Address:      s(d.Address,     200),
        STATUS:       s(d.STATUS,        1),
        AllowSMS:     s(d.AllowSMS,      1),
      });

      res.json({ status: 0, d: 1 });
    } catch (error: any) {
      console.error("Error in updateHospital:", error);
      res.status(500).json({ status: 1, message: error.message || "Failed to update hospital" });
    }
  }

  async cancelHospital(req: Request, res: Response) {
    try {
      const HospitalId = (req.body.HospitalId || '').toString().trim().substring(0, 12);
      const STATUS     = (req.body.STATUS     || 'I').toString().trim().substring(0, 1);

      await executeDbQuery(`
        UPDATE HospitalsList SET Status = @STATUS
        WHERE Hospital_Id = @HospitalId
      `, { HospitalId, STATUS });

      res.json({ status: 0, d: 1 });
    } catch (error: any) {
      console.error("Error in cancelHospital:", error);
      res.status(500).json({ status: 1, message: error.message || "Failed to cancel hospital" });
    }
  }

  async getCompCode(req: Request, res: Response) {
    res.json({ status: 0, d: '' });
  }
}