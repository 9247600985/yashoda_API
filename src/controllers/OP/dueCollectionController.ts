import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { containsSpecialCharacters, numberToWords } from "../../utilities/helpers";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";
const moment = require('moment');

export default class dueCollectionController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/op", this.router);    

        this.router.get("/getAllDueBillByConsultation", authenticateToken, this.getAllDueBillByConsultation.bind(this));
        this.router.get("/GETBIllDEt_Help", authenticateToken, this.getBillDetails.bind(this));
        this.router.get("/GetSearchDetailsDc", authenticateToken, this.getSearchDetails.bind(this));
        this.router.get("/GVServBook_SelectedIndexChanged", authenticateToken, this.getReceiptDetails.bind(this));
        this.router.post("/saveDueCollection", authenticateToken, this.saveDueCollection.bind(this));

    }

    async getAllDueBillByConsultation(req: Request, res: Response) {
        const input = req.body || req.query;

        const sqlText = `select BILLTYPE, BILLDATE, BILLNO, TOTALBILLAMT, TOTDISCOUNT, AMOUNTPAID, RFNDAMOUNT,(TOTALBILLAMT-TOTDISCOUNT-AMOUNTPAID-RFNDAMOUNT-AMOUNTRCVD) as Due from OPD_BILLMST where MEDRECNO=@MRNO AND STATUS='A' and (TOTALBILLAMT-TOTDISCOUNT-AMOUNTPAID-RFNDAMOUNT-AMOUNTRCVD)>0 order by BILLTYPE, BILLDATE `;

        try {
            const data = await executeDbQuery(sqlText, { MRNO: input.MRNO }, {});
            const rows = data.records.map((r: any) => ({
                BILLDATE: r.BILLDATE ? moment(r.BILLDATE).format("DD/MM/YYYY HH:mm") : "",
                BILLNO: r.BILLNO || "",
                BILLTYPE: r.BILLTYPE || "",
                TOTALBILLAMT: parseFloat(r.TOTALBILLAMT).toFixed(2) || "0.00",
                TOTDISCOUNT: parseFloat(r.TOTDISCOUNT).toFixed(2) || "0.00",
                AMOUNTPAID: parseFloat(r.AMOUNTPAID).toFixed(2) || "0.00",
                RFNDAMOUNT: parseFloat(r.RFNDAMOUNT).toFixed(2) || "0.00",
                DUEAMOUNT: parseFloat(r.Due).toFixed(2) || "0.00"
            }));

            res.json({ status: 0, d: rows });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getBillDetails(req: Request, res: Response) {
        const input = req.body || req.query;
        const HOSPITALID = input.HospitalId;
        const DOCTCODE = input.DOCTCODE;
        const BillNo = input.BillNo;
        const BillType = input.billtype;
        const Counter = "OP1";
        let compId = "";
        let query = "";

        try {

            if (BillType === "OB") {
                const compRes = await executeDbQuery(`SELECT COMP_ID FROM PATIENT_MASTER WHERE PATIENTMR_NO IN(SELECT MEDRECNO FROM OPD_BILLMST OP WHERE op.BILLNO like @BillNo)`, { BillNo: `%${BillNo}%` }, {});

                compId = compRes.records?.[0]?.COMP_ID || "";

                if (!compId.trim()) {
                    query = ` select op.Billno,op.Billdate,op.MEDRECNO,(select patient_name from patient_master where patientmr_NO = medrecno ) PATNAME,op.AGE,op.SEX, op.PATBILLAMT, isnull((op.PATAMTRCVD+PATAMTPAID),0) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.PATBILLAMT-op.PATDISCUNT- isnull(op.PATAMTPAID,0)- isnull(op.PATAMTRCVD,0) - isnull(op.PATCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE, op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG where (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-ISNULL(op.PATAMTRCVD,0)-ISNULL(op.PATCNAMT,0)+ISNULL(op.RFNDAMOUNT,0))  >0 and op.BILLTYPE = @BILLTYPE and op.BILLNO like @BillNo and op.CLNORGCODE=@HOSPITALID`;

                } else {
                    query = `select op.Billno,op.Billdate,op.MEDRECNO,(select patient_name from patient_master where patientmr_NO = medrecno ) PATNAME, op.AGE,op.SEX, op.PATBILLAMT, isnull((op.PATAMTRCVD+PATAMTPAID),0) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.COMBILLAMT-op.COMDISCUNT- isnull(op.COMAMTPAID,0)- isnull(op.COMAMTRCVD,0) - isnull(op.COMCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE, op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG where (op.COMBILLAMT-op.COMDISCUNT- isnull(op.COMAMTPAID,0)- isnull(op.COMAMTRCVD,0) - isnull(op.COMCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  >0 and op.BILLTYPE = @BILLTYPE and op.BILLNO like @BillNo and op.CLNORGCODE=@HOSPITALID`;
                }
            } else if (BillType === "CN") {
                query = ` select op.Billno,op.Billdate,op.MEDRECNO,op.PATNAME,op.AGE,op.SEX, op.PATBILLAMT, (op.PATAMTRCVD+PATAMTPAID) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-op.PATAMTRCVD-op.PATCNAMT+op.RFNDAMOUNT  )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE, op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM  OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG  where  (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-op.PATAMTRCVD-op.PATCNAMT+op.RFNDAMOUNT) >=0 and op.BILLTYPE in ('OB' , 'OC' ) and op.BILLNO like @BillNo and op.CLNORGCODE=@HOSPITALID and op.CASHCOUNTER=@Counter`;

            } else if (BillType === "CN_tab") {
                query = `select op.Billno,op.Billdate,op.MEDRECNO,op.PATNAME,op.AGE,op.SEX, op.PATBILLAMT, (op.PATAMTRCVD+PATAMTPAID) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-op.PATAMTRCVD-op.PATCNAMT+op.RFNDAMOUNT  )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE,  op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG  where  op.BILLTYPE in ('OB' , 'OC' ) and op.BILLNO like @BillNo and op.CLNORGCODE=@HOSPITALID`;

            } else {

                if (!compId.trim()) {
                    query = ` select op.Billno,op.Billdate,op.MEDRECNO,(select patient_name from patient_master where patientmr_NO = medrecno ) PATNAME,op.AGE,op.SEX, op.PATBILLAMT, isnull((op.PATAMTRCVD+PATAMTPAID),0) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.PATBILLAMT-op.PATDISCUNT- isnull(op.PATAMTPAID,0)- isnull(op.PATAMTRCVD,0) - isnull(op.PATCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE, op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM  OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG where (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-ISNULL(op.PATAMTRCVD,0)-ISNULL(op.PATCNAMT,0)+ISNULL(op.RFNDAMOUNT,0))  >0 and op.BILLTYPE = @BILLTYPE and op.BILLNO like  @BillNo and op.CLNORGCODE=@HOSPITALID`;

                } else {
                    query = ` select op.Billno,op.Billdate,op.MEDRECNO,(select patient_name from patient_master where patientmr_NO = medrecno ) PATNAME, op.AGE,op.SEX, op.PATBILLAMT, isnull((op.PATAMTRCVD+PATAMTPAID),0) as RecdAmt,op.PATCNAMT,op.PATRFNDAMT , (op.COMBILLAMT-op.COMDISCUNT- isnull(op.COMAMTPAID,0)- isnull(op.COMAMTRCVD,0) - isnull(op.COMCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  as DueAmt , op.CREATED_BY,op.DOCTCD,op.DEPTCODE,op.TARIFFID,op.PATCATG,op.PAYMODE, op.OPCONSNO,dd.Code,dd.Firstname,dep.DEPTNAME,tar.TARIFFDESC,pat.PC_Name,op.OPDREGNO FROM  OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Mst_Department dep on op.DEPTCODE =dep.DEPTCODE left join MST_TARIFFCATGORY tar on op.TARIFFID=tar.TARIFFID left join Mst_PatientCategory pat on pat.PC_Code=op.PATCATG where  (op.COMBILLAMT-op.COMDISCUNT- isnull(op.COMAMTPAID,0)- isnull(op.COMAMTRCVD,0) - isnull(op.COMCNAMT,0) + isnull(op.RFNDAMOUNT ,0) )  >0 and op.BILLTYPE = @BILLTYPE and op.BILLNO like @BillNo and op.CLNORGCODE=@HOSPITALID`;
                }
            }

            const result = await executeDbQuery(query, { BillNo: `%${BillNo}%`, BILLTYPE: BillType, HOSPITALID, Counter }, {});

            const rows = result.records.map((r: any) => ({
                BillNO: r.Billno || "",
                Billdate: r.Billdate ? moment(r.Billdate).format("DD/MM/YYYY") : "",
                MEDRECNO: r.MEDRECNO || "",
                PATNAME: r.PATNAME || "",
                AGE: r.AGE || "",
                SEX: r.SEX || "",
                PATBILLAMT: parseFloat(r.PATBILLAMT ?? 0).toFixed(2),
                RecdAmt: parseFloat(r.RecdAmt ?? 0).toFixed(2),
                PATCNAMT: parseFloat(r.PATCNAMT ?? 0).toFixed(2),
                PATRFNDAMT: parseFloat(r.PATRFNDAMT ?? 0).toFixed(2),
                DueAmt: parseFloat(r.DueAmt ?? 0).toFixed(2),
                CREATED_BY: r.CREATED_BY || "",
                DOCTCD: r.DOCTCD || "",
                DEPTCODE: r.DEPTCODE || "",
                TARIFFID: r.TARIFFID || "",
                PATCATG: r.PATCATG || "",
                PAYMODE: r.PAYMODE || "",
                OPCONSNO: r.OPCONSNO || "",
                Code: r.Code || "",
                Firstname: r.Firstname || "",
                DeptName: r.DEPTNAME || "",
                TariffCatg: r.TARIFFDESC || "",
                PatgName: r.PC_Name || "",
                OPDREGNO: r.OPDREGNO || "",
                CRDCOMPCD: compId
            }));

            res.json({ status: 0, d: rows });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getSearchDetails(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;

        const FromDate = input.FromDate;
        const ToDate = input.ToDate;
        const ReceiptNO = input.ReceiptNO;

        const sqlText = `select op.RECEIPTNO,op.RECEIPTDATE,op.OPDBILLNO,op.MEDRECNO,pm.FirstName,pm.Age, pm.Gender,pm.Mobile,op.AMOUNT,op.CREATED_BY from OPD_RECEIPTS op left join Patient_Master pm on pm.PatientMr_No=op.MEDRECNO where op.RCPTTYPE = 'OR' and CONVERT(VARCHAR(10), RECEIPTDATE,120) BETWEEN @FromDate AND @ToDate ${ReceiptNO ? "AND op.RECEIPTNO LIKE @ReceiptNO" : ""} ORDER BY op.RECEIPTDATE DESC`;

        try {
            const params: any = { FromDate, ToDate };
            if (ReceiptNO) params.ReceiptNO = `%${ReceiptNO}%`;

            const data = await executeDbQuery(sqlText, params, {});
            const records = data.records;
            const total = records.reduce((sum: number, r: any) => sum + (r.AMOUNT || "0.00"), 0);


            let html = `
      <thead>
        <tr class='success'>
          <th>Receipt No.</th><th>Receipt Date</th><th>Bill No</th>
          <th>MR Number</th><th>Patient Name</th>
          <th>Age</th><th>Sex</th><th>Contact</th>
          <th style='text-align:right;'>Amount</th><th>Created By</th>
        </tr>
      </thead><tbody>`;

            for (const r of records) {
                html += `
        <tr>
          <td>${r.RECEIPTNO}</td>
          <td>${moment(r.RECEIPTDATE).format("DD/MM/YYYY")}</td>
          <td>${r.OPDBILLNO}</td>
          <td>${r.MEDRECNO}</td>
          <td>${r.FirstName}</td>
          <td>${r.Age}</td>
          <td>${r.Gender}</td>
          <td>${r.Mobile}</td>
          <td style='text-align:right;'>${Number(r.AMOUNT).toFixed(2)}</td>
          <td>${r.CREATED_BY}</td>
        </tr>`;
            }

            html += `
      </tbody><tfoot>
        <tr style='color:blue'>
          <td colspan='7'></td>
          <td>Total</td>
          <td style='text-align:right;'>${total.toFixed(2)}</td>
          <td></td>
        </tr>
      </tfoot>`;

            res.json({ status: 0, d: html });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getReceiptDetails(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        const ReceiptNO = input.ReceiptNO;

        const sqlText = `select c.PatientMr_No,c.Age,c.Mobile,c.Gender, c.Patient_Name,c.Patient_Category_Id,a.MEDRECNO,a.RCPTTYPE,a.RECEIPTNO,a.RECEIPTDATE, a.OPDBILLNO,a.PAYMODE,a.CHEQUEDDNO,a.CHEQUEDATE,a.BANKNAME,a.RCVDFROM,a.AMOUNT, a.DEPTCODE,a.CREATED_BY ,a.PC_Code,a.TARIFFID,op.Billno,op.Billdate,op.MEDRECNO, op.PATNAME,op.AGE as Agee,op.SEX,op.PATBILLAMT,(op.PATAMTPAID+op.PATAMTRCVD) as RecdAmt, op.PATCNAMT,op.PATRFNDAMT , (op.PATBILLAMT-op.PATDISCUNT-op.PATAMTPAID-op.PATAMTRCVD-op.PATCNAMT+op.RFNDAMOUNT  )  as DueAmt, op.BILLTYPE,a.CNTRCODE From OPD_RECEIPTS a left join Patient_Master c on a.MEDRECNO = c.PatientMr_No LEFT join OPD_BILLMST op on a.OPDBILLNO=op.BILLNO where  a.RCPTTYPE='OR' and a.RECEIPTNO like @ReceiptNO`;

        try {
            const data = await executeDbQuery(sqlText, { ReceiptNO: `%${ReceiptNO}%` }, {});
            const rows = data.records.map((r: any) => ({
                PatientMr_No: r.PatientMr_No || "",
                Patient_Name: r.Patient_Name || "",
                PATNAME: r.PATNAME || "",
                Age: r.Age || "",
                Agee: r.Agee || "",
                SEX: r.SEX || "",
                Billdate: r.Billdate ? moment(r.Billdate).format("DD/MM/YYYY") : "",
                Mobile: r.Mobile || "",
                Gender: r.Gender || "",
                Patient_Category_Id: r.Patient_Category_Id || "",
                MEDRECNO: Array.isArray(r.MEDRECNO) ? r.MEDRECNO[0] : (r.MEDRECNO || ""),
                RCPTTYPE: r.RCPTTYPE || "",
                RECEIPTNO: r.RECEIPTNO || "",
                RECEIPTDATE: r.RECEIPTDATE ? moment(r.RECEIPTDATE).format("DD/MM/YYYY") : "",
                RECEIPT_Time: r.RECEIPTDATE ? moment(r.RECEIPTDATE).format("hh:mm A") : "",
                OPDBILLNO: r.OPDBILLNO || "",
                PAYMODE: r.PAYMODE || "",
                CHEQUEDDNO: r.CHEQUEDDNO || "",
                CHEQUEDATE: r.CHEQUEDATE ? moment(r.CHEQUEDATE).format("DD/MM/YYYY") : "",
                BANKNAME: r.BANKNAME || "",
                RCVDFROM: r.RCVDFROM || "",
                AMOUNT: parseFloat(r.AMOUNT ?? 0).toFixed(2),
                DEPTCODE: r.DEPTCODE || "",
                CREATED_BY: r.CREATED_BY || "",
                PC_Code: r.PC_Code || "",
                TARIFFID: r.TARIFFID || "",
                PATBILLAMT: parseFloat(r.PATBILLAMT ?? 0).toFixed(2),
                RecdAmt: parseFloat(r.RecdAmt ?? 0).toFixed(2),
                PATCNAMT: parseFloat(r.PATCNAMT ?? 0).toFixed(2),
                PATRFNDAMT: parseFloat(r.PATRFNDAMT ?? 0).toFixed(2),
                DueAmt: parseFloat(r.DueAmt ?? 0).toFixed(2),
                CNTRCODE: r.CNTRCODE || ""
            }));
            res.json({ status: 0, d: rows });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async saveDueCollection(req: Request, res: Response): Promise<void> {
        const input = req.body;

        const params = {
            CLNORGCODE: input.HOSPITALID,
            MEDRECNO: input.MEDRECNO,
            CNTRCODE: input.CNTRCODE,
            RCPTTYPE: input.RCPTTYPE,
            OPDBILLNO: input.OPDBILLNO,
            PAYMODE: input.PAYMODE,
            CHEQUEDDNO: input.CHEQUEDDNO,
            CHEQUEDATE: input.CHEQUEDATE,
            BANKNAME: input.BANKNAME,
            RCVDFROM: input.RCVDFROM,
            REMARKS: input.REMARKS,
            AMOUNT: input.AMOUNT,
            DEPTCODE: input.DEPTCODE,
            CREATED_BY: input.CREATED_BY,
            PC_Code: input.PC_Code,
            TARIFFID: input.TARIFFID, 
            EDITED_BY: input.CREATED_BY,
            REVISIONID: "",
            OPDREGNO: input.OPDREGNO,
            compCode: input.CompId,
        };

        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();
            await executeDbQuery("INSERT_DUECOLLECTION", params, { transaction, isStoredProc: true });
            await transaction.commit();
            res.json({ status: 0, message: "Receipt saved successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }


}