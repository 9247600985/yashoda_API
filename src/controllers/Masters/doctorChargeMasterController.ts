// ===== IMPORTS =====
import { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

// ===== CONTROLLER =====
export default class doctorChargeMasterController {
  private router: Router = Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);

    this.router.get("/getTariff",              authenticateToken, this.getTariff.bind(this));
    this.router.get("/getCountries",           authenticateToken, this.getCountries.bind(this));
    this.router.get("/getCurrency",            authenticateToken, this.getCurrency.bind(this));
    this.router.get("/getClinics",             authenticateToken, this.getClinics.bind(this));
    this.router.get("/getConsultationTypes",   authenticateToken, this.getConsultationTypes.bind(this));
    this.router.get("/getDoctorDetails",       authenticateToken, this.getDoctorDetails.bind(this));
    this.router.get("/getDoctorChargeList",    authenticateToken, this.getDoctorChargeList.bind(this));
    this.router.post("/getChargeDetails",      authenticateToken, this.getChargeDetails.bind(this));
    this.router.post("/saveDoctorCharges",     authenticateToken, this.saveDoctorCharges.bind(this));
  }

  // ===== API HANDLERS =====

  async getTariff(req: Request, res: Response): Promise<void> {
    const sql = `
      SELECT
        TARIFFID AS Code,
        TARIFFDESC AS Name
      FROM MST_TARIFFCATGORY
      WHERE STATUS = 'Active'
      ORDER BY TARIFFID
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
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

  async getCurrency(req: Request, res: Response): Promise<void> {
    const input = req.body || req.query;
    const Country_ID = input.Country_ID;

    const sql = `select CURRENCY from Mst_Country where Country_ID=@Country_ID`;
    const params = { Country_ID };
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getClinics(req: Request, res: Response): Promise<void> {
    const sql = `
      select
        ISNULL(USERID,'') as USERID,
        SHORTNAME, CLINIC_CODE, CLINIC_NAME, ADDRESS,
        COUNTRY, STATE, DISTRICT, CITY, EMAIL, PHONE,
        CONVERT(VARCHAR(10), CONTRACTSDATE, 103) StartDate,
        CONVERT(VARCHAR(10), CONTRACTEDATE, 103) EndDate,
        STATUS
      from TM_CLINICS
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
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

  async getDoctorDetails(req: Request, res: Response): Promise<void> {
    const sql = `select Code,Firstname from Mst_DoctorMaster where Status='A' order by Code`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getChargeDetails(req: Request, res: Response): Promise<void> {
    const { countryId, clinicId, tariffId, currency } = req.body;

    const sql = `SELECT * FROM Mst_ChargeSheet_TM WHERE CLNORGCODE = @clinicId AND TARIFFID = @tariffId AND COUNTRY_ID = @countryId AND CURRENCY = @currency`;
    const params = { clinicId, tariffId, countryId, currency };
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async saveDoctorCharges(req: Request, res: Response): Promise<void> {
    const doctors: any[] = req.body;

    if (!doctors || doctors.length === 0) {
      res.status(400).json({ status: 1, result: "No data provided" });
      return;
    }

    const { clinicId, tariffId, countryId, currency } = doctors[0];

    const deleteSql = `
      DELETE FROM Mst_ChargeSheet_TM
      WHERE CLNORGCODE = @clinicId
        AND TARIFFID   = @tariffId
        AND COUNTRY_ID = @countryId
        AND CURRENCY   = @currency
    `;

    const insertSql = `
      INSERT INTO Mst_ChargeSheet_TM (
        Doctor_ID, IP_FollowUp_Visits, IP_FollowUp_Days, Valid_Days, Valid_Visits,
        FollowUp_Days, FreeFollowUp_No, PaidFollowUp_No, NewVisit_Charge,
        PaidFollowUp_Charge, IPFollowUp_Charge, RevisionId,
        CLNORGCODE, TARIFFID, COUNTRY_ID, CURRENCY, cons_typeid
      ) VALUES (
        @doctorId, @ipVisits, @ipDays, @validDays, @validVisits,
        @freeDays, @freeVisits, @paidVisits, @newVisit,
        @paidFollowUp, @ipFollowUp, @revisionId,
        @clinicId, @tariffId, @countryId, @currency, @consType
      )
    `;

    try {
      await executeDbQuery(deleteSql, { clinicId, tariffId, countryId, currency });

      for (const d of doctors) {
        await executeDbQuery(insertSql, {
          doctorId:    d.doctorId,
          ipVisits:    d.ipVisits,
          ipDays:      d.ipDays,
          validDays:   d.validDays,
          validVisits: d.validVisits,
          freeDays:    d.freeDays,
          freeVisits:  d.freeVisits,
          paidVisits:  d.paidVisits,
          newVisit:    d.newVisit,
          paidFollowUp: d.paidFollowUp,
          ipFollowUp:  d.ipFollowUp,
          revisionId:  d.revisionId,
          clinicId:    d.clinicId,
          tariffId:    d.tariffId,
          countryId:   d.countryId,
          currency:    d.currency,
          consType:    d.consType,
        });
      }

      res.json({ status: 0, d: "Saved Successfully" });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getDoctorChargeList(req: Request, res: Response): Promise<void> {
    const { countryId, clinicId, tariffId, currency } = req.query as Record<string, string>;

    const sql = `
      SELECT
        Doctor_ID, IP_FollowUp_Visits, IP_FollowUp_Days, Valid_Days, Valid_Visits,
        FollowUp_Days, FreeFollowUp_No, PaidFollowUp_No, NewVisit_Charge,
        PaidFollowUp_Charge, Emergency_Charge, SpecialConsultation_Charge,
        CrossConsultation_Charge, GeneralOPD_Charge, CampConsultation_Charge,
        IPFollowUp_Charge, TeleConsultation_Charge, DoctorShare_Percentage, RevisionId
      FROM Mst_ChargeSheet_TM
      WHERE CLNORGCODE = @clinicId
        AND TARIFFID   = @tariffId
        AND COUNTRY_ID = @countryId
        AND CURRENCY   = @currency
      ORDER BY Doctor_ID
    `;
    const params = { clinicId, tariffId, countryId, currency };
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}
