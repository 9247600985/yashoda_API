import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../db";
import sql, { Numeric, query } from "mssql";
import { VisitType, VisitTypeResponse, safeVal, PatSearchCriteria, PatientSearchObj, formatDate, safeNumber, RegistrationFee } from "./helpers";


export default class opController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/op", this.router);

    this.router.get("/Duplicate", this.Check_Duplicate.bind(this));
    this.router.get("/DuplicateDoctorPatcon", this.Check_DuplicateDoctorPatcon.bind(this));
    this.router.get("/DuplicateDoctorPatcon1", this.Check_DuplicateDoctorPatcon1.bind(this));
    this.router.get("/GetPaymentType1", this.GetPaymentType1.bind(this));
    this.router.get("/getFessOnDoctorCode", this.getFessOnDoctorCode.bind(this));
    this.router.get("/checkIpNo", this.checkIpNo.bind(this));
    this.router.get("/GetDoctCode", this.GetDoctCode.bind(this));
    this.router.get("/GetCONSBYDEPT", this.GetCONSBYDEPT.bind(this));
    this.router.get("/getDoctorDepartment", this.getDoctorDepartment.bind(this));
    this.router.get("/getTokenNo", this.getTokenNo.bind(this));
    this.router.get("/getFacilityDefaultValues", this.getFacilityDefaultValues.bind(this));
    this.router.get("/getPatientOtherDetails", this.getPatientOtherDetails.bind(this));
    this.router.get("/GetPaymentType", this.GetPaymentType.bind(this));
    this.router.get("/loadOPRefDocRefAgent", this.loadOPRefDocRefAgent.bind(this));
    this.router.get("/GetPATTYPE", this.GetPATTYPE.bind(this));
    this.router.put("/DOCTPATCON", this.updateDOCTPATCON.bind(this));
    this.router.put("/DOCTPATCON1", this.updateDOCTPATCON1.bind(this));
    this.router.put("/PatientMaster", this.updatePatientMaster.bind(this));
    this.router.post("/PatientMaster", this.savePatientMaster.bind(this));
    this.router.post("/Consultation", this.saveConsultation.bind(this));
    this.router.post("/BillInsert", this.generateBillInsert.bind(this));
    this.router.post("/DOCTPATCON", this.saveDOCTPATCON.bind(this));
    this.router.post("/getCurrentVisitType", this.getCurrentVisitType.bind(this));
    this.router.post("/getCurrentVisitType1", this.getCurrentVisitType1.bind(this));
    this.router.post("/getPatientList", this.getPatientList.bind(this));
    this.router.post("/setPatientDetails", this.setPatientDetails.bind(this));
    this.router.post("/getRegFee1", this.getRegFee1.bind(this));

  }

  async getCurrentVisitType(req: Request, res: Response): Promise<void> {
    // Small helpers
    const toInt = (v: any, def = 0) =>
      v === null || v === undefined || v === "" ? def : parseInt(v, 10);

    const formatYmd = (d?: Date | null) =>
      d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().substring(0, 10) : "";
    // Expecting body fields similar to your C# VisitType class:
    // { viewmode, TariffCode, HospitalId, DEPTCODE, mrno, consultationno, doctcode, IPFollowUp_Days }
    const vt = req.body || {};

    // Build MAIN query like C#
    const mainQuery =
      vt.viewmode === "false"
        ? ` select DP.VisitType,DP.CLNORGCODE,DP.DOCTCODE,DP.MEDRECNO,DP.VisitType DPVisitType,DP.VISITS,DP.FreeVisit, DP.PaidVisit ,MC.Valid_Days,DP.LASTVISITDATE,MC.FreeFollowUp_No,MC.PaidFollowUp_No,DP.PAIDCONSDATE,DP.EDITED_ON,dp.IPFollowUp_Visits,MC.IP_FollowUp_Visits,MC.IP_FollowUp_Days from OPD_DOCTPATCON DP ,Mst_ChargeSheet_TM MC WHERE DP.DOCTCODE = MC.Doctor_ID AND MC.TARIFFID=@TARIFFCODE AND MC.CLNORGCODE =@HospitalId AND DP.CLNORGCODE=@CLNORGCODE AND DP.MEDRECNO=@mrno AND  DP.DOCTCODE=@doctcode `

        : ` select CN.VISITTYPE,DP.CLNORGCODE,DP.DOCTCODE,DP.MEDRECNO,DP.VisitType DPVisitType,DP.VISITS,DP.FreeVisit, DP.PaidVisit ,MC.Valid_Days,DP.LASTVISITDATE,MC.FreeFollowUp_No,MC.PaidFollowUp_No,DP.PAIDCONSDATE,DP.EDITED_ON ,dp.IPFollowUp_Visits,MC.IP_FollowUp_Visits,MC.IP_FollowUp_Days from OPD_CONSULTATION CN LEFT  JOIN OPD_DOCTPATCON DP ON CN.DOCTCODE = DP.DOCTCODE LEFT  JOIN Mst_ChargeSheet_TM MC  ON DP.DOCTCODE = MC.Doctor_ID WHERE MC.TARIFFID=@TARIFFCODE AND MC.CLNORGCODE = @HospitalId AND DP.CLNORGCODE=@CLNORGCODE AND DP.MEDRECNO=@mrno AND  DP.DOCTCODE=@doctcode AND CN.OPDBILLNO=@consultationno `;

    // Other query texts (1: latest IP discharge date window, 2: follow-up counters block, 3: latest cons dates)
    const qLatestDisDate = `SELECT TOP 1 DISDATE FROM IPD_DISCHARGE WHERE IPNO IN (SELECT IPNO FROM IPD_ADMISSION WHERE ADMNDOCTOR = @doctcode AND MEDRECNO = @mrno AND CONVERT(varchar(10), DISCHRGDT, 120) >= DATEADD(D, -1*@IP_VISITDAYS, GETDATE())) `;

    const qLatestPaidConsDateForDept = `SELECT TOP 1 PAIDCONSDATE FROM OPD_DOCTPATCON WHERE DOCTCODE IN (SELECT code FROM Mst_DoctorMaster WHERE Department = @DEPTCODE AND CONSBYDEPT = 'Y' AND STATUS = 'A' ) AND MEDRECNO = @mrno ORDER BY PAIDCONSDATE DESC; `;

    const qLatestReceiptDateForNewVisit = `SELECT TOP 1 RECEIPTDATE FROM OPD_CONSULTATION WHERE MEDRECNO = @mrno AND DEPTCODE = @DEPTCODE AND STATUS !='c' AND VISITTYPE = '1' ORDER BY RECEIPTDATE DESC `;

    const qFreeFollowupCountSince = `SELECT COUNT(*) AS Cnt FROM OPD_CONSULTATION WHERE MEDRECNO = @mrno AND DEPTCODE = @DEPTCODE AND CONVERT(varchar(10), RECEIPTDATE, 120) >= @RCPTDATE AND VISITTYPE = '2' AND STATUS != 'C' `;

    const qPaidFollowupCountSince = ` SELECT COUNT(*) AS Cnt FROM OPD_CONSULTATION WHERE MEDRECNO = @mrno AND DEPTCODE = @DEPTCODE AND CONVERT(varchar(10), RECEIPTDATE, 120) >= @RCPTDATE AND VISITTYPE = '3' AND STATUS !='C'`;

    const qIPFollowupCountWindow = ` SELECT COUNT(*) AS Cnt FROM OPD_CONSULTATION WHERE MEDRECNO = @mrno AND DOCTCODE = @doctcode AND CONVERT(varchar(10), RECEIPTDATE, 120) > DATEADD(D, -1*@IP_VISITDAYS, GETDATE()) AND VISITTYPE = '4' AND STATUS <> 'C' `;

    // Shared params for main query
    const mainParams = {
      TARIFFCODE: vt.TariffCode,
      HospitalId: vt.HospitalId,
      CLNORGCODE: vt.HospitalId, // matches C#
      mrno: vt.mrno,
      DEPTCODE: vt.DEPTCODE,
      consultationno: vt.consultationno,
    };

    try {
      // 1) IP discharge window check (Dis_Date)
      const disParams = {
        doctcode: vt.doctcode,
        mrno: vt.mrno,
        IP_VISITDAYS: toInt(vt.IPFollowUp_Days, 0),
      };
      const disRes = await executeDbQuery(qLatestDisDate, disParams);
      const Dis_Date: string =
        disRes.records?.[0]?.DISDATE ? formatYmd(new Date(disRes.records[0].DISDATE)) : "";

      // 2) MAIN query
      const mainRes = await executeDbQuery(mainQuery, mainParams);
      const dt = mainRes.records || [];

      const results: Array<{
        visitype: string;
        IP_VISITS?: string;
        VISITS?: string;
        FreeVisit?: string;
        PaidVisit?: string;
        PAIDCONSDATE?: string;
      }> = [];

      // If no rows
      if (dt.length === 0) {
        if (Dis_Date !== "") {
          results.push({
            visitype: "4",
            IP_VISITS: "0", // C# uses IPFollowUp_Visits variable at this branch; there it was 0 unless computed in rows
          });
        } else {
          results.push({
            visitype: "1",
            VISITS: "0",
            FreeVisit: "0",
            PaidVisit: "0",
          });
        }

        // Return early like C# would (it returns list with one item)
        res.json({ d: results });

      }

      // 3) Rows exist — iterate like C#
      for (const row of dt) {
        const Valid_Days = toInt(row.Valid_Days, 0);
        const VISITS = toInt(row.VISITS, 0);
        const FreeVisit = toInt(row.FreeVisit, 0);
        const PaidVisit = toInt(row.PaidVisit, 0);
        const FreeFollowUp_No = toInt(row.FreeFollowUp_No, 0);
        const PaidFollowUp_No = toInt(row.PaidFollowUp_No, 0);
        const LASTVISITDATE = row.LASTVISITDATE ? new Date(row.LASTVISITDATE) : null;
        const PAIDCONSDATE = row.PAIDCONSDATE ? new Date(row.PAIDCONSDATE) : new Date("1900-01-01");
        const EDITED_ON = row.EDITED_ON ? new Date(row.EDITED_ON) : null;

        const IP_FollowUp_Days = toInt(row.IP_FollowUp_Days, 0);
        const IP_FollowUp_Visits = toInt(row.IP_FollowUp_Visits, 0);
        const ipVisitDays = toInt(vt.IPFollowUp_Days ?? IP_FollowUp_Days, 0);

        let visittype = "1";
        let visitype = "0";
        let CHKPAIDCONSDATE = "";
        let RCPTDATE = "";

        if (Dis_Date !== "") {
          // IP Follow-up branch
          const CHECKDATE = new Date(PAIDCONSDATE);
          CHECKDATE.setDate(CHECKDATE.getDate() + ipVisitDays);

          const CHKRCPTDATE = EDITED_ON ? formatYmd(EDITED_ON) : "";

          const ipCountRes = await executeDbQuery(qIPFollowupCountWindow, {
            mrno: vt.mrno,
            doctcode: vt.doctcode,
            IP_VISITDAYS: ipVisitDays,
          });
          const IPFOLLOWUP_COUNT = toInt(ipCountRes.records?.[0]?.Cnt, 0);

          if (IPFOLLOWUP_COUNT < IP_FollowUp_Visits) {
            results.push({
              visitype: "4",
              IP_VISITS: String(row.IPFollowUp_Visits ?? ""),
            });
          } else {
            const ipChk = formatYmd(PAIDCONSDATE);
            if (ipChk === "1900-01-01") {
              results.push({
                visitype: "1",
                VISITS: String(VISITS),
                FreeVisit: String(FreeVisit),
                PaidVisit: String(PaidVisit),
              });
            } else {
              // Need latest dept PAIDCONSDATE and latest RECEIPTDATE for new visits
              const paidConsRes = await executeDbQuery(qLatestPaidConsDateForDept, {
                DEPTCODE: vt.DEPTCODE,
                mrno: vt.mrno,
              });
              const consDate =
                paidConsRes.records?.[0]?.PAIDCONSDATE &&
                new Date(paidConsRes.records[0].PAIDCONSDATE);
              CHKPAIDCONSDATE = consDate ? formatYmd(consDate) : "";

              const latestNewVisitRes = await executeDbQuery(qLatestReceiptDateForNewVisit, {
                DEPTCODE: vt.DEPTCODE,
                mrno: vt.mrno,
              });
              const latestRcpt =
                latestNewVisitRes.records?.[0]?.RECEIPTDATE &&
                new Date(latestNewVisitRes.records[0].RECEIPTDATE);
              RCPTDATE = latestRcpt ? formatYmd(latestRcpt) : "";

              const freeCntRes = await executeDbQuery(qFreeFollowupCountSince, {
                DEPTCODE: vt.DEPTCODE,
                mrno: vt.mrno,
                RCPTDATE,
              });
              const Freefollowupcount = toInt(freeCntRes.records?.[0]?.Cnt, 0);

              const paidCntRes = await executeDbQuery(qPaidFollowupCountSince, {
                DEPTCODE: vt.DEPTCODE,
                mrno: vt.mrno,
                RCPTDATE,
              });
              const paidfollowupcount = toInt(paidCntRes.records?.[0]?.Cnt, 0);

              const nowYmd = new Date();
              const withinValid = nowYmd < new Date(CHECKDATE);

              if (Freefollowupcount < FreeFollowUp_No) {
                visittype = withinValid ? "2" : paidfollowupcount < PaidFollowUp_No && withinValid ? "3" : "1";
              } else if (paidfollowupcount < PaidFollowUp_No) {
                visittype = withinValid ? "3" : "1";
              } else {
                visittype = "1";
              }

              if (vt.viewmode === "true") {
                visittype = row.VISITTYPE ? String(row.VISITTYPE) : "1";
              }

              results.push({
                visitype,
                VISITS: String(VISITS),
                FreeVisit: String(FreeVisit),
                PaidVisit: String(PaidVisit),
                PAIDCONSDATE: CHKPAIDCONSDATE,
              });
            }
          }
        } else {
          // NON-IP branch (same pattern as C#)
          const CHECKDATE = new Date(PAIDCONSDATE);
          CHECKDATE.setDate(CHECKDATE.getDate() + Valid_Days);

          const paidConsRes = await executeDbQuery(qLatestPaidConsDateForDept, {
            DEPTCODE: vt.DEPTCODE,
            mrno: vt.mrno,
          });
          const consDate =
            paidConsRes.records?.[0]?.PAIDCONSDATE &&
            new Date(paidConsRes.records[0].PAIDCONSDATE);
          CHKPAIDCONSDATE = consDate ? formatYmd(consDate) : "";

          const latestNewVisitRes = await executeDbQuery(qLatestReceiptDateForNewVisit, {
            DEPTCODE: vt.DEPTCODE,
            mrno: vt.mrno,
          });
          const latestRcpt =
            latestNewVisitRes.records?.[0]?.RECEIPTDATE &&
            new Date(latestNewVisitRes.records[0].RECEIPTDATE);
          RCPTDATE = latestRcpt ? formatYmd(latestRcpt) : "";

          const freeCntRes = await executeDbQuery(qFreeFollowupCountSince, {
            DEPTCODE: vt.DEPTCODE,
            mrno: vt.mrno,
            RCPTDATE,
          });
          const Freefollowupcount = toInt(freeCntRes.records?.[0]?.Cnt, 0);

          const paidCntRes = await executeDbQuery(qPaidFollowupCountSince, {
            DEPTCODE: vt.DEPTCODE,
            mrno: vt.mrno,
            RCPTDATE,
          });
          const paidfollowupcount = toInt(paidCntRes.records?.[0]?.Cnt, 0);

          const nowYmd = new Date();
          const withinValid = nowYmd < CHECKDATE;

          if (Freefollowupcount < FreeFollowUp_No) {
            visittype = withinValid ? "2" : paidfollowupcount < PaidFollowUp_No && withinValid ? "3" : "1";
          } else if (paidfollowupcount < PaidFollowUp_No) {
            visittype = withinValid ? "3" : "1";
          } else {
            visittype = "1";
          }

          if (vt.viewmode === "true") {
            visittype = row.VISITTYPE ? String(row.VISITTYPE) : "1";
          }

          results.push({
            visitype,
            VISITS: String(VISITS),
            FreeVisit: String(FreeVisit),
            PaidVisit: String(PaidVisit),
            PAIDCONSDATE: CHKPAIDCONSDATE,
          });
        }
      }

      // Match ASP.NET PageMethod shape so your existing success handler works:
      // success: function(data) { for(...) data.d[i] ... }
      res.json({ status: 0, d: results });
    } catch (err: any) {
      // For parity with your other endpoints
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getCurrentVisitType1(req: Request, res: Response): Promise<void> {
    const input: VisitType = req.method === "GET" ? (req.query as any) : req.body;

    let query = "";
    if (input.viewmode === "false") {
      query = ` SELECT DP.VisitType, DP.CLNORGCODE, DP.DOCTCODE, DP.MEDRECNO, DP.VisitType AS DPVisitType, DP.VISITS, DP.FreeVisit, DP.PaidVisit, MC.Valid_Days, DP.LASTVISITDATE, MC.FreeFollowUp_No, MC.PaidFollowUp_No, DP.PAIDCONSDATE, DP.EDITED_ON, DP.IPFollowUp_Visits, MC.IP_FollowUp_Visits, MC.IP_FollowUp_Days FROM OPD_DOCTPATCON DP, Mst_ChargeSheet_TM MC WHERE DP.DOCTCODE = MC.Doctor_ID AND MC.TARIFFID=@TARIFFCODE AND MC.CLNORGCODE=@HospitalId AND DP.CLNORGCODE=@CLNORGCODE AND DP.MEDRECNO=@mrno AND DP.DOCTCODE=@doctcode
    `;
    } else {
      query = ` SELECT CN.VISITTYPE, DP.CLNORGCODE, DP.DOCTCODE, DP.MEDRECNO, DP.VisitType AS DPVisitType, DP.VISITS, DP.FreeVisit, DP.PaidVisit, MC.Valid_Days, DP.LASTVISITDATE, MC.FreeFollowUp_No, MC.PaidFollowUp_No, DP.PAIDCONSDATE, DP.EDITED_ON, DP.IPFollowUp_Visits, MC.IP_FollowUp_Visits, MC.IP_FollowUp_Days FROM OPD_CONSULTATION CN LEFT JOIN OPD_DOCTPATCON DP ON CN.DOCTCODE = DP.DOCTCODE LEFT JOIN Mst_ChargeSheet_TM MC ON DP.DOCTCODE = MC.Doctor_ID WHERE MC.TARIFFID=@TARIFFCODE AND MC.CLNORGCODE=@HospitalId AND DP.CLNORGCODE=@CLNORGCODE AND DP.MEDRECNO=@mrno AND DP.DOCTCODE=@doctcode AND CN.OPDBILLNO=@consultationno `;
    }

    try {
      const pool = await conpool.connect();

      // 🔹 Get Latest Discharge Date
      const disQry = ` SELECT TOP 1 DISDATE FROM IPD_DISCHARGE WHERE IPNO IN ( SELECT IPNO FROM IPD_ADMISSION WHERE ADMNDOCTOR=@doctcode AND MEDRECNO=@mrno AND CONVERT(varchar(10), DISCHRGDT,120) >= DATEADD(D,-1*@IP_VISITDAYS, GETDATE())) `;

      const disParams = {
        doctcode: input.doctcode,
        mrno: input.mrno,
        IP_VISITDAYS: input.IPFollowUp_Days,
      };

      const disRes = await executeDbQuery(disQry, disParams);
      const Dis_Date = disRes.records?.[0]?.DISDATE || "";

      // 🔹 Execute main query
      const mainParams = {
        TARIFFCODE: input.TariffCode,
        HospitalId: input.HospitalId,
        CLNORGCODE: input.HospitalId,
        mrno: input.mrno,
        doctcode: input.doctcode,
        DEPTCODE: input.DEPTCODE,
        consultationno: input.consultationno,
      };

      const mainRes = await executeDbQuery(query, mainParams);
      const dt = mainRes.records;
      const visityTypes: VisitTypeResponse[] = [];

      if (dt.length === 0) {
        if (Dis_Date !== "") {
          visityTypes.push({ visitype: "4", IP_VISITS: "0" });
        } else {
          visityTypes.push({
            visitype: "1",
            VISITS: "0",
            FreeVisit: "0",
            PaidVisit: "0",
          });
        }
        res.json({ status: 0, result: visityTypes });
        return;
      }

      for (const dr of dt) {
        const visits = safeVal(dr.VISITS, 0);
        const freevisits = safeVal(dr.FreeVisit, 0);
        const paidvisits = safeVal(dr.PaidVisit, 0);
        const freefolowup = safeVal(dr.FreeFollowUp_No, 0);
        const paidfollowup = safeVal(dr.PaidFollowUp_No, 0);
        const validDays = safeVal(dr.Valid_Days, 0);
        const PAIDCONSDATE = dr.PAIDCONSDATE ? new Date(dr.PAIDCONSDATE) : null;
        const RECEIPTDATE = dr.EDITED_ON ? new Date(dr.EDITED_ON) : null;
        const IP_FOLLOWUP_VISITS = safeVal(dr.IP_FollowUp_Visits, 0);

        let visittype = "1";
        let visitype = "0";

        // 🔹 Apply discharge logic
        if (Dis_Date !== "") {
          // Count IP followup consultations
          const ipParams = {
            doctcode: input.doctcode,
            mrno: input.mrno,
            IP_VISITDAYS: input.IPFollowUp_Days,
          };

          const ipRes = await executeDbQuery(`SELECT COUNT(*) AS CNT FROM OPD_CONSULTATION WHERE MEDRECNO=@mrno AND DOCTCODE=@doctcode AND CONVERT(varchar(10),RECEIPTDATE,120) > DATEADD(D,-1*@IP_VISITDAYS,GETDATE()) AND VISITTYPE='4' AND STATUS!='C' `,
            ipParams
          );

          const IPFOLLOWUP_COUNT = ipRes.records?.[0]?.CNT || 0;
          if (IPFOLLOWUP_COUNT < IP_FOLLOWUP_VISITS) {
            visityTypes.push({
              visitype: "4",
              IP_VISITS: dr.IPFollowUp_Visits?.toString(),
            });
            continue;
          }
        }

        // 🔹 Follow-up logic
        if (freevisits < freefolowup) {
          visittype = "2";
        } else if (paidvisits < paidfollowup) {
          visittype = "3";
        } else {
          visittype = "1";
        }

        // 🔹 Override in viewmode
        if (input.viewmode === "true") {
          visittype = dr.VISITTYPE ? dr.VISITTYPE.toString() : "1";
        }

        visityTypes.push({
          visitype,
          VISITS: visits.toString(),
          FreeVisit: freevisits.toString(),
          PaidVisit: paidvisits.toString(),
          PAIDCONSDATE: PAIDCONSDATE
            ? PAIDCONSDATE.toISOString().split("T")[0]
            : undefined,
        });
      }

      res.json({ status: 0, result: visityTypes });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getFessOnDoctorCode(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {
      let sql = `select NewVisit_Charge,PaidFollowUp_Charge,Emergency_Charge,SpecialConsultation_Charge ,CrossConsultation_Charge, GeneralOPD_Charge,DoctorShare_Percentage,Valid_Visits,FreeFollowUp_No,PaidFollowUp_No,IPFollowUp_Charge,IP_FollowUp_Visits,IP_FollowUp_Days from Mst_ChargeSheet_TM S `;

      if (input.CHKBLSRULES && input.CHKBLSRULES.length > 0) {
        sql += `, MST_COMPRULETRN C WHERE S.TARIFFID = C.TARIFFID`;
      } else {
        sql += ` WHERE 1=1`;
      }

      sql += ` AND S.TARIFFID = @tariffcd AND S.CLNORGCODE = @HospitalId AND S.COUNTRY_ID = @COUNTRY_ID`;

      if (input.DOCTCODE && input.DOCTCODE.length > 0) {
        sql += ` AND Doctor_ID = @doctcode`;
      }

      const params: any = { tariffcd: input.TARIFFID, HospitalId: input.CLNORGCODE, COUNTRY_ID: input.COUNTRY_ID, };

      if (input.DOCTCODE && input.DOCTCODE.length > 0) {
        params.doctcode = input.DOCTCODE;
      }

      const { records } = await executeDbQuery(sql, params);

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getPatientOtherDetails(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = ` SELECT mst.Guardian_Name, mst.Guardian_Relation, mst.Guardian_TeleCell, mst.Cr_Address1, mst.Cr_Address2, mst.Cr_Address3, mst.Cr_Pincode, mst.Cr_City, T.CityName, mst.Cr_Country, C.Country_Name, mst.Cr_State, S.State_Name, mst.Cr_District, D.District_Name, mst.Image_Name, mst.NATLCODE, mst.RELGCODE, mst.Blood_Group, mst.Marital_Status, mst.PatientType FROM Patient_Master MST LEFT JOIN Mst_Country C ON C.Country_ID = MST.Cr_Country LEFT JOIN Mst_District D ON D.District_ID = MST.Cr_District LEFT JOIN Mst_State S ON S.State_ID = MST.Cr_State LEFT JOIN Mst_City_Details T ON T.ID = MST.Cr_City WHERE PatientMr_No = @MRNO `;

    const params = { MRNO: input.PatientMrNo };

    try {
      const { records } = await executeDbQuery(sql, params);

      const details = records.map((dr: any) => {
        const imgpath = dr.Image_Name || "";
        let base64ImageRepresentation = "";

        // Optional: load base64 if file exists
        // if (imgpath) {
        //   const imageArray = fs.readFileSync(imgpath);
        //   base64ImageRepresentation = Buffer.from(imageArray).toString("base64");
        // }

        return {
          guardianname: dr.Guardian_Name || "",
          guardianrelation: dr.Guardian_Relation || "",
          guardianmobile: dr.Guardian_TeleCell || "",
          guardianaddress1: dr.Cr_Address1 || "",
          guardianaddress2: dr.Cr_Address2 || "",
          guardianaddress3: dr.Cr_Address3 || "",
          guardianpincode: dr.Cr_Pincode || "",
          guardiancityid: dr.Cr_City || "",
          guardiancityname: dr.CityName || "",
          guardiancountryid: dr.Cr_Country || "",
          guardiancountryname: dr.Country_Name || "",
          guardianstateid: dr.Cr_State || "",
          guardianstatename: dr.State_Name || "",
          guardiandistrictid: dr.Cr_District || "",
          guardiandistrictname: dr.District_Name || "",
          imagepath: base64ImageRepresentation
            ? `data:image/jpeg;base64,${base64ImageRepresentation}`
            : "",
          imagepathhiden: imgpath,
          Nationality: dr.NATLCODE || "",
          Religion: dr.RELGCODE || "",
          maritalstatus: dr.Marital_Status || "",
          bloodgroup: dr.Blood_Group || "",
          PatientType: dr.PatientType || ""
        };
      });

      res.json({ status: 0, result: details });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async loadOPRefDocRefAgent(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `Select pm.ReferralDoctoragent_ID,pm.ReferralDoctor_ID,Ref_FName,RefDoctor_FName from Patient_Master pm left join Mst_ReferralDoctor mrd on mrd.RefDoct_ID=pm.ReferralDoctor_ID left join Mst_ReferralAgents mra on mra.Ref_ID=pm.ReferralDoctoragent_ID where  (pm.PatientMr_No=@MRNO or pm.PatientMr_No=@OPNO)`;

    const params = { MRNO: input.mrno, OPNO: input.OPNO }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetPaymentType(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `select Payment_Type,* from Mst_PatientCategory where PC_Code=@PATCATGCD`;

    const params = { PATCATGCD: input.PatientCategory }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetPATTYPE(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `SELECT count(*) FROM OPD_DOCTPATCON WHERE MEDRECNO=@MEDRECNO`;

    const params = { MEDRECNO: input.MEDRECNO }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async checkIpNo(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `select count(*) AS AdmittedCount from ipd_admission where status='A' and medrecno=@MRNO `;

    const params = { MRNO: input.PatientMrNo }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getFacilityDefaultValues(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = ` select MST.CountryId,COALESCE(CN.Country_Name,'')Country_Name, MST.StateId,COALESCE(ST.State_Name,'') State_Name, MST.DistrictId,COALESCE(DS.District_Name ,'')District_Name, MST.CityId,MST.PC_CODE ,COALESCE(CT.CityName,'')CityName,OpBedCatId from Mst_FacilitySetup MST LEFT JOIN Mst_Country CN ON CN.Country_ID = MST.CountryId LEFT JOIN Mst_State ST ON ST.State_ID = MST.StateId LEFT JOIN Mst_District DS ON DS.District_ID=MST.DistrictId LEFT JOIN Mst_City_Details CT ON CT.ID=MST.CityId where MST.CLNORGCODE=@HOSPID`;

    const params = { HOSPID: input.HospitalId }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetDoctCode(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT DOCTCODE FROM OPD_CONSULTATION WHERE MEDRECNO=@MRNO AND OPDBILLNO=@BILLNO`;
    const params = { MRNO: input.PatientMrNo, BILLNO: input.BILLNO }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getDoctorDepartment(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `select DEP.CLNORGCODE, Dep.DEPTCODE,Dep.DEPTNAME,Doc.serviceCode,(select OPRegFeeServcode from Mst_FacilitySetup where CLNORGCODE=@HospitalId) OPRegFeeServcode, Doc.roomno from Mst_DoctorMaster Doc, Mst_Department Dep where Doc.Department = Dep.DEPTCODE and Doc.Code=@DOCTCODE `;
    const params = { HospitalId: input.HospitalId, DOCTCODE: input.DOCTCODE }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getTokenNo(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT GENTOKEN FROM OPD_DOCTTOKENNO WHERE DOCTCODE=@DOCTCD AND CLNORGCODE=@HOSPID AND CONVERT(VARCHAR(10),CONSDATE,120)=CONVERT(VARCHAR(10),GETDATE(),120) `;

    const params = { DOCTCODE: input.DOCTCODE, HOSPID: input.HospitalId }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetCONSBYDEPT(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `select CONSBYDEPT from  Mst_DoctorMaster where Status='A' and code=@DOCTCD`;
    const params = { DOCTCD: input.DOCTCODE }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetPaymentType1(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = ` SELECT PAYMENT_TYPE FROM MST_PATIENTCATEGORY WHERE PC_CODE=@CATGCD`;
    const params = { CATGCD: input.CATGCD }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async Check_Duplicate(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;


    let ddobjects: { idField: string }[] = [];
    let WhereCond = '';
    try {

      if (input.WhereCond) {
        WhereCond = input.WhereCond.replace(/&quot;/g, "'");
      }

      let query = ` SELECT COUNT(${input.checkonField}) as Cnt, ${input.checkonField} FROM ${input.TableName} WHERE 1=1 AND ${input.checkonField} = @checkValue `;

      if (WhereCond && WhereCond.trim().length > 0 && WhereCond.trim() !== "''") {

        if (!/=|>|<|LIKE/i.test(WhereCond)) {
          throw new Error(`Invalid WhereCond: ${WhereCond}`);
        }
        query += ` AND ${WhereCond}`;
      }

      query += ` GROUP BY ${input.checkonField} HAVING COUNT(${input.checkonField}) >= 1`;

      const { records } = await executeDbQuery(query, { checkValue: input.checkValue });

      for (const row of records) {
        ddobjects.push({ idField: row[input.checkonField] });
      }

      // res.json(ddobjects);
      res.json({ status: 0, result: ddobjects });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });

    }
  }

  async Check_DuplicateDoctorPatcon(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {

      let query = `SELECT DOCTCODE, MEDRECNO FROM OPD_DOCTPATCON WHERE MEDRECNO = @mrno AND DOCTCODE IN (SELECT code FROM Mst_DoctorMaster WHERE Status = 'A' AND CONSBYDEPT = 'Y' AND DOCTCODE=@Doctcd)`;

      const params = { mrno: input.mrno, Doctcd: input.Doctcd };

      const { records } = await executeDbQuery(query, params);

      res.json({ status: 0, result: records });

    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async Check_DuplicateDoctorPatcon1(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {

      let query = `SELECT DOCTCODE, MEDRECNO FROM OPD_DOCTPATCON WHERE MEDRECNO = @mrno AND DOCTCODE IN (SELECT code FROM Mst_DoctorMaster WHERE Status = 'A' AND CONSBYDEPT = 'Y' AND Department = @DEPTCODE)`;

      const params = { mrno: input.mrno, DEPTCODE: input.DEPTCODE };

      const { records } = await executeDbQuery(query, params);

      res.json({ status: 0, result: records });

    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async savePatientMaster(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const spName = input.pattype === "D"
        ? "Patient_Master_INSERT_DP"
        : "Patient_Master_INSERT";

      const sql = `
        DECLARE @MRNO VARCHAR(50);
        EXEC ${spName}
          @OPDNum = @OPDNum,
          @Patient_Name = @Patient_Name,
          @Age = @Age,
          @Occupation = @Occupation,
          @Blood_Group = @Blood_Group,
          @Telephone = @Telephone,
          @Mobile = @Mobile,
          @Work_NO = @Work_NO,
          @Email = @Email,
          @Patient_DOB = @Patient_DOB,
          @Gender = @Gender,
          @weight = @weight,
          @Height = @Height,
          @Marital_Status = @Marital_Status,
          @Address1 = @Address1,
          @Address2 = @Address2,
          @Address3 = @Address3,
          @PinCode = @PinCode,
          @Country = @Country,
          @State = @State,
          @District = @District,
          @Address = @Address,
          @Patient_Category_Id = @Patient_Category_Id,
          @EmgConct_Name = @EmgConct_Name,
          @EmgConct_Relation = @EmgConct_Relation,
          @EmgConct_TeleHome = @EmgConct_TeleHome,
          @EmgConct_TeleCell = @EmgConct_TeleCell,
          @Guardian_Name = @Guardian_Name,
          @Guardian_Relation = @Guardian_Relation,
          @Guardian_TeleHome = @Guardian_TeleHome,
          @Guardian_TeleCell = @Guardian_TeleCell,
          @Regd_No = @Regd_No,
          @Children_NO = @Children_NO,
          @Pregnancies_NO = @Pregnancies_NO,
          @Complaints = @Complaints,
          @Remarks = @Remarks,
          @City_Id = @City_Id,
          @Salutation = @Salutation,
          @Cr_Address1 = @Cr_Address1,
          @Cr_Address2 = @Cr_Address2,
          @Cr_Address3 = @Cr_Address3,
          @Cr_Pincode = @Cr_Pincode,
          @Cr_City = @Cr_City,
          @Cr_Country = @Cr_Country,
          @Cr_State = @Cr_State,
          @Cr_District = @Cr_District,
          @Doctor_Id = @Doctor_Id,
          @PatientType = @PatientType,
          @Comp_Id = @Comp_Id,
          @Cat_Id = @Cat_Id,
          @Relation = @Relation,
          @Status = @Status,
          @IPNO = @IPNO,
          @Tariff_Category = @Tariff_Category,
          @Consultation_Date = @Consultation_Date,
          @Department = @Department,
          @ReferralDoctor_ID = @ReferralDoctor_ID,
          @ReferralDoctoragent_ID = @ReferralDoctoragent_ID,
          @Meternity = @Meternity,
          @UniqueId = @UniqueId,
          @EmpIdCardNo = @EmpIdCardNo,
          @LetterNo = @LetterNo,
          @Limit = @Limit,
          @ValidDate = @ValidDate,
          @Image_Name = @Image_Name,
          @AppointmentNO = @AppointmentNO,
          @EXPDUEDATE = @EXPDUEDATE,
          @CLNORGCODE = @CLNORGCODE,
          @REVISIONID = @REVISIONID,
          @FirstName = @FirstName,
          @MiddleName = @MiddleName,
          @LastName = @LastName,
          @Doctot_ID2 = @Doctot_ID2,
          @Department2 = @Department2,
          @EmpId = @EmpId,
          @EmpName = @EmpName,
          @EmpRefType = @EmpRefType,
          @EmpDept = @EmpDept,
          @EmpDesgcode = @EmpDesgcode,
          @ReasonFor = @ReasonFor,
          @NATLCODE = @NATLCODE,
          @RELGCODE = @RELGCODE,
          @fathername = @fathername,
          @CREATED_BY = @CREATED_BY,
          @CREATED_ON = @CREATED_ON,
          @EDITED_BY = @EDITED_BY,
          @EDITED_ON = @EDITED_ON,
          @MEDRECNO = @MRNO OUTPUT;

        SELECT @MRNO AS MRNO, @OPDNum AS OPREGNO;
        `;

      const params = {
        OPDNum: input.OPDNum,
        Patient_Name: input.patname,
        Age: input.age,
        Occupation: null,
        Blood_Group: input.bloodgroup,
        Telephone: input.telphone,
        Mobile: input.mobile,
        Work_NO: input.work,
        Email: input.email,
        Patient_DOB: input.dob || null,
        Gender: input.gender,
        weight: input.weight?.length ? input.weight : 0,
        Height: input.hieght?.length ? input.hieght : 0,
        Marital_Status: input.maritalstatus,
        Address1: input.address1,
        Address2: input.address2,
        Address3: input.address3,
        PinCode: input.pincode,
        Country: input.countryid,
        State: input.stateid,
        District: input.districtid,
        Address: ``,
        // Address: `${input.address1} ${input.address2} ${input.address3}`,
        Patient_Category_Id: input.patcatid,
        EmgConct_Name: null,
        EmgConct_Relation: null,
        EmgConct_TeleHome: null,
        EmgConct_TeleCell: null,
        Guardian_Name: input.guardianname,
        Guardian_Relation: input.guardianrelation,
        Guardian_TeleHome: null,
        Guardian_TeleCell: input.guardianmobile,
        Regd_No: null,
        Children_NO: null,
        Pregnancies_NO: null,
        Complaints: null,
        Remarks: null,
        City_Id: input.cityid,
        Salutation: input.patsalutationid,
        Cr_Address1: input.guardianaddress1,
        Cr_Address2: input.guardianaddress2,
        Cr_Address3: input.guardianaddress3,
        Cr_Pincode: input.guardianpincode,
        Cr_City: input.guardiancityid,
        Cr_Country: input.guardiancountryid,
        Cr_State: input.guardianstateid,
        Cr_District: input.guardiandistrictid,
        Doctor_Id: input.doctcd,
        PatientType: input.pattype,
        Comp_Id: input.compid,
        Cat_Id: input.patcatid,
        Relation: input.guardianrelation,
        Status: input.pattype,
        IPNO: null,
        Tariff_Category: input.tarifcatid,
        Consultation_Date: null,
        Department: input.departmentid,
        ReferralDoctor_ID: input.refdoctcd,
        ReferralDoctoragent_ID: input.ReferralAgent_ID,
        Meternity: input.maritalstatus,
        UniqueId: input.uniqueid,
        EmpIdCardNo: input.empidcardno,
        LetterNo: input.letterno,
        Limit: input.limit,
        ValidDate: input.validdate || null,
        Image_Name: input.imagepath
          ? `/PatientImages/${input.imagepath}`
          : null,
        AppointmentNO: null,
        EXPDUEDATE: null,
        REVISIONID: null,
        FirstName: input.firstname,
        MiddleName: input.middlename,
        LastName: input.lastname,
        Doctot_ID2: null,
        Department2: null,
        EmpId: input.empid,
        EmpName: input.empname,
        EmpRefType: input.empreftype,
        EmpDept: input.empdeptid,
        EmpDesgcode: input.empdesgcd,
        ReasonFor: null,
        NATLCODE: input.Nationality,
        RELGCODE: input.Religion,
        fathername: input.fathername,
        CREATED_BY: input.userId,
        CREATED_ON: input.Crated_On,
        CLNORGCODE: input.hospitalId,
        EDITED_BY: null,
        EDITED_ON: null
      };

      const { records } = await executeDbQuery(sql, params, {
        transaction: transaction,
        query: `EXEC ${spName}`,
        params: params
      });

      await transaction.commit();

      if (records?.length) {
        const { MRNO } = records[0];
        res.status(200).json({ status: 0, MRNO: MRNO, OPNO: input.OPDNum });
      } else {
        res.status(200).json({ status: 1, message: "No data returned from SP" });

      }
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async saveConsultation(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Get session values
      const sessionCounterID = input.CounterId || '';
      const sessionUID = input.userId || '';

      // Step 1: Call OPD_CONSULTATION_INSERT
      const sp1Name = "OPD_CONSULTATION_INSERT";
      const sp1Params = {
        OPDREGNO: input.OPNum,
        CLNORGCODE: input.CLNORGCODE,
        FINYEAR: input.FINYEAR,
        COUNTERNO: input.COUNTERNO || sessionCounterID,
        CONSULTNO: input.CONSULTNO,
        OPDBILLNO: input.OPDBILLNO,
        RECEIPTNO: input.RECEIPTNO,
        RECEIPTDATE: input.RECEIPTDATE,
        MEDRECNO: input.MEDRECNO,
        AGE: input.AGE,
        DOCTCODE: input.DOCTCODE,
        DEPTCODE: input.DEPTCODE,
        REFHOSP: input.REFHOSP,
        REFDOCT: input.REFDOCT,
        REMARKS: input.REMARKS,
        SPLTICKET: input.SPLTICKET,
        TELBOOKING: input.TELBOOKING,
        REGFEE: parseFloat(input.REGFEE) || 0,
        CONSFEE: parseFloat(input.CONSFEE) || 0,
        TELBKGFEE: parseFloat(input.TELBKGFEE) || 0,
        SPLTICKFEE: parseFloat(input.SPLTICKFEE) || 0,
        OTHRCHRG: parseFloat(input.OTHRCHRG) || 0,
        TOTALAMT: parseFloat(input.TOTALAMT) || 0,
        DISCPER: parseFloat(input.DISCPER) || 0,
        DISCAMT: parseFloat(input.DISCAMT) || 0,
        NETAMT: parseFloat(input.NETAMT) || 0,
        PAIDAMT: parseFloat(input.PAIDAMT) || 0,
        RECEIVEDAMT: parseFloat(input.RECEIVEDAMT) || 0,
        HOSPSHARE: parseFloat(input.HOSPSHARE) || 0,
        DOCTSHARE: parseFloat(input.DOCTSHARE) || 0,
        ORGDOCSHAR: parseFloat(input.ORGDOCSHAR) || 0,
        CONSPATAMT: parseFloat(input.CONSPATAMT) || 0,
        CONSCOMPAMT: parseFloat(input.CONSCOMPAMT) || 0,
        PATTYPE: input.PATTYPE,
        PATCATG: input.PATCATG,
        TARIFFID: input.TARIFFID,
        PAYMODE: input.PAYMODE,
        BOOKFEE: parseFloat(input.BOOKFEE) || 0,
        CASETYPECD: input.CASETYPECD,
        CONSTYPE: input.CONSTYPE,
        CONSDATE: input.CONSDATE,
        REFFERENCE: input.REFFERENCE,
        CONSCATG: input.CONSCATG,
        CASPPRISDT: input.CASPPRISDT,
        CASPPRRTDT: input.CASPPRRTDT,
        POSTFLAG: input.POSTFLAG,
        AMTPAID: input.AMTPAID,
        EMPID: input.EMPID,
        ADVBKDYN: input.ADVBKDYN,
        ADVAMT: parseFloat(input.ADVAMT) || 0,
        TOKENNO: parseFloat(input.TOKENNO) || 0,
        LASTCONSLT: input.LASTCONSLT,
        VISITFEE: parseFloat(input.VISITFEE) || 0,
        BOOKINGFEE: parseFloat(input.BOOKINGFEE) || 0,
        DIVISION: input.DIVISION,
        CLINICCODE: input.CLINICCODE,
        DISCSLNO: input.DISCSLNO,
        FUNDSOURCE: input.FUNDSOURCE,
        COMPCODE: input.COMPCODE,
        CRDEMPID: input.CRDEMPID,
        LETTERNO: input.LETTERNO,
        CARDLIMIT: parseFloat(input.CARDLIMIT) || 0,
        RELATION: input.RELATION,
        RCVDCOUNTR: input.RCVDCOUNTR,
        RECEIVEDBY: input.RECEIVEDBY,
        RECEIVEDON: input.RECEIVEDON,
        CONSAUTHBY: input.CONSAUTHBY,
        CREDAUTHBY: input.CREDAUTHBY,
        DISCAUTHBY: input.DISCAUTHBY,
        ADVADJAMT: input.ADVADJAMT,
        TRANCODE: input.TRANCODE,
        MATERNITY: input.MATERNITY,
        EXPDUEDATE: input.EXPDUEDATE,
        CASPPRSTS: input.CASPPRSTS,
        VISITTYPE: input.VISITTYPE,
        SHAREDOCT: input.SHAREDOCT,
        HOSPNCASE: input.HOSPNCASE,
        DOCTNCASE: input.DOCTNCASE,
        DEPTYPE: input.DEPTYPE,
        ALLWCASHYN: input.ALLWCASHYN,
        SNCTPRFYN: input.SNCTPRFYN,
        SNCTPROOF: input.SNCTPROOF,
        CREATED_BY: sessionUID,
        CREATED_ON: input.Crated_On,
        EDITED_BY: input.EDITED_BY || '',
        EDITED_ON: input.EDITED_ON || '',
        STATUS: input.STATUS,
        Duedate: input.Duedate,
        ChequeNo: input.ChequeNo,
        DrawnOn: input.BANKNAME,
        PayDate: input.PayDate,
        AppointmentNO: input.AppointmentNO,
        REVISIONID: input.REVISIONID,
        CalledYN: input.CalledYN,
        InProcessYN: input.InProcessYN,
        ClosedYN: input.ClosedYN,
        CalledTime: input.CalledTime,
        InprocessTime: input.InprocessTime,
        ClosedTime: input.ClosedTime,
        MLC: input.MLC,
        DISCOUNTON: input.DISCOUNTON
      };

      const sp1Query = `EXEC ${sp1Name} 
            @OPDREGNO, @CLNORGCODE, @FINYEAR, @COUNTERNO, @CONSULTNO, @OPDBILLNO, @RECEIPTNO, @RECEIPTDATE, 
            @MEDRECNO, @AGE, @DOCTCODE, @DEPTCODE, @REFHOSP, @REFDOCT, @REMARKS, @SPLTICKET, @TELBOOKING, 
            @REGFEE, @CONSFEE, @TELBKGFEE, @SPLTICKFEE, @OTHRCHRG, @TOTALAMT, @DISCPER, @DISCAMT, @NETAMT, 
            @PAIDAMT, @RECEIVEDAMT, @HOSPSHARE, @DOCTSHARE, @ORGDOCSHAR, @CONSPATAMT, @CONSCOMPAMT, @PATTYPE, 
            @PATCATG, @TARIFFID, @PAYMODE, @BOOKFEE, @CASETYPECD, @CONSTYPE, @CONSDATE, @REFFERENCE, @CONSCATG, 
            @CASPPRISDT, @CASPPRRTDT, @POSTFLAG, @AMTPAID, @EMPID, @ADVBKDYN, @ADVAMT, @TOKENNO, @LASTCONSLT, 
            @VISITFEE, @BOOKINGFEE, @DIVISION, @CLINICCODE, @DISCSLNO, @FUNDSOURCE, @COMPCODE, @CRDEMPID, 
            @LETTERNO, @CARDLIMIT, @RELATION, @RCVDCOUNTR, @RECEIVEDBY, @RECEIVEDON, @CONSAUTHBY, @CREDAUTHBY, 
            @DISCAUTHBY, @ADVADJAMT, @TRANCODE, @MATERNITY, @EXPDUEDATE, @CASPPRSTS, @VISITTYPE, @SHAREDOCT, 
            @HOSPNCASE, @DOCTNCASE, @DEPTYPE, @ALLWCASHYN, @SNCTPRFYN, @SNCTPROOF, @CREATED_BY, @CREATED_ON, 
            @EDITED_BY, @EDITED_ON, @STATUS, @Duedate, @ChequeNo, @DrawnOn, @PayDate, @AppointmentNO, @REVISIONID, 
            @CalledYN, @InProcessYN, @ClosedYN, @CalledTime, @InprocessTime, @ClosedTime, @MLC, @DISCOUNTON`;

      await executeDbQuery(sp1Query, sp1Params, { transaction });

      // Step 2: Insert into TM_APPOINTMENTS if AppointmentNO is empty
      if (!input.AppointmentNO) {
        const appQuery = `
                INSERT INTO TM_APPOINTMENTS(CLNORGCODE, FINYEAR, TRNUMBER, MOBILE, DOCTCODE, APPOINTMENTNO, APPOINTMENTDATE, APPOINTMENTTIME,
                CONSTYPE, VISITTYPE, VISITAMOUNT, VISITSTATUS, CREATED_BY, CREATED_ON, STATUS, VISIT, AP_TYPE, CONSULTED, VERIFIED_YN)
                VALUES(@CLNORGCODE, (SELECT finyear FROM Mst_AccYear WHERE UPPER(OpenStatus)='O' AND UPPER(CurrentFinancialYear)='Y' AND CLNORGCODE=@CLNORGCODE),
                @MEDRECNO, @MOBILENO, @DOCTCODE, @OPDBILLNO, GETDATE(), GETDATE(),
                @CONSTYPE, @PATTYPE, @TOTALAMT, 'Paid', @UID, GETDATE(), '1', @VISITTYPE, 'C', 'Y', 'N')
            `;

        const appParams = {
          CLNORGCODE: input.CLNORGCODE,
          MEDRECNO: input.MEDRECNO,
          MOBILENO: '91' + input.MOBILENO,
          DOCTCODE: input.DOCTCODE,
          OPDBILLNO: input.OPDBILLNO,
          CONSTYPE: '00' + input.CONSTYPE,
          PATTYPE: input.PATTYPE,
          TOTALAMT: input.TOTALAMT,
          UID: sessionUID,
          VISITTYPE: input.VISITTYPE
        };

        await executeDbQuery(appQuery, appParams, { transaction });
      }

      // Step 3: Check OPD_DOCTPATCON
      const checkQuery = `
            SELECT DOCTCODE, MEDRECNO FROM OPD_DOCTPATCON
            WHERE MEDRECNO=@MEDRECNO AND DOCTCODE=@DOCTCODE
        `;
      const checkParams = {
        MEDRECNO: input.MEDRECNO,
        DOCTCODE: input.DOCTCODE
      };
      const { records: checkResult } = await executeDbQuery(checkQuery, checkParams, { transaction });

      // Step 4: Call OPD_BILLMST_INSERT
      const sp2Name = "OPD_BILLMST_INSERT";
      const sp2Params = {
        CLNORGCODE: input.CLNORGCODE,
        FINYEAR: input.FINYEAR,
        CASHCOUNTER: input.CASHCOUNTER || sessionCounterID,
        BILLTYPE: input.BILLTYPE,
        BILLNO: input.OPDBILLNO,
        BEDCATGCD: input.BEDCATGCD,
        RCPTNO: input.RECEIPTNO,
        OPREGNO: input.OPNum,
        MEDRECNO: input.MEDRECNO,
        BILLDATE: input.BILLDATE,
        SALUTNCODE: input.SALUTNCODE,
        PATNAME: input.PATNAME,
        PATFNAME: input.PATFNAME,
        PATMNAME: input.PATMNAME,
        PATLNAME: input.PATLNAME,
        PATSURNAME: input.PATSURNAME,
        AGE: input.AGE,
        SEX: input.SEX,
        ADDRESS1: input.ADDRESS1,
        ADDRESS2: input.ADDRESS2,
        ADDRESS3: input.ADDRESS3,
        CITYCODE: input.CITYCODE,
        DISTRICTCODE: input.DISTRICTCODE,
        STATECODE: input.STATECODE,
        COUNTRYCODE: input.COUNTRYCODE,
        PINCODE: input.PINCODE,
        MOBILENO: input.MOBILENO,
        PAYMODE: input.PAYMODE,
        CHEQUEDDNO: input.ChequeNo,
        CHEQUEDATE: input.CHEQUEDATE,
        BANKNAME: input.BANKNAME,
        REMARKS: input.REMARKS,
        REFBILLNO: input.REFBILLNO,
        REFDOCTCD: input.REFDOCTCD,
        DOCTCD: input.DOCTCD,
        CRDCOMPCD: input.CRDCOMPCD,
        LETTERNO: input.LETTERNO,
        VALIDUPTO: input.VALIDUPTO,
        DISPNO: input.DISPNO,
        DISPDATE: input.DISPDATE,
        TOKENNO: parseFloat(input.TOKENNO) || 0,
        TARIFFID: input.TARIFFID,
        TOTCOVAMT: parseFloat(input.TOTCOVAMT) || 0,
        TOTUNCOVAMT: parseFloat(input.TOTUNCOVAMT) || 0,
        TOTSERVAMT: parseFloat(input.TOTSERVAMT) || 0,
        PATBILLAMT: parseFloat(input.PATBILLAMT) || 0,
        PATDISCUNT: parseFloat(input.PATDISCUNT) || 0,
        PATAMTPAID: parseFloat(input.PATAMTPAID) || 0,
        PATAMTRCVD: parseFloat(input.PATAMTRCVD) || 0,
        PATCNAMT: parseFloat(input.PATCNAMT) || 0,
        PATRFNDAMT: parseFloat(input.PATRFNDAMT) || 0,
        COMBILLAMT: parseFloat(input.COMBILLAMT) || 0,
        COMDISCUNT: parseFloat(input.COMDISCUNT) || 0,
        COMAMTPAID: parseFloat(input.COMAMTPAID) || 0,
        COMAMTRCVD: parseFloat(input.COMAMTRCVD) || 0,
        COMCNAMT: parseFloat(input.COMCNAMT) || 0,
        COMRFNDAMT: parseFloat(input.COMRFNDAMT) || 0,
        CREDAUTHBY: input.CREDAUTHBY,
        DISCAUTHBY: input.DISCAUTHBY,
        BILLSTAT: input.BILLSTAT,
        DRAWNON: input.BANKNAME,
        PATCATG: input.PATCATG,
        CONSCATG: input.CONSCATG,
        EMPID: input.EMPID,
        EMPCODE: input.EMPCODE,
        CLINICCODE: input.CLINICCODE,
        FUNDSOURCE: input.FUNDSOURCE,
        DEPTCODE: input.DEPTCODE,
        OPCONSNO: input.OPCONSNO,
        OPCONSAMT: parseFloat(input.OPCONSAMT) || 0,
        OPREGFEE: parseFloat(input.OPREGFEE) || 0,
        COMPRCPT: input.COMPRCPT,
        POSTFLAG: input.POSTFLAG,
        NETAMOUNT: parseFloat(input.NETAMOUNT) || 0,
        AMOUNTPAID: parseFloat(input.AMOUNTPAID) || 0,
        AMOUNTRCVD: parseFloat(input.AMOUNTRCVD) || 0,
        CNAMOUNT: parseFloat(input.CNAMOUNT) || 0,
        RFNDAMOUNT: parseFloat(input.RFNDAMOUNT) || 0,
        TOTDISCOUNT: parseFloat(input.TOTDISCOUNT) || 0,
        TOTALBILLAMT: parseFloat(input.TOTALBILLAMT) || 0,
        ADDR4: input.ADDR4,
        ADDR5: input.ADDR5,
        CASETYPE: input.CASETYPE,
        AUTHTRANID: input.AUTHTRANID,
        REQUESTNO: input.REQUESTNO,
        CASHCOLL: input.CASHCOLL,
        EXMPTNO: input.EXMPTNO,
        ADVADJAMT: parseFloat(input.ADVADJAMT) || 0,
        TRANCODE: input.TRANCODE,
        SCROLLNO: input.SCROLLNO,
        EMERGENCYN: input.EMERGENCYN,
        PATPHONE: input.PATPHONE,
        COMPSTATUS: input.COMPSTATUS,
        DISALOWAMT: parseFloat(input.DISALOWAMT) || 0,
        BILLSOURCE: input.BILLSOURCE,
        MATERNYN: input.MATERNYN,
        EXPDUEDATE: input.EXPDUEDATE,
        IPNO: input.IPNO,
        WRITOFFAMT: parseFloat(input.WRITOFFAMT) || 0,
        TAXAMT: parseFloat(input.TAXAMT) || 0,
        OTEXPENTYN: input.OTEXPENTYN,
        TOTSRVTAX: parseFloat(input.TOTSRVTAX) || 0,
        SERVTAXON: parseFloat(input.SERVTAXON) || 0,
        SRVTAXAMT: parseFloat(input.SRVTAXAMT) || 0,
        EDUCESAMT: parseFloat(input.EDUCESAMT) || 0,
        SHECESAMT: parseFloat(input.SHECESAMT) || 0,
        DEPTYPE: input.DEPTYPE,
        INSCOMPCD: input.INSCOMPCD,
        INTLUPLDYN: input.INTLUPLDYN,
        ALLWCASHYN: input.ALLWCASHYN,
        SNCTPRFYN: input.SNCTPRFYN,
        SNCTPROOF: input.SNCTPROOF,
        PISUID: input.PISUID,
        PISPWD: input.PISPWD,
        DOCTPOST: input.DOCTPOST,
        LEDGPOST: input.LEDGPOST,
        POSTDATE: input.POSTDATE,
        CREATED_BY: sessionUID,
        CREATED_ON: input.Crated_On,
        EDITED_BY: input.EDITED_BY || '',
        EDITED_ON: input.EDITED_ON || '',
        CANCELDBY: input.CANCELDBY,
        CANCELDON: input.CANCELDON,
        STATUS: input.STATUS,
        CONSTYPE: input.CONSTYPE,
        WardNo: input.WardNo,
        BedNO: input.BedNO,
        RevisionId: input.REVISIONID,
        ReferralAgent: input.ReferralAgent
      };

      const sp2Query = `EXEC ${sp2Name} 
            @CLNORGCODE, @FINYEAR, @CASHCOUNTER, @BILLTYPE, @BILLNO, @BEDCATGCD, @RCPTNO, @OPREGNO, 
            @MEDRECNO, @BILLDATE, @SALUTNCODE, @PATNAME, @PATFNAME, @PATMNAME, @PATLNAME, @PATSURNAME, 
            @AGE, @SEX, @ADDRESS1, @ADDRESS2, @ADDRESS3, @CITYCODE, @DISTRICTCODE, @STATECODE, @COUNTRYCODE, 
            @PINCODE, @MOBILENO, @PAYMODE, @CHEQUEDDNO, @CHEQUEDATE, @BANKNAME, @REMARKS, @REFBILLNO, 
            @REFDOCTCD, @DOCTCD, @CRDCOMPCD, @LETTERNO, @VALIDUPTO, @DISPNO, @DISPDATE, @TOKENNO, @TARIFFID, 
            @TOTCOVAMT, @TOTUNCOVAMT, @TOTSERVAMT, @PATBILLAMT, @PATDISCUNT, @PATAMTPAID, @PATAMTRCVD, 
            @PATCNAMT, @PATRFNDAMT, @COMBILLAMT, @COMDISCUNT, @COMAMTPAID, @COMAMTRCVD, @COMCNAMT, 
            @COMRFNDAMT, @CREDAUTHBY, @DISCAUTHBY, @BILLSTAT, @DRAWNON, @PATCATG, @CONSCATG, @EMPID, 
            @EMPCODE, @CLINICCODE, @FUNDSOURCE, @DEPTCODE, @OPCONSNO, @OPCONSAMT, @OPREGFEE, @COMPRCPT, 
            @POSTFLAG, @NETAMOUNT, @AMOUNTPAID, @AMOUNTRCVD, @CNAMOUNT, @RFNDAMOUNT, @TOTDISCOUNT, 
            @TOTALBILLAMT, @ADDR4, @ADDR5, @CASETYPE, @AUTHTRANID, @REQUESTNO, @CASHCOLL, @EXMPTNO, 
            @ADVADJAMT, @TRANCODE, @SCROLLNO, @EMERGENCYN, @PATPHONE, @COMPSTATUS, @DISALOWAMT, @BILLSOURCE, 
            @MATERNYN, @EXPDUEDATE, @IPNO, @WRITOFFAMT, @TAXAMT, @OTEXPENTYN, @TOTSRVTAX, @SERVTAXON, 
            @SRVTAXAMT, @EDUCESAMT, @SHECESAMT, @DEPTYPE, @INSCOMPCD, @INTLUPLDYN, @ALLWCASHYN, @SNCTPRFYN, 
            @SNCTPROOF, @PISUID, @PISPWD, @DOCTPOST, @LEDGPOST, @POSTDATE, @CREATED_BY, @CREATED_ON, 
            @EDITED_BY, @EDITED_ON, @CANCELDBY, @CANCELDON, @STATUS, @CONSTYPE, @WardNo, @BedNO, @RevisionId, 
            @ReferralAgent`;

      await executeDbQuery(sp2Query, sp2Params, { transaction });

      // Step 5: Call OPD_RECEIPTS_INSERT if DUEAMOUNT123 <= 0
      if (!input.DUEAMOUNT123 || input.DUEAMOUNT123 <= 0) {
        const sp3Name = "OPD_RECEIPTS_INSERT";
        const sp3Params = {
          CLNORGCODE: input.CLNORGCODE,
          FINYEAR: input.FINYEAR,
          MEDRECNO: input.MEDRECNO,
          CNTRCODE: input.COUNTERNO || sessionCounterID,
          RCPTTYPE: "OC",
          RECEIPTNO: input.RECEIPTNO,
          RECEIPTDATE: "",
          OPDBILLNO: input.OPDBILLNO,
          PAYMODE: input.PAYMODE,
          CHEQUEDDNO: input.ChequeNo,
          CHEQUEDATE: input.CHEQUEDATE,
          BANKNAME: input.BANKNAME,
          RCVDFROM: input.RCVDCOUNTR,
          REMARKS: input.REMARKS,
          AMOUNT: parseFloat(input.AMOUNTPAID) || 0,
          FUNDSOURCE: input.FUNDSOURCE,
          DEPTCODE: input.DEPTCODE,
          CREATED_BY: sessionUID,
          CREATED_ON: input.Crated_On,
          EDITED_BY: input.EDITED_BY || '',
          EDITED_ON: input.EDITED_ON || '',
          STATUS: input.STATUS,
          CNNO: "",
          PC_Code: input.PATCATG,
          TARIFFID: input.TARIFFID,
          REVISIONID: input.REVISIONID,
          OPDREGNO: input.OPNum
        };

        const sp3Query = `EXEC ${sp3Name} 
                @CLNORGCODE, @FINYEAR, @MEDRECNO, @CNTRCODE, @RCPTTYPE, @RECEIPTNO, @RECEIPTDATE, 
                @OPDBILLNO, @PAYMODE, @CHEQUEDDNO, @CHEQUEDATE, @BANKNAME, @RCVDFROM, @REMARKS, 
                @AMOUNT, @FUNDSOURCE, @DEPTCODE, @CREATED_BY, @CREATED_ON, @EDITED_BY, @EDITED_ON, 
                @STATUS, @CNNO, @PC_Code, @TARIFFID, @REVISIONID, @OPDREGNO`;

        await executeDbQuery(sp3Query, sp3Params, { transaction });
      }

      // Step 6: Update opd_billmst
      const updateQuery = `
            UPDATE opd_billmst
            SET TOTALBILLAMT = AMOUNTPAID + TOTDISCOUNT, PATBILLAMT = AMOUNTPAID + TOTDISCOUNT
            WHERE AMOUNTPAID > TOTALBILLAMT + TOTDISCOUNT AND BILLTYPE='OC' AND COMBILLAMT=0
            AND BILLno = @BILLNO
        `;
      const updateParams = { BILLNO: input.OPDBILLNO };
      await executeDbQuery(updateQuery, updateParams, { transaction });

      // Step 7: Update tm_Appointments
      if (input.AppointmentNO) {
        const updateAppQuery = `
                UPDATE tm_Appointments SET consulted='Y' WHERE appointmentno=@AppointmentNO
            `;
        const updateAppParams = { AppointmentNO: input.AppointmentNO };
        await executeDbQuery(updateAppQuery, updateAppParams, { transaction });
      }

      // Commit transaction
      await transaction.commit();

      res.json({ status: 0, message: "Success", result: 1 });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async generateBillInsert(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    const insertQuery = ` INSERT INTO OPD_BILLTRN ( CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, SERVCODE, QUANTITY, COVRATE, UNCOVRATE, NETRATE, PATAMOUNT, COMAMOUNT, PATCNAMT, COMCNAMT, PATDISC, COMDISC, OPCNNO, REMARKS, ORDGENYN, SERCANSTAT, RFNDSTAT, DGREGSTAT, DEPTCODE, LEDGRPCODE, SRVGRPCODE, TRAN_PERIOD, FUNDSOURCE, SUBGRPCODE, SRVTYPCODE, SERDISCOUNT, NET, RATE, AMOUNT, DOCTCODE, DOCTSHARE, TECHSHARE, SURCHARGE, ADDSURCHRG, DOCTAMT, HOSPSHARE, ORGDOCSHAR, TRANCODE, SURCHRGNOT, SHARDOCT, SURGCODE, PACKAGECODE, DOCTPOSTDT, SRVTAXYN, SRVTAXAMT, EDUCESAMT, SHECESAMT, RENDQTY, DOCTPOST, CREATED_BY, CREATED_ON, STATUS, Dper, RevisionId ) VALUES ( @CLNORGCODE, (SELECT finyear FROM Mst_AccYear WHERE UPPER(OpenStatus) = 'O' AND UPPER(CurrentFinancialYear) = 'Y' AND CLNORGCODE = @CLNORGCODE), @CASHCOUNTER, @BILLTYPE, @BILLNO, @SERVCODE, @QUANTITY, @COVRATE, @UNCOVRATE, @NETRATE, @PATAMOUNT, @COMAMOUNT, @PATCNAMT, @COMCNAMT, @PATDISC, @COMDISC, @OPCNNO, @REMARKS, @ORDGENYN, @SERCANSTAT, @RFNDSTAT, @DGREGSTAT, @DEPTCODE, @LEDGRPCODE, @SRVGRPCODE, @TRAN_PERIOD, @FUNDSOURCE, @SUBGRPCODE, @SRVTYPCODE, @SERDISCOUNT, @NET, @RATE, @AMOUNT, @DOCTCODE, @DOCTSHARE, @TECHSHARE, @SURCHARGE, @ADDSURCHRG, @DOCTAMT, @HOSPSHARE, @ORGDOCSHAR, @TRANCODE, @SURCHRGNOT, @SHARDOCT, @SURGCODE, @PACKAGECODE, @DOCTPOSTDT, @SRVTAXYN, @SRVTAXAMT, @EDUCESAMT, @SHECESAMT, @RENDQTY, @DOCTPOST, @CREATED_BY, GETDATE(), 'A', @Dper, @RevisionId ) `;

    try {
      await transaction.begin();
      const params = { CLNORGCODE: input.CLNORGCODE, CASHCOUNTER: input.CASHCOUNTER, BILLTYPE: input.BILLTYPE, BILLNO: input.BILLNO, SERVCODE: input.SERVCODE, QUANTITY: input.QUANTITY, COVRATE: input.COVRATE, UNCOVRATE: input.UNCOVRATE, NETRATE: input.NETRATE, PATAMOUNT: input.PATAMOUNT, COMAMOUNT: input.COMAMOUNT, PATCNAMT: input.PATCNAMT, COMCNAMT: input.COMCNAMT, PATDISC: input.PATDISC, COMDISC: input.COMDISC, OPCNNO: input.OPCNNO, REMARKS: input.REMARKS, ORDGENYN: input.ORDGENYN, SERCANSTAT: input.SERCANSTAT, RFNDSTAT: input.RFNDSTAT, DGREGSTAT: input.DGREGSTAT, DEPTCODE: input.DEPTCODE, LEDGRPCODE: input.LEDGRPCODE, SRVGRPCODE: input.SRVGRPCODE, TRAN_PERIOD: input.TRAN_PERIOD, FUNDSOURCE: input.FUNDSOURCE, SUBGRPCODE: input.SUBGRPCODE, SRVTYPCODE: input.SRVTYPCODE, SERDISCOUNT: input.SERDISCOUNT, NET: input.NET, RATE: input.RATE, AMOUNT: input.AMOUNT, DOCTCODE: input.DOCTCODE, DOCTSHARE: input.DOCTSHARE, TECHSHARE: input.TECHSHARE, SURCHARGE: input.SURCHARGE, ADDSURCHRG: input.ADDSURCHRG, DOCTAMT: input.DOCTAMT, HOSPSHARE: input.HOSPSHARE, ORGDOCSHAR: input.ORGDOCSHAR, TRANCODE: input.TRANCODE, SURCHRGNOT: input.SURCHRGNOT, SHARDOCT: input.SHARDOCT, SURGCODE: input.SURGCODE, PACKAGECODE: input.PACKAGECODE, DOCTPOSTDT: input.DOCTPOSTDT, SRVTAXYN: input.SRVTAXYN, SRVTAXAMT: input.SRVTAXAMT, EDUCESAMT: input.EDUCESAMT, SHECESAMT: input.SHECESAMT, RENDQTY: input.RENDQTY, DOCTPOST: input.DOCTPOST, CREATED_BY: input.CREATED_BY, Dper: input.Dper, RevisionId: input.RevisionId };

      const result = await executeDbQuery(insertQuery, params, { transaction });

      await transaction.commit();

      if (result.rowsAffected[0] > 0) {
        res.json({ status: 0, result: "Inserted successfully", billNo: input.BILLNO });
      } else {
        res.json({ status: 1, result: "Insert failed" });
      }

    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async updatePatientMaster(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      const spName = "Patient_Master_UPDATE";

      const insertQuery = ` 
      DECLARE @MRNO VARCHAR(50);
      EXEC ${spName}
        @OPDNum = @OPDNum,
        @PatientMr_No = @PatientMr_No,
        @Patient_Name = @Patient_Name,
        @Age = @Age,
        @Occupation = @Occupation,
        @Blood_Group = @Blood_Group,
        @Telephone = @Telephone,
        @Mobile = @Mobile,
        @Email = @Email,
        @Patient_DOB = @Patient_DOB,
        @Gender = @Gender,
        @weight = @weight,
        @Height = @Height,
        @Marital_Status = @Marital_Status,
        @Address1 = @Address1,
        @Address2 = @Address2,
        @Address3 = @Address3,
        @PinCode = @PinCode,
        @Country = @Country,
        @State = @State,
        @District = @District,
        @Address = @Address,
        @Patient_Category_Id = @Patient_Category_Id,
        @Work_NO = @Work_NO,
        @EmgConct_Name = @EmgConct_Name,
        @EmgConct_Relation = @EmgConct_Relation,
        @EmgConct_TeleHome = @EmgConct_TeleHome,
        @EmgConct_TeleCell = @EmgConct_TeleCell,
        @Guardian_Name = @Guardian_Name,
        @Guardian_Relation = @Guardian_Relation,
        @Guardian_TeleHome = @Guardian_TeleHome,
        @Guardian_TeleCell = @Guardian_TeleCell,
        @Regd_No = @Regd_No,
        @Children_NO = @Children_NO,
        @Pregnancies_NO = @Pregnancies_NO,
        @Complaints = @Complaints,
        @Remarks = @Remarks,
        @City_Id = @City_Id,
        @Salutation = @Salutation,
        @Cr_Address1 = @Cr_Address1,
        @Cr_Address2 = @Cr_Address2,
        @Cr_Address3 = @Cr_Address3,
        @Cr_Pincode = @Cr_Pincode,
        @Cr_City = @Cr_City,
        @Cr_Country = @Cr_Country,
        @Cr_State = @Cr_State,
        @Cr_District = @Cr_District,
        @Doctor_Id = @Doctor_Id,
        @PatientType = @PatientType,
        @Comp_Id = @Comp_Id,
        @Cat_Id = @Cat_Id,
        @Relation = @Relation,
        @Status = @Status,
        @IPNO = @IPNO,
        @Tariff_Category = @Tariff_Category,
        @Consultation_Date = @Consultation_Date,
        @Department = @Department,
        @ReferralDoctor_ID = @ReferralDoctor_ID,
        @ReferralDoctoragent_ID = @ReferralDoctoragent_ID,
        @Meternity = @Meternity,
        @UniqueId = @UniqueId,
        @EmpIdCardNo = @EmpIdCardNo,
        @LetterNo = @LetterNo,
        @Limit = @Limit,
        @ValidDate = @ValidDate,
        @Image_Name = @Image_Name,
        @AppointmentNO = @AppointmentNO,
        @EXPDUEDATE = @EXPDUEDATE,
        @CLNORGCODE = @CLNORGCODE,
        @REVISIONID = @REVISIONID,
        @FirstName = @FirstName,
        @MiddleName = @MiddleName,
        @LastName = @LastName,
        @Doctot_ID2 = @Doctot_ID2,
        @Department2 = @Department2,
        @EmpId = @EmpId,
        @EmpName = @EmpName,
        @EmpRefType = @EmpRefType,
        @EmpDept = @EmpDept,
        @EmpDesgcode = @EmpDesgcode,
        @ReasonFor = @ReasonFor,
        @NATLCODE = @NATLCODE,
        @RELGCODE = @RELGCODE,
        @fathername = @fathername,
        @CREATED_BY = @CREATED_BY,
        @CREATED_ON = @CREATED_ON,
        @EDITED_BY = @EDITED_BY,
        @EDITED_ON = @EDITED_ON `;

      const params = {
        OPDNum: input.OPDNum || null,
        PatientMr_No: input.mrno,
        Patient_Name: input.patname,
        Age: input.age,
        Occupation: input.Occupation || null,
        Blood_Group: input.bloodgroup,
        Telephone: input.mobile,
        Mobile: input.mobile,
        Email: input.email,
        Patient_DOB: input.dob,
        Gender: input.gender,
        weight: input.weight || 0,
        Height: input.hieght || 0,
        Marital_Status: input.maritalstatus,
        Address1: input.address1,
        Address2: input.address2,
        Address3: input.address3,
        PinCode: input.pincode,
        Country: input.countryid,
        State: input.stateid,
        District: input.districtid,
        Address: `${input.address1} ${input.address2} ${input.address3}`,
        Patient_Category_Id: input.patcatid,
        Work_NO: input.Work_NO || null,
        EmgConct_Name: input.EmgConct_Name,
        EmgConct_Relation: input.EmgConct_Relation || null,
        EmgConct_TeleHome: input.EmgConct_TeleHome || null,
        EmgConct_TeleCell: input.EmgConct_TeleCell || null,
        Guardian_Name: input.guardianname,
        Guardian_Relation: input.guardianrelation,
        Guardian_TeleHome: input.Guardian_TeleHome || "",
        Guardian_TeleCell: input.guardianmobile,
        Regd_No: input.Regd_No || null,
        Children_NO: input.Children_NO || null,
        Pregnancies_NO: input.Pregnancies_NO || null,
        Complaints: input.Complaints || null,
        Remarks: input.Remarks || null,
        City_Id: input.cityid,
        Salutation: input.patsalutationid,
        Cr_Address1: input.guardianaddress1,
        Cr_Address2: input.guardianaddress2,
        Cr_Address3: input.guardianaddress3,
        Cr_Pincode: input.guardianpincode,
        Cr_City: input.guardiancityid,
        Cr_Country: input.guardiancountryid,
        Cr_State: input.guardianstateid,
        Cr_District: input.guardiandistrictid,
        Doctor_Id: input.doctcd,
        PatientType: input.pattype,
        Comp_Id: input.compid,
        Cat_Id: input.patcatid,
        Relation: input.guardianrelation,
        Status: input.pattype || "A",
        IPNO: input.IPNO || null,
        Tariff_Category: input.tarifcatid,
        Consultation_Date: input.Consultation_Date || null,
        Department: input.departmentid,
        ReferralDoctor_ID: input.refdoctcd,
        ReferralDoctoragent_ID: input.ReferralAgent_ID,
        Meternity: input.maritalstatus,
        UniqueId: input.uniqueid,
        EmpIdCardNo: input.empidcardno,
        LetterNo: input.letterno,
        Limit: input.limit,
        ValidDate: input.validdate,
        Image_Name: input.imagepath || "",
        AppointmentNO: input.AppointmentNO || null,
        EXPDUEDATE: input.EXPDUEDATE || null,
        CLNORGCODE: input.hospitalId,
        REVISIONID: input.REVISIONID || null,
        FirstName: input.firstname,
        MiddleName: input.middlename,
        LastName: input.lastname,
        Doctot_ID2: input.Doctot_ID2 || null,
        Department2: input.Department2 || null,
        EmpId: input.empid,
        EmpName: input.empname,
        EmpRefType: input.empreftype,
        EmpDept: input.empdeptid,
        EmpDesgcode: input.empdesgcd,
        ReasonFor: input.ReasonFor || null,
        NATLCODE: input.Nationality,
        RELGCODE: input.Religion,
        fathername: input.fathername,
        CREATED_BY: null,
        CREATED_ON: null,
        EDITED_BY: input.userId,
        EDITED_ON: input.Crated_On
      };

      const { records: records1 } = await executeDbQuery(insertQuery, params, {
        transaction: transaction,
        query: `EXEC ${spName}`,
        params: params
      });


      const spName1 = "Patient_Master_UPDATE";
      const insertQuery1 = ` 
      DECLARE @MRNO VARCHAR(50);
      EXEC ${spName1}
      @MRNO = @MRNO,
      @PATIENTNAME = @PATIENTNAME,
      @AGE = @AGE,
      @SALUTNCODE = @SALUTNCODE,
      @GENDER = @GENDER` ;

      const params1 = {
        MRNO: input.mrno,
        PATIENTNAME: input.patname,
        AGE: input.age,
        SALUTNCODE: input.patsalutationid,
        GENDER: input.gender
      }

      const { records: records2 } = await executeDbQuery(insertQuery1, params1, {
        transaction: transaction,
        query: `EXEC ${spName1}`,
        params: params1
      });

      transaction.commit();
      const MRNO = records1?.[0]?.MRNO;

      if (records1?.length) {

        res.json({ status: 0, MRNO: MRNO });
      } else {
        res.json({ status: 1, message: "No data returned from SP" });
      }
    } catch (err: any) {
      transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async saveDOCTPATCON(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Get session values
      const sessionUID = input.userId || '';

      // Step 1: Call OPD_DOCTPATCON_INSERT stored procedure
      const spName = "OPD_DOCTPATCON_INSERT";
      const spParams = {
        CLNORGCODE: input.CLNORGCODE,
        DOCTCODE: input.DOCTCODE,
        MEDRECNO: input.MEDRECNO,
        IPNO: input.IPNO || null,
        CONSULTATIONTYPE: input.CONSULTATIONTYPE || null,
        EPISODENO: input.EPISODENO || null,
        PAIDCONSDATE: input.PAIDCONSDATE || null,
        PAIDCONSNO: input.PAIDCONSNO || null,
        PREVISITDATE: input.PREVISITDATE || null,
        LASTVISITDATE: input.LASTVISITDATE || null,
        VISITS: input.VISITS || 0,
        CREATED_BY: sessionUID,
        CREATED_ON: input.Crated_On,
        EDITED_BY: input.EDITED_BY || null,
        EDITED_ON: input.EDITED_ON || null,
        STATUS: input.STATUS || 'A',
        FreeVisit: input.FreeVisit || 0,
        PaidVisit: input.PaidVisit || 0,
        VisitType: input.VisitType || null,
        DPCId: input.DPCId || null,
        REVISIONID: input.REVISIONID || null,
        IPFollowUp_Visits: input.IP_VISITS || 0
      };

      const spQuery = `EXEC ${spName} 
      @CLNORGCODE, @DOCTCODE, @MEDRECNO, @IPNO, @CONSULTATIONTYPE, @EPISODENO, 
      @PAIDCONSDATE, @PAIDCONSNO, @PREVISITDATE, @LASTVISITDATE, @VISITS, 
      @CREATED_BY, @CREATED_ON, @EDITED_BY, @EDITED_ON, @STATUS, @FreeVisit, 
      @PaidVisit, @VisitType, @DPCId, @REVISIONID, @IPFollowUp_Visits`;

      const { records } = await executeDbQuery(spQuery, spParams, { transaction });

      // Commit transaction
      await transaction.commit();

      // Return the result count (similar to C# returning result.ToString())
      res.json({ status: 0, message: "Success", result: records ? records.length : 1 });

    } catch (err: any) {
      // Rollback transaction on error
      await transaction.rollback();

      // Return error response (similar to C# returning "0")
      res.status(500).json({ status: 1, message: err.message, result: 0 });
    }
  }

  async updateDOCTPATCON(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Get session values
      const sessionUID = input.userId || '';

      // Call OPD_DOCTPATCON_UPDATE stored procedure
      const spName = "OPD_DOCTPATCON_UPDATE";
      const spParams = {
        CLNORGCODE: input.CLNORGCODE,
        DOCTCODE: input.DOCTCODE,
        MEDRECNO: input.MEDRECNO,
        IPNO: input.IPNO || null,
        CONSULTATIONTYPE: input.CONSULTATIONTYPE || null,
        EPISODENO: input.EPISODENO || null,
        PAIDCONSDATE: input.PAIDCONSDATE || null,
        PAIDCONSNO: input.PAIDCONSNO || null,
        PREVISITDATE: input.PREVISITDATE || null,
        LASTVISITDATE: input.LASTVISITDATE || null,
        VISITS: input.VISITS || 0,
        CREATED_BY: null,
        CREATED_ON: null,
        EDITED_BY: input.Crated_On,
        EDITED_ON: sessionUID,
        STATUS: input.STATUS || 'A',
        FreeVisit: input.FreeVisit || 0,
        PaidVisit: input.PaidVisit || 0,
        VisitType: input.VisitType || null,
        REVISIONID: input.REVISIONID || null,
        // DEPTCODE: input.DEPTCODE || null, @DEPTCODE, 
        IPFollowUp_Visits: input.IP_VISITS || 0
      };

      const spQuery = `EXEC ${spName} 
      @CLNORGCODE, @DOCTCODE, @MEDRECNO, @IPNO, @CONSULTATIONTYPE, @EPISODENO, 
      @PAIDCONSDATE, @PAIDCONSNO, @PREVISITDATE, @LASTVISITDATE, @VISITS, 
      @CREATED_BY, @CREATED_ON, @EDITED_BY, @EDITED_ON, @STATUS, @FreeVisit, 
      @PaidVisit, @VisitType, @REVISIONID, @IPFollowUp_Visits`;

      const { records } = await executeDbQuery(spQuery, spParams, { transaction });

      // Commit transaction
      await transaction.commit();

      // Return the result count (similar to C# returning result.ToString())
      res.json({ status: 0, message: "Success", result: records });

    } catch (err: any) {
      // Rollback transaction on error
      await transaction.rollback();

      // Return error response (similar to C# returning "0")
      res.status(500).json({ status: 1, message: err.message, result: 0 });
    }
  }

  async updateDOCTPATCON1(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Get session values
      const sessionUID = input.userId || '';

      // Call OPD_DOCTPATCON_UPDATE_Y stored procedure
      const spName = "OPD_DOCTPATCON_UPDATE_Y";
      const spParams = {
        CLNORGCODE: input.CLNORGCODE,
        DOCTCODE: input.DOCTCODE,
        MEDRECNO: input.MEDRECNO,
        IPNO: input.IPNO || null,
        CONSULTATIONTYPE: input.CONSULTATIONTYPE || null,
        EPISODENO: input.EPISODENO || null,
        PAIDCONSDATE: input.PAIDCONSDATE || null,
        PAIDCONSNO: input.PAIDCONSNO || null,
        PREVISITDATE: input.PREVISITDATE || null,
        LASTVISITDATE: input.LASTVISITDATE || null,
        VISITS: input.VISITS || 0,
        CREATED_BY: null,
        CREATED_ON: null,
        EDITED_BY: input.Crated_On,
        EDITED_ON: sessionUID,
        STATUS: input.STATUS || 'A',
        FreeVisit: input.FreeVisit || 0,
        PaidVisit: input.PaidVisit || 0,
        VisitType: input.VisitType || null,
        REVISIONID: input.REVISIONID || null,
        DEPTCODE: input.DEPTCODE || null,
        IPFollowUp_Visits: input.IP_VISITS || 0
      };

      const spQuery = `EXEC ${spName} 
      @CLNORGCODE, @DOCTCODE, @MEDRECNO, @IPNO, @CONSULTATIONTYPE, @EPISODENO, 
      @PAIDCONSDATE, @PAIDCONSNO, @PREVISITDATE, @LASTVISITDATE, @VISITS, 
      @CREATED_BY, @CREATED_ON, @EDITED_BY, @EDITED_ON, @STATUS, @FreeVisit, 
      @PaidVisit, @VisitType, @REVISIONID, @DEPTCODE, @IPFollowUp_Visits`;

      const { records } = await executeDbQuery(spQuery, spParams, { transaction });

      // Commit transaction
      await transaction.commit();

      // Return the result count (similar to C# returning result.ToString())
      res.json({ status: 0, message: "Success", result: records });

    } catch (err: any) {
      // Rollback transaction on error
      await transaction.rollback();

      // Return error response (similar to C# returning "0")
      res.status(500).json({ status: 1, message: err.message, result: 0 });
    }
  }

  async getPatientList(req: Request, res: Response): Promise<void> {
    const input: PatSearchCriteria = req.body.pat || {};


    // HTML table start
    let table = `
    <thead>
      <tr class='success'>
        <th style='text-align: left;'>MR Number</th>
        <th style='text-align: left; display: none'>MR Number DOM</th>
        <th style='text-align: left;'>IP Number</th>
        <th style='text-align: left; display: none'>IP Number DOM</th>
        <th style='text-align: left;'>Patient Name</th>
        <th style='text-align: left;'>Gender</th>
        <th style='text-align: left;'>Age</th>
        <th style='text-align: left;'>DOB</th>
        <th style='text-align: left;'>Mobile</th>
        <th style='text-align: left;'>Address1</th>
        <th style='text-align: left;'>Father Name</th>
      </tr>
    </thead>
    <tbody>
  `;

    try {
      const query = `EXEC USP_GET_PATIENT_DETAILS @HospitalId = @HospitalId, @PATTYPE = @PATTYPE, @MRNO =  @MRNO, @DOCTCODE = @DOCTCODE, @IPNO = @IPNO, @OPDREGNO = @OPDREGNO`;

      const params = { HospitalId: input.hospid, PATTYPE: input.pattypesearch, MRNO: input.mrno, DOCTCODE: input.doctcd, IPNO: input.ipno, OPDREGNO: input.mrno };

      const result = await executeDbQuery(query, params);
      const records = result.records || [];
      for (const dr of records) {
        table += `
        <tr>
          <td style='text-align: left;'>${dr["PatientMr_No"] || ""}</td>
          <td style='text-align: left; display:none'>${input.patMrnoDOM || ""}</td>
          <td style='text-align: left;'>${dr["IPNO"] || ""}</td>
          <td style='text-align: left; display:none'>${input.patIpnoDOM || ""}</td>
          <td style='text-align: left;'>${dr["Patient_Name"] || ""}</td>
          <td style='text-align: left;'>${dr["Gender"] || ""}</td>
          <td style='text-align: left;'>${dr["Age"] || ""}</td>
          <td style='text-align: left;'>${dr["Patient_DOB"] ? new Date(dr["Patient_DOB"]).toISOString().substring(0, 10) : ""}</td>
          <td style='text-align: left;'>${dr["Mobile"] || ""}</td>
          <td style='text-align: left;'>${dr["Address1"] || ""}</td>
          <td style='text-align: left;'>${dr["fathername"] || ""}</td>
        </tr>
      `;
      }

      table += "</tbody>";

      res.json({ status: 0, d: table });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async setPatientDetails(req: Request, res: Response): Promise<void> {
    const input: PatSearchCriteria = req.body.pat || {};


    try {
      const params = {
        HospitalId: input.hospid,
        PATTYPE: input.pattypesearch,
        MRNO: input.mrno,
        DOCTCODE: input.doctcd,
        IPNO: input.ipno,
        OPDREGNO: input.patOPNum || input.mrno,
      };

      const query = "USP_GET_PATIENT_DETAILS";

      const dbRes = await executeDbQuery(query, params, { isStoredProc: true });

      const patobj: PatientSearchObj[] = (dbRes.records || []).map((dr: any) => ({
        consultno: dr.CONSULTNO,
        consdate: formatDate(dr.CONSDATE),
        mrno: dr.PatientMr_No,
        ipno: dr.IPNO,
        patsalutationid: dr.Salutation,
        patname: dr.Patient_Name?.toUpperCase(),
        gender: dr.Gender,
        age: dr.Age,
        dob: formatDate(dr.Patient_DOB),
        mobile: dr.Mobile,
        telphone: dr.Telephone,
        email: dr.Email,
        address1: dr.Address1,
        address2: dr.Address2,
        address3: dr.Address3,
        pincode: dr.PinCode,
        countryid: dr.Country,
        stateid: dr.State,
        districtid: dr.District,
        cityid: dr.City_Id,
        departmentid: dr.Department,
        patcatid: dr.Patient_Category_Id,
        tarifcatid: dr.Tariff_Category,
        doctcd: dr.DOCTCODE,
        doctname: dr.DOCTNAME,
        patsalutation: dr.PAT_SALUTATION,
        country: dr.Country_Name,
        state: dr.State_Name,
        district: dr.District_Name,
        city: dr.CityName,
        deptname: dr.DEPTNAME,
        patcat: dr.PC_Name,
        tarifcat: dr.TARIFFDESC,
        firstname: dr.FirstName?.toUpperCase(),
        middlename: dr.MiddleName?.toUpperCase(),
        lastname: dr.LastName?.toUpperCase(),
        fathername: dr.fathername?.toUpperCase(),
        hieght: dr.Height,
        weight: dr.weight,
        bloodgroup: dr.Blood_Group?.trim(),
        maritalstatus: dr.Marital_Status?.trim(),
        pattype: dr.PatientType,
        uniqueid: dr.UniqueId,
        compid: dr.Comp_Id,
        compname: dr.COMPName,
        empidcardno: dr.EmpIdCardNo,
        letterno: dr.LetterNo,
        limit: dr.Limit,
        validdate: formatDate(dr.ValidDate),
        empid: dr.EmpId,
        empname: dr.EmpName,
        empreftype: dr.EmpRefType,
        empdeptid: dr.EmpDept,
        empdeptname: dr.DEPTNAME,
        empdesgcd: dr.EmpDesgcode,
        empdesgname: dr.DESGNAME,
        refdoctcd: dr.RefDoct_ID,
        refdoctname: dr.refdoctname?.toUpperCase(),
        BEDNO: dr.BEDNO,
        WARDNUMBER: dr.WARDNUMBER,
        AdmitDt: dr.AdmitDt,
        AdmitTM: dr.AdmitTM,
        ADMNDOCTOR: dr.ADMNDOCTOR,
        DoctorName: dr.DoctorName,
        PRBEDCATG: dr.PRBEDCATG,
        BedCategory: dr.BedCategory,
        NURSCODE: dr.NURSCODE,
        NURSINGSTATION: dr.NURSINGSTATION,
        FOLIONO: dr.FOLIONO,
        DISCHRGDT: formatDate(dr.DISCHRGDT),
        OPNum: dr.OPDREGNO,
      }));

      res.json({ status: 0, result: patobj });
      return;
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getRegFee1(req: Request, res: Response): Promise<void> {
    const input = req.body.Regfee; 

    try {
      let result = 0;
      let result1 = 0;

      // If MedrecNo is provided, check OPD and IPD tables
      if (input.MedrecNo && input.MedrecNo.trim() !== "") {
        // Query OPD_DOCTPATCON
        const opdRes = await executeDbQuery(
          "SELECT COUNT(*) as CNT FROM OPD_DOCTPATCON WHERE MEDRECNO = @MedrecNo AND STATUS <> 'C'",
          { MedrecNo: input.MedrecNo }
        );
        result = safeNumber(opdRes.records[0]?.CNT);

        // Query IPD_ADMISSION
        const ipdRes = await executeDbQuery(
          "SELECT COUNT(*) as CNT FROM IPD_ADMISSION WHERE MEDRECNO = @MedrecNo AND STATUS <> 'C'",
          { MedrecNo: input.MedrecNo }
        );
        result1 = safeNumber(ipdRes.records[0]?.CNT);
      }

      let registrationFees: RegistrationFee[] = [];

      if (result > 0 || result1 > 0) {
        // Patient already exists → return default 0 fee
        registrationFees.push({
          regfeetype: "P",
          opddiscount: 0,
          regfeeamount: 0,
        });
      } else {
        // Otherwise, fetch RegnFee_Amount from Mst_FacilitySetup
        const query = `SELECT ISNULL(RegnFee_Amount, '0.00') as RegnFee_Amount FROM Mst_FacilitySetup WHERE CLNORGCODE = @CLNORGCODE `;
        const params = { CLNORGCODE: input.HospitalId };
        const regRes = await executeDbQuery(query, params);

        for (const dr of regRes.records) {
          registrationFees.push({
            regfeetype: "P",
            opddiscount: 0,
            regfeeamount: input.patcat === "003" ? 0 : safeNumber(dr.RegnFee_Amount),
          });
        }
      }

      res.json({ status: 0, d: registrationFees });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

}