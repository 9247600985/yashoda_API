import express, { Request, Response, Router } from "express";
import os from "os";
import { conpool, executeDbQuery } from "../../db";
import sql from "mssql";
import { VisitType, VisitTypeResponse, safeVal, PatSearchCriteria, PatientSearchObj, formatDate, safeNumber, RegistrationFee, numberToWords, CompanyNoticeBoardRegistration, formatDateChange, PatDetailsFromAppointment, formatDateForDb } from "../../utilities/helpers";
import { authenticateToken } from "../../utilities/authMiddleWare";
const moment = require('moment');


export default class consultationController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/op", authenticateToken, this.router);

    this.router.get("/Duplicate", authenticateToken, this.Check_Duplicate.bind(this));
    this.router.get("/DuplicateDoctorPatcon", authenticateToken, this.Check_DuplicateDoctorPatcon.bind(this));
    this.router.get("/DuplicateDoctorPatcon1", authenticateToken, this.Check_DuplicateDoctorPatcon1.bind(this));
    this.router.get("/BindPrintvaliddays", authenticateToken, this.BindPrintvaliddays.bind(this));
    this.router.get("/GetPaymentType1", authenticateToken, this.GetPaymentType1.bind(this));
    this.router.get("/getFessOnDoctorCode", authenticateToken, this.getFessOnDoctorCode.bind(this));
    this.router.get("/checkIpNo", authenticateToken, this.checkIpNo.bind(this));
    this.router.get("/GetDoctCode", authenticateToken, this.GetDoctCode.bind(this));
    this.router.get("/GetCONSBYDEPT", authenticateToken, this.GetCONSBYDEPT.bind(this));
    this.router.get("/getDoctorDepartment", authenticateToken, this.getDoctorDepartment.bind(this));
    this.router.get("/getTokenNo", authenticateToken, this.getTokenNo.bind(this));
    this.router.get("/Get_Footer", authenticateToken, this.Get_Footer.bind(this));
    this.router.get("/checkMRStatus", authenticateToken, this.checkMRStatus.bind(this));
    this.router.get("/getClinic_Details", authenticateToken, this.getClinic_Details.bind(this));
    this.router.get("/getDoctorQualification", authenticateToken, this.getDoctorQualification.bind(this));
    this.router.get("/getFacilityDefaultValues", authenticateToken, this.getFacilityDefaultValues.bind(this));
    this.router.get("/displaydate", authenticateToken, this.displaydate.bind(this));
    this.router.get("/getPatientOtherDetails", authenticateToken, this.getPatientOtherDetails.bind(this));
    this.router.get("/GetPaymentType", authenticateToken, this.GetPaymentType.bind(this));
    this.router.get("/loadOPRefDocRefAgent", authenticateToken, this.loadOPRefDocRefAgent.bind(this));
    this.router.get("/GetPATTYPE", authenticateToken, this.GetPATTYPE.bind(this));
    this.router.get("/getSecondaryDoctors", authenticateToken, this.getSecondaryDoctors.bind(this));
    this.router.get("/getPatCategoryDetails", authenticateToken, this.getPatCategoryDetails.bind(this));
    this.router.get("/ServeicePageconsult", authenticateToken, this.ServeicePageconsult.bind(this));
    this.router.get("/bindPrintConsultationPage2", authenticateToken, this.bindPrintConsultationPage2.bind(this));
    this.router.get("/getAppointmentList", authenticateToken, this.getAppointmentList.bind(this));
    this.router.get("/getPatientDetailsFromAppointment", authenticateToken, this.getPatientDetailsFromAppointment.bind(this));
    this.router.get("/getConsultationlist", authenticateToken, this.getConsultationlist.bind(this));
    this.router.get("/getConsultationBillDetails", authenticateToken, this.getConsultationBillDetails.bind(this));
    this.router.get("/getLocalIPAddress", authenticateToken, this.getLocalIPAddress.bind(this));
    this.router.get("/getPublicIP", authenticateToken, this.getPublicIP.bind(this));
    this.router.get("/viewVisits", authenticateToken, this.viewVisits.bind(this));
    this.router.get("/GetPatOldData", authenticateToken, this.GetPatOldData.bind(this));
    this.router.put("/DOCTPATCON", authenticateToken, this.updateDOCTPATCON.bind(this));
    this.router.put("/DOCTPATCON1", authenticateToken, this.updateDOCTPATCON1.bind(this));
    this.router.put("/PatientMaster", authenticateToken, this.updatePatientMaster.bind(this));
    this.router.put("/cancelConsultation", authenticateToken, this.cancelConsultation.bind(this));
    this.router.put("/cancelConsultation1", authenticateToken, this.cancelConsultation1.bind(this));
    this.router.put("/UpdateConsultation", authenticateToken, this.UpdateConsultation.bind(this));
    this.router.put("/UpdateConsultation1", authenticateToken, this.UpdateConsultation1.bind(this));
    this.router.put("/UpDatePaidCOnsDate", authenticateToken, this.UpDatePaidCOnsDate.bind(this));
    this.router.post("/PatientMaster", authenticateToken, this.savePatientMaster.bind(this));
    this.router.post("/Consultation", authenticateToken, this.saveConsultation.bind(this));
    this.router.post("/BillInsert", authenticateToken, this.generateBillInsert.bind(this));
    this.router.post("/saveDOCTPATCON", authenticateToken, this.saveDOCTPATCON.bind(this));
    this.router.post("/getCurrentVisitType", authenticateToken, this.getCurrentVisitType.bind(this));
    this.router.post("/getCurrentVisitType1", authenticateToken, this.getCurrentVisitType1.bind(this));
    this.router.post("/getPatientList", authenticateToken, this.getPatientList.bind(this));
    this.router.post("/setPatientDetails", authenticateToken, this.setPatientDetails.bind(this));
    this.router.post("/getRegFee1", authenticateToken, this.getRegFee1.bind(this));
    this.router.post("/savePatientDetailsWithIPAddress", authenticateToken, this.savePatientDetailsWithIPAddress.bind(this));
    this.router.post("/saveIPADDRESS_OPDBILLMST", authenticateToken, this.saveIPADDRESS_OPDBILLMST.bind(this));

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

    const sql = `SELECT count(*) as count FROM OPD_DOCTPATCON WHERE MEDRECNO=@MEDRECNO`;

    const params = { MEDRECNO: input.MEDRECNO }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getSecondaryDoctors(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `SELECT 1 SL_NO ,DOCT_CODE1, Firstname ,Qualification , Qualification1,Qualification2,Qualification3,Qualification4       FROM Primary_Secondary_doctors P ,  Mst_DoctorMaster D WHERE P.DOCT_CODE1 = D.CODE    AND P.CLINIC_CODE = @CLINIC_CODE  AND P.CONS_DOCT_CODE = @CONS_DOCT_CODE   UNION ALL SELECT 2 SL_NO ,DOCT_CODE2, Firstname ,Qualification , Qualification1,Qualification2,Qualification3,Qualification4     FROM  Primary_Secondary_doctors P, Mst_DoctorMaster D WHERE P.DOCT_CODE2 = D.CODE    AND P.CLINIC_CODE = @CLINIC_CODE  AND P.CONS_DOCT_CODE = @CONS_DOCT_CODE  UNION ALL SELECT 3 SL_NO ,DOCT_CODE3, Firstname ,Qualification , Qualification1,Qualification2,Qualification3,Qualification4     FROM  Primary_Secondary_doctors P, Mst_DoctorMaster D WHERE P.DOCT_CODE3 = D.CODE     AND P.CLINIC_CODE = @CLINIC_CODE  AND P.CONS_DOCT_CODE = @CONS_DOCT_CODE   UNION ALL SELECT 4 SL_NO ,DOCT_CODE4, Firstname ,Qualification , Qualification1,Qualification2,Qualification3,Qualification4     FROM  Primary_Secondary_doctors P, Mst_DoctorMaster D WHERE P.DOCT_CODE4 = D.CODE     AND P.CLINIC_CODE = @CLINIC_CODE  AND P.CONS_DOCT_CODE = @CONS_DOCT_CODE   UNION ALL SELECT 5 SL_NO ,DOCT_CODE5, Firstname ,Qualification , Qualification1,Qualification2,Qualification3,Qualification4     FROM  Primary_Secondary_doctors P, Mst_DoctorMaster D WHERE P.DOCT_CODE5 = D.CODE     AND P.CLINIC_CODE = @CLINIC_CODE  AND P.CONS_DOCT_CODE = @CONS_DOCT_CODE ORDER BY 1`;

    const params = { CLINIC_CODE: input.CLINIC_CODE, CONS_DOCT_CODE: input.CONS_DOCT_CODE }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getPatCategoryDetails(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `select t.CLNORGCODE,t.TARIFFID,t.TARIFFDESC,t.REC_STATUS,t.RevisionId ,p.Payment_Type from MST_TARIFFCATGORY t,Mst_PatientCategory p where t.TARIFFID=p.Tariff_Category and p.PC_Code=@PC_Code`;

    const params = { PC_Code: input.PatCatCd }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async ServeicePageconsult(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `select opd.servcode,mst.servname,opd.quantity,opd.rate,opd.amount from opd_billtrn opd  inner join  mst_services mst on opd.servcode=mst.servcode  where billno=@billno order by mst.servname desc`;

    const params = { billno: input.billno }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
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

  async displaydate(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `select PAIDCONSDATE FROM OPD_DOCTPATCON WHERE MEDRECNO=@MEDRECNO`;
    const params = { MEDRECNO: input.MEDRECNO }
    try {
      const { records } = await executeDbQuery(sql, params);

      const details = records.map((row: any) => {
        let dateObj = "";
        if (row.PAIDCONSDATE) {
          dateObj = formatDate(row.PAIDCONSDATE);

        }
        return { PAIDCONSDATE: dateObj };
      });

      res.json({ status: 0, result: details });
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

  async Get_Footer(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT isnull(OP_PRESC_FOOTER,'')as OP_PRESC_FOOTER FROM TM_CLINICS WHERE CLINIC_CODE=@CLINIC_CODE`;

    const params = { CLINIC_CODE: input.CLINIC_CODE }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async GetPatOldData(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT ISNULL(PATIENTMR_NO,'') AS MRNO FROM PATIENT_MASTER WHERE FIRSTNAME=@FNAME AND LASTNAME=@LNAME AND Gender=@GENDER AND convert(varchar(10), Patient_DOB,120)=@DOB AND MOBILE=@MOBILE `;

    const params = { FNAME: input.FNAME, LNAME: input.LNAME, GENDER: input.GENDER, DOB: input.DOB, MOBILE: input }

    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, d: records });
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

  async checkMRStatus(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT count(*) FROM OPD_CONSULTATION WHERE MEDRECNO=@MRNO and status<>'C' `;
    const sql1 = `select HospitalName from HospitalsList `;

    const params = { MRNO: input.MRNO }
    try {
      const { records } = await executeDbQuery(sql, params);
      const records1 = await executeDbQuery(sql1, []);

      res.json({ status: 0, result: records, records1 });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getClinic_Details(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `select CLINIC_NAME,ADDRESS,PHONE From tm_clinics WHERE CLINIC_CODE=@hospid`;

    const params = { hospid: input.hospid }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getDoctorQualification(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {

      const doctorQuery = `SELECT isnull(MobileNo,'') as MobileNo,isnull(Email,'') as Email,RoomNo, registrationNo, Qualification,isnull(Qualification1,'') as Qualification1,isnull(Qualification2,'') as Qualification2,isnull(Qualification3,'') as Qualification3,isnull(Qualification4,'') as Qualification4 FROM Mst_DoctorMaster WHERE Code=@DoctCode and status<>'C'`;

      const doctorResult = await executeDbQuery(doctorQuery, { DoctCode: input.DoctCode });

      let lst: string[] = [];

      if (doctorResult.records.length > 0) {
        const dr = doctorResult.records[0];
        lst.push(
          dr.registrationNo,
          dr.Qualification,
          dr.RoomNo,
          dr.Qualification1,
          dr.Qualification2,
          dr.Qualification3,
          dr.Qualification4,
          dr.MobileNo,
          dr.Email
        );
      }

      const tokenQuery = `select TOKENNO from OPD_CONSULTATION where OPDBILLNO=@ConsultNo or consultno=@ConsultNo`;

      const tokenResult = await executeDbQuery(tokenQuery, { ConsultNo: input.ConsultNo });

      if (tokenResult.records.length > 0) {
        lst.push(tokenResult.records[0].TOKENNO);
      } else {
        lst.push("");
      }

      res.json({ status: 1, d: lst });
    } catch (err: any) {

      res.status(500).json({ status: 0, error: err.message });
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

  async BindPrintvaliddays(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = ` SELECT valid_days FROM Mst_ChargeSheet WHERE Doctor_ID = @Doctor_ID AND valid_days != 0 `;
    const params = { Doctor_ID: input.doctcode };
    const details: CompanyNoticeBoardRegistration[] = [];

    try {
      const { records } = await executeDbQuery(sql, params);

      records.forEach((row: any) => {
        const user: CompanyNoticeBoardRegistration = {};
        user.validdays = row.valid_days?.toString() || "0";

        const validDaysNum = Number(user.validdays);
        const today = moment(input.consdate, "DD/MM/YYYY").add(validDaysNum - 1, "days");
        user.VALIDUPTO = today.format("DD/MMM/YYYY");

        details.push(user);
      });

      res.json({ status: 0, result: details });
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
        Address: `${input.address1} ${input.address2} ${input.address3}`,
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
          : '',
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
        DISCAUTHBY: input.DISCAUTHBY || '',
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

      // First SP: Patient_Master_UPDATE
      const spName = "Patient_Master_UPDATE";
      const insertQuery = `
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
        @EDITED_ON = @EDITED_ON;
    `;

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
        EmgConct_Name: input.EmgConct_Name || null,
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
        ValidDate: input.validdate || null,
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
        CREATED_BY: input.userId, CREATED_ON: input.Crated_On, EDITED_BY: input.userId, EDITED_ON: input.Crated_On,
      };

      await executeDbQuery(insertQuery, params, { transaction });

      // Second SP: USP_UPDATE_PATIENTNAME
      const spName2 = "USP_UPDATE_PATIENTNAME";
      const insertQuery2 = `
      EXEC ${spName2}
        @MRNO = @MRNO,
        @PATIENTNAME = @PATIENTNAME,
        @AGE = @AGE,
        @SALUTNCODE = @SALUTNCODE,
        @GENDER = @GENDER;
    `;

      const params2 = {
        MRNO: input.mrno,
        PATIENTNAME: input.patname,
        AGE: input.age,
        SALUTNCODE: input.patsalutationid,
        GENDER: input.gender,
      };

      await executeDbQuery(insertQuery2, params2, { transaction });

      await transaction.commit();

      res.json({ status: 0, message: "Patient updated successfully" });
    } catch (err: any) {
      await transaction.rollback();
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
        IPNO: input.IPNO ,
        CONSULTATIONTYPE: input.CONSULTATIONTYPE ,
        EPISODENO: input.EPISODENO ,
        PAIDCONSDATE: input.PAIDCONSDATE,
        PAIDCONSNO: input.PAIDCONSNO ,
        PREVISITDATE: input.PREVISITDATE ,
        LASTVISITDATE: input.LASTVISITDATE ,
        VISITS: input.VISITS || 0,
        CREATED_BY: sessionUID,
        CREATED_ON: input.Crated_On,
        EDITED_BY: input.EDITED_BY || '',
        EDITED_ON: input.EDITED_ON || '1900-01-01',
        STATUS: input.STATUS || 'A',
        FreeVisit: input.FreeVisit || 0,
        PaidVisit: input.PaidVisit || 0,
        VisitType: input.VisitType ,
        DPCId: input.DPCId ,
        REVISIONID: input.REVISIONID  ,
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
        CREATED_BY: input.userId,
        CREATED_ON: input.Crated_On,
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
        CREATED_BY: input.userId,
        CREATED_ON: input.Crated_On,
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
          <td style='text-align: left;'>${dr["Patient_DOB"] ? formatDateChange(dr["Patient_DOB"]) : ""}</td>
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
        consdate: formatDateChange(dr.CONSDATE),
        mrno: dr.PatientMr_No,
        ipno: dr.IPNO,
        patsalutationid: dr.Salutation,
        patname: dr.Patient_Name?.toUpperCase(),
        gender: dr.Gender,
        age: dr.Age,
        dob: formatDateChange(dr.Patient_DOB),
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
        validdate: formatDateChange(dr.ValidDate),
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
        DISCHRGDT: formatDateChange(dr.DISCHRGDT),
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

  async bindPrintConsultationPage2(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const query = `select mu.USERNAME,billmst.BILLDATE,billmst.BILLNO , pm.PatientMr_No,sol.Sal_Desc,(pm.FirstName +' ' +pm.MiddleName+' '+pm.LastName) AS Patient_Name,pm.Gender,pm.Age,pm.Mobile,drsol.Sal_Desc as drSol,pm.FirstName,mdept.DEPTNAME,mstdoct.Firstname as DoctName,mp.PayMode ,rfDr.RefDoctor_FName as refraldoctr,rfDrsal.Sal_Desc  as refsal from  Patient_master pm left join Mst_Department mdept on pm.Department=mdept.DEPTCODE left join Mst_DoctorMaster mstdoct on pm.Doctor_Id=mstdoct.Code left join Mst_ReferralDoctor rfDr on rfDr.RefDoct_ID=pm.ReferralDoctor_ID left join Mst_Salutation sol on sol.Sal_Code=pm.Salutation left join OPD_BILLMST billmst  on billmst.MEDRECNO=pm.PatientMr_No left join Mst_UserDetails mu on pm.CREATED_BY=mu.USERID left join PayMode mp on mp.paymodeid=billmst.PAYMODE left join Mst_Salutation drsol on drsol.Sal_Code=mstdoct.Salutation  left join Mst_Salutation rfDrsal on rfDrsal.Sal_Code=rfDr.Salutation where  pm.PatientMr_No=@PatientMr_No and billmst.billno=@billno `;

    try {
      const result = await executeDbQuery(query, { PatientMr_No: input.PatientMr_No, billno: input.billno });

      const details = result.records.map((row: any) => {
        const net = Math.round(Number(input.billamount || 0));
        const netWords = numberToWords(net);

        return {
          CREATED_BY: row.USERNAME,
          BILLDATE: moment(row.BILLDATE).format("DD/MM/YYYY hh:mm A"),
          BILLNO: row.BILLNO,
          Sal_Desc: row.Sal_Desc,
          PatientMr_No: row.PatientMr_No,
          Patient_Name: row.Patient_Name,
          Gender: row.Gender,
          Age: row.Age,
          Mobile: row.Mobile,
          drSol: row.drSol,
          Firstname: row.DoctName,
          refsal: row.refsal,
          RefDoctor_FName: row.refraldoctr,
          DEPTNAME: row.DEPTNAME,
          NETAMT: net.toFixed(2),
          PayMode: row.PayMode,
          NETAMTWORDS: `${netWords} Rupees only.`,
        };
      });

      res.json({ status: 0, result: details });
    } catch (err: any) {

      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getAppointmentList(req: Request, res: Response): Promise<void> {
    // In C#, hospid came from Session — here you’d get it from req.session or JWT if needed
    // const hospid = req.session?.HospitalId;

    const query = `select a.VISITSTATUS,a.visitamount,a.trnumber PatientMr_No, A.AppointmentNo, AppointmentDate AppointmentDate, AppointmentTime, Patient_Name ,D.Firstname, Doctcode, visittype from TM_APPOINTMENTS A inner join Patient_Master pm on a.trnumber = pm.patientmr_no LEFT JOIN Mst_DoctorMaster D ON D.Code = A.Doctcode where convert(varchar(10), AppointmentDate, 120) between convert(varchar(10), getdate(), 120) and convert(varchar(10), getdate(), 120) and A.visitStatus in('Paid') and (consulted is null or Consulted != 'Y')  and a.ap_type='A' ORDER BY AppointmentDate`;

    let table = `
    <THead>
      <tr class='success'>
        <TH style='text-align: left;'>Payment Status</TH>
        <TH style='text-align: left;'>YH No.</TH>
        <TH style='text-align: left;'>Appointment No</TH>
        <TH style='text-align: left;'>Date</TH>
        <TH style='text-align: left;'>Time</TH>
        <TH style='text-align: left;'>Patient Name</TH>
        <TH style='text-align: left;'>Doctor Name</TH>
        <TH style='text-align: left;'>Patient Type</TH>
        <TH style='text-align: left;display:none'>Doctor Id</TH>
        <TH style='text-align: left;display:none'>Visit Type</TH>
      </tr>
    </THead>
    <tbody>
  `;

    try {
      const { records } = await executeDbQuery(query, []);

      for (const row of records) {
        let visitstatus = row.VISITSTATUS;
        if (visitstatus !== "Paid") {
          visitstatus = "Unpaid";
        }

        table += `
        <tr>
          <td style='text-align: left;'>${visitstatus}</td>
          <td style='text-align: left;'>${row.PatientMr_No ?? ""}</td>
          <td style='text-align: left;'>${row.AppointmentNo ?? ""}</td>
          <td style='text-align: left;'>${row.AppointmentDate ?? ""}</td>
          <td style='text-align: left;'>${row.AppointmentTime ?? ""}</td>
          <td style='text-align: left;'>${row.Patient_Name ?? ""}</td>
          <td style='text-align: left;'>${row.Firstname ?? ""}</td>
          <td style='text-align: left;'>${row.Patient_Type ?? ""}</td>
          <td style='text-align: left;display:none'>${row.Doctcode ?? ""}</td>
          <td style='text-align: left;display:none'>${row.visittype ?? ""}</td>
        </tr>
      `;
      }

      table += "</tbody>";

      res.json({ status: 0, d: table });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getPatientDetailsFromAppointment(req: Request, res: Response): Promise<void> {
    // In C#, Appointment object is passed in — here we read from body or query
    const input = req.method === "GET" ? req.query : req.body;
    const appointmentNo = input.appointno;

    try {
      // Call the stored procedure
      const { records } = await executeDbQuery(
        "EXEC USP_GETPATDETFROMAPPOINTMENT @APPOINTMENTNO=@AppointmentNo",
        { AppointmentNo: appointmentNo }
      );

      // Map DB rows to PatDetailsFromAppointment[]
      const appointments: PatDetailsFromAppointment[] = records.map((r: any) => ({
        amount: r.visitamount !== null ? Number(r.visitamount) : undefined,
        salutation: r.Salutation ?? "",
        patname: r.Patient_Name ?? "",
        patfname: r.FirstName ?? "",
        patlname: r.LastName ?? "",
        patage: r.Age ?? "",
        mobile: r.Mobile ?? "",
        email: r.Email ?? "",
        dob: formatDateChange(r.Patient_DOB) ?? "",
        gender: r.Gender ?? "",
        countryid: r.Country ?? "",
        countryname: r.Country_Name ?? "",
        stateid: r.State ?? "",
        statename: r.State_Name ?? "",
        districtid: r.District ?? "",
        districtname: r.District_Name ?? "",
        cityidid: r.City_id ?? "",
        cityname: r.CityName ?? "",
        patcat: r.Patient_Category_Id ?? "",
        addr1: r.Address1 ?? "",
        addr2: r.Address2 ?? "",
        addr3: r.Address3 ?? "",
        visitytype: r.VISITTYPE ?? "",
        doctcd: r.Code ?? "",
        doctname: r.DRNAME ?? "",
        deptcd: r.DEPCODE ?? "",
        deptname: r.DEPTNAME ?? ""
      }));

      // Return array like C# method
      res.json({ status: 0, result: appointments });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getConsultationlist(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    let totnetamt = 0,
      totpaidamt = 0,
      totdueamt = 0,
      totcons = 0,
      i = 0;

    try {


      const tempfromdate = formatDateForDb(input.fromdate);
      const temptodate = formatDateForDb(input.todate);

      const hospid = input.HOSPITALID || "";
      const CounterID = input.COUNTERID || "OP1";
      const USERID = input.USERID || "";

      // Stored procedure call
      const query = ` EXEC USP_GET_CONSULTATIONLIST @FROMDATE=@FROMDATE, @TODATE=@TODATE, @DOCTCODE=@DOCTCODE, @MRNO=@MRNO, @USERID=@USERID, @COUNTERID=@COUNTERID, @CLNORGCODE=@CLNORGCODE `;

      const params = { FROMDATE: tempfromdate, TODATE: temptodate, DOCTCODE: input.doctcode, MRNO: input.mrno, USERID, COUNTERID: CounterID, CLNORGCODE: hospid, };

      const { records } = await executeDbQuery(query, params);

      let table = `
      <thead>
        <tr class='success'>
          <th style='text-align: left;'>Slno</th>
          <th style='text-align: left;'>Consulation No.</th>
          <th style='text-align: left;'>Consulation Date</th>
          <th style='text-align: left;display:none;'>OP Number</th>
          <th style='text-align: left;'>YH Number</th>
          <th style='text-align: left;'>Patient Name</th>
          <th style='text-align: left;'>Token Number</th>
          <th style='text-align: left;'>Age</th>
          <th style='text-align: left;'>Sex</th>
          <th style='text-align: left;'>Contact</th>
          <th style='text-align: left;'>Doctor</th>
          <th style='text-align: left;'>Visit Type</th>
          <th style='text-align: right;'>Net Amount</th>
          <th style='text-align: right;'>Paid Amount</th>
          <th style='text-align: right;'>Due Amount</th>
          <th style='text-align: left;'>Status</th>
          <th style='text-align: left; display: none'>Bill No.</th>
          <th style='text-align: left;'>Remarks</th>
          <th style='text-align: left;'>UserName</th>
        </tr>
      </thead>
      <tbody>
    `;

      const consList: any[] = [];

      for (const dr of records) {
        i++;

        const consultation = {
          CONSULTNO: dr.CONSULTNO,
          CONSDATE: dr.CONSDATE ? formatDateChange(dr.CONSDATE) : "",
          OPNUM: dr.OPDREGNO,
          MEDRECNO: dr.MEDRECNO,
          Patient_Name: dr.Patient_Name,
          TOKENNO: dr.TOKENNO,
          Age: dr.Age,
          Gender: dr.Gender,
          Mobile: dr.Mobile,
          Firstname: dr.Firstname,
          VisitType_Name: dr.VisitType_Name,
          NETAMT: parseFloat(dr.NETAMT || 0),
          PAIDAMT: parseFloat(dr.PAIDAMT || 0),
          DUEAMOUNT: parseFloat(dr.DUEAMOUNT || 0),
          STATUS: dr.STATUS,
          OPDBILLNO: dr.OPDBILLNO,
          PATTYPE: dr.PATTYPE,
          CONSTYPE: dr.CONSTYPE,
          RECEIPTNO: dr.RECEIPTNO,
          RECEIPTDATE: dr.RECEIPTDATE ? formatDateChange(dr.RECEIPTDATE) : "",
          REMARKS: dr.REMARKS,
          USERNAME: dr.USERNAME,
        };

        let style1 = consultation.STATUS === "A" ? "" : "color:white !important;background-color:#ee6e73  !important;";

        table += `
        <tr style='text-align:left;'>
          <td style='text-align:left;${style1}'>${i}</td>
          <td style='text-align:left;${style1}'>${consultation.OPDBILLNO}</td>
          <td style='text-align:left;${style1}'>${consultation.CONSDATE}</td>
          <td style='text-align:left;display:none;${style1}'>${consultation.OPNUM}</td>
          <td style='text-align:left;${style1}'>${consultation.MEDRECNO}</td>
          <td style='text-align:left;${style1}'>${consultation.Patient_Name}</td>
          <td style='text-align:left;${style1}'>${consultation.TOKENNO}</td>
          <td style='text-align:left;${style1}'>${consultation.Age}</td>
          <td style='text-align:left;${style1}'>${consultation.Gender}</td>
          <td style='text-align:left;${style1}'>${consultation.Mobile}</td>
          <td style='text-align:left;${style1}'>${consultation.Firstname}</td>
          <td style='text-align:left;${style1}'>${consultation.VisitType_Name}</td>
          <td style='text-align:right;${style1}'>${consultation.NETAMT}</td>
          <td style='text-align:right;${style1}'>${consultation.PAIDAMT}</td>
          <td style='text-align:right;${style1}'>${consultation.DUEAMOUNT}</td>
          <td style='text-align:left;${style1}'>${consultation.STATUS}</td>
          <td style='text-align:left;display:none;${style1}'>${consultation.OPDBILLNO}</td>
          <td style='text-align:left;${style1}'>${consultation.REMARKS}</td>
          <td style='text-align:left;${style1}'>${consultation.USERNAME}</td>
        </tr>
      `;

        consList.push(consultation);
        totnetamt += consultation.NETAMT;
        totpaidamt += consultation.PAIDAMT;
        totdueamt += consultation.DUEAMOUNT;
        totcons++;
      }

      table += `
      </tbody>
      <tfoot>
        <tr style='color:blue'>
          <td style='text-align:left;'>Total Cons:${totcons}</td>
          <td></td><td></td><td></td>
          <td style='display:none;'></td>
          <td></td><td></td><td></td><td></td>
          <td></td><td></td>
          <td style='text-align:left;'>Total</td>
          <td style='text-align:right;'>${totnetamt.toFixed(2)}</td>
          <td style='text-align:right;'>${totpaidamt.toFixed(2)}</td>
          <td style='text-align:right;'>${totdueamt.toFixed(2)}</td>
          <td></td><td></td><td></td><td style='display:none;'></td>
        </tr>
      </tfoot>
    `;

      consList.push({
        NETAMT: totnetamt,
        PAIDAMT: totpaidamt,
        DUEAMOUNT: totdueamt,
        TOTCONS: totcons,
      });

      res.json({ status: 0, table, d: consList });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getConsultationBillDetails(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {
      const hospid = input.HospitalId || "";
      const billno = input.billno;

      // Build SQL query
      let query = `select b.REMARKS, C.DISCOUNTON,BILLNO,CASHCOUNTER,BEDCATGCD,RCPTNO ,B.MEDRECNO,B.PAYMODE, CHEQUEDDNO,CHEQUEDATE,B.BANKNAME,DOCTCD,CRDCOMPCD,B.LETTERNO, VALIDUPTO,B.PATCATG,B.TARIFFID,  C.REGFEE,C.CONSFEE,C.DISCPER,C.DISCAMT,C.NETAMT, B.COMBILLAMT,B.PATBILLAMT,C.NETAMT TOTALAMOUNT, (B.COMBILLAMT-B.COMDISCUNT) AS COMBILLAMT,(B.PATBILLAMT-B.PATDISCUNT) AS PATBILLAMT ,(C.TOTALAMT-C.DISCAMT) AS TOTALAMOUNT, B.COMAMTPAID,B.PATAMTPAID,C.PAIDAMT, C.HOSPSHARE,C.DOCTSHARE,B.CREDAUTHBY,B.DISCAUTHBY,C.VISITTYPE,C.TOKENNO,D.Firstname DOCTNAME,c.DEPTCODE,dp.DEPTNAME, d.serviceCode,(select opregfeeservcode from Mst_FacilitySetup where CLNORGCODE=@HospitalId) opregfeeservcode,t.TARIFFDESC,t.RevisionId,p.Payment_Type,ISNULL(CMP.Name,'') COMPNAME,C.CRDEMPID,B.STATUS, (B.COMBILLAMT-B.COMDISCUNT-B.COMAMTPAID-B.COMAMTRCVD) as COMPDUE, (B.PATBILLAMT-B.PATDISCUNT-B.PATAMTPAID-B.PATAMTRCVD) as PATDUE, (B.TOTALBILLAMT-B.TOTDISCOUNT-B.AMOUNTPAID-B.AMOUNTRCVD) as TOTALDUE from OPD_BILLMST B left join OPD_CONSULTATION C on  B.BILLNO = C.OPDBILLNO left join MST_TARIFFCATGORY t on t.TARIFFID=b.TARIFFID  inner join Mst_DoctorMaster d on d.code=c.DOCTCODE inner join Mst_Department dp on dp.DEPTCODE=c.DEPTCODE LEFT JOIN Company CMP ON B.CRDCOMPCD=CMP.Com_Id inner join Mst_PatientCategory p on p.PC_Code=c.PATCATG WHERE BILLNO=@billno `;

      // Add org condition like in C# code
      if (hospid && hospid !== "001001001000") {
        query += " AND C.CLNORGCODE = @HospitalId";
      }

      const params = {
        billno,
        HospitalId: hospid,
      };

      const { records } = await executeDbQuery(query, params);

      // Map results to match original C# return structure
      const consList = records.map((dr: any) => ({
        REMARKS: dr.REMARKS,
        DISCOUNTON: dr.DISCOUNTON,
        EMPID: dr.CRDEMPID,
        COMPNAME: dr.COMPNAME,
        PAYMENTTYPE: dr.Payment_Type,
        SERVCODE: dr.serviceCode,
        OPREGSERVCODE: dr.opregfeeservcode,
        TARIFFDESC: dr.TARIFFDESC,
        REVISIONID: dr.RevisionId,
        CASHCOUNTER: dr.CASHCOUNTER,
        BEDCATGCD: dr.BEDCATGCD,
        DEPTCODE: dr.DEPTCODE,
        DEPTNAME: dr.DEPTNAME,
        DOCTNAME: dr.DOCTNAME,
        RCPTNO: dr.RCPTNO,
        MEDRECNO: dr.MEDRECNO,
        PAYMODE: dr.PAYMODE,
        CHEQUEDDNO: dr.CHEQUEDDNO,
        CHEQUEDATE: dr.CHEQUEDATE ? formatDateChange(dr.CHEQUEDATE) : "",
        BANKNAME: dr.BANKNAME,
        DOCTCD: dr.DOCTCD,
        CRDCOMPCD: dr.CRDCOMPCD,
        LETTERNO: dr.LETTERNO,
        VALIDUPTO: dr.VALIDUPTO ? formatDateChange(dr.VALIDUPTO) : "",
        PATCATG: dr.PATCATG,
        TARIFFID: dr.TARIFFID,
        REGFEE: dr.REGFEE,
        CONSFEE: dr.CONSFEE,
        DISCPER: dr.DISCPER,
        DISCAMT: dr.DISCAMT,
        NETAMT: dr.NETAMT,
        COMBILLAMT: dr.COMBILLAMT,
        PATBILLAMT: dr.PATBILLAMT,
        TOTALAMOUNT: dr.TOTALAMOUNT,
        COMAMTPAID: dr.COMAMTPAID,
        PATAMTPAID: dr.PATAMTPAID,
        PAIDAMT: dr.PAIDAMT,
        HOSPSHARE: dr.HOSPSHARE,
        DOCTSHARE: dr.DOCTSHARE,
        CREDAUTHBY: dr.CREDAUTHBY,
        DISCAUTHBY: dr.DISCAUTHBY,
        VISITTYPE: dr.VISITTYPE,
        TOKENNO: dr.TOKENNO,
        STATUS: dr.STATUS,
        COMPDUE: dr.COMPDUE,
        PATDUE: dr.PATDUE,
        TOTALDUE: dr.TOTALDUE,
      }));

      res.json({ status: 0, result: consList });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async UpDatePaidCOnsDate(req: Request, res: Response): Promise<void> {
    const { deptCode, doctCode, medRecNo, paidConsDate, consByDate } = req.body;

    try {
      let query = "";
      let params: Record<string, any> = {};

      if (consByDate === "Y") {
        query = `update OPD_DOCTPATCON set PAIDCONSDATE=@paidDate where DOCTCODE in (select code from Mst_DoctorMaster where Department=@dept and CONSBYDEPT='Y' and STATUS='A') and MEDRECNO=@mrno`;
        params = { paidDate: paidConsDate, dept: deptCode, mrno: medRecNo };
      } else {
        query = `update OPD_DOCTPATCON set PAIDCONSDATE=@paidDate where DOCTCODE=@doct and MEDRECNO=@mrno`;
        params = { paidDate: paidConsDate, doct: doctCode, mrno: medRecNo };
      }

      const { rowsAffected } = await executeDbQuery(query, params);

      res.json({ status: 0, message: "Success", result: rowsAffected?.[0] ?? 0 });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message, result: 0 });
    }
  }

  async UpdateConsultation(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { rowsAffected } = await executeDbQuery("OPD_CONSULTATION_UPDATE", { ConsultationNo: input.ConsultationNum, edited_by: input.UserId }, { transaction, isStoredProc: true });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
        return;
      }

    }
  }

  async UpdateConsultation1(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { rowsAffected } = await executeDbQuery("OPD_CONSULTATION_UPDATE_Y", { ConsultationNo: input.ConsultationNum }, { transaction, isStoredProc: true });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
      }

    }
  }

  async cancelConsultation1(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { rowsAffected } = await executeDbQuery("OPD_CONSULTATION_UPDATE_Y", { ConsultationNo: input.ConsultationNum }, { transaction, isStoredProc: true });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
      }

    }
  }

  async cancelConsultation(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { rowsAffected } = await executeDbQuery("OPD_CONSULTATION_UPDATE", { ConsultationNo: input.ConsultationNum }, { transaction, isStoredProc: true });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
      }

    }
  }

  async saveIPADDRESS_OPDBILLMST(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const query = "INSERT INTO OPD_BILLMST_AUDIT (CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, BEDCATGCD, RCPTNO, OPREGNO, MEDRECNO, BILLDATE, SALUTNCODE, PATNAME, PATFNAME, PATMNAME, PATLNAME, PATSURNAME, AGE, SEX, ADDRESS1, ADDRESS2, ADDRESS3, CITYCODE, DISTRICTCODE, STATECODE, COUNTRYCODE, PINCODE, MOBILENO, PAYMODE, CHEQUEDDNO, CHEQUEDATE, BANKNAME, REMARKS, REFBILLNO, REFDOCTCD, DOCTCD, CRDCOMPCD, LETTERNO, VALIDUPTO, DISPNO, DISPDATE, TOKENNO, TARIFFID, TOTCOVAMT, TOTUNCOVAMT, TOTSERVAMT, PATBILLAMT, PATDISCUNT, PATAMTPAID, PATAMTRCVD, PATCNAMT, PATRFNDAMT, COMBILLAMT, COMDISCUNT, COMAMTPAID, COMAMTRCVD, COMCNAMT, COMRFNDAMT, CREDAUTHBY, DISCAUTHBY, BILLSTAT, DRAWNON, PATCATG, CONSCATG, EMPID, EMPCODE, CLINICCODE, FUNDSOURCE, DEPTCODE, OPCONSNO, OPCONSAMT, OPREGFEE, COMPRCPT, POSTFLAG, NETAMOUNT, AMOUNTPAID, AMOUNTRCVD, CNAMOUNT, RFNDAMOUNT, TOTDISCOUNT, TOTALBILLAMT, ADDR4, ADDR5, CASETYPE, AUTHTRANID, REQUESTNO, CASHCOLL, EXMPTNO, ADVADJAMT, TRANCODE, SCROLLNO, EMERGENCYN, PATPHONE, COMPSTATUS, DISALOWAMT, BILLSOURCE, MATERNYN, EXPDUEDATE, IPNO, WRITOFFAMT, TAXAMT, OTEXPENTYN, TOTSRVTAX, SERVTAXON, SRVTAXAMT, EDUCESAMT, SHECESAMT, DEPTYPE, INSCOMPCD, INTLUPLDYN, ALLWCASHYN, SNCTPRFYN, SNCTPROOF, PISUID, PISPWD, DOCTPOST, LEDGPOST, POSTDATE, CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, CANCELDBY, CANCELDON, STATUS, CONSTYPE, WardNo, BedNO, RevisionId, OPDREGNO, DISCCATG, ReferralAgent_ID, USERID, USERNAME, SYSTEM_IPADRESS, INSERTED_ON) SELECT CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, BEDCATGCD, RCPTNO, OPREGNO, MEDRECNO, BILLDATE, SALUTNCODE, PATNAME, PATFNAME, PATMNAME, PATLNAME, PATSURNAME, AGE, SEX, ADDRESS1, ADDRESS2, ADDRESS3, CITYCODE, DISTRICTCODE, STATECODE, COUNTRYCODE, PINCODE, MOBILENO, PAYMODE, CHEQUEDDNO, CHEQUEDATE, BANKNAME, REMARKS, REFBILLNO, REFDOCTCD, DOCTCD, CRDCOMPCD, LETTERNO, VALIDUPTO, DISPNO, DISPDATE, TOKENNO, TARIFFID, TOTCOVAMT, TOTUNCOVAMT, TOTSERVAMT, PATBILLAMT, PATDISCUNT, PATAMTPAID, PATAMTRCVD, PATCNAMT, PATRFNDAMT, COMBILLAMT, COMDISCUNT, COMAMTPAID, COMAMTRCVD, COMCNAMT, COMRFNDAMT, CREDAUTHBY, DISCAUTHBY, BILLSTAT, DRAWNON, PATCATG, CONSCATG, EMPID, EMPCODE, CLINICCODE, FUNDSOURCE, DEPTCODE, OPCONSNO, OPCONSAMT, OPREGFEE, COMPRCPT, POSTFLAG, NETAMOUNT, AMOUNTPAID, AMOUNTRCVD, CNAMOUNT, RFNDAMOUNT, TOTDISCOUNT, TOTALBILLAMT, ADDR4, ADDR5, CASETYPE, AUTHTRANID, REQUESTNO, CASHCOLL, EXMPTNO, ADVADJAMT, TRANCODE, SCROLLNO, EMERGENCYN, PATPHONE, COMPSTATUS, DISALOWAMT, BILLSOURCE, MATERNYN, EXPDUEDATE, IPNO, WRITOFFAMT, TAXAMT, OTEXPENTYN, TOTSRVTAX, SERVTAXON, SRVTAXAMT, EDUCESAMT, SHECESAMT, DEPTYPE, INSCOMPCD, INTLUPLDYN, ALLWCASHYN, SNCTPRFYN, SNCTPROOF, PISUID, PISPWD, DOCTPOST, LEDGPOST, POSTDATE, CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, CANCELDBY, CANCELDON, STATUS, CONSTYPE, WardNo, BedNO, RevisionId, OPDREGNO, DISCCATG, ReferralAgent_ID, @USERID, @USERNAME, @IPAddress, GETDATE() from OPD_BILLMST where medrecno=@MRNO and BILLNO=@BILLNO";

      const params = { USERID: input.USERID, USERNAME: input.USERNAME, IPAddress: input.IPAddress, MRNO: input.MRNO, BILLNO: input.BILLNO };

      const { rowsAffected } = await executeDbQuery(query, params, { transaction });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
      }

    }
  }

  async savePatientDetailsWithIPAddress(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const pool = await conpool.connect();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { rowsAffected } = await executeDbQuery("insert into patient_master_audit select *, @USERID @IPAddress, GETDATE(), @USERNAME from patient_master where patientmr_no=@MRNO ", { USERID: input.USERID, IPAddress: input.IPAddress, USERNAME: input.USERNAME, MRNO: input.MRNO }, { transaction });

      await transaction.commit();

      res.json({ status: 0, message: "Success", d: rowsAffected?.[0] ?? 1 });

    } catch (err: any) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        res.status(500).json({ status: 1, message: err.message, result: 0 });
      }

    }
  }

  async getLocalIPAddress(req: Request, res: Response): Promise<void> {
    try {
      const networkInterfaces = os.networkInterfaces();
      let ipAddress = "";

      for (const iface of Object.values(networkInterfaces)) {
        if (!iface) continue;
        for (const alias of iface) {
          if (alias.family === "IPv4" && !alias.internal) {
            ipAddress = alias.address;
            break;
          }
        }
        if (ipAddress) break;
      }

      res.json({ status: 0, d: ipAddress });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message, ip: "" });
    }
  }

  async getPublicIP(req: Request, res: Response) {
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const data: any = await resp.json();
      res.json({ status: 0, ip: data.ip });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async viewVisits(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const medRecNo = input.MEDRECNO;

    try {
      // Query matches your C# logic
      const query = `SELECT C.MEDRECNO,PM.FirstName PATNAME, PM.Patient_Category_Id, C.CONSULTNO, C.OPDBILLNO, C.RECEIPTDATE, D.FIRSTNAME,C.REGFEE,C.CONSFEE, (CASE WHEN C.VISITTYPE='1' THEN 'First Visit' WHEN C.VISITTYPE='2' THEN 'Follow-up Visit' WHEN C.VISITTYPE='3' THEN 'Cross Consultation' WHEN C.VISITTYPE='4' THEN 'Emergency Visit' END) VISITTYPE,C.REGFEE,C.CONSFEE FROM OPD_CONSULTATION C  LEFT JOIN MST_DOCTORMASTER D ON D.CODE=C.DOCTCODE LEFT JOIN PATIENT_MASTER PM ON PM.PATIENTMR_NO=C.MEDRECNO WHERE MEDRECNO=@MEDRECNO ORDER BY RECEIPTDATE`;

      const { records } = await executeDbQuery(query, { medRecNo });

      let sb = `
      <thead>
        <tr class='success'>
          <th style='text-align: left;'>YH No.</th>
          <th style='text-align: left;'>Patient Name</th>
          <th style='text-align: left;'>Patient Type</th>
          <th style='text-align: left;'>Consultation Type</th>
          <th style='text-align: left;'>Consultation No</th>
          <th style='text-align: left;'>Consultation Date</th>
          <th style='text-align: left;'>Consultant Name</th>
          <th style='text-align: left;'>Bill No.</th>
          <th style='text-align: right;'>Reg Fee</th>
          <th style='text-align: right;'>Cons Fee</th>
        </tr>
      </thead>
      <tbody>
    `;

      for (const row of records) {
        sb += `
        <tr>
          <td>${row.MEDRECNO ?? ""}</td>
          <td>${row.PATNAME ?? ""}</td>
          <td>${row.Patient_Category_Id ?? ""}</td>
          <td>${row.VISITTYPE ?? ""}</td>
          <td>${row.CONSULTNO ?? ""}</td>
          <td>${row.RECEIPTDATE ?? ""}</td>
          <td>${row.FIRSTNAME ?? ""}</td>
          <td>${row.OPDBILLNO ?? ""}</td>
          <td style='text-align: right;'>${row.REGFEE ?? ""}</td>
          <td style='text-align: right;'>${row.CONSFEE ?? ""}</td>
        </tr>
      `;
      }

      sb += "</tbody>";

      res.json({ status: 0, d: sb });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }


}