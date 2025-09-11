import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
import { console } from "inspector";
import { logInfo } from "../utilities/logger";
import { Session } from "inspector/promises";
import { containsSpecialCharacters } from "./helpers";

export default class reportsController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/reports", this.router);

    this.router.get("/AccountReport", this.AccountReport.bind(this)); 
    this.router.get("/AmbulanceDetails", this.AmbulanceDetails.bind(this)); 
    this.router.get("/BillRegisterCollectionSummary", this.BillRegisterCollectionSummary.bind(this)); 
    this.router.get("/DeptWiseCollectionSummary", this.DeptWiseCollectionSummary.bind(this)); 
    this.router.get("/DeptWiseReportForAccounts", this.DeptWiseReportForAccounts.bind(this)); 
    this.router.get("/InvestigationWiseCollection", this.InvestigationWiseCollection.bind(this)); 
    this.router.get("/ConsultationWise", this.ConsultationWise.bind(this)); 
    this.router.get("/InvestigationCountWise", this.InvestigationCountWise.bind(this)); 
    this.router.get("/getPaymodeWiseDetails", this.getPaymodeWiseDetails.bind(this)); 
  }

  async AccountReport(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;
    let sql = '';

    if (input.paymode == '001') {
      sql = ` SELECT 'MA1/24-25/MCR-80' DocNo, CONVERT (varchar(20), OH.BILLDATE, 103) Date,'MAIN CASH - ' + T.ACC_CLINIC_NAME_CASH  CashBankAC,'MA1' Division,'MCR' Receipt_Type, A.ACCREM + T.ACC_CLINIC_NAME_CASH + '(' + CONVERT(varchar(20), OH.BILLDATE, 103) + ')'  sNarration,A.ACCODE Account, ROUND(COALESCE(SUM(OD.AMOUNT - (OD.SERDISCOUNT + OD.PATCNAMT)), 0), 0) Amount FROM OPD_BILLMST OH    LEFT JOIN OPD_BILLTRN OD ON OH.BILLNO = OD.BILLNO  LEFT JOIN MST_SERVICES S ON OD.SERVCODE = S.SERVCODE LEFT JOIN MST_ACCOUNTS A ON A.ACCODE = S.ACCODE      LEFT JOIN TM_CLINICS T ON T.CLNORGCODE = OD.CLNORGCODE  WHERE OH.PAYMODE = '001' and convert(varchar(10), OH.BILLDATE, 120)>=@FromDate  and convert(varchar(10), OH.BILLDATE, 120)<= @ToDate and OH.BILLNO like @Bill_number AND T.CLINIC_CODE like @Clinic_Code  GROUP BY CONVERT(varchar(20), OH.BILLDATE, 103),T.ACC_CLINIC_NAME_CASH,A.ACCREM,A.ACCODE HAVING ROUND(COALESCE(SUM(OD.AMOUNT - (OD.SERDISCOUNT + OD.PATCNAMT)), 0), 0) <> 0 ORDER BY T.ACC_CLINIC_NAME_CASH,CONVERT(varchar(20), OH.BILLDATE, 103)  `;
    }
    else {
      sql = ` SELECT '' INV_NO,'MA1/24-25/YHCL-99' RCTNO,CONVERT(varchar, OH.BILLDATE, 103) DATES	,S.ACCODE CODE, A.ACDESCR NAME, CASE WHEN OH.PAYMODE = '002' THEN 'CHQ' WHEN PAYMODE IN('004', '005', '006') THEN 'CARD' ELSE 'UPI' END MODE_OF_PAYMENT,'' CASH,'' CARD,'' BANK ,ROUND(COALESCE(SUM(OD.AMOUNT - (OD.SERDISCOUNT + OD.PATCNAMT)), 0), 0) Amount,'' SETTLEMENTNO,T.ACC_SHORT_NAME + ' ' +  CASE WHEN OH.PAYMODE = '002' THEN 'CHQ' WHEN(PAYMODE IN('004', '005', '006')) THEN ACC2CARDREM ELSE ACC2UPIREM END + T.ACC_CLINIC_NAME   ACCOUNT2,'' CHEQUE_NO,'' CHEQUE_DT,A.ACCREM + T.ACC_CLINIC_NAME + '(' + CONVERT(varchar, OH.BILLDATE, 103) + ')'  NARRATION,'' REMARKS FROM OPD_BILLMST OH LEFT JOIN OPD_BILLTRN OD ON OH.BILLNO = OD.BILLNO LEFT JOIN MST_SERVICES S ON OD.SERVCODE = S.SERVCODE  LEFT JOIN MST_ACCOUNTS A ON A.ACCODE = S.ACCODE  LEFT JOIN TM_CLINICS T ON T.CLNORGCODE = OD.CLNORGCODE  WHERE OH.PAYMODE NOT IN('001')  and convert(varchar(10), OH.BILLDATE, 120)>=@FromDate  and convert(varchar(10), OH.BILLDATE, 120)<= @ToDate and OH.BILLNO like @Bill_number  AND T.CLINIC_CODE like @Clinic_Code  GROUP BY CONVERT(varchar, OH.BILLDATE, 103),T.ACC_CLINIC_NAME,S.ACCODE,A.ACDESCR,A.ACCREM,CASE WHEN OH.PAYMODE = '002' THEN 'CHQ' WHEN PAYMODE IN('004', '005', '006')  THEN 'CARD' ELSE 'UPI' END,T.ACC_SHORT_NAME + ' ' + CASE WHEN OH.PAYMODE = '002' THEN 'CHQ' WHEN(PAYMODE IN('004', '005', '006'))  THEN ACC2CARDREM ELSE ACC2UPIREM END + T.ACC_CLINIC_NAME,T.ACC_SHORT_NAME,ACC2CARDREM,ACC2UPIREM HAVING ROUND(COALESCE(SUM(OD.AMOUNT - (OD.SERDISCOUNT + OD.PATCNAMT)), 0), 0) <> 0 ORDER BY T.ACC_CLINIC_NAME,CONVERT(varchar, OH.BILLDATE, 103)  `;
    }
    try {
      const { records } = await executeDbQuery(sql, { FromDate: input.FROMDATE, ToDate: input.TODATE, Bill_number: `%${input.Bill_number || ''}%`, Clinic_Code: `%${input.Clinic_Code || ''}%` });
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async AmbulanceDetails(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;

    let hospid = input.hospid || "";

    if (hospid === "001001001000") {
      hospid = "%%";
    } else {
      hospid = `%${hospid}%`;
    }

    const sql = `SELECT CONVERT(VARCHAR(10),DEPARTURE_DATE  ,105) BDATE,OPBILLNO BILLNO,PATIENT_NAME[PATIENT_NAME],VEHICLENO,DRIVER_NAME[DRIVER_NAME],TRAVEL_TO[DESTINATION] , CHARGES AMOUNT FROM YH_AMBULANCE_DETAILS WHERE   CONVERT(VARCHAR(10),DEPARTURE_DATE  ,120)  BETWEEN @FDATE AND @TDATE AND STATUS = 'A' AND CLNORGCODE LIKE @hospid `;
    try {
      const { records } = await executeDbQuery(sql, { FDATE: input.FDATE, TDATE: input.TDATE, hospid });
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async BillRegisterCollectionSummary(req: Request, res: Response): Promise<void> {
    
    const input = req.method === 'GET' ? req.query : req.body;
    let hospid='';

    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    const sql = `select TM.CLINIC_NAME,UM.USERNAME,BM.MEDRECNO,BM.BILLNO, convert(varchar(10),BM.BILLDATE,103)as BILLDATE , BM.PATFNAME AS Patientname, ISNULL( RF.REFDOCTOR_FNAME,'') AS REF_DOC ,BM.TOTALBILLAMT,BM.TOTDISCOUNT,BM.AMOUNTPAID,0 AS DUEAMOUNT,BM.RFNDAMOUNT,(BM.AMOUNTPAID-BM.RFNDAMOUNT)AS NETAMOUNT   , STUFF((SELECT '; ' + S.SERVNAME   FROM MST_SERVICES S, OPD_BILLTRN D WHERE S.SERVCODE = D.SERVCODE AND  D.BILLNO = BM.BILLNO   ORDER BY S.SERVNAME    FOR XML PATH('')), 1, 1, '') SERVNAME   from OPD_BILLMST BM left join Mst_ReferralDoctor RF on RF.RefDoct_ID = BM.REFDOCTCD   INNER JOIN Mst_UserDetails UM ON UM.USERID=BM.CREATED_BY  INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE=BM.CLNORGCODE WHERE convert(varchar(10), Bm.BILLDATE, 120)>=@FROMDATE    and convert(varchar(10), Bm.BILLDATE, 120)<=@TODATE AND BM.CREATED_BY LIKE @UserId AND BM.CLNORGCODE like @hospid ORDER BY 1,2 `;
    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, UserId: `%${input.UserId}%`, hospid: hospid ? `%${hospid}%` : "%%" });
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async DeptWiseCollectionSummary(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;

    let Serv_Type_Cond = '';
    let Discount_cond = '';
    let Refund_cond = '';
    let hospid = '';

    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    if (input.Serv_Type) {
      input.Serv_Type = input.Serv_Type.replace(/&quot;/g, "'");
    }

    if (input.Serv_Type === 'AA' && input.Serv_group) {
      Serv_Type_Cond = ` AND D.LABDPTCODE='${input.Serv_group}' `;
    } else if (input.Serv_Type === 'AA' && !input.Serv_group) {
      Serv_Type_Cond = ``;
    } else if (!input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD NOT IN('01','02','03') `;
    } else if (input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD IN('${input.Serv_Type}') `;
    } else if (input.Serv_Type && input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD IN('${input.Serv_Type}') AND D.LABDPTCODE='${input.Serv_group}' `;
    }

    if (input.Rad_Value === 'D') {
      Discount_cond = ` AND OD.SERDISCOUNT>0 `;
    }
    if (input.Rad_Value === 'R') {
      Refund_cond = ` AND (OD.PATCNAMT+OD.COMCNAMT)>0 `;
    }

    const sql = ` SELECT PD.PAYMODE, oh.DOCTCD, DM1.FIRSTNAME, OH.MEDRECNO Regno, CONVERT(VARCHAR(10), OH.BILLDATE, 103) AS Regdate, OH.PATNAME Patientname, CASE WHEN D.LABDPTDESC IS NULL THEN ddm.DEPTNAME ELSE D.LABDPTDESC END DEPTNAME, S.SERVNAME Investigation, OD.AMOUNT TotalAmt, SERDISCOUNT DiscAmt, OD.AMOUNT - OD.SERDISCOUNT Paid, 0 DueAmt, (OD.PATCNAMT+OD.COMCNAMT) REFUNDAMT, (OD.AMOUNT - OD.SERDISCOUNT - (OD.PATCNAMT+OD.COMCNAMT)) NetAmt, U.USERNAME, TM.CLINIC_NAME FROM OPD_BILLMST OH LEFT JOIN OPD_BILLTRN OD ON OH.BILLNO = OD.BILLNO LEFT JOIN MST_SERVICES S ON OD.SERVCODE = S.SERVCODE LEFT JOIN Mst_Department ddm ON ddm.deptcode = S.DEPTCODE LEFT JOIN DGL_TESTMASTER DM ON DM.TESTCODE = S.SERVCODE LEFT JOIN DGL_LABDEPT D ON D.LABDPTCODE = DM.LABDPTCODE LEFT JOIN MST_USERDETAILS U ON OH.CREATED_BY = U.USERID LEFT JOIN Mst_DoctorMaster DM1 ON DM1.CODE = OH.DOCTCD INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = OH.CLNORGCODE INNER JOIN PAYMODE PD ON PD.PAYMODEID = OH.PAYMODE WHERE OH.BILLTYPE = 'OB' AND OH.CLNORGCODE LIKE @hospid AND CONVERT(VARCHAR(10), OH.BILLDATE, 120) >= @FROMDATE AND CONVERT(VARCHAR(10), OH.BILLDATE, 120) <= @TODATE AND OH.CREATED_BY LIKE @UserId ${Serv_Type_Cond} ${Discount_cond} ${Refund_cond} AND OH.DOCTCD LIKE @DoctCode ORDER BY D.LABDPTDESC `;

    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, UserId: `%${input.UserId}%`, hospid: hospid ? `%${hospid}%` : "%%", DoctCode: `%${input.DoctCode || ''}%` });

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async DeptWiseReportForAccounts(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;

    let hospid='';
    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    const sql = ` SELECT PD.PAYMODE AS BILLPAYMODE, CASE WHEN (OD.PATCNAMT+OD.COMCNAMT)!=0 THEN PD_RF.PAYMODE ELSE '' END AS RF_PAYMODE, OH.DOCTCD, DM1.FIRSTNAME, OH.MEDRECNO Regno, CONVERT(varchar(10), OH.BILLDATE, 103) AS Regdate, OH.PATNAME Patientname, CASE WHEN D.LABDPTDESC IS NULL THEN DDM.DEPTNAME ELSE D.LABDPTDESC END DEPTNAME, S.SERVNAME Investigation, OD.AMOUNT TotalAmt, SERDISCOUNT DiscAmt, OD.AMOUNT - OD.SERDISCOUNT Paid, 0 DueAmt, (OD.PATCNAMT + OD.COMCNAMT) REFUNDAMT, (OD.AMOUNT - (OD.SERDISCOUNT) - (OD.PATCNAMT + OD.COMCNAMT)) NetAmt, U.USERNAME, TM.CLINIC_NAME, ORM.REMARKS, CASE WHEN (OD.PATCNAMT+OD.COMCNAMT)!=0 THEN ORM_RF.REMARKS ELSE '' END AS REFUND_REMARKS FROM OPD_BILLMST OH LEFT JOIN OPD_RECEIPTS ORM ON ORM.OPDBILLNO = OH.BILLNO AND ORM.RCPTTYPE != 'OF' LEFT JOIN OPD_RECEIPTS ORM_RF ON ORM_RF.OPDBILLNO = OH.BILLNO AND ORM_RF.RCPTTYPE = 'OF' LEFT JOIN OPD_BILLTRN OD ON OH.BILLNO = OD.BILLNO LEFT JOIN MST_SERVICES S ON OD.SERVCODE = S.SERVCODE LEFT JOIN MST_DEPARTMENT DDM ON DDM.DEPTCODE = S.DEPTCODE LEFT JOIN DGL_TESTMASTER DM ON DM.TESTCODE = S.SERVCODE LEFT JOIN DGL_LABDEPT D ON D.LABDPTCODE = DM.LABDPTCODE LEFT JOIN MST_USERDETAILS U ON OH.CREATED_BY = U.USERID LEFT JOIN MST_DOCTORMASTER DM1 ON DM1.CODE = OH.DOCTCD INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = OH.CLNORGCODE LEFT JOIN PAYMODE PD ON PD.PAYMODEID = OH.PAYMODE LEFT JOIN PAYMODE PD_RF ON PD_RF.PAYMODEID = ORM_RF.PAYMODE WHERE OH.CLNORGCODE LIKE @hospid AND CONVERT(varchar(10), OH.BILLDATE, 120) >= @FROMDATE AND CONVERT(varchar(10), OH.BILLDATE, 120) <= @TODATE AND OH.CREATED_BY LIKE @UserId AND OH.DOCTCD LIKE @DoctCode ORDER BY D.LABDPTDESC; `;

    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, UserId: `%${input.UserId}%`, hospid: hospid ? `%${hospid}%` : "%%", DoctCode: `%${input.DoctCode || ''}%`, });
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async InvestigationWiseCollection(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;

    let Serv_Type_Cond = '';
    let Serv_Code_Cond = '';
    let hospid = '';

    if (!input.Clinic_Code) {
      hospid = input.SessionHospitalId || '';
    } else if (input.Clinic_Code === '001001001000') {
      hospid = '';
    } else {
      hospid = input.Clinic_Code;
    }

    if (!input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD NOT IN('01','02','03') `;
    } else if (input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD = @Serv_Type `;
    } else if (input.Serv_Type && input.Serv_group) {
      Serv_Type_Cond = ` AND S.SERVTYPECD = @Serv_Type AND D.LABDPTCODE = @Serv_group `;
    }

    if (input.ServCode) {
      Serv_Code_Cond = ` AND S.SERVCODE = @ServCode `;
    }

    const sql = ` SELECT BM.OPREGNO AS REGNO, BM.BILLNO, CONVERT(varchar(10), BM.BILLDATE, 103) AS BILLDATE, BM.PATFNAME AS Patientname, S.SERVCODE, S.SERVNAME AS Investigation, OD.AMOUNT AS TotalAmt, OD.SERDISCOUNT AS DiscAmt, OD.AMOUNT - OD.SERDISCOUNT AS Paid, 0 AS DUEAMT, (OD.PATCNAMT + OD.COMCNAMT) AS REFUND, (OD.AMOUNT - OD.SERDISCOUNT - (OD.PATCNAMT + OD.COMCNAMT)) AS NET, U.USERNAME, TM.CLINIC_NAME FROM  OPD_BILLMST BM LEFT JOIN OPD_BILLTRN OD ON BM.BILLNO = OD.BILLNO LEFT JOIN MST_SERVICES S ON OD.SERVCODE = S.SERVCODE LEFT JOIN DGL_TESTMASTER DM ON DM.TESTCODE = S.SERVCODE LEFT JOIN DGL_LABDEPT D ON D.LABDPTCODE = DM.LABDPTCODE LEFT JOIN MST_USERDETAILS U ON BM.CREATED_BY = U.USERID INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = BM.CLNORGCODE WHERE BM.CLNORGCODE LIKE @hospid AND CONVERT(varchar(10), BM.BILLDATE, 120) >= @FromDate AND CONVERT(varchar(10), BM.BILLDATE, 120) <= @ToDate AND BM.CREATED_BY LIKE @UserID ${Serv_Type_Cond} ${Serv_Code_Cond} AND BM.BILLTYPE = 'OB' ORDER BY 5`;

    try {
      const { records } = await executeDbQuery(sql, { FromDate: input.FROMDATE, ToDate: input.TODATE, hospid: hospid ? `%${hospid}%` : "%%", UserID: `%${input.UserId || ''}%`, Serv_Type: input.Serv_Type || '', Serv_group: input.Serv_group || '', ServCode: input.ServCode || '', });

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async ConsultationWise(req: Request, res: Response): Promise<void> {
    const input = req.method === 'GET' ? req.query : req.body;

    let hospid = '';
    let Case_Cond = "";

    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    
    if (input.Case_NType == "Y" && input.Case_RType == "Y") {
      Case_Cond = " AND OPC.PATTYPE in('New','Old') ";
    }
    else if (input.Case_NType == "Y" && input.Case_RType != "Y") {
      Case_Cond = " AND OPC.PATTYPE in('New') ";
    }
    else if (input.Case_NType != "Y" && input.Case_RType == "Y") {
      Case_Cond = " AND OPC.PATTYPE in('Old') ";
    }

    const sql = ` select  convert(varchar(10),opc.CONSDATE,103) as CONS_DATE, opc.MEDRECNO as YHNUMBER, opc.OPDBILLNO as OPNO_Billno, OM.PATNAME, OM.MOBILENO, D.Firstname as DOCTOR_NAME,SM.Speciality_Name AS DOCT_SPEC, RF.RefDoctor_FName as Referral_Doc, case when opc.PATTYPE='New' then 'REGISTRATION' else 'REVIEW' end    VISIT_TYPE,  opc.PAIDAMT,opc.DOCTCODE,OPC.REGFEE,OPC.CONSFEE,OM.TOTALBILLAMT,OM.TOTDISCOUNT,OM.AMOUNTPAID,0 AS DUEAMOUNT,OM.RFNDAMOUNT,(OM.AMOUNTPAID-OM.RFNDAMOUNT)AS NETAMOUNT,UM.USERNAME,TM.CLINIC_NAME,PM.PAYMODE from OPD_CONSULTATION opc INNER JOIN OPD_BILLMST OM ON OM.BILLNO=OPC.OPDBILLNO left join Mst_DoctorMaster D on D.code=opc.DOCTCODE LEFT JOIN Speciality_Master SM ON SM.Speciality_ID=D.SpecializationId  left join Mst_ReferralDoctor RF on RF.RefDoct_ID=opc.REFDOCT  INNER JOIN Mst_UserDetails UM ON UM.USERID=OM.CREATED_BY  INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE=OM.CLNORGCODE INNER JOIN PayMode PM ON PM.Paymodeid=OM.PAYMODE WHERE  convert(varchar(10), OM.BILLDATE, 120) BETWEEN @FROMDATE  and  @TODATE and opc.CLNORGCODE like @hospid and opc.DOCTCODE like @DOCT_CODE  AND OM.BILLTYPE='OC' AND OM.CREATED_BY LIKE @USERID ${Case_Cond} order by convert(varchar(10), OM.BILLDATE, 112),9,6 `;

    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, hospid: hospid ? `%${hospid}%` : "%%", DOCT_CODE: `%${input.DOCT_CODE}%`, USERID: `%${input.USERID || ''}%` });

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async InvestigationCountWise(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    let hospid = "";
    let Serv_Type_Cond = "";
    let Serv_Code_Cond = "";

    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    if (!input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = " and S.SERVTYPECD not in('01','02','03') ";
    } else if (input.Serv_Type && !input.Serv_group) {
      Serv_Type_Cond = ` and S.SERVTYPECD='${input.Serv_Type}' `;
    } else if (input.Serv_Type && input.Serv_group) {
      Serv_Type_Cond = ` and S.SERVTYPECD='${input.Serv_Type}' and LD.LABDPTCODE='${input.Serv_group}' `;
    }

    if (input.ServCode) {
      Serv_Code_Cond = ` AND S.SERVCODE='${input.ServCode}' `;
    }

    const sql = ` select   S.SERVNAME INVESTIGATION ,COUNT(D.SERVCODE) CNT,SUM(AMOUNT) Invst_Total_Amt,SUM(D.SERDISCOUNT)  Invst_Disc_Amt,SUM(D.AMOUNT - (D.SERDISCOUNT)) AS Invst_Paid_Amt,0 Invst_Due_Amt ,SUM(D.PATCNAMT + D.COMCNAMT) AS REFUND,  SUM( D.AMOUNT - (D.SERDISCOUNT) - ((D.PATCNAMT + D.COMCNAMT))) NETAMT,TM.CLINIC_NAME from OPD_BILLMST BM INNER JOIN OPD_BILLTRN D ON D.BILLNO = BM.BILLNO INNER JOIN MST_SERVICES S ON S.SERVCODE = D.SERVCODE left join DGL_TESTMASTER DM on DM.TESTCODE=S.SERVCODE LEFT JOIN DGL_LABDEPT LD ON LD.LABDPTCODE = DM.LABDPTCODE INNER JOIN Mst_UserDetails UM ON UM.USERID = BM.CREATED_BY INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE=BM.CLNORGCODE WHERE convert(varchar(10), Bm.BILLDATE, 120) between @FROMDATE and @TODATE AND BM.CLNORGCODE like @hospid AND BM.CREATED_BY LIKE @UserID ${Serv_Type_Cond} ${Serv_Code_Cond} and BM.BILLTYPE = 'OB' GROUP BY S.SERVNAME, TM.CLINIC_NAME ORDER BY 1 `;

    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, hospid: hospid ? `%${hospid}%` : "%%", UserID: `%${input.UserID || ""}%` });

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getPaymodeWiseDetails(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    if (
      containsSpecialCharacters(input.FROMDATE) ||
      containsSpecialCharacters(input.TODATE) ||
      containsSpecialCharacters(input.Case_CashType) ||
      containsSpecialCharacters(input.Case_ChequeType) ||
      containsSpecialCharacters(input.Case_CardType) ||
      containsSpecialCharacters(input.Case_OnlineType) ||
      containsSpecialCharacters(input.UserId) ||
      containsSpecialCharacters(input.Clinic_Code)
    ) {
      res.json({ status: 1, result: [], message:"Please avoid special characters in fields" }); 
      return;
    }

    let hospid = "";
    if (!input.Clinic_Code) {
      hospid = input.hospitalId || "";
    } else if (input.Clinic_Code === "001001001000") {
      hospid = "";
    } else {
      hospid = input.Clinic_Code;
    }

    let DD = "";
    if (input.Case_CashType === "Y") DD += "'001',";
    if (input.Case_ChequeType === "Y") DD += "'002',";
    if (input.Case_CardType === "Y") DD += "'004','005','006',";
    if (input.Case_OnlineType === "Y") DD += "'008',";

    let PayMode_Cond = "";
    if (DD) {
      DD = DD.substring(0, DD.length - 1);
      PayMode_Cond = ` AND ORM.PAYMODE in(${DD})`;
    }

    const sql = `select TM.CLINIC_NAME,UM.USERNAME, BM.MEDRECNO, BM.OPREGNO AS REGNO,BM.BILLNO,convert(varchar(10),BM.BILLDATE,103) as BILLDATE,orm.RECEIPTNO,convert(varchar(10),ORM.RECEIPTDATE,103) as RECEIPTDATE  ,BM.PATNAME AS Patientname, RF.RefDoctor_FName AS REF_DOC ,BM.TOTALBILLAMT,BM.TOTDISCOUNT,BM.AMOUNTPAID,0 AS DUEAMOUNT,0 RFNDAMOUNT,(BM.AMOUNTPAID)AS NETAMOUNT,  case when bm.paymode = '001' then bm.AMOUNTPAID else 0 end CASH, CASE WHEN BM.PAYMODE IN('004','006') THEN bm.AMOUNTPAID else 0 end CC,CASE WHEN BM.PAYMODE = '002' THEN bm.AMOUNTPAID  else 0 end Cheque, CASE WHEN BM.PAYMODE IN('005','008') THEN bm.AMOUNTPAID else 0 end ONLINE_PAYMENT from OPD_BILLMST BM inner join OPD_RECEIPTS ORM ON ORM.OPDBILLNO = BM.BILLNO left join Mst_ReferralDoctor RF on RF.RefDoct_ID = BM.REFDOCTCD INNER JOIN Mst_UserDetails UM ON UM.USERID = BM.CREATED_BY INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = BM.CLNORGCODE WHERE convert(varchar(10), Bm.BILLDATE, 120)>= @FROMDATE and convert(varchar(10), Bm.BILLDATE, 120)<= @TODATE AND BM.CREATED_BY LIKE @UserId AND BM.CLNORGCODE like @hospid ${PayMode_Cond}  and orm.RCPTTYPE != 'OF' union all select TM.CLINIC_NAME,UM.USERNAME, BM.MEDRECNO, BM.OPREGNO AS REGNO,BM.BILLNO,convert(varchar(10), BM.BILLDATE, 103) as BILLDATE,orm.RECEIPTNO ,convert(varchar(10), ORM.RECEIPTDATE, 103) as RECEIPTDATE ,BM.PATNAME AS Patientname, RF.RefDoctor_FName AS REF_DOC ,0 TOTALBILLAMT,0 TOTDISCOUNT,0 AMOUNTPAID,0 AS DUEAMOUNT, BM.RFNDAMOUNT,-1 * (orm.amount)AS NETAMOUNT,  case when ORM.paymode = '001' then - 1 * (ORM.AMOUNT) else 0 end CASH, CASE WHEN ORM.PAYMODE IN('004','006') THEN - 1 * (ORM.AMOUNT) else 0 end CC,    CASE WHEN ORM.PAYMODE = '002' THEN - 1 * (ORM.AMOUNT)  else 0 end Cheque, CASE WHEN ORM.PAYMODE IN('005','008') THEN - 1 * (ORM.AMOUNT) else 0 end ONLINE_PAYMENT from OPD_BILLMST BM inner join OPD_RECEIPTS ORM ON ORM.OPDBILLNO = BM.BILLNO left join Mst_ReferralDoctor RF on RF.RefDoct_ID = BM.REFDOCTCD INNER JOIN Mst_UserDetails UM ON UM.USERID = BM.CREATED_BY INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = ORM.CLNORGCODE WHERE convert(varchar(10), Bm.BILLDATE, 120)>= @FROMDATE and convert(varchar(10), Bm.BILLDATE, 120)<= @TODATE AND BM.CREATED_BY LIKE @UserId AND BM.CLNORGCODE like @hospid ${PayMode_Cond}   and orm.RCPTTYPE = 'OF' order by 5,6,7`;

    try {
      const { records } = await executeDbQuery(sql, { FROMDATE: input.FROMDATE, TODATE: input.TODATE, hospid: hospid ? `%${hospid}%` : "%%", UserId: `%${input.UserId || ""}%` });

      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }


}