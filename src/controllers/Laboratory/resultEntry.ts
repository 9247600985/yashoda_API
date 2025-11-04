import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";
import { getResEntryCurrNumber, saveFileToFolder } from "../../utilities/helpers";
const moment = require('moment');

export default class resultEntryController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/lab", this.router);

        this.router.get("/get_PatientDetails", authenticateToken, this.getPatientDetails.bind(this));
        this.router.get("/get_GridDetails", authenticateToken, this.getGridDetails.bind(this));
        this.router.get("/get_NormalValues", authenticateToken, this.getNormalValues.bind(this));
        this.router.get("/get_FixedValues", authenticateToken, this.getFixedValues.bind(this));
        this.router.get("/getDoctorSignature", authenticateToken, this.getDoctorSignature.bind(this));
        this.router.get("/Get_Footer", authenticateToken, this.getFooter.bind(this));
        this.router.get("/getResConf", authenticateToken, this.getResConf.bind(this));
        this.router.get("/getCusDisplay", authenticateToken, this.getCusDisplay.bind(this));
        this.router.post("/Save_Click", authenticateToken, this.saveClick.bind(this));
        this.router.put("/Verify_Click", authenticateToken, this.verifyClick.bind(this));

    }

    async getPatientDetails(req: Request, res: Response): Promise<void> {
        const input = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const SampleCollectNo = input.SampleCollectNo;
        const AcceptnaceNo = input.AcceptnaceNo;
        const OrderNo = input.OrderNo;

        const query = `  SELECT distinct ot.acceptanno, om.billno, ot.LABCODE,om.MEDRECNO, om.IPNO, om.AGE, om.SEX, om.PATNAME, om.PATCATG, om.NURSTCODE, pm.MOBILE, om.BEDCATGCD, ot.SPECCODE, mw.WARDDESC, bd.BED_NAME, om.TARIFFID, ot.LABDPTCODE, pm.Patient_DOB, om.ORDEREDBY, om.REPORTTO, ot.SAMLECOLNO, ot.ORDERNO,SL.Sal_Desc,ISNULL(C.NAME,'')AS COMPNAME,  CONVERT(VARCHAR(10),OT.ORDERDATE,103)  +' ' +  CONVERT(VARCHAR(8),OT.ORDERTIME,108) as ORDERDATE, CONVERT(VARCHAR(10),OT.SAMCOLDATE,103)  +' ' +  CONVERT(VARCHAR(8),OT.SAMCOLTIME,108) as SAMPLECOLLDATE, CONVERT(VARCHAR(10),OT.RECEIVEDON,103)  +' ' +  CONVERT(VARCHAR(8),OT.RECEIVEDAT,108) as SAMPLERCVDDATE, CONVERT(VARCHAR(10),OT.RESULTDATE,103)  +' ' +  CONVERT(VARCHAR(8),OT.RESULTTIME,108) as RESULTENTERDATE, OT.RESULTNO,om.clnorgcode, BM.CRDCOMPCD AS CUSTOMERID,BM.REFDOCTCD,RM.RefDoctor_FName,DM.Firstname AS DOCTNAME FROM DGL_ORDERTRN ot LEFT JOIN DGL_ORDERMST om on ot.ORDERNO=om.ORDERNO LEFT JOIN OPD_BILLMST BM ON BM.BILLNO=OM.BILLNO LEFT JOIN Mst_ReferralDoctor RM ON RM.RefDoct_ID=BM.REFDOCTCD LEFT JOIN Mst_DoctorMaster DM ON DM.CODE=BM.DOCTCD LEFT JOIN Patient_Master pm on om.MEDRECNO=pm.PatientMr_No INNER JOIN Mst_Salutation SL ON SL.Sal_Code=BM.SALUTNCODE LEFT JOIN MST_BED_DETAILS bd ON om.BEDNO=bd.BED_NAME  LEFT JOIN MST_WARDS mw ON om.WARDNO=mw.WARDDESC LEFT JOIN COMPANY C ON C.Com_Id=BM.CRDCOMPCD WHERE ot.SAMLECOLNO=@SampleCollectNo and ot.acceptanno=@AcceptnaceNo and ot.ORDERNO=@OrderNo  `;

        const params = { SampleCollectNo, AcceptnaceNo, OrderNo, };

        try {
            const { records } = await executeDbQuery(query, params);

            const details = records.map((r: any) => ({
                AcceptNo: r.acceptanno ?? '',
                BillNo: r.billno ?? '',
                LabCode: r.LABCODE ?? '',
                MRNO: r.MEDRECNO ?? '',
                IPNO: r.IPNO ?? '',
                Age: r.AGE ?? '',
                Sex: r.SEX ?? '',
                PatName: r.PATNAME ?? '',
                PatCatg: r.PATCATG ?? '',
                NurStCode: r.NURSTCODE ?? '',
                Mobile: r.MOBILE ?? '',
                BedCatCode: r.BEDCATGCD ?? '',
                SpecimenCode: r.SPECCODE ?? '',
                WardDesc: r.WARDDESC ?? '',
                BedName: r.BED_NAME ?? '',
                TariffId: r.TARIFFID ?? '',
                LabDeptCode: r.LABDPTCODE ?? '',
                PatDOB: r.Patient_DOB ?? '',
                OrderBy: r.ORDEREDBY ?? '',
                ReportTo: r.REPORTTO ?? '',
                SampleColNo: r.SAMLECOLNO ?? '',
                OrderNo: r.ORDERNO ?? '',
                SalDesc: r.Sal_Desc ?? '',
                CompName: r.COMPNAME ?? '',
                RefDoct: r.RefDoctor_FName ?? '',
                OrderDate: r.ORDERDATE ?? '',
                SampleCollDate: r.SAMPLECOLLDATE ?? '',
                SampleReceiveDate: r.SAMPLERCVDDATE ?? '',
                ResultEnterDate: r.RESULTENTERDATE ?? '',
                RESULTNO: r.RESULTNO ?? '',
                Clnorgcode: r.clnorgcode ?? '',
                CUSTOMERID: r.CUSTOMERID ?? '',
                Doct_Name: r.DOCTNAME ?? '',
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getGridDetails(req: Request, res: Response): Promise<void> {

        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const SampleCollectNo = input.SampleCollectNo;
        const AcceptnaceNo = input.AcceptnaceNo;
        const OrderNo = input.OrderNo;


        const profileQuery = `SELECT DISTINCT PROFILEYN FROM DGL_ORDERTRN OT WHERE ot.SAMLECOLNO=@SampleCollectNo and ot.ORDERNO=@OrderNo and ot.acceptanno=@AcceptnaceNo`;
        const profileParams = { SampleCollectNo, OrderNo, AcceptnaceNo };

        const orgQuery = `SELECT  CLNORGCODE FROM DGL_ORDERMST OT WHERE  ot.ORDERNO=@OrderNo AND STATUS='A'`;
        const orgParams = { OrderNo };

        const mainQuery = `  select distinct OT.SEQNO,dl.LABDPTCODE, dl.LABDPTDESC, dm.mthdcode, dm.mthdname, ot.SAMLECOLNO, ot.ORDERNO, ot.TESTCODE, tm.TESTNAME, ti.INVESTCODE, ti.INVESTDESC, um.UNITNAME, ti.SEQUENCE, iv.DFTVAL,um.UNITCODE,isnull(TM.INTERPRETATION,'') as INTERPRETATION,p.TESTNAME as PROFILENAME, ot.PROFILEYN,  rm.VERIFIEDBY,rt.RESULTDET, rt.LABCODE,CONVERT(VARCHAR(16), rt.RESULTDATE,120) AS RESULTDATE, rt.REMARKS, rt.RESULTNO,rm.RESUSTATUS,rm.VERIFIEDON,IV.RESULTYPE from DGL_ORDERTRN ot  left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join DGL_LABDEPT dl on dl.LABDPTCODE=ot.LABDPTCODE left join DGL_TESTINVST ti on tm.TESTCODE=ti.TESTCODE left join DGL_TESTMASTER p on ot.PROFILEID=p.TESTCODE LEFT JOIN DGL_INVSTMST iv ON iv.INVESTCODE=ti.INVESTCODE left join DGL_MethodMAST dm on DM.MTHDCODE=iv.MTHDCODE left join DGL_UnitMAST um on iv.UNITCODE=um.UNITCODE LEFT JOIN DGL_RESULTMST RM ON RM.ORDERNO=OT.ORDERNO AND RM.SAMLECOLNO=OT.SAMLECOLNO AND RM.ACCEPTANNO=OT.ACCEPTANNO LEFT JOIN DGL_RESULTTRN RT ON RT.RESULTNO=RM.RESULTNO AND RT.TESTCODE=OT.TESTCODE AND RT.INVESTCODE=TI.INVESTCODE where ot.SAMLECOLNO=@SampleCollectNo and ot.ORDERNO=@OrderNo and ot.acceptanno=@AcceptnaceNo ORDER BY dl.LABDPTCODE, OT.SEQNO ,TI.SEQUENCE `;
        const mainParams = { SampleCollectNo, OrderNo, AcceptnaceNo };

        try {
            const [profileRes, orgRes] = await Promise.all([
                executeDbQuery(profileQuery, profileParams),
                executeDbQuery(orgQuery, orgParams),
            ]);
            const PROFILEYN = (profileRes.records && profileRes.records[0]?.PROFILEYN != null ? String(profileRes.records[0].PROFILEYN) : '');

            const Order_HospCode = (orgRes.records && orgRes.records[0]?.CLNORGCODE != null ? String(orgRes.records[0].CLNORGCODE) : '');
            const { records } = await executeDbQuery(mainQuery, mainParams);

            const details = records.map((r: any) => ({
                LabDeptCode: r.LABDPTCODE ?? '',
                LABDPTDESC: r.LABDPTDESC ?? '',
                mthdcode: r.mthdcode ?? '',
                mthdname: r.mthdname ?? '',
                SampleColNo: r.SAMLECOLNO ?? '',
                OrderNo: r.ORDERNO ?? '',
                TESTCODE: r.TESTCODE ?? '',
                TESTNAME: r.TESTNAME ?? '',
                INVESTCODE: r.INVESTCODE ?? '',
                INVESTDESC: r.INVESTDESC ?? '',
                UNITNAME: r.UNITNAME ?? '',
                SEQUENCE: r.SEQUENCE != null ? String(r.SEQUENCE) : '',
                DFTVAL: r.DFTVAL ?? '',
                UNITCODE: r.UNITCODE ?? '',
                INTERPRETATION: r.INTERPRETATION ?? '',
                PROFILENAME: r.PROFILENAME ?? '',
                PROFILEYN: r.PROFILEYN ?? '',
                VERIFIEDBY: r.VERIFIEDBY ?? '',
                RESULTDET: r.RESULTDET ?? '',
                LabCode: r.LABCODE ?? '',
                RESULTDATE: r.RESULTDATE ?? '',
                REMARKS: r.REMARKS ?? '',
                RESUSTATUS: r.RESUSTATUS ?? '',
                VERIFIEDON: r.VERIFIEDON ?? '',
                RESULTYPE: r.RESULTYPE ?? '',
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getNormalValues(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const INVESTCODE = input.INVESTCODE;
        const gender = input.gender;
        const AGETYPE = input.AGETYPE;
        const FINALAGE = input.FINALAGE;


        const query = `  select MAXVAL, MINVAL,convert(varchar(4),AGEFROM) +''+AGEFROMTYPE as AGEFROM, convert(varchar(4),AGETO)+''+AGETOTYPE as AGETO,NORREMARK from DGL_NORMVALS where INVESTCODE=@INVESTCODE and (AGEFROM<=@FINALAGE and AGETO>=@FINALAGE) and (SEX='A' or SEX=@gender or SEX=@gender + 'C') AND AGEFROMTYPE=@AGETYPE AND AGETOTYPE=@AGETYPE  `;

        const params = { INVESTCODE, FINALAGE, gender, AGETYPE, };

        try {
            const { records } = await executeDbQuery(query, params);

            const details = records.map((r: any) => ({
                MAXVAL: r.MAXVAL != null ? String(r.MAXVAL) : '',
                MINVAL: r.MINVAL != null ? String(r.MINVAL) : '',
                AGEFROM: r.AGEFROM != null ? String(r.AGEFROM) : '',
                AGETO: r.AGETO != null ? String(r.AGETO) : '',
                NORREMARK: r.NORREMARK != null ? String(r.NORREMARK) : '',
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getFixedValues(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const SAMLECOLNO = input.SamNo;
        const ORDERNO = input.OrdNo;
        const INVESTCODE = input.INVESTCODE;

        const query = ` select distinct fv.FIXEDSTRIN, fv.BYDEFAULT from DGL_ORDERTRN ot left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join DGL_TESTINVST ti on tm.TESTCODE=ti.TESTCODE left join DGL_NORMVALS nv on ti.INVESTCODE=nv.INVESTCODE left join DGL_FIXEDVALS fv on ti.INVESTCODE=fv.INVESTCODE where ot.SAMLECOLNO=@SAMLECOLNO and ot.ORDERNO=@ORDERNO and fv.INVESTCODE=@INVESTCODE `;

        const params = { SAMLECOLNO, ORDERNO, INVESTCODE, };

        try {
            const { records } = await executeDbQuery(query, params);

            const details = records.map((r: any) => ({
                FIXEDSTRIN: r.FIXEDSTRIN != null ? String(r.FIXEDSTRIN) : '',
                BYDEFAULT: r.BYDEFAULT != null ? String(r.BYDEFAULT) : '',
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getDoctorSignature(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};
        const DoctCode: string = (input.DoctCode ?? "").toString().trim();

        if (!DoctCode) {
            res.status(400).json({ status: 1, message: "Missing required parameter: DoctCode" });
            return;
        }

        const query = `SELECT DM.FIRSTNAME, DM.SIGNATURE_PATH, DM.QUALIFICATION, SM.Speciality_Desc FROM Mst_DoctorMaster DM INNER JOIN Speciality_Master SM ON SM.Speciality_ID = DM.SpecializationId WHERE DM.Code = @DoctCode`;

        const params = { DoctCode };

        try {
            const { records } = await executeDbQuery(query, params);

            let Admn: any[] = [];

            if (records.length > 0) {
                for (const dr of records) {
                    Admn.push({
                        INCHSIG: dr.SIGNATURE_PATH ? String(dr.SIGNATURE_PATH) : "",
                        INCHDOCT: dr.QUALIFICATION ? String(dr.QUALIFICATION) : "",
                        INCHDOCTNM: dr.FIRSTNAME ? String(dr.FIRSTNAME) : "",
                        INCHDOCTSP: dr.Speciality_Desc ? String(dr.Speciality_Desc) : "",
                    });
                }
            } else {
                Admn.push({
                    INCHSIG: "",
                    INCHDOCT: "",
                    INCHDOCTNM: "",
                    INCHDOCTSP: "",
                });
            }

            res.json({ status: 0, d: Admn });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getFooter(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length) ? req.body : req.query;
        const CLINIC_CODE: string = (input.CLINIC_CODE ?? "").toString().trim();

        const query = `SELECT isnull(LAB_PRINT_FOOTER,'')as LAB_PRINT_FOOTER FROM TM_CLINICS WHERE CLINIC_CODE=@CLINIC_CODE`;
        const params = { CLINIC_CODE };

        try {
            const { records } = await executeDbQuery(query, params);
            const footer: string = records?.[0]?.LAB_PRINT_FOOTER ?? "";
            res.json({ status: 0, d: footer });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getResConf(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const RESULTNO: string = (input.RESULTNO ?? "").toString().trim();

        const query = `SELECT COUNT(*) AS CNT FROM DGL_PRINT WHERE RESULTNO = @RESULTNO`;
        const params = { RESULTNO };

        try {
            const { records } = await executeDbQuery(query, params);
            const ResultConf: number = parseInt(records?.[0]?.CNT ?? "0", 10);

            res.json({ status: 0, d: ResultConf });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getCusDisplay(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const CUSTOMERID: string = (input.CUSTOMERID ?? "").toString().trim();


        const query = `SELECT ISNULL(REF_CUST_DISPLAY,'N') AS REF_CUST_DISPLAY FROM COMPANY WHERE COM_ID=@CUSTOMERID`;
        const params = { CUSTOMERID };

        try {
            const { records } = await executeDbQuery(query, params);
            const DBDisplay: string = records?.[0]?.REF_CUST_DISPLAY ?? "N";

            res.json({ status: 0, d: DBDisplay });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getLabAdminWithSignature(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        const testCode: string = (input.testCode ?? input.TESTCODE ?? "").toString().trim();

        const query = `SELECT INCHDOCT,inchdocdesg,ASSTDOCDESG,ASSTDOCT,INCHSIGN,ASSTSIGN FROM DGL_TESTMASTER DT INNER JOIN DGL_LABDEPT DL ON DL.LABDPTCODE = DT.LABDPTCODE WHERE DT.TESTCODE = @TESTCODE `;
        const params = { TESTCODE: testCode };

        try {
            const { records } = await executeDbQuery(query, params);
            const details: any[] = [];

            for (const row of records) {
                const user: any = {
                    INCHDOCTNM: row.INCHDOCT ?? "",
                    DESIGNATION: row.INCHDOC_DESG ?? "",
                    ASSTDESIGNATION: row.ASSTDOCDESG ?? "",
                    ASSTDOCTNM: row.ASSTDOCT ?? "",
                    INCHSIG: "",
                    ASSTSIGN: "",
                };

                if (row.INCHSIGN instanceof Buffer && row.INCHSIGN.length > 0) {
                    user.INCHSIG = row.INCHSIGN.toString("base64");
                }

                if (row.ASSTSIGN instanceof Buffer && row.ASSTSIGN.length > 0) {
                    user.ASSTSIGN = row.ASSTSIGN.toString("base64");
                }

                details.push(user);
            }

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async saveClick(req: Request, res: Response): Promise<void> {
        const input = req.body;

        const Clnorgcode = input.Clnorgcode;
        const OrderNo = input.OrderNo;
        const SampleColNo = input.SampleColNo;
        const AcceptNo = input.AcceptNo;

        const LabDeptCode = input.LabDeptCode;
        const LabCode = input.LabCode;
        const REMARKS = input.REMARKS;

        const IPNO = input.IPNO;
        const MRNO = input.MRNO;

        const RESULTNO_IN = input.RESULTNO;

        const TableDetails: any[] = Array.isArray(input.TableDetails) ? input.TableDetails : [];
        const CERTIFICATE: any[] = Array.isArray(input.CERTIFICATE) ? input.CERTIFICATE : [];

        const editedBy = input.UID || '';
        const createdBy = input.UID || '';


        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const qFin = `select FinYear from Mst_AccYear where Openstatus='o' and CurrentFinancialYear='y' and clnorgcode=@clnorgcode `;
            const finRes = await executeDbQuery(qFin, { clnorgcode: Clnorgcode }, { transaction });
            const FinYear = finRes.records?.[0]?.FinYear || '';


            if (!FinYear) throw new Error('Active financial year not found for this CLNORGCODE.');

            const qExist = ` select ISNULL(RESULTNO,'') AS RESULTNO from DGL_RESULTMST WHERE ORDERNO=@ORDERNO AND ACCEPTANNO=@ACCEPTANNO AND SAMLECOLNO=@SAMLECOLNO `;
            const existParams = { ORDERNO: OrderNo, SAMLECOLNO: SampleColNo, ACCEPTANNO: AcceptNo };
            const existRes = await executeDbQuery(qExist, existParams, { transaction });
            const RESULTNO_EXIST: string = existRes.records?.[0]?.RESULTNO || '';

            let Result_Number = RESULTNO_IN || RESULTNO_EXIST;

            if (!Result_Number) { Result_Number = await getResEntryCurrNumber(transaction, FinYear, Clnorgcode, 'LABRESULT'); }

            let doc_path = '';
            let doc_name = '';
            let doc_type = '';
            let query_text = '';
            if (Array.isArray(CERTIFICATE) && CERTIFICATE.length > 0) {
                const paths: string[] = [];
                const names: string[] = [];
                const types: string[] = [];
                for (const item of CERTIFICATE) {
                    const p = await saveFileToFolder(item.BASE64DATA, item.FILENAME, Result_Number, 'Documents');
                    paths.push(p);
                    names.push(item.FILENAME);
                    types.push(item.CONTENTTYPE);
                }
                doc_path = paths.join(',');
                doc_name = names.join(',');
                doc_type = types.join(',');
                query_text = `, FILE_NAME=@FILE_NAME, CONTENT_TYPE=@CONTENT_TYPE, FILE_PATH=@FILE_PATH `;
            }

            if (RESULTNO_EXIST || RESULTNO_IN) {
                const qUpdateMst = ` UPDATE DGL_RESULTMST SET edited_by=@edited_by, edited_on=GETDATE() ${query_text} WHERE RESULTNO=@RESULTNO AND CLNORGCODE=@CLNORGCODE `;

                const updParams: any = { edited_by: String(editedBy), RESULTNO: Result_Number, CLNORGCODE: Clnorgcode, };
                if (query_text) {
                    updParams.FILE_NAME = doc_name;
                    updParams.CONTENT_TYPE = doc_type;
                    updParams.FILE_PATH = doc_path;
                }
                await executeDbQuery(qUpdateMst, updParams, { transaction });

                const qDeleteTrn = `delete from DGL_RESULTTRN where RESULTNO=@RESULTNO and CLNORGCODE=@CLNORGCODE`;
                await executeDbQuery(qDeleteTrn, { RESULTNO: Result_Number, CLNORGCODE: Clnorgcode }, { transaction });

                const qInsertTrn = `insert into DGL_RESULTTRN(CLNORGCODE,LABDPTCODE, LABCODE, RESULTNO, RESULTDATE, RESULTTYPE, TESTCODE, INVESTCODE, UNIT, NORMALVAL1, NORMALVAL2, DFTVAL, RESULTDET, ACCEPTANNO, SAMLECOLNO, REMARKS) values ( @CLNORGCODE,@LABDPTCODE, @LABCODE, @RESULTNO, GETDATE(), 'R',@TESTCODE,@INVESTCODE, @UNIT, @NORMALVAL1, @NORMALVAL2, @DFTVAL, @RESULTDET, @ACCEPTANNO, @SAMLECOLNO, @REMARKS)`;

                for (const item of TableDetails) {
                    const p = {
                        RESULTNO: Result_Number,
                        TESTCODE: item.TESTCODE,
                        INVESTCODE: item.INVESTCODE,
                        UNIT: item.UNITCODE,
                        NORMALVAL1: item.MINVAL,
                        NORMALVAL2: item.MAXVAL,
                        DFTVAL: item.DFTVAL,
                        RESULTDET: item.RESULTDET,
                        CLNORGCODE: Clnorgcode,
                        LABDPTCODE: LabDeptCode,
                        LABCODE: LabCode,
                        ACCEPTANNO: AcceptNo,
                        SAMLECOLNO: SampleColNo,
                        REMARKS,
                    };
                    await executeDbQuery(qInsertTrn, p, { transaction });
                }
            } else {
                const qInsertMst = `insert into DGL_RESULTMST(CLNORGCODE,FINYEAR, LABDPTCODE, LABCODE, RESULTNO, RESULTDATE, RESULTTYPE, RESUSTATUS, TEMPLATEID, REPORTGRP, REMARKS, ORDERNO, ACCEPTANNO, SAMLECOLNO, IPNO, MRNO, CREATED_BY, CREATED_ON,FILE_NAME,CONTENT_TYPE,FILE_PATH) values( @CLNORGCODE,@FINYEAR,@LABDPTCODE, @LABCODE,@RESULTNO, GETDATE(), 'R', 'RE','','',@REMARKS, @ORDERNO,@ACCEPTANNO, @SAMLECOLNO, @IPNO,@MRNO, @CREATED_BY, GETDATE(),@FILE_NAME,@CONTENT_TYPE,@FILE_PATH)`;

                const pInsMst = {
                    CLNORGCODE: Clnorgcode,
                    FINYEAR: FinYear,
                    LABDPTCODE: LabDeptCode,
                    LABCODE: LabCode,
                    RESULTNO: Result_Number,
                    REMARKS,
                    ORDERNO: OrderNo,
                    ACCEPTANNO: AcceptNo,
                    SAMLECOLNO: SampleColNo,
                    IPNO,
                    MRNO,
                    CREATED_BY: String(createdBy),
                    FILE_NAME: doc_name,
                    CONTENT_TYPE: doc_type,
                    FILE_PATH: doc_path,
                };
                await executeDbQuery(qInsertMst, pInsMst, { transaction });

                const qInsertTrn = `insert into DGL_RESULTTRN(CLNORGCODE,LABDPTCODE, LABCODE, RESULTNO, RESULTDATE, RESULTTYPE, TESTCODE, INVESTCODE, UNIT, NORMALVAL1, NORMALVAL2, DFTVAL, RESULTDET, ACCEPTANNO, SAMLECOLNO, REMARKS) values (@CLNORGCODE,@LABDPTCODE,@LABCODE,@RESULTNO, GETDATE(), 'R', @TESTCODE, @INVESTCODE,@UNIT, @NORMALVAL1, @NORMALVAL2, @DFTVAL, @RESULTDET, @ACCEPTANNO, @SAMLECOLNO,@REMARKS)`;

                for (const item of TableDetails) {
                    const p = {
                        RESULTNO: Result_Number,
                        TESTCODE: item.TESTCODE,
                        INVESTCODE: item.INVESTCODE,
                        UNIT: item.UNITCODE,
                        NORMALVAL1: item.MINVAL,
                        NORMALVAL2: item.MAXVAL,
                        DFTVAL: item.DFTVAL,
                        RESULTDET: item.RESULTDET,
                        CLNORGCODE: Clnorgcode,
                        LABDPTCODE: LabDeptCode,
                        LABCODE: LabCode,
                        ACCEPTANNO: AcceptNo,
                        SAMLECOLNO: SampleColNo,
                        REMARKS,
                    };
                    await executeDbQuery(qInsertTrn, p, { transaction });
                }
            }

            const qGetResultDate = `select ResultDate from DGL_RESULTMST where RESULTNO=@RESULTNO and samlecolno=@samlecolno and acceptanno=@acceptanno`;

            const dtRes = await executeDbQuery(qGetResultDate, { RESULTNO: Result_Number, SAMLECOLNO: SampleColNo, ACCEPTANNO: AcceptNo }, { transaction });

            const resultDateDb = dtRes.records?.[0]?.RESULTDATE ? new Date(dtRes.records[0].RESULTDATE) : new Date();
            const Res_Date = moment(resultDateDb).format('DD-MM-YYYY HH:mm:ss');
            const RESULTDATE_sql = moment(resultDateDb).format('YYYY-MM-DD');
            const RESULTTIME_sql = moment(resultDateDb).format('HH:mm:ss');

            const qUpdOrderTrn = `update DGL_ORDERTRN set SAMPLESTATUS='RE', teststatus='RE', resultno=@resultno, RESULTDATE=@RESULTDATE, RESULTTIME=@RESULTTIME where SAMLECOLNO=@SAMLECOLNO and acceptanno=@acceptanno and orderno=@orderno and CLNORGCODE=@CLNORGCODE`;

            const updOrderParams = {
                RESULTNO: Result_Number,
                RESULTDATE: RESULTDATE_sql,
                RESULTTIME: RESULTTIME_sql,
                SAMLECOLNO: SampleColNo,
                ACCEPTANNO: AcceptNo,
                ORDERNO: OrderNo,
                CLNORGCODE: Clnorgcode,
            };
            await executeDbQuery(qUpdOrderTrn, updOrderParams, { transaction });

            const qUser = `select mu.USERNAME from DGL_RESULTMST dr left join Mst_UserDetails mu on mu.USERID =dr.CREATED_BY where dr.RESULTNO=@RESULTNO and dr.SAMLECOLNO=@SAMLECOLNO`;

            const uRes = await executeDbQuery(qUser, { RESULTNO: Result_Number, SAMLECOLNO: SampleColNo }, { transaction });
            const USERNAME: string = uRes.records?.[0]?.USERNAME || '';

            await transaction.commit();
            res.json({ status: 0, d: [Result_Number, Res_Date, USERNAME] });
            return;
        } catch (err: any) {
            try { await transaction.rollback(); } catch { }
            res.status(500).json({ status: 1, message: err.message });
            return;
        }
    }

    async verifyClick(req: Request, res: Response): Promise<void> {
        const input: any = req.body || req.query || {};

        const RESULTNO = (input.RESULTNO ?? "").toString().trim();
        const CLNORGCODE = (input.Clnorgcode ?? "").toString().trim();
        const VERIFIEDBY = (input.VERIFIEDBY ?? "").toString().trim();
        const VERIFIEDBY1 = (input.VERIFIEDBY1 ?? "").toString().trim();
        const SAMLECOLNO = (input.SampleColNo ?? input.SAMLECOLNO ?? "").toString().trim();

        if (!RESULTNO || !CLNORGCODE) {
            res.status(400).json({ status: 1, message: "Missing RESULTNO or CLNORGCODE" });
            return;
        }

        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const qMst = ` update DGL_RESULTMST set RESUSTATUS='RV', DELVSTATUS='RV', VERIFIEDON=GETDATE(),VERIFIEDBY=@VERIFIEDBY, VERIFIEDBY1=@VERIFIEDBY1, VERIFIEDON1=getdate() where RESULTNO=@RESULTNO and CLNORGCODE=@CLNORGCODE`;
            const pMst = { VERIFIEDBY, VERIFIEDBY1, RESULTNO, CLNORGCODE };
            await executeDbQuery(qMst, pMst, { transaction });

            const qTrn = ` update DGL_RESULTTRN set RESSTATUS='RV' where RESULTNO=@RESULTNO and CLNORGCODE=@CLNORGCODE`;
            const pTrn = { RESULTNO, CLNORGCODE };
            await executeDbQuery(qTrn, pTrn, { transaction });

            const qUser = ` select mu.USERNAME from DGL_RESULTMST dr left join Mst_UserDetails mu on mu.USERID =dr.VERIFIEDBY where dr.RESULTNO=@RESULTNO and dr.SAMLECOLNO=@SAMLECOLNO`;
            const pUser = { RESULTNO, SAMLECOLNO };
            const userRes = await executeDbQuery(qUser, pUser, { transaction });
            const USERNAME: string = userRes.records?.[0]?.USERNAME ?? "";

            await transaction.commit();

            res.json({ status: 0, d: [USERNAME] });
        } catch (err: any) {
            try { await transaction.rollback(); } catch { }
            res.status(500).json({ status: 1, message: err.message });
        }
    }


}
