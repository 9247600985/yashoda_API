import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { containsSpecialCharacters, numberToWords } from "../../utilities/helpers";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";
const moment = require('moment');

export default class creditNoteController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/op", this.router);

        this.router.get("/getBillDetails", authenticateToken, this.getBillDetails.bind(this));
        this.router.get("/getBillDetailByBillNo", authenticateToken, this.getBillDetailByBillNo.bind(this));
        this.router.get("/getServicesByBillNo", authenticateToken, this.getServicesByBillNo.bind(this));
        this.router.get("/checkServCodeType", authenticateToken, this.checkServCodeType.bind(this));
        this.router.get("/getCount", authenticateToken, this.getCount.bind(this));
        this.router.get("/DisplayCreditNoteRefundRecpt", authenticateToken, this.BindPrintCreditNoteRefundRecpt.bind(this));
        this.router.get("/GetCNSearchDetails", authenticateToken, this.GetSearchDetails.bind(this));
        this.router.get("/GET_TAB_SEARCH_DETAILS_CN", authenticateToken, this.GET_TAB_SEARCH_DETAILS.bind(this));
        this.router.get("/getPreviousCNAmountByBill", authenticateToken, this.getPreviousCNAmountByBill.bind(this));
        this.router.post("/saveCreditNote", authenticateToken, this.saveCreditNote.bind(this));
        this.router.post("/saveIPAddress_OPDBILLMST_CN", authenticateToken, this.saveIPAddress_OPDBILLMST.bind(this));

    }

    async getBillDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sql = `select pm.FirstName, BILLNO, BILLDATE, MEDRECNO, TOTALBILLAMT, CNAMOUNT, PATCNAMT from opd_billmst ob left join Patient_Master pm on ob.MEDRECNO = pm.PatientMr_No where ob.billno like @BillNo and ob.STATUS<>'C' and OB.CLNORGCODE=@CLNORGCODE`;

            const params = { BillNo: `%${input.BillNo}%`, CLNORGCODE: input.HospitalId, };

            const { records } = await executeDbQuery(sql, params);

            const list = records.map((r: any) => ({
                PATIENTNAME: r.FirstName || "",
                BILLNO: r.BILLNO || "",
                BILLDATE: r.BILLDATE ? moment(r.BILLDATE).format("DD/MM/YYYY HH:mm") : "",
                MRNUMBER: r.MEDRECNO || "",
                PATBILLAMT: parseFloat(r.TOTALBILLAMT).toFixed(2) ?? "",
                CNAMT: parseFloat(r.CNAMOUNT).toFixed(2) ?? "",
                PATCNAMT: parseFloat(r.PATCNAMT).toFixed(2) ?? "",
            }));

            res.json({ status: 0, d: list });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getBillDetailByBillNo(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sql = `select RM.RefDoctor_FName, op.CRDCOMPCD,c.Name,op.Billno,convert(varchar(10),op.Billdate,103)Billdate,op.MEDRECNO,(select patient_name from patient_master where patientmr_NO = medrecno ) PATNAME,op.AGE,op.SEX, op.TOTALBILLAMT, isnull((op.AMOUNTPAID+op.AMOUNTRCVD),0) as RecdAmt,op.CNAMOUNT, op.RFNDAMOUNT , (isnull(op.TOTALBILLAMT,0)- isnull(op.TOTDISCOUNT,0)-isnull(op.CNAMOUNT,0) - isnull((op.AMOUNTPAID+op.AMOUNTRCVD),0))  as DueAmt ,  op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE,  op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO,op.MOBILENO FROM OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG left join Company c on c.Com_Id=op.CRDCOMPCD LEFT JOIN Mst_ReferralDoctor RM ON RM.RefDoct_ID=OP.REFDOCTCD where (op.TOTALBILLAMT-op.TOTDISCOUNT-op.RFNDAMOUNT)>=0  and  op.BILLNO like @BillNo  and op.CLNORGCODE=@CLNORGCODE and op.STATUS<>'C'`;

            const params = { BillNo: `%${input.BillNo}%`, CLNORGCODE: input.HospitalId || "", };

            const { records } = await executeDbQuery(sql, params);

            const list = records.map((r: any) => ({
                BILLNO: r.Billno || "",
                BILLDATE: r.Billdate ? moment(r.Billdate, "DD/MM/YYYY").format("DD/MM/YYYY") : "", MRNUMBER: r.MEDRECNO || "",
                PATNAME: r.PATNAME || "",
                AGE: r.AGE || "",
                GENDER: r.SEX || "",
                CREATED_BY: r.CREATED_BY || "",
                DEPTCODE: r.DEPTCODE || "",
                DEPTNAME: r.DEPTNAME || "",
                TARIFFID: r.TARIFFID || "",
                PATCATGCD: r.PATCATG || "",
                PAYMODE: r.PAYMODE || "",
                OPCONSNO: r.OPCONSNO || "",
                DOCTCD: r.DOCTCD || "",
                DOCTCODE: r.Code || "",
                DOCTNAME: r.Firstname || "",
                TARIFFDESC: r.TARIFFDESC || "",
                PATCATGNAME: r.PC_Name || "",
                OPDREGNO: r.OPDREGNO || "",
                COMPANYID: r.CRDCOMPCD || "",
                COMPANYNAME: r.Name || "",
                REFDOCTNAME: r.RefDoctor_FName || "",
                MOBILENO: r.MOBILENO || "",
                PATBILLAMT: parseFloat(r.TOTALBILLAMT).toFixed(2) ?? "",
                PATRCVDAMT: parseFloat(r.RecdAmt).toFixed(2) ?? "",
                PATCNAMT: parseFloat(r.CNAMOUNT).toFixed(2) ?? "",
                PATRFNDAMT: parseFloat(r.RFNDAMOUNT).toFixed(2) ?? "",
                PATDUEAMT: parseFloat(r.DueAmt).toFixed(2) ?? "",
            }));

            res.json({ status: 0, d: list });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getServicesByBillNo(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sql = `select opd_billtrn.srvtypcode,opd_billtrn.patcnamt,opd_billtrn.comcnamt,opd_billtrn.slno sno, mst_services.SERVCODE, mst_services.servname, PATCNAMT,(CASE WHEN opd_billtrn.BILLTYPE='OB' THEN AMOUNT-SERDISCOUNT ELSE AMOUNT-(PATDISC+COMDISC) END) AS AMOUNT from opd_billtrn inner join mst_services on mst_services.servcode = opd_billtrn.SERVCODE where billno=@billNo order by opd_billtrn.slno`;

            const params = { billNo: input.BillNo };

            const { records } = await executeDbQuery(sql, params);

            const list = records.map((r: any) => ({
                SERVTYPCODE: r.srvtypcode || "",
                SERVCODE: r.SERVCODE || "",
                SERVNAME: r.servname || "",
                PATCNAMT: Number(r.PATCNAMT || 0) > 0 ? r.PATCNAMT?.toString() || "" : r.comcnamt?.toString() || "0.00",
                AMOUNT: parseFloat(r.AMOUNT).toFixed(2) ?? "0.00",
            }));

            res.json({ status: 0, d: list });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async checkServCodeType(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const servCode = input.servCode || "";
        const srvTypeCd = input.srvTypeCd || "";
        const billNo = input.billNo || "";

        try {
            let sql = "";

            if (srvTypeCd === "01") {
                sql = `select count(*) as Cnt from DGL_ORDERMST dom inner join DGL_ORDERTRN dot on dot.ORDERNO = dom.ORDERNO where dom.BILLNO = @BillNo and dot.testcode = @ServCode and dot.SAMPLESTATUS<>'OP' and dot.TESTSTATUS<>'OP'`;

            } else if (srvTypeCd === "02") {
                sql = `select count(*) as Cnt from DGR_ORDERMST dom inner join DGR_ORDERTRN dot on dot.ORDERNO = dom.ORDERNO where dom.BILLNO = @BillNo and dot.testcode = @ServCode and dot.SAMPLESTATUS<>'OP' and dot.TESTSTATUS<>'OP'`;

            } else if (srvTypeCd === "03") {
                sql = `select count(*) as Cnt from DGC_ORDERMST dom inner join DGC_ORDERTRN dot on dot.ORDERNO = dom.ORDERNO where dom.BILLNO = @BillNo and dot.testcode = @ServCode and dot.SAMPLESTATUS<>'OP' and dot.TESTSTATUS<>'OP'`;

            } else {
                res.json({ status: 1, result: "Invalid service type code" });
                return;
            }

            const params = { BillNo: billNo, ServCode: servCode };

            const { records } = await executeDbQuery(sql, params);
            const count = records.length ? Number(records[0].Cnt) : 0;

            res.json({ status: 0, d: count });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getCount(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sql = "select COUNT(CNTRN_ID) as CNTRNID_CNT from opd_cntrn";

            const { records } = await executeDbQuery(sql, []);
            const count = records.length ? Number(records[0].CNTRNID_CNT) : 0;

            res.json({ status: 0, d: count });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async BindPrintCreditNoteRefundRecpt(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const BILLNO = input.BILLNO || "";
        const TRANNO = input.TRANNO || "";

        try {
            let sql = `SELECT DISTINCT OPDC.SERVCODE,MSTS.SERVNAME,OPDBT.PATAMOUNT PATSERVAMT,OPDBT.COMAMOUNT COMSERVAMT,OPDC.PATCNAMT,OPDC.COMCNAMT,  OPDC.PATPAYAMT,OPDC.COMPAYAMT,ISNULL(CNTYP.Credit_Desc,'') AS Credit_Desc FROM OPD_CNTRN OPDC INNER JOIN  OPD_CNMST OPDM ON OPDC.OPCNNO=OPDM.OPCNNO INNER JOIN OPD_BILLTRN OPDBT ON OPDC.SERVCODE=OPDBT.SERVCODE INNER JOIN MST_SERVICES MSTS ON OPDC.SERVCODE=MSTS.SERVCODE LEFT JOIN Mst_CreditDebitNote CNTYP ON OPDC.CNTYPCD=CNTYP.Credit_Code WHERE  OPDBT.BILLNO=@BILLNO`;

            const params: any = { BILLNO };

            if (TRANNO) {
                sql += " AND OPDC.OPCNNO = @TRANNO";
                params.TRANNO = TRANNO;
            }

            const { records } = await executeDbQuery(sql, params);

            let PATCNAMOUNT = 0;
            let COMPCNAMOUNT = 0;

            const details = records.map((r: any) => {
                const patientCnamt = Number(r.PATCNAMT || 0.00);
                const companyCnamt = Number(r.COMCNAMT || 0.00);
                PATCNAMOUNT += patientCnamt;
                COMPCNAMOUNT += companyCnamt;
                return {
                    SERVCODE: r.SERVCODE || "",
                    SERVNAME: r.SERVNAME || "",
                    PATSERVAMT: parseFloat(r.PATSERVAMT).toFixed(2) ?? "",
                    COMSERVAMT: parseFloat(r.COMSERVAMT).toFixed(2) ?? "",
                    PATCNAMT: parseFloat(r.PATCNAMT).toFixed(2) ?? "",
                    COMCNAMT: parseFloat(r.COMCNAMT).toFixed(2) ?? "",
                    PATPAYAMT: parseFloat(r.PATPAYAMT).toFixed(2) ?? "",
                    COMPAYAMT: parseFloat(r.COMPAYAMT).toFixed(2) ?? "",
                    CNTYPCD: r.Credit_Desc || ""
                };
            });


            const user1: any = {};
            if (PATCNAMOUNT > 0) {
                const Net = Math.round(PATCNAMOUNT);
                user1.NETAMT = Net.toFixed(2);
                user1.NETAMTWORDS = `Rupees ${numberToWords(Net)} only.`;
            } else if (COMPCNAMOUNT > 0) {
                const Net = Math.round(COMPCNAMOUNT);
                user1.NETAMT = Net.toFixed(2);
                user1.NETAMTWORDS = `Rupees ${numberToWords(Net)} only.`;
            }
            details.push(user1);

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetSearchDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const cnno = input.cnno || "";
            const billno = input.billno || "";
            const CN_Status = input.CN_Status || "";
            const Ref_Status = input.Ref_Status || "";

            let sql = `Select CNM.OPCNNO,CNM.OPBILLNO,BM.BILLDATE,PM.FirstName,PM.Age, PM.Gender,CNM.PATCNAMT,CNM.COMCNAMT,CNM.STATUS as cnstatus,CNM.RFSTATUS,CNM.CREATED_BY  from OPD_CNMST CNM LEFT JOIN OPD_BILLMST BM ON CNM.OPBILLNO=BM.BILLNO LEFT JOIN Patient_Master PM ON PM.PatientMr_No = BM.MEDRECNO  WHERE CNM.CLNORGCODE=@hospid AND convert(varchar(10), CNM.CREATED_ON, 120)   between @fromdate AND @todate`;

            const params = { hospid: input.HospitalId, fromdate: input.fromdate, todate: input.todate, cnno: `%${cnno}%`, billno: `%${billno}%`, CN_Status, Ref_Status, };

            if (cnno) sql += " AND CNM.OPCNNO LIKE @cnno";
            if (billno) sql += " AND CNM.OPBILLNO LIKE @billno";
            if (CN_Status) sql += " AND CNM.STATUS = @CN_Status";
            if (Ref_Status) sql += " AND CNM.RFSTATUS = @Ref_Status";

            const { records } = await executeDbQuery(sql, params);

            let totCnAmt = 0;
            let html = `
      <caption>Category Wise Patient</caption>
      <thead>
        <tr class='success'>
          <th style='text-align:left;'>Credit Note No.</th>
          <th style='text-align:left;'>Bill No.</th>
          <th style='text-align:left;'>Bill Date</th>
          <th style='text-align:left;'>Patient Name</th>
          <th style='text-align:right;'>Age</th>
          <th style='text-align:left;'>Sex</th>
          <th style='text-align:right;'>Credit Note Amount</th>
          <th style='text-align:left;'>CN.Status</th>
          <th style='text-align:left;'>RF.Status</th>
          <th style='text-align:left;'>Created By</th>
        </tr>
      </thead>
      <tbody>
    `;

            records.forEach((r: any) => {
                const patCnamt = Number(r.PATCNAMT || 0) > 0 ? Number(r.PATCNAMT || 0) : Number(r.COMCNAMT || 0);

                html += `
        <tr class='success'>
          <td style='text-align:left;'>${r.OPCNNO ?? ""}</td>
          <td style='text-align:left;'>${r.OPBILLNO ?? ""}</td>
          <td style='text-align:left;'>${moment(r.BILLDATE).format("DD/MM/YYYY HH:mm") ?? ""}</td> 
          <td style='text-align:left;'>${r.FirstName ?? ""}</td>
          <td style='text-align:left;'>${r.Age ?? ""}</td>
          <td style='text-align:left;'>${r.Gender ?? ""}</td>
          <td style='text-align:right;'>${patCnamt.toFixed(2)}</td>
          <td style='text-align:left;'>${r.cnstatus ?? ""}</td>
          <td style='text-align:left;'>${r.RFSTATUS ?? ""}</td>
          <td style='text-align:left;'>${r.CREATED_BY ?? ""}</td>
        </tr>
      `;
                totCnAmt += patCnamt;
            });

            html += `
      </tbody>
      <tfoot>
        <tr style='color:blue;'>
          <td></td><td></td><td></td><td></td><td></td>
          <td style='text-align:left;'>Total</td>
          <td style='text-align:right;'>(${totCnAmt.toFixed(2)})</td>
          <td></td><td></td><td></td>
        </tr>
      </tfoot>
    `;

            res.json({ status: 0, d: html });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GET_TAB_SEARCH_DETAILS(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const BILLNO = input.BILLNO || "";
        const CNNO = input.CNNO || "";

        try {
            const sql = `select T.Slno sno,M.OPBILLNO,M.OPCNNO,M.OPCNDATE,M.OPBILLNO,T.SERVCODE, sc.NETRATE,S.SERVNAME,T.CNTYPCD,T.PATPAYAMT,ISNULL(T.COMCNAMT,0) COMCNAMT,ISNULL(T.PATCNAMT,0) PATCNAMT,BM.BILLNO, BM.BILLDATE,  BM.PATBILLAMT,BM.AMOUNTRCVD,BM.CNAMOUNT,BM.RFNDAMOUNT, BM.MEDRECNO,BM.TARIFFID,BM.PATCATG,BM.DEPTCODE,PM.FirstName,PM.Age,PM.Gender, m.AUTHCODE,m.REMARKS,m.CNTRCODE,m.PATCNAMT as totcnamount from OPD_CNMST M LEFT JOIN OPD_CNTRN T ON T.OPCNNO = M.OPCNNO LEFT JOIN OPD_BILLMST BM  ON  BM.BILLNO=M.OPBILLNO LEFT JOIN MST_SERVICES S ON S.SERVCODE=T.SERVCODE LEFT JOIN Patient_Master PM ON PM.PatientMr_No = BM.MEDRECNO left join OPD_BILLTRN sc on sc.SERVCODE=s.SERVCODE and sc.BILLNO =  M.OPBILLNO WHERE M.OPBILLNO=@BILLNO AND M.OPCNNO=@CNNO order by T.Slno`;

            const params = { BILLNO, CNNO };

            const { records } = await executeDbQuery(sql, params);

            const details = records.map((r: any) => ({
                OPBILLNO: r.OPBILLNO || "",
                OPCNNO: r.OPCNNO || "",
                OPCNDATE: r.OPCNDATE || "",
                SERVCODE: r.SERVCODE || "",
                SERVNAME: r.SERVNAME || "",
                CNTYPCD: r.CNTYPCD || "",
                PATPAYAMT: r.PATPAYAMT?.toString() ?? "",
                PATCNAMT: Number(r.PATCNAMT || 0) > 0 ? r.PATCNAMT.toString() : r.COMCNAMT?.toString() ?? "",
                BILLNO: r.BILLNO || "",
                BILLDATE: moment(r.BILLDATE).format("DD/MM/YYYY HH:mm") ?? "",
                PATBILLAMT: r.PATBILLAMT?.toString() ?? "",
                AMOUNTRCVD: r.AMOUNTRCVD?.toString() ?? "",
                CNAMOUNT: r.CNAMOUNT?.toString() ?? "",
                RFNDAMOUNT: r.RFNDAMOUNT?.toString() ?? "",
                MEDRECNO: r.MEDRECNO || "",
                TARIFFID: r.TARIFFID || "",
                PATCATG: r.PATCATG || "",
                DEPTCODE: r.DEPTCODE || "",
                FirstName: r.FirstName || "",
                Age: r.Age?.toString() ?? "",
                Gender: r.Gender || "",
                NETRATE: r.NETRATE?.toString() ?? "",
                CNTRCODE: r.CNTRCODE || "",
                REMARKS: r.REMARKS || "",
                totcnamount: r.totcnamount?.toString() ?? "",
                AUTHCODE: r.AUTHCODE || ""
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getPreviousCNAmountByBill(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const BILLNO = input.BILLNO;

        try {
            const sql = `SELECT BT.SERVCODE,BT.PATCNAMT,BT.COMCNAMT FROM OPD_BILLMST BM INNER JOIN OPD_BILLTRN BT ON BM.BILLNO=BT.BILLNO WHERE BM.BILLNO=@BILLNO`;

            const params = { BILLNO };

            const { records } = await executeDbQuery(sql, params);

            const list = records.map((r: any) => ({
                SERVCODE: r.SERVCODE || "",
                PATCNAMT: Number(r.PATCNAMT || 0) > 0 ? r.PATCNAMT?.toString() ?? "0.00" : r.COMCNAMT?.toString() ?? ""
            }));

            res.json({ status: 0, d: list });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async saveCreditNote(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const sessionHospId = input.HospId;
            const sessionUID = input.userId;

            const sp1Name = "INSERT_OPD_CNMST";

            const sp1Params = {
                CLNORGCODE: sessionHospId,
                CNTRCODE: input.getUI?.CNTRCODE,
                OPBILLNO: input.getUI?.OPBILLNO,
                AUTHCODE: input.getUI?.AUTHCODE,
                REMARKS: input.getUI?.REMARKS,
                FUNDSOURCE: "N",
                DEPTCODE: input.getUI?.DEPTCODE,
                PATCNAMT: parseFloat(input.getUI?.PATCNAMT) || 0,
                COMCNAMT: parseFloat(input.getUI?.COMCNAMT) || 0,
                POSTFLAG: "N",
                DOCTPOST: "N",
                DOCTPOSTDT: input.getUI?.DOCTPOSTDT,
                LEDGPOST: "N",
                CREATED_BY: sessionUID,
                STATUS: input.getUI?.STATUS || "A",
                REFSTATUS: "P",
                DISCCATG: input.getUI?.DiscCatg,
                OPDREGNO: input.getUI?.OPDREGNO,
                // two OUTPUT params must be registered as descriptors
                FINYEAROUT: { type: sql.VarChar(10), direction: "output" },
                CNMSTNOOUT: { type: sql.VarChar(30), direction: "output" }
            };

            const { output: sp1Output } = await executeDbQuery(sp1Name, sp1Params, { transaction, isStoredProc: true });

            const creditNoteNo = sp1Output?.CNMSTNOOUT;
            const finYear = sp1Output?.FINYEAROUT;

            const company = input.getUI?.COMPANY || "";
            const dueAmt = parseFloat(input.getUI?.Due_Amount) || 0;

            if (company === "" || dueAmt === 0) {
                const sp2Name = "INSERT_CNREFUND";

                const sp2Params = {
                    CLNORGCODE: sessionHospId,
                    MEDRECNO: input.getUII?.MEDRECNO,
                    CNTRCODE: input.getUI?.CNTRCODE,
                    RCPTTYPE: input.getUII?.RCPTTYPE,
                    OPDBILLNO: input.getUI?.OPBILLNO,
                    PAYMODE: input.getUII?.PAYMODE,
                    CHEQUEDDNO: input.getUII?.CHEQUEDDNO,
                    CHEQUEDATE: input.getUII?.CHEQUEDATE,
                    BANKNAME: input.getUII?.BANKNAME,
                    RCVDFROM: input.getUII?.RCVDFROM,
                    REMARKS: input.getUI?.REMARKS,
                    AMOUNT: parseFloat(input.getUII?.AMOUNT) || 0,
                    DEPTCODE: input.getUI?.DEPTCODE,
                    CREATED_BY: sessionUID,
                    EDITED_BY: sessionUID,
                    PC_Code: input.getUII?.PC_Code,
                    TARIFFID: input.getUII?.TARIFFID,
                    REVISIONID: "",
                    CNNO: creditNoteNo,
                    OPDREGNO: input.getUI?.OPDREGNO
                };

                await executeDbQuery(sp2Name, sp2Params, { transaction, isStoredProc: true });
            }


            for (const row of input.DetailRows || []) {
                const insQuery = `INSERT INTO OPD_CNTRN (SLNO, OPCNNO, CLNORGCODE, FINYEAR, CNTRCODE, SERVCODE, CNTYPCD, FUNDSOURCE, DEPTCODE, PATCNAMT, COMCNAMT, PATPAYAMT, COMPAYAMT, CREATED_BY, CREATED_ON, EDITED_ON, STATUS) VALUES (@SLNO, @OPCNNO, @CLNORGCODE, @FINYEAR, @CNTRCODE, @SERVCODE, @CNTYPCD, @FUNDSOURCE, @DEPTCODE, @PATCNAMT, @COMCNAMT, @PATPAYAMT, @COMPAYAMT, @CREATED_BY, GETDATE(), GETDATE(), 'A') `;

                const insParams = {
                    SLNO: row.SlNo,
                    OPCNNO: creditNoteNo,
                    CLNORGCODE: sessionHospId,
                    FINYEAR: finYear,
                    CNTRCODE: row.CounterCode,
                    SERVCODE: row.ServCode,
                    CNTYPCD: row.CNTYPE,
                    FUNDSOURCE: "N",
                    DEPTCODE: row.Dept,
                    PATCNAMT: row.patAmount,
                    COMCNAMT: row.CompCNAmount,
                    PATPAYAMT: row.PATPAYMENT,
                    COMPAYAMT: row.COMPAYMENT,
                    CREATED_BY: sessionUID
                };
                await executeDbQuery(insQuery, insParams, { transaction });
            }


            if (input.checked === "Y") {
                for (const row of (input.DetailRows || []).filter((r: any) => r.Checked === "Y")) {
                    const updParams = {
                        BILLNO: row.BillNo,
                        MRNO: row.MRNo,
                        SERVCODE: row.ServCode,
                        Hosp: sessionHospId
                    };

                    const updQuery = `UPDATE dgl_ordertrn SET SAMPLESTATUS='C', TESTSTATUS='C' WHERE orderno IN ( SELECT ORDERNO FROM dgl_ordermst WHERE billno=@BILLNO AND medrecno=@MRNO AND clnorgcode=@Hosp ) AND servcode=@SERVCODE AND clnorgcode=@Hosp; UPDATE dgr_ordertrn SET SAMPLESTATUS='C', TESTSTATUS='C' WHERE orderno IN ( SELECT ORDERNO FROM dgr_ordermst WHERE billno=@BILLNO AND  medrecno=@MRNO AND clnorgcode=@Hosp ) AND servcode=@SERVCODE AND clnorgcode=@Hosp; UPDATE dgc_ordertrn SET SAMPLESTATUS='C', TESTSTATUS='C' WHERE orderno IN ( SELECT ORDERNO FROM dgc_ordermst WHERE billno=@BILLNO AND medrecno=@MRNO AND clnorgcode=@Hosp
           ) AND servcode=@SERVCODE AND clnorgcode=@Hosp; `;

                    await executeDbQuery(updQuery, updParams, { transaction });
                }
            }


            for (const upd of input.getUII?.ServiceUpdates || []) {
                const upQuery =
                    upd.companyId && upd.payMode === "003"
                        ? `UPDATE opd_billtrn SET comcnamt = ISNULL(comcnamt,0)+@patCnAmt, net = net - @patCnAmt, Edited_By = @EditedBy, Edited_On = GETDATE() WHERE billno=@billno AND servcode=@servcode` : `UPDATE opd_billtrn SET patcnamt = ISNULL(patcnamt,0)+@patCnAmt, net = net - @patCnAmt, Edited_By = @EditedBy, Edited_On = GETDATE() WHERE billno=@billno AND servcode=@servcode`;

                const upParams = {
                    patCnAmt: upd.patCnAmt,
                    EditedBy: sessionUID,
                    billno: input.getUII.OPBILLNO,
                    servcode: upd.servCode
                };
                await executeDbQuery(upQuery, upParams, { transaction });
            }


            await transaction.commit();

            res.json({
                status: 0,
                message: "Credit note saved successfully",
                result: { CreditNoteNo: creditNoteNo, FinYear: finYear }
            });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async saveIPAddress_OPDBILLMST(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const USERID = input.USERID;
            const USERNAME = input.USERNAME;
            const IPAddress = input.IPAddress;
            const MRNO = input.MRNO;
            const BILLNO = input.BILLNO;

            const query = ` INSERT INTO OPD_BILLMST_AUDIT SELECT  *, @USERID AS USERID, @USERNAME AS USERNAME, @IPAddress AS SYSTEM_IPADDRESS, GETDATE() AS INSERTED_ON FROM OPD_BILLMST WHERE MEDRECNO = @MRNO AND BILLNO = @BILLNO `;

            const params = { USERID, USERNAME, IPAddress, MRNO, BILLNO };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({
                status: 0,
                message: "IP address and bill details saved successfully."
            });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({
                status: 1,
                message: err.message
            });
        }
    }

}