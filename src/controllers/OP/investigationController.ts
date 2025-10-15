import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import sql from "mssql";
import { fetchCurrentFinYear, fetchCurrentNumber } from "../Masters/mastersController";
import { formatDateChange, numberToWords, PaymentField, PaymentFieldRow, PaymentMode, PaymentModeRow } from "../../utilities/helpers";
import { authenticateToken } from "../../utilities/authMiddleWare";
const moment = require('moment');

export default class investigationController {
    private router: Router = express.Router();

    constructor(private app: Router) {

        app.use("/op", this.router);

        this.router.get("/getServicesInfo", authenticateToken, this.getServicesInfo.bind(this));
        this.router.get("/getPaymentType", authenticateToken, this.getPaymentType.bind(this));
        this.router.get("/loadRevision", authenticateToken, this.loadRevision.bind(this));
        this.router.get("/GetPaymentFields", authenticateToken, this.GetPaymentFields.bind(this));
        this.router.get("/GetDocFavDetails", authenticateToken, this.GetDocFavDetails.bind(this));
        this.router.get("/getDept", authenticateToken, this.getDept.bind(this));
        this.router.get("/getTariff", authenticateToken, this.getTariff.bind(this));
        this.router.get("/GET_FacilitySetUpDetails", authenticateToken, this.GET_FacilitySetUpDetails.bind(this));
        this.router.get("/getProfileServices", authenticateToken, this.getProfileServices.bind(this));
        this.router.get("/GetPACKAGEServices", authenticateToken, this.GetPACKAGEServices.bind(this));
        this.router.get("/GET_FACILITYSETUP_BEDCATG", authenticateToken, this.GET_FACILITYSETUP_BEDCATG.bind(this));
        this.router.get("/getServicesCost", authenticateToken, this.getServicesCost.bind(this));
        this.router.get("/LoadCrdauthLtr", authenticateToken, this.LoadCrdauthLtr.bind(this));
        this.router.get("/LoadCrdAuthDetServCode", authenticateToken, this.LoadCrdAuthDetServCode.bind(this));
        this.router.get("/LoadCompruletrn", authenticateToken, this.LoadCompruletrn.bind(this));
        this.router.get("/loadSplServCost", authenticateToken, this.loadSplServCost.bind(this));
        this.router.get("/GetAuthDetails", authenticateToken, this.GetAuthDetails.bind(this));
        this.router.get("/GetTrnCount", authenticateToken, this.GetTrnCount.bind(this));
        this.router.get("/GetSearchDetails", authenticateToken, this.GetSearchDetails.bind(this));
        this.router.get("/GET_TAB_SEARCH_DETAILS", authenticateToken, this.GET_TAB_SEARCH_DETAILS.bind(this));
        this.router.get("/GET_TAB_SEARCH_DETAILS_Main", authenticateToken, this.GET_TAB_SEARCH_DETAILS_Main.bind(this));
        this.router.get("/BindPrintOutpatientBillPage", authenticateToken, this.BindPrintOutpatientBillPage.bind(this));
        this.router.get("/getEmergencyPercentage", authenticateToken, this.getEmergencyPercentage.bind(this));
        this.router.get("/Get_AmbDetailsPrint", authenticateToken, this.Get_AmbDetailsPrint.bind(this));
        this.router.get("/ServeicePage", authenticateToken, this.BindPrintServeice.bind(this));
        this.router.get("/PrintOutpatientBillPage1", authenticateToken, this.DisplayPrintOutpatientBillPagedispaly1.bind(this));
        this.router.post("/saveInvestigation", authenticateToken, this.saveInvestigation.bind(this));
        this.router.post("/saveIPADDRESS_OPDBILLMST", authenticateToken, this.saveIPADDRESS_OPDBILLMST.bind(this));
        this.router.put("/CancelDetails", authenticateToken, this.CancelDetails.bind(this));
    }

    async getServicesInfo(req: Request, res: Response): Promise<void> {

        const input = req.method === "GET" ? req.query : req.body;

        let query = "";
        const SERVCODE = input.serviceCode || "";
        const CLNORGCODE = input.hospid || "";
        const TARIFFID = input.tariffId || "";
        const BEDCATGCODE = input.bedCategoryId || "";

        try {
            if (input.patientType === "IP") {
                query = `SELECT d.DEPTNAME, M.SERVCODE,M.SERVNAME,MS.SERVICECOST,MS.DOCTSHAREAMT,M.DOC_COMP,M.RATEEDIT, M.DEPTCODE,  M.NAMEEDIT,M.QTY_EDITABLE,M.IsDiscountAlwd as IsDiscountAlwd,M.MaxDiscountPer as MaxDiscountPer, M.SERVTYPECD,M.SRVGRPCODE,M.SRVSUBGRP FROM MST_SERVICES M JOIN MST_SERVICECOST MS ON MS.SERVCODE = M.SERVCODE and MS.STATUS =  'A' join Mst_Department d on d.DEPTCODE=m.DEPTCODE WHERE M.STATUS = 'A'  and (M.SERVCODE like '%${SERVCODE}%' or m.SERVNAME like '%${SERVCODE}%' or m.MNEUNONIC like '%${SERVCODE}%') AND MS.TARIFFID='${TARIFFID}' AND MS.BEDCATGCODE='${BEDCATGCODE}' and MS.CLNORGCODE = '${CLNORGCODE}' order by M.SERVNAME `;

            } else if (input.patientType === "OP") {
                query = `SELECT d.DEPTNAME, M.SERVCODE,M.SERVNAME,MS.SERVICECOST,MS.DOCTSHAREAMT,M.DOC_COMP,M.RATEEDIT, M.DEPTCODE,  M.NAMEEDIT,M.QTY_EDITABLE,M.IsDiscountAlwd as IsDiscountAlwd,M.MaxDiscountPer as MaxDiscountPer, M.SERVTYPECD,M.SRVGRPCODE,M.SRVSUBGRP FROM MST_SERVICES M JOIN MST_SERVICECOST MS ON MS.SERVCODE = M.SERVCODE and MS.STATUS =  'A' join Mst_Department d on d.DEPTCODE=m.DEPTCODE WHERE M.STATUS = 'A'  and (M.SERVCODE like '%${SERVCODE}%' or m.SERVNAME like '%${SERVCODE}%' or m.MNEUNONIC like '%${SERVCODE}%') AND MS.TARIFFID='001' AND MS.BEDCATGCODE in (select OpBedCatId from Mst_FacilitySetup) and MS.CLNORGCODE = '${CLNORGCODE}' `;

            } else if (input.patientType === "D") {
                query = `SELECT d.DEPTNAME, M.SERVCODE,M.SERVNAME,MS.SERVICECOST,MS.DOCTSHAREAMT,M.DOC_COMP,M.RATEEDIT, M.DEPTCODE,  M.NAMEEDIT,M.QTY_EDITABLE,M.IsDiscountAlwd as IsDiscountAlwd,M.MaxDiscountPer as MaxDiscountPer, M.SERVTYPECD,M.SRVGRPCODE,M.SRVSUBGRP FROM MST_SERVICES M JOIN MST_SERVICECOST MS ON MS.SERVCODE = M.SERVCODE and MS.STATUS =  'A' join Mst_Department d on d.DEPTCODE=m.DEPTCODE WHERE M.STATUS = 'A'  and (M.SERVCODE like '%${SERVCODE}%' or m.SERVNAME like '%${SERVCODE}%' or m.MNEUNONIC like '%${SERVCODE}%')  AND MS.TARIFFID='001' AND MS.BEDCATGCODE in (select OpBedCatId from Mst_FacilitySetup) and MS.CLNORGCODE = '${CLNORGCODE}' order by M.SERVNAME `;

            } else if (input.patientType === "CT") {
                query = `SELECT ms.HOSPSERVCODE SERVCODE, f.SERVNAME SERVNAME,  f.DEPTCODE,  ms.GENSERVCOST SERVICECOST, f.RATEEDIT,  f.NAMEEDIT ,f.QTY_EDITABLE,DEPTNAME '',f.IsDiscountAlwd as IsDiscountAlwd,f.MaxDiscountPer as MaxDiscountPer, f.SERVTYPECD,f.SRVGRPCODE,f.SRVSUBGRP, f.DOCSHARE DOCTSHAREAMT,  f.DOC_COMP FROM MST_COMPSPLTARIF MS INNER JOIN MST_SERVICES F ON MS.HOSPSERVCODE=F.SERVCODE WHERE  TARIFFID='" + TARIFFID + "' and F.CLNORGCODE='" + hospid + "' and (f.SERVCODE like '%${SERVCODE}%' or f.SERVNAME like '%${SERVCODE}%')  `;
            }


            const result = await executeDbQuery(query, []);

            let table = "";
            let i = 0;

            for (const row of result.records) {
                i++;
                if (i === 1) {
                    table += `
          <thead style='width: 100%;'>
            <tr class='success'>
              <th id='th1'>Service Code</th>
              <th id='th3'>Service Name</th>
              <th id='th4'>Rate</th>
              <th id='th2' style='display:none;'>Name Edit</th>
              <th id='th2' style='display:none;'>Qty Edit</th>
              <th id='th2' style='display:none;'>Rate Edit</th>
              <th id='th5' style='display:none;'>Doctor Share</th>
              <th id='th6'>Department</th>
              <th id='th7' style='display:none;'>Company Amt</th>
              <th id='th8' style='display:none;'>Is Disc Alwd</th>
              <th id='th9' style='display:none;'>Max Disc Alwd</th>
              <th id='th11' style='display:none;'>ServGrp</th>
              <th id='th12' style='display:none;'>ServSubGrp</th>
              <th id='th10' style='display:none;'>ServType</th>
              <th id='th13' style='display:none;'>deptcode</th>
              <th id='th14' style='display:none;'>DoctComp</th>
            </tr>
          </thead>
          <tbody> `;
                }

                table += `
        <tr ondblclick="getServHelpDetls(${i});">
          <td style='text-align:left;'>${row.SERVCODE}</td>
          <td style='text-align:left;'>${row.SERVNAME}</td>
          <td style='text-align:left;'>${row.SERVICECOST}</td>
          <td style='text-align:left; display:none;'>${row.NAMEEDIT}</td>
          <td style='text-align:left; display:none;'>${row.QTY_EDITABLE}</td>
          <td style='text-align:left; display:none;'>${row.RATEEDIT}</td>
          <td style='text-align:left; display:none;'>${row.DOCTSHAREAMT}</td>
          <td style='text-align:left;'>${row.DEPTNAME}</td>
          <td style='text-align:left; display:none;'>${row.DOC_COMP}</td>
          <td style='text-align:left; display:none;'>${row.IsDiscountAlwd}</td>
          <td style='text-align:left; display:none;'>${row.MaxDiscountPer}</td>
          <td style='text-align:left; display:none;'>${row.SRVGRPCODE}</td>
          <td style='text-align:left; display:none;'>${row.SRVSUBGRP}</td>
          <td style='text-align:left; display:none;'>${row.SERVTYPECD}</td>
          <td style='text-align:left; display:none;'>${row.DEPTCODE}</td>
          <td style='text-align:left; display:none;'>${row.DOC_COMP}</td>
        </tr> `;
            }

            if (i > 0) table += "</tbody>";

            res.json({ status: 0, d: table });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getPaymentType(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = ` SELECT Payment_Type, * FROM Mst_PatientCategory WHERE PC_Code = @PatCatg `;

        const params = { PatCatg: input.PatCatg };

        try {
            const { records } = await executeDbQuery(sql, params);

            const details = records.map((row: any) => {
                const TYPE = parseInt(row.Payment_Type, 10);
                const TYPE1 = TYPE.toString().padStart(3, "0");
                return { Payment_Type: TYPE1 };
            });

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async loadRevision(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select distinct SEQID,TARIFFID,Revision_id,TARIFFDISCPERC  from MST_COMPRULETRN where COMPRULEGRP='TBP' and CRDCOMPCODE=@compId  order by SEQID asc`;

        const params = { compId: input.compId };

        try {
            const { records } = await executeDbQuery(sql, params)

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetDocFavDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT M.SERVCODE,M.SERVNAME,MS.SERVICECOST,MS.DOCTSHAREAMT, M.DOC_COMP,M.RATEEDIT,M.DEPTCODE,  M.NAMEEDIT,M.QTY_EDITABLE, M.IsDiscountAlwd as IsDiscountAlwd,M.MaxDiscountPer as MaxDiscountPer, M.SERVTYPECD,M.SRVGRPCODE,M.SRVSUBGRP FROM MST_SERVICES M JOIN MST_SERVICECOST MS ON MS.SERVCODE = M.SERVCODE  and MS.STATUS =  'A' WHERE M.STATUS = 'A' and  M.SERVCODE in (select SERVCODE from   MST_DOCFAVSERV where DOCTCODE like @DoctCode) AND MS.TARIFFID='001' and MS.CLNORGCODE = @hospid AND MS.BEDCATGCODE='001' order by M.SERVNAME `;

        const params = { DoctCode: input.DoctCode, hospid: input.hospid };

        try {
            const { records } = await executeDbQuery(sql, params)

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getDept(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT Department FROM Mst_DoctorMaster WHERE CODE=@DoctCode `;

        const params = { DoctCode: input.DoctCode };

        try {
            const { records } = await executeDbQuery(sql, params)

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getTariff(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select TARIFFDESC from MST_COMPRULETRN mcr inner join MST_TARIFFCATGORY mtc on mtc.TARIFFID=mcr.TARIFFID where CRDCOMPCODE=@compId and mcr.SEQID=1`;

        const params = { compId: input.compId };

        try {
            const { records } = await executeDbQuery(sql, params)

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GET_FacilitySetUpDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select PC_CODE,TariffId from Mst_FacilitySetup where CLNORGCODE=@hospid`;

        const params = { hospid: input.hospid };

        try {
            const { records } = await executeDbQuery(sql, params)

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getProfileServices(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select dp.TESTCODE as SERVCODE,SC.SERVNAME,'0' SERVICECOST, '0' DOCTSHAREAMT,'01' DOC_COMP,'N'  RATEEDIT,sc.DEPTCODE,'N' NAMEEDIT, 'N' QTY_EDITABLE,'N' ISDISCOUNTALWD,'0' MAXDISCOUNTPER,sc.SERVTYPECD, sc.SRVGRPCODE,sc.SRVSUBGRP from DGL_PANELPROF dp LEFT JOIN MST_SERVICES SC ON SC.SERVCODE=DP.TESTCODE where dp.PANELPROFCD in (select TESTCODE from DGL_TESTMASTER where TESTTYPE in ('R','P') and TESTCODE like @ServCode)`;

        const params = { ServCode: `%${input.ServCode}%` };

        try {
            const { records } = await executeDbQuery(sql, params);

            let profile = 1;
            let prId = "";

            const details = records.map((row: any) => {
                if (profile === 1) {
                    prId = row.SERVCODE;
                }

                const user = {
                    SERVCODE: row.SERVCODE,
                    SERVNAME: row.SERVNAME,
                    SERVICECOST: row.SERVICECOST,
                    DOCTSHAREAMT: row.DOCTSHAREAMT,
                    DOC_COMP: row.DOC_COMP,
                    DEPTCODE: row.DEPTCODE,
                    RATEEDIT: row.RATEEDIT,
                    NAMEEDIT: row.NAMEEDIT,
                    QTY_EDITABLE: row.QTY_EDITABLE,
                    IsDiscountAlwd: row.IsDiscountAlwd,
                    MaxDiscountPer: row.MaxDiscountPer,
                    SRVGRPCODE: row.SRVGRPCODE,
                    SRVSUBGRP: row.SRVSUBGRP,
                    SERVTYPECD: row.SERVTYPECD,
                    profileId: prId,
                    profileYN: "Y"
                };

                profile++;
                return user;
            });

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetPACKAGEServices(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select dp.SERVCODE,SC.SERVNAME,'0' SERVICECOST,'0' DOCTSHAREAMT,'01' DOC_COMP,'N'  RATEEDIT, '' DEPTCODE,'N' NAMEEDIT,'N' QTY_EDITABLE,'N' ISDISCOUNTALWD,'0' MAXDISCOUNTPER,SC.SERVTYPECD,SC.SRVGRPCODE, SC.SRVSUBGRP from MST_OPDHCKPKG dp LEFT JOIN MST_SERVICES SC ON SC.SERVCODE=DP.SERVCODE where PACKAGECODE IN (select SERVCODE from MST_SERVICES where OPIPPACKGE='O' and SERVCODE like @ServCode)`;

        const params = { ServCode: `%${input.ServCode}%` };

        try {
            const { records } = await executeDbQuery(sql, params);


            const details = records.map((row: any) => {

                const user = {
                    SERVCODE: row.SERVCODE,
                    SERVNAME: row.SERVNAME,
                    SERVICECOST: row.SERVICECOST,
                    DOCTSHAREAMT: row.DOCTSHAREAMT,
                    DOC_COMP: row.DOC_COMP,
                    DEPTCODE: row.DEPTCODE,
                    RATEEDIT: row.RATEEDIT,
                    NAMEEDIT: row.NAMEEDIT,
                    QTY_EDITABLE: row.QTY_EDITABLE,
                    IsDiscountAlwd: row.ISDISCOUNTALWD,
                    MaxDiscountPer: row.MAXDISCOUNTPER,
                    SRVGRPCODE: row.SRVGRPCODE,
                    SRVSUBGRP: row.SRVSUBGRP,
                    SERVTYPECD: row.SERVTYPECD,

                };

                return user;
            });

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GET_FACILITYSETUP_BEDCATG(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT OpBedCatId FROM Mst_FacilitySetup WHERE CLNORGCODE=@HOSPCODE`;

        const params = { HOSPCODE: input.HOSPCODE };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getServicesCost(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT  m.SERVCODE, m.SERVNAME, m.DEPTCODE, ms.SERVICECOST, ms.DOCTSHAREAMT, m.DOC_COMP, m.RATEEDIT, m.NAMEEDIT FROM MST_SERVICECOST MS LEFT JOIN MST_SERVICES M ON M.SERVCODE=MS.SERVCODE LEFT JOIN Mst_FacilitySetup F ON MS.BEDCATGCODE=F.OpBedCatId WHERE MS.SERVCODE != 'C' AND M.STATUS != 'C' AND (m.PATIENTTYPE = 'O' OR m.PATIENTTYPE = 'B') and MS.CLNORGCODE=@CLNORGCODE AND ms.TARIFFID =@Tariffid AND (m.SERVNAME LIKE @Servname) OR (m.SERVCODE LIKE @Servname) `;

        const params = { CLNORGCODE: input.hospid, Tariffid: input.Tariffid, Servname: `%${input.Servname || ''}%` };

        let table = `
        <thead>
            <tr class='success'>
                <th id='th16'>Service Code</th>
                <th id='th17'>Service Name</th>
                <th id='th18'>Dept</th>
                <th id='th19'>Serv_cost</th>
                <th id='th20'>Doct_share_Amt</th>
                <th id='th21'>Doct_Comp</th>
                <th id='th23'>Rate_Ed</th>
                <th id='th22'>Name_Ed</th>
            </tr>
        </thead>
        <tbody>
    `;

        try {
            const { records } = await executeDbQuery(sql, params);

            for (const row of records) {
                table += `
                <tr>
                    <td style='text-align:left;'>${row.SERVCODE}</td>
                    <td style='text-align:left;'>${row.SERVNAME}</td>
                    <td style='text-align:left;'>${row.DEPTCODE}</td>
                    <td style='text-align:left;'>${row.SERVICECOST}</td>
                    <td style='text-align:left;'>${row.DOCTSHAREAMT}</td>
                    <td style='text-align:left;'>${row.DOC_COMP}</td>
                    <td style='text-align:left;'>${row.RATEEDIT}</td>
                    <td style='text-align:left;'>${row.NAMEEDIT}</td>
                </tr>
            `;
            }

            table += `</tbody>`;

            res.json({ status: 0, d: table });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async LoadCrdauthLtr(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT CONVERT(varchar(20),VALIDUPTO,103) VALIDUPTO,CRDAUTHnUM,ENTLAMOUNT,BILLAMT,CNAMOUNT,(ENTLAMOUNT-BILLAMT+CNAMOUNT) rem_Amt FROM OPB_CRDAUTHLTR where MEDRECNO=@mrno and CRDCOMPCODE=@Compcode and LETTERNO=@Letterno and CLNORGCODE=@UnitCode`;

        const params = { mrno: input.mrno, Compcode: input.Compcode, Letterno: input.Letterno, UnitCode: input.UnitCode };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async LoadCrdAuthDetServCode(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT * FROM OPB_CRDAUTHLTR_DET WHERE SERVCODE=@Servcode AND CRDAUTHNO=@Authno`;

        const params = { Servcode: input.Servcode, Authno: input.Authno };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async LoadCompruletrn(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT TARIFFID FROM  MST_COMPRULETRN where CRDCOMPCODE=@Strcompcode and CLNORGCODE=@strUntiId and Revision_id=@strrevisionid `;

        const params = { Strcompcode: input.Strcompcode, strUntiId: input.strUntiId, strrevisionid: input.strrevisionid };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async loadSplServCost(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select distinct HOSPSERVCODE,SPLSERVCOST,SPLSERVNAME,SPLSERVCODE,SLNO,PAGENO,TARIFFID,REVISIONID  from MST_HOSPCOMPSERVLNK where HOSPSERVCODE=@servCode and TARIFFID=@tariffId and REVISIONID=@revision`;

        const params = { servCode: input.servCode, tariffId: input.tariffId, revision: input.revision };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetAuthDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select IPNO,MEDRECNO,LETTERNO,VALIDUPTO,ENTLAMOUNT,NOLIMITYN,EMPCODE, CLNORGCODE,EMPDEPARTMENT from IPB_CRDAUTHLTR where CRDCOMPCODE in (select Com_Id from Company where AUTHLETTER in ('O','A')) and IPNO=@MrNo and MEDRECNO=@IPNO and CLNORGCODE=@hospid`;

        const params = { MrNo: input.MrNo, IPNO: input.IPNO, hospid: input.hospid };

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetTrnCount(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT COUNT(*) as countt FROM OPD_BILLTRN`;

        try {
            const { records } = await executeDbQuery(sql, []);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async getEmergencyPercentage(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `select isnull(EmergencyPerc,0) from mst_facilitysetup WHERE CLNORGCODE=@HOSPID`;

        try {
            const { records } = await executeDbQuery(sql, { HOSPID: input.HOSPID });

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async Get_AmbDetailsPrint(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `SELECT TRAVEL_FROM, TRAVEL_TO, VEHICLENO, DISTANCE, DRIVER_NAME,DEPARTURE_DATE, ARRIVAL_DATE FROM YH_AMBULANCE_DETAILS WHERE OPBILLNO = @BILLNO`;

        const params = { BILLNO: input.BILLNO }

        try {
            const { records } = await executeDbQuery(sql, params);

            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async BindPrintServeice(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sql = `select CONVERT(varchar(10), ob.CREATED_ON,120) created_Date,m.SERVNAME,ob.SERVCODE,QUANTITY,RATE,AMOUNT,Dper,NET,HOSPSHARE,DOCTSHARE,ob.DEPTCODE,(AMOUNT-NET) as Disc_Amt,DOCTCODE,ob.splservcode,mh.SPLSERVNAME,ob.RevisionId,ob.spltariff_Id from OPD_BILLTRN ob inner join MST_SERVICES m on m.SERVCODE=ob.SERVCODE left join MST_HOSPCOMPSERVLNK mh on mh.SPLSERVCODE=ob.splservcode and mh.REVISIONID=ob.RevisionId and mh.SPLTARIFFID=ob.spltariff_id and mh.HOSPSERVCODE=ob.SERVCODE where ob.BILLNO=@BILLNO and ob.STATUS!='C'`;

            const params = { BILLNO: input.BILLNO };


            const result = await executeDbQuery(sql, params);
            const details = result.records.map((row: any) => {
                return {
                    SERVCODE: row.SERVCODE,
                    servname: row.SERVNAME,
                    quantity: row.QUANTITY,
                    rate: parseFloat(row.RATE).toFixed(2),
                    amount: parseFloat(row.AMOUNT).toFixed(2),
                    refamount: parseFloat(row.Disc_Amt).toFixed(2),
                    Dper: parseFloat(row.Dper).toFixed(2),
                    NET: parseFloat(row.NET).toFixed(2),
                    HOSPSHARE: parseFloat(row.HOSPSHARE).toFixed(2),
                    DOCTSHARE: parseFloat(row.DOCTSHARE).toFixed(2),
                    DEPTCODE: row.DEPTCODE,
                    DOCTCODE: row.DOCTCODE,
                    splservcode: row.splservcode,
                    splServName: row.SPLSERVNAME,
                    RevisionId: row.RevisionId,
                    spltariff_Id: row.spltariff_Id,
                    CREATED_ON: moment(row.created_Date).format("DD/MM/YYYY"),
                };
            });

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async DisplayPrintOutpatientBillPagedispaly1(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {


            let sql = `SELECT MD.DC_Name, SUM(ISNULL(OB.TOTDISCOUNT,0)) DISC, SUM(ISNULL(NETAMOUNT,0) - (ISNULL(AMOUNTPAID,0) + ISNULL(AMOUNTRCVD,0))) DUE, 'OP' OPCHD FROM OPD_BILLMST AS OB LEFT JOIN MST_DiscountCategory AS MD ON OB.DISCCATG = MD.DC_Code WHERE OB.status NOT IN ('C') AND OB.BILLDATE >= '${input.FromDate} 00:00:00' AND OB.BILLDATE <= '${input.FromDate} 23:59:59' `;

            if (input.CounterAll === "NO") {
                sql += ` AND OB.CASHCOUNTER='${input.Counter}'`;
            }
            if (input.UserAll === "NO") {
                sql += ` AND OB.CREATED_BY='${input.UserWise}'`;
            }
            sql += ` GROUP BY MD.DC_Name`;

            sql += `
            UNION ALL
            SELECT B.PATCATGCD AS DC_Name,
                   SUM(CONCESSION) DISC,
                   0 DUE,
                   'CHD' OPCHD
            FROM CHD_VACCREG V, IPD_ADMISSION B
            WHERE V.STATUS != 'C'
              AND B.STATUS != 'C'
              AND V.REGMRNO = B.MEDRECNO
              AND V.TRANDATE >= '${input.FromDate} 00:00:00'
              AND V.TRANDATE <= '${input.FromDate} 23:59:59'
        `;

            if (input.CounterAll === "NO") {
                sql += ` AND V.OPCCOUNTER='${input.Counter}'`;
            }
            if (input.UserAll === "NO") {
                sql += ` AND V.CREATED_BY='${input.UserWise}'`;
            }
            sql += ` GROUP BY B.PATCATGCD`;

            // Execute query
            const result = await executeDbQuery(sql);

            // Map results like CompanyNoticeBoardRegistration[]
            const details = result.records.map((row: any) => ({
                DC_Name: row.DC_Name,
                DISC: parseFloat(row.DISC).toFixed(2),
                DUE: parseFloat(row.DUE).toFixed(2),
                OPCHD: row.OPCHD
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async saveInvestigation(req: Request, res: Response): Promise<void> {
        const input = req.body.invData;
        const pool = await conpool.connect();
        const transaction = new sql.Transaction(pool);
        let Insert_OPD_BILLMST = '', Insert_OPD_Receipts = '', Insert_OPD_BILLTRN = '', Insert_YH_AMBULANCE_DETAILS = '', Insert_DGS_ORDERMST = '', INSERT_DGS_ORDERTRN = '', Insert_DGL_ORDERMST = '', Insert_DGL_ORDERTRN = '', Insert_DGC_ORDERMST = '', Insert_DGC_ORDERTRN = '', insert_DGR_ORDERMST = '', INSERT_DGR_ORDERTRN = '', Update_Patient_Master = '';
        const FinYear: any = await fetchCurrentFinYear();


        try {
            await transaction.begin();

            const BillNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'OB', ModuleId: "002" }, transaction);
            const ReceiptNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'RC', ModuleId: "002" }, transaction);
            const SURGOrderNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'DS', ModuleId: "002" }, transaction);
            const LABOrderNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'DL', ModuleId: "002" }, transaction);
            const CARDOrdenoNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'DC', ModuleId: "002" }, transaction);
            const RADOrderNo: any = await fetchCurrentNumber({ hospitalId: input.CLNORGCODE, type: 'DR', ModuleId: "002" }, transaction);

            Insert_OPD_BILLMST = "insert OPD_BILLMST(CLNORGCODE,FINYEAR,CASHCOUNTER, BILLTYPE,BILLNO,BEDCATGCD,RCPTNO,OPREGNO,MEDRECNO,BILLDATE,SALUTNCODE, PATNAME,PATFNAME,PATMNAME,PATLNAME,PATSURNAME,AGE,SEX, ADDRESS1,ADDRESS2,ADDRESS3,CITYCODE,DISTRICTCODE,STATECODE,COUNTRYCODE,PINCODE, MOBILENO,PAYMODE,CHEQUEDDNO,CHEQUEDATE,BANKNAME,REMARKS,REFBILLNO, REFDOCTCD,DOCTCD,CRDCOMPCD,LETTERNO,VALIDUPTO,DISPNO,DISPDATE,TOKENNO, TARIFFID,TOTCOVAMT,TOTUNCOVAMT,TOTSERVAMT,PATBILLAMT,PATDISCUNT, PATAMTPAID,PATAMTRCVD,PATCNAMT,PATRFNDAMT,COMBILLAMT,COMDISCUNT, COMAMTPAID,COMAMTRCVD,COMCNAMT,COMRFNDAMT,CREDAUTHBY,DISCAUTHBY, BILLSTAT,DRAWNON,PATCATG,CONSCATG,EMPID,EMPCODE,CLINICCODE,FUNDSOURCE, DEPTCODE,OPCONSNO,OPCONSAMT,OPREGFEE,COMPRCPT,POSTFLAG,NETAMOUNT, AMOUNTPAID,AMOUNTRCVD,CNAMOUNT,RFNDAMOUNT,TOTDISCOUNT,TOTALBILLAMT, ADDR4,ADDR5,CASETYPE,AUTHTRANID,REQUESTNO,CASHCOLL,EXMPTNO,ADVADJAMT, TRANCODE,SCROLLNO,EMERGENCYN,PATPHONE,COMPSTATUS,DISALOWAMT,BILLSOURCE, MATERNYN,EXPDUEDATE,IPNO,WRITOFFAMT,TAXAMT,OTEXPENTYN,TOTSRVTAX, SERVTAXON,SRVTAXAMT,EDUCESAMT,SHECESAMT,DEPTYPE,INSCOMPCD,INTLUPLDYN, ALLWCASHYN,SNCTPRFYN,SNCTPROOF,PISUID,PISPWD,DOCTPOST,LEDGPOST, POSTDATE,CREATED_BY,CREATED_ON,EDITED_BY,EDITED_ON,CANCELDBY, CANCELDON,STATUS,CONSTYPE,WardNo,BedNO,RevisionId,DISCCATG,OPDREGNO,ReferralAgent_ID) values (@CLNORGCODE, @FINYEAR, @CashCounter,'OB', @InvBillNo, (select OpBedCatId from Mst_FacilitySetup WHERE CLNORGCODE=@HospId),@RECEIPTNO, @MedRecNo, @MedRecNo1, GetDate(), @Sal_code, @PATNAME, @PATNAME1,'','','', @Age, @Gender,'','','','','','','','', @MobileNo, @PayMode, @CheqNo, @CheqDate, @BankName, @Remarks, @BillNO, @RefDoct, @Doctor, @companycode_new, @Autho_Letter, @LetterValidDate, '', '', '', @Tarif_ID, @CovAmt, @UnCovAmt, @TotServAmt, @TotPatServAmt, @PatDiscAmt, @PatAmtPaid, '0', '0', '0', @CompAmt, @CompDisc, @CompPaid, '0','0','0',@CrdAuthBy, @DiscAuthBy, '',@DrawnOn, @PatCatg, '', @EMPCODE, @EMPCODE1, '', '', @DeptCode,'','0','0','','', @NetAmt, @TotPaidAmt, '0', '0', '0', @TotalDiscount, @TotServAmt, '','','','','','','','0','','','N','','','0', @PatType, '','', @IPNO, '0', '0', 'N','0','0','0','0','0','','','N','N','N','','','','N','N',Getdate(), @CREATED_BY, GetDate(),'','','','','A','', @WardNo, @BedCatg, @Revision, @DiscCatg, @MedRecNo2, @refferalAgent)";

            const params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, CashCounter: input.CashCounter, InvBillNo: BillNo, HospId: input.CLNORGCODE, RECEIPTNO: ReceiptNo, MedRecNo: input.MedRecNo, MedRecNo1: input.MedRecNo, Sal_code: input.Sal_code, PATNAME: input.PATNAME, PATNAME1: input.PATNAME, Age: input.Age, Gender: input.Gender, MobileNo: input.MobileNo, PayMode: input.PayMode, CheqNo: input.CheqNo, CheqDate: input.CheqDate, BankName: input.BankName, Remarks: input.Remarks, BillNO: BillNo, RefDoct: input.RefDoct, Doctor: input.Doctor, companycode_new: input.companycode_new, Autho_Letter: input.Autho_Letter, LetterValidDate: input.LetterValidDate, Tarif_ID: input.Tarif_ID, CovAmt: input.CovAmt, UnCovAmt: input.UnCovAmt, TotServAmt: input.TotServAmt, TotPatServAmt: input.TotPatServAmt, PatDiscAmt: input.PatDiscAmt, PatAmtPaid: input.PatAmtPaid, CompAmt: input.CompAmt, CompDisc: input.CompDisc, CompPaid: input.CompPaid, CrdAuthBy: input.CrdAuthBy, DiscAuthBy: input.DiscAuthBy, DrawnOn: input.DrawnOn, PatCatg: input.PatCatg, EMPCODE: input.EMPCODE || '', EMPCODE1: input.EMPCODE || '', DeptCode: input.DeptCode, NetAmt: input.NetAmt, TotPaidAmt: input.TotPaidAmt, TotalDiscount: input.TotalDiscount, PatType: input.PatType, IPNO: '', CREATED_BY: input.CREATED_BY, WardNo: input.WardNo, BedCatg: input.BedCatg, Revision: input.Revision, DiscCatg: input.DiscCatg, MedRecNo2: input.MedRecNo, refferalAgent: input.refferalAgent };

            const { rowsAffected } = await executeDbQuery(Insert_OPD_BILLMST, params, { transaction });

            if (input.PayMode !== "003") {
                Insert_OPD_Receipts = "insert OPD_RECEIPTS (CLNORGCODE,FINYEAR,MEDRECNO,CNTRCODE, RCPTTYPE,RECEIPTNO,RECEIPTDATE,OPDBILLNO,PAYMODE,CHEQUEDDNO,CHEQUEDATE,BANKNAME, RCVDFROM,REMARKS,AMOUNT,DEPTCODE,CREATED_BY,CREATED_ON,STATUS,CNNO,PC_Code,TARIFFID,REVISIONID,OPDREGNO) values (@CLNORGCODE, @FINYEAR, @MedRecNo, @CashCounter, 'OB', @RECEIPTNO, GetDate(), @InvBillNo, @PayMode, @CheqNo, @CheqDate, @BankName, @CREATED_BY, @Remarks, @TotPaidAmt, '','','','A','', @PatCatg, @Tarif_ID, @Revision, @OPDREGNO)";

                const OPD_Receipts_Params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, MedRecNo: input.MedRecNo, CashCounter: input.CashCounter, RECEIPTNO: ReceiptNo, InvBillNo: BillNo, PayMode: input.PayMode, CheqNo: input.CheqNo, CheqDate: input.CheqDate, BankName: input.BankName, CREATED_BY: input.CREATED_BY, Remarks: input.Remarks, TotPaidAmt: input.TotPaidAmt, PatCatg: input.PatCatg, Tarif_ID: input.Tarif_ID, Revision: input.Revision, OPDREGNO: input.OPDREGNO }

                const { rowsAffected } = await executeDbQuery(Insert_OPD_Receipts, OPD_Receipts_Params, { transaction });

            }
            const rows = req.body.billTrnRows;

            const hasLab = rows.some((r: { ServType: string }) => r.ServType === "01");
            const hasRad = rows.some((r: { ServType: string }) => r.ServType === "02");
            const hasCard = rows.some((r: { ServType: string }) => r.ServType === "03");
            const hasSurg = rows.some((r: { ServType: string }) => r.ServType === "04");

            if (hasLab) {
                Insert_DGL_ORDERMST = "insert DGL_ORDERMST (CLNORGCODE,FINYEAR,ORDERNO,ORDERDATE,ORDERTIME,ORDERTYPE, PATTYPE,IPNO,MEDRECNO,PATNAME,AGE,SEX,BILLNO,NURSTCODE,REPORTTO, ORDEREDBY,STARTDATE,STARTTIME,STOPDATE,STOPTIME,BEDCATGCD,TARIFFID, CLINICALNOTES,REPAFTER,REMARKS,ORDER_STATUS,RACECD,LABTYPECD,LABTYPE, WARDNO,BEDNO,CLINICCODE,REQUESTNO,CREATED_BY,CREATED_ON,EDITED_BY, EDITED_ON,STATUS,PRIORITY,PATCATG,RoomNo,OPDREGNO) values (@CLNORGCODE, @FINYEAR, @labOrderCount, GetDate(),CONVERT(VARCHAR(8),GETDATE(),108),'O', @PatType, @IPNO, @MedRecNo, @PATNAME, @Age, @Gender,@pBillNO,'', @Doctor, @Doctor1,GETDATE(),CONVERT(VARCHAR(8),GETDATE(),108),'1900-01-01','00:00:00.0000000', @BedCatg, @Tarif_ID,'','', @Remarks,'OP','', @ServType,'', @WardNo,  @BedCatg1,'','',@CREATED_BY, GETDATE(),'','','A','R', @PatCatg, @WardNo1, @OPDREGNO)";


                const Insert_DGL_ORDERMST_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, labOrderCount: LABOrderNo, PatType: input.PatType, IPNO: input.IPNO, MedRecNo: input.MedRecNo, PATNAME: input.PATNAME, Age: input.Age, Gender: input.Gender, pBillNO: BillNo, Doctor: input.Doctor, Doctor1: input.Doctor, BedCatg: input.BedCatg, Tarif_ID: input.Tarif_ID, Remarks: input.Remarks, ServType: "01", WardNo: input.WardNo, BedCatg1: input.BedCatg, CREATED_BY: input.CREATED_BY, PatCatg: input.PatCatg, WardNo1: input.WardNo, OPDREGNO: input.OPDREGNO };

                const rowsAffected = await executeDbQuery(Insert_DGL_ORDERMST, Insert_DGL_ORDERMST_params, { transaction });
            }

            if (hasRad) {
                insert_DGR_ORDERMST = "insert DGR_ORDERMST (CLNORGCODE,FINYEAR,ORDERNO,ORDERDATE,ORDERTIME,ORDERTYPE, PATTYPE,IPNO,MEDRECNO,PATNAME,AGE,SEX,BILLNO,NURSTCODE,REPORTTO, ORDEREDBY,STARTDATE,STARTTIME,STOPDATE,STOPTIME,BEDCATGCD,TARIFFID, CLINICALNOTES,REPAFTER,REMARKS,ORDER_STATUS,RACECD,LABTYPECD,LABTYPE, WARDNO,BEDNO,CLINICCODE,REQUESTNO,CREATED_BY,CREATED_ON,EDITED_BY, EDITED_ON,STATUS,PRIORITY,PATCATG,RoomNo,OPDREGNO) values (@CLNORGCODE, @FINYEAR, @radOrderCount, GetDate(),CONVERT(VARCHAR(8),GETDATE(),108),'O', @PatType, @IPNO,  @MedRecNo, @PATNAME,  @Age, @Gender, @pBillNO, '', @Doctor , @Doctor1,GETDATE(),CONVERT(VARCHAR(8),GETDATE(),108),'1900-01-01','00:00:00.0000000',  @BedCatg, @Tarif_ID,'','', @Remarks,'OP','', @ServType,'', @WardNo,  @BedCatg1,'','',@CREATED_BY, GETDATE(),'','','A','R', @PatCatg, @WardNo1, @OPDREGNO)";

                const insert_DGR_ORDERMST_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, radOrderCount: RADOrderNo, PatType: input.PatType, IPNO: input.IPNO, MedRecNo: input.MedRecNo, PATNAME: input.PATNAME, Age: input.Age, Gender: input.Gender, pBillNO: BillNo, Doctor: input.Doctor, Doctor1: input.Doctor, BedCatg: input.BedCatg, Tarif_ID: input.Tarif_ID, Remarks: input.Remarks, ServType: "02", WardNo: input.WardNo, BedCatg1: input.BedCatg, CREATED_BY: input.CREATED_BY, PatCatg: input.PatCatg, WardNo1: input.WardNo, OPDREGNO: input.OPDREGNO };

                const rowsAffected = await executeDbQuery(insert_DGR_ORDERMST, insert_DGR_ORDERMST_params, { transaction });
            }

            if (hasCard) {
                Insert_DGC_ORDERMST = "insert DGC_ORDERMST (CLNORGCODE,FINYEAR,ORDERNO, ORDERDATE,ORDERTIME,ORDERTYPE,PATTYPE,IPNO,MEDRECNO,PATNAME,AGE, SEX,BILLNO,NURSTCODE,REPORTTO,ORDEREDBY,STARTDATE,STARTTIME,STOPDATE, STOPTIME,BEDCATGCD,TARIFFID,CLINICALNOTES,REPAFTER,REMARKS,ORDER_STATUS, RACECD,LABTYPECD,LABTYPE,WARDNO,BEDNO,CLINICCODE,REQUESTNO,CREATED_BY, CREATED_ON,EDITED_BY,EDITED_ON,STATUS,PRIORITY,PATCATG,RoomNo,OPDREGNO) values (@CLNORGCODE, @FINYEAR ,@CardordrCount, GetDate(),CONVERT(VARCHAR(8),GETDATE(),108),'O', @PatType, @IPNO,  @MedRecNo, @PATNAME,  @Age, @Gender,@pBillNO,'', @Doctor, @Doctor1,GETDATE(),CONVERT(VARCHAR(8),GETDATE(),108),'1900-01-01','00:00:00.0000000',  @BedCatg, @Tarif_ID,'','', @Remarks,'OP','', @ServType,'', @WardNo1,  @BedCatg1,'','', @CREATED_BY, GETDATE(),'','','A','R', @PatCatg, @WardNo, @OPDREGNO)";

                const Insert_DGC_ORDERMST_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, CardordrCount: CARDOrdenoNo, PatType: input.PatType, IPNO: input.IPNO, MedRecNo: input.MedRecNo, PATNAME: input.PATNAME, Age: input.Age, Gender: input.Gender, pBillNO: BillNo, Doctor: input.Doctor, Doctor1: input.Doctor, BedCatg: input.BedCatg, Tarif_ID: input.Tarif_ID, Remarks: input.Remarks, ServType: "03", WardNo: input.WardNo, BedCatg1: input.BedCatg, CREATED_BY: input.CREATED_BY, PatCatg: input.PatCatg, WardNo1: input.WardNo, OPDREGNO: input.OPDREGNO };

                const rowsAffected = await executeDbQuery(Insert_DGC_ORDERMST, Insert_DGC_ORDERMST_params, { transaction });
            }

            if (hasSurg) {
                Insert_DGS_ORDERMST = "insert DGS_ORDERMST (CLNORGCODE,FINYEAR,ORDERNO,ORDERDATE,ORDERTIME,ORDERTYPE,PATTYPE,IPNO,MEDRECNO,PATNAME,AGE, SEX,BILLNO,NURSTCODE,REPORTTO,ORDEREDBY,STARTDATE,STARTTIME,STOPDATE, STOPTIME,BEDCATGCD,TARIFFID,CLINICALNOTES,REPAFTER,REMARKS,ORDER_STATUS, RACECD,LABTYPECD,LABTYPE,WARDNO,BEDNO,CLINICCODE,REQUESTNO,CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, STATUS, PRIORITY, PATCATG, RoomNo, OPDREGNO) values (@CLNORGCODE, @FINYEAR, @RendOrdrCount, GetDate(), CONVERT(VARCHAR(8),GETDATE(),108), 'O', @PatType, @IPNO, @MedRecNo, @PATNAME, @Age, @Gender, @pBillNO, '', @Doctor, @Doctor1, GETDATE(), CONVERT(VARCHAR(8),GETDATE(),108), '1900-01-01', '00:00:00.0000000', @BedCatg, @Tarif_ID, '', '', @Remarks, 'OP', '', @ServType, '', @WardNo, @BedCatg1, '', '', @CREATED_BY, GETDATE(), '', '', 'A', 'R', @PatCatg, @WardNo1, @OPDREGNO)";

                const Insert_DGS_ORDERMST_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, RendOrdrCount: SURGOrderNo, PatType: input.PatType, IPNO: input.IPNO, MedRecNo: input.MedRecNo, PATNAME: input.PATNAME, Age: input.Age, Gender: input.Gender, pBillNO: BillNo, Doctor: input.Doctor, Doctor1: input.Doctor, BedCatg: input.BedCatg, Tarif_ID: input.Tarif_ID, Remarks: input.Remarks, ServType: "04", WardNo: input.WardNo, BedCatg1: input.BedCatg, CREATED_BY: input.CREATED_BY, PatCatg: input.PatCatg, WardNo1: input.WardNo, OPDREGNO: input.OPDREGNO };

                const { rowsAffected } = await executeDbQuery(Insert_DGS_ORDERMST, Insert_DGS_ORDERMST_params, { transaction });
            }

            const seq: Record<string, number> = { "01": 0, "02": 0, "03": 0, "04": 0 };
            for (const row of rows) {

                Insert_OPD_BILLTRN = "INSERT OPD_BILLTRN (CLNORGCODE,FINYEAR,CASHCOUNTER,BILLTYPE,BILLNO,SERVCODE,SplServCode,QUANTITY, COVRATE,UNCOVRATE,NETRATE,PATAMOUNT,COMAMOUNT,PATCNAMT,COMCNAMT,PATDISC,COMDISC,OPCNNO, REMARKS,ORDGENYN,SERCANSTAT,RFNDSTAT,DGREGSTAT,DEPTCODE,LEDGRPCODE,SRVGRPCODE, TRAN_PERIOD,FUNDSOURCE,SUBGRPCODE,SRVTYPCODE,SERDISCOUNT,NET,RATE,AMOUNT,DOCTCODE, DOCTSHARE,TECHSHARE,SURCHARGE,ADDSURCHRG,DOCTAMT,HOSPSHARE,ORGDOCSHAR,TRANCODE,SURCHRGNOT, SHARDOCT,SURGCODE,PACKAGECODE,DOCTPOSTDT,SRVTAXYN,SRVTAXAMT,EDUCESAMT,SHECESAMT,RENDQTY, DOCTPOST,CREATED_BY,CREATED_ON,EDITED_BY,EDITED_ON,STATUS,Dper,RevisionId,splTariff_Id) VALUES (@CLNORGCODE, @FINYEAR, @CashCounter, 'OB', @InvBillNo, @SERVCODE, @splServCode, @Qty, @Rate, '0', @Rate1, @PatAmt, @CompAmt, '0', '0', @PatDisc, @CompDisc, '', @Remarks, 'N','', '', '', @Dept, '', @ServGrpCode, '', '', @ServSubGrpCode, @ServType, @DiscAmt, @NetAmt, @Rate2, @Amount, @RepDoc, @DocShare, '0', '0', '0', @DocShare, @HospShare, '0', '', '0', '', '', '', '1900-01-01', 'N', '0', '0', '0','0', 'N', @CREATED_BY, GetDate(), '','', 'A', @DiscPer, @revissionId, @tariffId)";

                const Insert_OPD_BILLTRN_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, CashCounter: input.CashCounter, InvBillNo: BillNo, SERVCODE: row.ServCode, splServCode: row.splServCode || '', Qty: row.Qty, Rate: row.Rate, Rate1: row.Rate, PatAmt: row.PatAmt, CompAmt: row.CompAmt, PatDisc: row.PatDisc, CompDisc: row.CompDisc, Remarks: input.Remarks, Dept: row.Dept, ServGrpCode: row.ServGrpCode, ServSubGrpCode: row.ServSubGrpCode, ServType: row.ServType, DiscAmt: row.DiscAmt, NetAmt: row.NetAmt, Rate2: row.Rate, Amount: row.Amount, RepDoc: row.RepDoc, DocShare: row.DocShare, HospShare: row.HospShare, CREATED_BY: input.CREATED_BY, DiscPer: row.DiscPer, revissionId: row.revissionId, tariffId: row.tariffId };

                const { rowsAffected } = await executeDbQuery(Insert_OPD_BILLTRN, Insert_OPD_BILLTRN_params, { transaction });

                if (row.ServCode == "PRO001") {
                    Insert_YH_AMBULANCE_DETAILS = "insert YH_AMBULANCE_DETAILS (CLNORGCODE, OPBILLNO,VEHICLENO,DRIVER_NAME,TRAVEL_FROM,TRAVEL_TO,PATIENT_NAME,STATUS, DISTANCE,DEPARTURE_DATE,CHARGES,CREATED_BY,CREATED_ON,ARRIVAL_DATE ) values (@CLNORGCODE, @InvBillNo, @Amb_vechilno, @Amb_drivername, @Amb_from, @Amb_to, @PATNAME, 'A', @Amb_distance, @Amb_date, @Amount, @CREATED_BY, GETDATE(), @Amb_Adate)";

                    const Insert_YH_AMBULANCE_DETAILS_params = { CLNORGCODE: input.CLNORGCODE, InvBillNo: BillNo, Amb_vechilno: input.Amb_vechilno || '', Amb_drivername: input.Amb_drivername || '', Amb_from: input.Amb_from || '', Amb_to: input.Amb_to || '', PATNAME: input.PATNAME, Amb_distance: input.Amb_distance || '', Amb_date: input.Amb_date || '', Amount: input.Amount || '0.00', CREATED_BY: input.CREATED_BY, Amb_Adate: input.Amb_Adate || '' };

                    const { rowsAffected } = await executeDbQuery(Insert_YH_AMBULANCE_DETAILS, Insert_YH_AMBULANCE_DETAILS_params, { transaction });
                }

                if (row.ServType == "04") {
                    const DGS_Seq = ++seq["04"];

                    INSERT_DGS_ORDERTRN = "INSERT DGS_ORDERTRN (CLNORGCODE,FINYEAR,LABCODE, LABTYPECD,LABDPTCODE,LABSUBDPTCODE,ORDERNO,ORDERDATE,ORDERTIME,TESTCODE, PROFILEYN,PROFILEID,SEQNO,SERVCODE,TESTSTATUS,TARIFFID,BEDCATGCD, SPECCODE,MTHDCODE,CONTCODE,SAMLECOLNO,SAMCOLDATE,SAMCOLTIME,SAMLECOLBY, ACCEPTANNO,ACCEPTEDBY,ACCEPTEDON,ACCEPTEDAT,SAMPLESTATUS,CENTERCODE, RESULTNO,RESULTDATE,RESULTTIME,WORKLISTNO,LEDGRPCODE,COLLECTEDBY,PROSRVCODE, INSTRUCTNS,RECEIVEDBY,SEPERATEBY,REJECTEDBY,REJECTEDON,REJECTEDAT, RLTPANPROF,RCVDORSEND ,SENDDATE,SENDTIME,REJREASON,REJSAMPLNO, RERUNREASON,RERUNDATE,RERUNTIME,RECEIVEDON,RECEIVEDAT,SCHEDULEYN, PRIORITY,OPENED,SPEC_QTY,PRFMDOCT,PRFDOCDPT,WRKLSTGEN, SPEMULCODE,SPEMULSTAT,SAMNOGENDT,SAMNOGENTM,ISSMPTSTSEND,ORDQTY, CANCELBY,CANCELON,CANCELAT,PACSSTATUS,SERVCOST,TOTALSERVCOST,SLNO, QTY,TOTALQTY,VISITNO) VALUES(@CLNORGCODE,  @FINYEAR, '', @ServType, @ServGrpCode, @ServSubGrpCode, @RendOrdrCount, GETDATE(), CONVERT(VARCHAR(8),GETDATE(),108), '', 'N', @TESTCODE, @DGS_Seq, @ServCode, 'OP', @Tarif_ID, @BedCatg,'','','','',GetDate(),CONVERT(VARCHAR(8),GETDATE(),108),'','','', GETDATE(), GETDATE(),'OP','','','1900-01-01','00:00:00.0000000','','','','','','','','','00:00:00.0000000','1900-01-01', '','','1900-01-01','00:00:00.0000000','','','','1900-01-01','00:00:00.0000000', '1900-01-01','00:00:00.0000000','','R','','0','','','N','N','','1900-01-01','00:00:00.0000000','N', @Qty,'','1900-01-01','00:00:00.0000000', '', @Rate, @Rate1, @DGS_Seq1, @Qty1, @Qty2,'')";

                    const INSERT_DGS_ORDERTRN_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, ServType: row.ServType, ServGrpCode: row.ServGrpCode, ServSubGrpCode: input.ServSubGrpCode, RendOrdrCount: SURGOrderNo, TESTCODE: row.splServCode || row.ServCode, DGS_Seq: DGS_Seq, ServCode: row.ServCode || row.splServCode, Tarif_ID: input.Tarif_ID, BedCatg: input.BedCatg, Qty: row.Qty, Rate: row.Rate, Rate1: row.Rate, DGS_Seq1: DGS_Seq, Qty1: row.Qty, Qty2: row.Qty };


                    const rowsAffected1 = await executeDbQuery(INSERT_DGS_ORDERTRN, INSERT_DGS_ORDERTRN_params, { transaction });

                }

                if (row.ServType == "01") {
                    const DGL_Seq = ++seq["01"];

                    Insert_DGL_ORDERTRN = "INSERT DGL_ORDERTRN (CLNORGCODE,FINYEAR,LABCODE,LABTYPECD,LABDPTCODE, LABSUBDPTCODE,ORDERNO,ORDERDATE,ORDERTIME,TESTCODE,PROFILEYN, PROFILEID,SEQNO, SERVCODE,TESTSTATUS,TARIFFID,BEDCATGCD, SPECCODE,MTHDCODE,CONTCODE,SAMLECOLNO,SAMCOLDATE,SAMCOLTIME, SAMLECOLBY,ACCEPTANNO,ACCEPTEDBY,ACCEPTEDON,ACCEPTEDAT,SAMPLESTATUS, CENTERCODE,RESULTNO,RESULTDATE,RESULTTIME,WORKLISTNO,LEDGRPCODE, COLLECTEDBY,PROSRVCODE,INSTRUCTNS,RECEIVEDBY,SEPERATEBY,REJECTEDBY, REJECTEDON,REJECTEDAT,RLTPANPROF,RCVDORSEND,SENDDATE,SENDTIME, REJREASON,REJSAMPLNO, RERUNREASON,RERUNDATE,RERUNTIME,RECEIVEDAT, SCHEDULEYN,PRIORITY,OPENED,SPEC_QTY, PRFMDOCT,PRFDOCDPT, WRKLSTGEN,SPEMULCODE,SPEMULNAME,SPEMULSTAT,SAMNOGENDT, SAMNOGENTM, ISSMPTSTSEND,ORDQTY,CANCELBY,CANCELON,CANCELAT,PACSSTATUS, SERVCOST, TOTALSERVCOST,SLNO)VALUES(@CLNORGCODE, @FINYEAR, '', @ServType, @ServGrpCode, @ServSubGrpCode, @labOrderCount, GETDATE(),CONVERT(VARCHAR(8),GETDATE(),108), @splServCode, @PROFILEYN, @PROFILEID, @DGL_Seq, @splServCode1, 'OP', @Tarif_ID, @BedCatg, '','','','',GetDate(),CONVERT(VARCHAR(8),GETDATE(),108), '','','',GETDATE(),'','OP', '','','1900-01-01','00:00:00.0000000','','', '','','','','','', '','','','','1900-01-01','00:00:00.0000000','','','','1900-01-01','00:00:00.0000000','','N','','R','0','','', '','','','','','', 'N', @Qty,'','1900-01-01','00:00:00.0000000','', @Rate, @Rate1, @DGL_Seq1)"

                    const Insert_DGL_ORDERTRN_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, ServType: row.ServType, ServGrpCode: row.ServGrpCode, ServSubGrpCode: row.ServSubGrpCode, labOrderCount: LABOrderNo, splServCode: row.splServCode || row.ServCode, PROFILEYN: row.PROFILEYN || 'N', PROFILEID: row.PROFILEID || '', DGL_Seq: DGL_Seq, SplServCode1: row.SplServCode || row.ServCode, Tarif_ID: input.Tarif_ID, BedCatg: input.BedCatg, Qty: row.Qty, Rate: row.Rate, Rate1: row.Rate, DGL_Seq1: DGL_Seq };

                    const rowsAffected = await executeDbQuery(Insert_DGL_ORDERTRN, Insert_DGL_ORDERTRN_params, { transaction });

                }

                if (row.ServType == "03") {
                    const DGC_Seq = ++seq["03"];

                    Insert_DGC_ORDERTRN = "INSERT DGC_ORDERTRN (CLNORGCODE, FINYEAR, LABCODE, LABTYPECD, LABDPTCODE, LABSUBDPTCODE,ORDERNO, ORDERDATE, ORDERTIME,TESTCODE, PROFILEYN, PROFILEID, SEQNO, SERVCODE, TESTSTATUS, TARIFFID, BEDCATGCD,SPECCODE, MTHDCODE, CONTCODE, SAMLECOLNO, SAMCOLDATE, SAMCOLTIME, SAMLECOLBY,ACCEPTANNO, ACCEPTEDBY, ACCEPTEDON, ACCEPTEDAT, SAMPLESTATUS, CENTERCODE,RESULTNO, RESULTDATE, RESULTTIME, WORKLISTNO, LEDGCPCODE, COLLECTEDBY, PROSRVCODE, INSTRUCTNS,RECEIVEDBY, SEPERATEBY, REJECTEDBY, REJECTEDON, REJECTEDAT, RLTPANPROF, RCVDORSEND, SENDDATE, SENDTIME,REJREASON, REJSAMPLNO, RERUNREASON, RERUNDATE, RERUNTIME, RECEIVEDAT,SCHEDULEYN, PRIORITY, OPENED, SPEC_QTY, PRFMDOCT, PRFDOCDPT, WRKLSTGEN,SPEMULCODE, SPEMULNAME, SPEMULSTAT, SAMNOGENDT, SAMNOGENTM, ISSMPTSTSEND,ORDQTY, CANCELBY, CANCELON, CANCELAT, PACSSTATUS, SERVCOST, TOTALSERVCOST, SLNO) VALUES (@CLNORGCODE, @FINYEAR, '',@ServType, @ServGrpCode, @ServSubGrpCode,@CardordrCount, GETDATE(), CONVERT(VARCHAR(8), GETDATE(), 108),@SplServCode, 'N', NULL, @DGC_Seq, @SplServCode1, 'OP', @Tarif_ID, @BedCatg,'', '', '', '', '1900-01-01', '00:00:00', '', '', '', '1900-01-01', '00:00:00','OP', '', '','1900-01-01', '00:00:00','', '', '', '','', '', '', '', '1900-01-01', '00:00:00', '', '','1900-01-01', '00:00:00','', '', '', '1900-01-01', '00:00:00','1900-01-01','N', 'R', 0, 0, '', '', '', '', '', '', '1900-01-01', '00:00:00', 'N',@Qty, '', '1900-01-01', '00:00:00', '', @Rate, @Rate1, @DGC_Seq1 );";

                    const Insert_DGC_ORDERTRN_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, ServType: row.ServType, ServGrpCode: row.ServGrpCode, ServSubGrpCode: row.ServSubGrpCode, CardordrCount: CARDOrdenoNo, SplServCode: row.splServCode || row.ServCode, DGC_Seq: DGC_Seq, SplServCode1: row.splServCode || row.ServCode, Tarif_ID: input.Tarif_ID, BedCatg: input.BedCatg, Qty: row.Qty, Rate: row.Rate, Rate1: row.Rate, DGC_Seq1: DGC_Seq };

                    const rowsAffected = await executeDbQuery(Insert_DGC_ORDERTRN, Insert_DGC_ORDERTRN_params, { transaction });

                }

                if (row.ServType == "02") {
                    const DGR_Seq = ++seq["02"];

                    INSERT_DGR_ORDERTRN = "INSERT DGR_ORDERTRN (CLNORGCODE, FINYEAR, LABCODE, LABTYPECD, LABDPTCODE, LABSUBDPTCODE,ORDERNO, ORDERDATE, ORDERTIME,TESTCODE, PROFILEYN, PROFILEID, SEQNO, SERVCODE, TESTSTATUS, TARIFFID, BEDCATGCD,SPECCODE, MTHDCODE, CONTCODE, SAMLECOLNO, SAMCOLDATE, SAMCOLTIME, SAMLECOLBY,ACCEPTANNO, ACCEPTEDBY, ACCEPTEDON, ACCEPTEDAT, SAMPLESTATUS, CENTERCODE,RESULTNO, RESULTDATE, RESULTTIME, WORKLISTNO, LEDGRPCODE, COLLECTEDBY, PROSRVCODE, INSTRUCTNS,RECEIVEDBY, SEPERATEBY, REJECTEDBY, REJECTEDON, REJECTEDAT, RLTPANPROF, RCVDORSEND, SENDDATE, SENDTIME,REJREASON, REJSAMPLNO, RERUNREASON, RERUNDATE, RERUNTIME, RECEIVEDON, RECEIVEDAT,SCHEDULEYN, PRIORITY, OPENED, SPEC_QTY, PRFMDOCT, PRFDOCDPT, WRKLSTGEN,SPEMULCODE, SPEMULNAME, SPEMULSTAT, SAMNOGENDT, SAMNOGENTM, ISSMPTSTSEND,ORDQTY, CANCELBY, CANCELON, CANCELAT, PACSSTATUS, SERVCOST, TOTALSERVCOST, SLNO) VALUES (@CLNORGCODE, @FINYEAR, '',@ServType, @ServGrpCode, @ServSubGrpCode,@radOrderCount, GETDATE(), CONVERT(VARCHAR(8), GETDATE(), 108),@splServCode, 'N', NULL, @DGR_Seq, @splServCode1, 'OP', @Tarif_ID, @BedCatg,'', '', '', '','1900-01-01', '00:00:00', '', '', '', '1900-01-01', '00:00:00', '', '', '', '1900-01-01', '00:00:00', '', '', '', '', '', '', '', '', '1900-01-01', '00:00:00','', '','1900-01-01', '00:00:00', '', '', '', '1900-01-01', '00:00:00', '1900-01-01', '00:00:00', 'N', 'R', 0, 0, '', '', '', '', '', '', '1900-01-01', '00:00:00','N', @Qty,'', '1900-01-01', '00:00:00', '', @Rate, @Rate1, @DGR_Seq1 );";

                    const INSERT_DGR_ORDERTRN_params = { CLNORGCODE: input.CLNORGCODE, FINYEAR: FinYear, ServType: row.ServType, ServGrpCode: row.ServGrpCode, ServSubGrpCode: row.ServSubGrpCode, radOrderCount: RADOrderNo, splServCode: row.splServCode || row.ServCode, DGR_Seq: DGR_Seq, splServCode1: row.ServCode || row.splServCode, Tarif_ID: input.Tarif_ID, BedCatg: input.BedCatg || '', Qty: Number(row.Qty ?? 1), Rate: Number(row.Rate ?? 0), Rate1: Number(row.Rate ?? 0), DGR_Seq1: DGR_Seq };

                    const rowsAffected = await executeDbQuery(INSERT_DGR_ORDERTRN, INSERT_DGR_ORDERTRN_params, { transaction });
                }


            }

            Update_Patient_Master = "update patient_master set age= @Age, Patient_DOB= @patDOB, Comp_Id= @companycode_new where patientmr_no= @MedRecNo";

            const Update_Patient_Master_params = { Age: input.Age, patDOB: input.patDOB, companycode_new: input.companycode_new, MedRecNo: input.MedRecNo };

            const rowsAffected1 = await executeDbQuery(Update_Patient_Master, Update_Patient_Master_params, { transaction });

            // Commit transaction
            await transaction.commit();

            res.json({ status: 0, message: "Success", result: rowsAffected, BillNo: BillNo });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async saveIPADDRESS_OPDBILLMST(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const pool = await conpool.connect();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const query = "INSERT INTO OPD_BILLMST_AUDIT (CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, BEDCATGCD, RCPTNO, OPREGNO, MEDRECNO, BILLDATE, SALUTNCODE, PATNAME, PATFNAME, PATMNAME, PATLNAME, PATSURNAME, AGE, SEX, ADDRESS1, ADDRESS2, ADDRESS3, CITYCODE, DISTRICTCODE, STATECODE, COUNTRYCODE, PINCODE, MOBILENO, PAYMODE, CHEQUEDDNO, CHEQUEDATE, BANKNAME, REMARKS, REFBILLNO, REFDOCTCD, DOCTCD, CRDCOMPCD, LETTERNO, VALIDUPTO, DISPNO, DISPDATE, TOKENNO, TARIFFID, TOTCOVAMT, TOTUNCOVAMT, TOTSERVAMT, PATBILLAMT, PATDISCUNT, PATAMTPAID, PATAMTRCVD, PATCNAMT, PATRFNDAMT, COMBILLAMT, COMDISCUNT, COMAMTPAID, COMAMTRCVD, COMCNAMT, COMRFNDAMT, CREDAUTHBY, DISCAUTHBY, BILLSTAT, DRAWNON, PATCATG, CONSCATG, EMPID, EMPCODE, CLINICCODE, FUNDSOURCE, DEPTCODE, OPCONSNO, OPCONSAMT, OPREGFEE, COMPRCPT, POSTFLAG, NETAMOUNT, AMOUNTPAID, AMOUNTRCVD, CNAMOUNT, RFNDAMOUNT, TOTDISCOUNT, TOTALBILLAMT, ADDR4, ADDR5, CASETYPE, AUTHTRANID, REQUESTNO, CASHCOLL, EXMPTNO, ADVADJAMT, TRANCODE, SCROLLNO, EMERGENCYN, PATPHONE, COMPSTATUS, DISALOWAMT, BILLSOURCE, MATERNYN, EXPDUEDATE, IPNO, WRITOFFAMT, TAXAMT, OTEXPENTYN, TOTSRVTAX, SERVTAXON, SRVTAXAMT, EDUCESAMT, SHECESAMT, DEPTYPE, INSCOMPCD, INTLUPLDYN, ALLWCASHYN, SNCTPRFYN, SNCTPROOF, PISUID, PISPWD, DOCTPOST, LEDGPOST, POSTDATE, CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, CANCELDBY, CANCELDON, STATUS, CONSTYPE, WardNo, BedNO, RevisionId, OPDREGNO, DISCCATG, ReferralAgent_ID, USERID, USERNAME, SYSTEM_IPADRESS, INSERTED_ON) SELECT CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, BEDCATGCD, RCPTNO, OPREGNO, MEDRECNO, BILLDATE, SALUTNCODE, PATNAME, PATFNAME, PATMNAME, PATLNAME, PATSURNAME, AGE, SEX, ADDRESS1, ADDRESS2, ADDRESS3, CITYCODE, DISTRICTCODE, STATECODE, COUNTRYCODE, PINCODE, MOBILENO, PAYMODE, CHEQUEDDNO, CHEQUEDATE, BANKNAME, REMARKS, REFBILLNO, REFDOCTCD, DOCTCD, CRDCOMPCD, LETTERNO, VALIDUPTO, DISPNO, DISPDATE, TOKENNO, TARIFFID, TOTCOVAMT, TOTUNCOVAMT, TOTSERVAMT, PATBILLAMT, PATDISCUNT, PATAMTPAID, PATAMTRCVD, PATCNAMT, PATRFNDAMT, COMBILLAMT, COMDISCUNT, COMAMTPAID, COMAMTRCVD, COMCNAMT, COMRFNDAMT, CREDAUTHBY, DISCAUTHBY, BILLSTAT, DRAWNON, PATCATG, CONSCATG, EMPID, EMPCODE, CLINICCODE, FUNDSOURCE, DEPTCODE, OPCONSNO, OPCONSAMT, OPREGFEE, COMPRCPT, POSTFLAG, NETAMOUNT, AMOUNTPAID, AMOUNTRCVD, CNAMOUNT, RFNDAMOUNT, TOTDISCOUNT, TOTALBILLAMT, ADDR4, ADDR5, CASETYPE, AUTHTRANID, REQUESTNO, CASHCOLL, EXMPTNO, ADVADJAMT, TRANCODE, SCROLLNO, EMERGENCYN, PATPHONE, COMPSTATUS, DISALOWAMT, BILLSOURCE, MATERNYN, EXPDUEDATE, IPNO, WRITOFFAMT, TAXAMT, OTEXPENTYN, TOTSRVTAX, SERVTAXON, SRVTAXAMT, EDUCESAMT, SHECESAMT, DEPTYPE, INSCOMPCD, INTLUPLDYN, ALLWCASHYN, SNCTPRFYN, SNCTPROOF, PISUID, PISPWD, DOCTPOST, LEDGPOST, POSTDATE, CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, CANCELDBY, CANCELDON, STATUS, CONSTYPE, WardNo, BedNO, RevisionId, OPDREGNO, DISCCATG, ReferralAgent_ID, @USERID, @USERNAME, @IPAddress, GETDATE() from OPD_BILLMST where medrecno=@MRNO and BILLNO=@BILLNO";

            const params = { USERID: input.USERID, USERNAME: input.USERNAME, IPAddress: input.IPAddress, MRNO: input.MRNO, BILLNO: input.BILLNO };

            const { records } = await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Success", result: records });

        } catch (err: any) {
            await transaction.rollback();

            res.status(500).json({ status: 1, message: err.message, result: 0 });
        }
    }

    async GetPaymentFields(req: Request, res: Response): Promise<void> {
        try {
            const sql = "EXEC spGetPayModeFields";
            const { records } = await executeDbQuery(sql, {});
            const payModes: PaymentModeRow[] = records[0];
            const fields: PaymentFieldRow[] = records[1];

            const listPayModes: PaymentMode[] = payModes.map((pm: PaymentModeRow) => {
                const paymentFields: PaymentField[] = fields
                    .filter((f: PaymentFieldRow) => f.payModeId === pm.Paymodeid)
                    .map((f: PaymentFieldRow) => ({
                        fieldId: f.FieldId,
                        fieldName: f.FieldName,
                        payModeId: f.payModeId,
                    }));

                return {
                    paymentModeId: pm.Paymodeid,
                    paymentModeName: pm.PayMode,
                    paymentFields,
                };
            });

            res.json({ status: 0, d: listPayModes });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async CancelDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {

            let vl_cancel_flg = "N";
            let x = 0;

            const checkQueries = [
                `SELECT DISTINCT TESTSTATUS FROM DGL_ORDERTRN WHERE ORDERNO IN (SELECT ORDERNO FROM DGL_ORDERMST WHERE BILLNO = @Billnos)`,
                `SELECT DISTINCT TESTSTATUS FROM DGR_ORDERTRN WHERE ORDERNO IN (SELECT ORDERNO FROM DGR_ORDERMST WHERE BILLNO = @Billnos)`,
                `SELECT DISTINCT TESTSTATUS FROM DGC_ORDERTRN WHERE ORDERNO IN (SELECT ORDERNO FROM DGC_ORDERMST WHERE BILLNO = @Billnos)`,
                `SELECT DISTINCT TESTSTATUS FROM DGS_ORDERTRN WHERE ORDERNO IN (SELECT ORDERNO FROM DGS_ORDERMST WHERE BILLNO = @Billnos)`
            ];

            const params = { Billnos: input.Billnos };

            for (const q of checkQueries) {
                const { records } = await executeDbQuery(q, params);
                for (const row of records) {
                    if (row.TESTSTATUS === "OP") {
                        vl_cancel_flg = "Y";
                    }
                }
            }

            if (vl_cancel_flg === "Y" || true) {
                const cancelSQL = `EXEC OPD_BILLMST_CANCEL @Billno=@Billno, @edited_by=@edited_by, @Remarks=@Remarks`;
                const cancelParams = {
                    Billno: input.Billnos,
                    edited_by: input.userId,
                    Remarks: input.Remarks || "Cancelled via API"
                };

                await executeDbQuery(cancelSQL, cancelParams);
                x = 9;
            }

            const details = [{ result: String(x) }];
            res.json({ status: 0, d: details });

        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetSearchDetails(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const fromDate = input.FromDate;
            const toDate = input.ToDate;
            const doctor = input.Doctor || "";
            const status = input.status || "";
            const compId = input.compId || "";

            const hospid = input.HospitalId;
            const user = input.USERID;

            let sql = `select u.USERNAME,c.Name companyName,op.Billno, op.Billdate,op.OPDREGNO, op.MEDRECNO ,op.PATNAME,AGE,op.SEX, op.NetAmount, op.PATAMTPAID, (op.NETAMOUNT - op.AMOUNTPAID) DueAmt, op.CREATED_BY,DOCTCD,Firstname,	ipno,AMOUNTPAID,op.status from OPD_BILLMST op left join Mst_DoctorMaster dd on dd.Code=op.DOCTCD left join Company c on c.Com_Id=op.CRDCOMPCD left join Mst_UserDetails u on u.USERID=op.CREATED_BY where BILLTYPE='OB' and CONVERT(VARCHAR(10),BILLDATE,120) BETWEEN @fromdate AND @todate and OP.CLNORGCODE=@hospid`;

            const params: any = {
                fromdate: fromDate,
                todate: toDate,
                hospid: hospid,
            };

            if (status) {
                sql += " AND op.status = @status";
                params.status = status;
            }

            if (doctor) {
                sql += " AND op.DOCTCD LIKE '%' + @doctor";
                params.doctor = doctor;
            }

            if (compId) {
                sql += " AND c.Com_Id = @compId";
                params.compId = compId;
            }

            sql += " ORDER BY op.BILLNO DESC";

            const { records } = await executeDbQuery(sql, params);

            let totNet = 0;
            let totPaid = 0;
            let totDue = 0;

            let html = `
      <thead>
        <tr class='success'>
          <th style='display:none;'></th>
          <th>SLNO</th>
          <th style='text-align:left;'>Bill No.</th>
          <th style='text-align:left;'>Bill Date</th>
          <th style='text-align:left;display:none;'>OP Number</th>
          <th style='text-align:left;'>YH Number</th>
          <th style='text-align:left;'>Patient Name</th>
          <th style='text-align:left;'>Company</th>
          <th style='text-align:left;'>Age</th>
          <th style='text-align:left;'>Sex</th>
          <th style='text-align:right;'>Net Amount</th>
          <th style='text-align:right;'>Paid Amount</th>
          <th style='text-align:right;'>Due Amount</th>
          <th style='text-align:left;'>IP Number</th>
          <th style='text-align:left;'>Status</th>
          <th style='text-align:left;'>UserName</th>
        </tr>
      </thead><tbody>`;

            records.forEach((row, index) => {
                const style =
                    row.status === "A"
                        ? ""
                        : "color:white !important;background-color:#ee6e73 !important;";
                const billDate = formatDateChange(row.Billdate);
                const netAmt = parseFloat(row.NetAmount ?? 0);
                const paidAmt = parseFloat(row.PATAMTPAID ?? 0);
                const dueAmt = parseFloat(row.DueAmt ?? 0);

                totNet += netAmt;
                totPaid += paidAmt;
                totDue += dueAmt;

                html += `
        <tr style='text-align:left;'>
          <td style='display:none;'></td>
          <td style='${style}'>${index + 1}</td>
          <td style='${style}'>${row.Billno}</td>
          <td style='${style}'>${billDate}</td>
          <td style='display:none;${style}'>${row.OPDREGNO ?? ""}</td>
          <td style='${style}'>${row.MEDRECNO ?? ""}</td>
          <td style='${style}'>${row.PATNAME ?? ""}</td>
          <td style='${style}'>${row.companyName ?? ""}</td>
          <td style='${style}'>${row.AGE ?? ""}</td>
          <td style='${style}'>${row.SEX ?? ""}</td>
          <td style='text-align:right;${style}'>${netAmt.toFixed(2)}</td>
          <td style='text-align:right;${style}'>${paidAmt.toFixed(2)}</td>
          <td style='text-align:right;${style}'>${dueAmt.toFixed(2)}</td>
          <td style='${style}'>${row.ipno ?? ""}</td>
          <td style='${style}'>${row.status ?? ""}</td>
          <td style='${style}'>${row.USERNAME ?? ""}</td>
        </tr>`;
            });

            html += `
      </tbody>
      <tfoot>
        <tr style='color:blue'>
          <td style='display:none;'></td><td></td><td></td><td></td>
          <td style='display:none;'></td><td></td><td></td><td></td><td></td>
          <td style='text-align:left;'>Total</td>
          <td style='text-align:right;'>${totNet.toFixed(2)}</td>
          <td style='text-align:right;'>${totPaid.toFixed(2)}</td>
          <td style='text-align:right;'>${totDue.toFixed(2)}</td>
          <td></td><td></td><td></td>
        </tr>
      </tfoot>`;

            res.json({ status: 0, d: html });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GET_TAB_SEARCH_DETAILS(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const BILLNO = input.BILLNO;
            if (!BILLNO) {
                res.status(400).json({ status: 1, result: "Missing BILLNO parameter" });
                return;
            }

            const sql = `select m.SERVNAME,ob.SERVCODE,QUANTITY,RATE,AMOUNT,Dper,NET,HOSPSHARE,DOCTSHARE,ob.DEPTCODE,(AMOUNT-NET) as Disc_Amt,DOCTCODE,ob.splservcode,mh.SPLSERVNAME,ob.RevisionId,ob.spltariff_Id from OPD_BILLTRN ob inner join MST_SERVICES m on m.SERVCODE=ob.SERVCODE left join MST_HOSPCOMPSERVLNK mh on mh.SPLSERVCODE=ob.splservcode and mh.REVISIONID=ob.RevisionId and mh.SPLTARIFFID=ob.spltariff_id and mh.HOSPSERVCODE=ob.SERVCODE where ob.BILLNO=@BILLNO `;

            const params = { BILLNO };

            const { records } = await executeDbQuery(sql, params);

            const details = records.map((r: any) => ({
                SERVCODE: r.SERVCODE || "",
                SERVNAME: r.SERVNAME || "",
                QUANTITY: r.QUANTITY || "",
                RATE: r.RATE || "",
                AMOUNT: r.AMOUNT || "",
                Dper: r.Dper || "",
                NET: r.NET || "",
                HOSPSHARE: r.HOSPSHARE || "",
                DOCTSHARE: r.DOCTSHARE || "",
                DEPTCODE: r.DEPTCODE || "",
                Disc_Amt: r.Disc_Amt || "",
                DOCTCODE: r.DOCTCODE || "",
                TARIFFID: r.spltariff_Id || "",
                REVISIONID: r.RevisionId || "",
                SPLSERVCODE: r.splservcode || "",
                SPLSERVNAME: r.SPLSERVNAME || ""
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GET_TAB_SEARCH_DETAILS_Main(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const BILLNO = input.BILLNO;
            if (!BILLNO) {
                res.status(400).json({ status: 1, result: "Missing BILLNO parameter" });
                return;
            }

            const sql = `select B.DEPTCODE, b.billsource,b.PAYMODE,b.TOTSERVAMT,b.NETAMOUNT,b.TOTCOVAMT,b.TOTUNCOVAMT,b.CREATED_BY,b.CREATED_ON,b.PATDISCUNT,b.COMDISCUNT, b.COMBILLAMT,b.PATBILLAMT,b.NETAMOUNT,b.AMOUNTPAID,b.COMAMTPAID,b.PATAMTPAID,b.CASHCOUNTER,b.CREDAUTHBY,  b.DISCAUTHBY,b.REMARKS,b.CHEQUEDDNO, b.CHEQUEDATE, b.BANKNAME, b.DRAWNON,b.LETTERNO, b.VALIDUPTO , p.Mobile,p.Age,b.PATCATG,pc.PC_Name,b.DOCTCD,d.Firstname,b.TARIFFID,tc.TARIFFDESC,b.CRDCOMPCD,c.Name,b.REFDOCTCD,rd.RefDoctor_FName, b.ReferralAgent_ID,ra.Ref_FName,sal.Sal_Code,b.PATNAME,p.REVISIONID,p.Department,pt.pt_code,B.STATUS,P.EMAIL,CONVERT(varchar(10),P.Patient_DOB,103)Patient_DOB,P.Gender from OPD_BILLMST b inner join Patient_Master p on p.patientmr_no=b.MEDRECNO inner join Mst_Salutation sal on sal.Sal_Code=p.Salutation left join Mst_DoctorMaster d on d.Code=b.DOCTCD left join Mst_PatientCategory pc on pc.PC_Code=b.PATCATG left join MST_TARIFFCATGORY tc on tc.TARIFFID=b.TARIFFID left join Company c on c.Com_Id=b.CRDCOMPCD left join Mst_ReferralDoctor rd on rd.RefDoct_ID=b.REFDOCTCD left join Mst_ReferralAgents ra on ra.Ref_ID=b.ReferralAgent_ID left join PayMode pm on pm.Paymodeid=b.PAYMODE left join Mst_PaymentType pt on pt.PT_Code=pm.PayType where b.BILLNO=@BILLNO`;

            const params = { BILLNO };

            const { records } = await executeDbQuery(sql, params);

            const details = records.map((r: any) => ({
                BILLSOURCE: r.BILLSOURCE || "",
                PAYMODE: r.PAYMODE || "",
                TOTSERVAMT: parseFloat(r.TOTSERVAMT).toFixed(2) || "0.00",
                NETAMOUNT: parseFloat(r.NETAMOUNT).toFixed(2) || "0.00",
                TOTCOVAMT: parseFloat(r.TOTCOVAMT).toFixed(2) || "0.00",
                TOTUNCOVAMT: parseFloat(r.TOTUNCOVAMT).toFixed(2) || "0.00",
                CREATED_BY: r.CREATED_BY || "",
                CREATED_ON: formatDateChange(r.CREATED_ON) || "",
                PATDISCUNT: parseFloat(r.PATDISCUNT).toFixed(2) || "0.00",
                COMDISCUNT: parseFloat(r.COMDISCUNT).toFixed(2) || "0.00",
                COMBILLAMT: parseFloat(r.COMBILLAMT).toFixed(2) || "0.00",
                PATBILLAMT: parseFloat(r.PATBILLAMT).toFixed(2) || "0.00",
                AMOUNTPAID: parseFloat(r.AMOUNTPAID).toFixed(2) || "0.00",
                COMAMTPAID: parseFloat(r.COMAMTPAID).toFixed(2) || "0.00",
                PATAMTPAID: parseFloat(r.PATAMTPAID).toFixed(2) || "0.00",
                CASHCOUNTER: r.CASHCOUNTER || "",
                CREDAUTHBY: r.CREDAUTHBY || "",
                DISCAUTHBY: r.DISCAUTHBY || "",
                REMARKS: r.REMARKS || "",
                CHEQUEDDNO: r.CHEQUEDDNO || "",
                CHEQUEDATE: formatDateChange(r.CHEQUEDATE) || "",
                BANKNAME: r.BANKNAME || "",
                DRAWNON: r.DRAWNON || "",
                VALIDUPTO: r.VALIDUPTO || "",
                CRDCOMPCD: r.CRDCOMPCD || "",
                LETTERNO: r.LETTERNO || "",
                Mobile: r.Mobile || "",
                Age: r.Age || "",
                PATCATG: r.PATCATG || "",
                PC_Name: r.PC_Name || "",
                DOCTCD: r.DOCTCD || "",
                DOCNAME: r.Firstname || "",
                TARIFFID: r.TARIFFID || "",
                TARIFNAME: r.TARIFFDESC || "",
                COMPNAME: r.COMPNAME || "",
                REFDOCTCD: r.REFDOCTCD || "",
                REFDOCNAME: r.RefDoctor_FName || "",
                ReferralAgent_ID: r.ReferralAgent_ID || "",
                REFAGNAME: r.Ref_FName || "",
                Sal_Code: r.Sal_Code || "",
                PATNAME: r.PATNAME || "",
                EMAIL: r.EMAIL || "",
                DEPTCODE: r.Department || "",
                DEPTCODE1: r.DEPTCODE || "",
                REVISIONID: r.REVISIONID || "",
                PAYMENTTYPE: r.pt_code || "",
                STATUS: r.STATUS || "",
                DOB: formatDateChange(r.Patient_DOB) || "",
                Gender: r.Gender || ""
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async BindPrintOutpatientBillPage(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const BILLNO = input.BILLNO || input.Strbillno;

        if (!BILLNO) {
            res.status(400).json({ status: 1, result: "Missing BILLNO parameter" });
            return;
        }

        try {
            const sql = `select  md.DEPTNAME,c.Name company_Name,pm.Address as addres,mu.USERNAME, sol.Sal_Desc,dsol.Sal_Desc as docSal,con.Expr1,con.BILLNO,con.MEDRECNO,con.Age,con.BILLDATE,(pm.FirstName +' ' +pm.MiddleName+' '+pm.LastName) AS PATNAME,con.AGE,con.SEX,  con.LETTERNO,con.VALIDUPTO,con.TOKENNO,con.TOTCOVAMT,con.TOTUNCOVAMT  , con.RECEIPTDATE,con.TOTSERVAMT,con.PATBILLAMT,con.NETAMOUNT,con.AMOUNTPAID,con.RFNDAMOUNT,con.AUTHTRANID,con.IPNO,con.TARIFFDESC,con.SERDISCOUNT  ,con.QUANTITY,con.NET,con.RATE,con.AMOUNT,con.DOCTSHARE,con.e,con.Firstname,con.CerdAuthBy,con.DiscAuthBy,con.TARIFFDESC  ,con.PayMode,con.SERVNAME,con.RefDoctor_FName,con.CASHCOUNTER,con.RCPTNO  ,con.MOBILENO,con.TOTDISCOUNT,con.CHEQUEDDNO,con.CHEQUEDATE  ,con.DRAWNON,con.Name,con.HospitalName,con.Address  ,con.MOBILENO as Phone_No,con.WardNo,con.BedNO,con.PC_Name,con.CREATED_BY,con.SERVCODE,con.REFDOCTCD,rfDr.RefDoctor_FName as refraldoctr,rfDrsal.Sal_Desc as refsal from OPReportView con   left join Mst_Salutation sol on con.SALUTNCODE=sol.Sal_Code   left join Mst_DoctorMaster doc on con.DOCTCD=doc.Code  left join Mst_Salutation dsol on doc.Salutation=dsol.Sal_Code  left join Mst_ReferralDoctor rfDr on rfDr.RefDoct_ID=con.REFDOCTCD left join Patient_Master pm on pm.PatientMr_No=con.MEDRECNO left join Company c on c.Com_Id=pm.Comp_Id left join Mst_Department md on md.DEPTCODE=con.deptcode  left join Mst_Salutation rfDrsal on rfDrsal.Sal_Code=rfDr.Salutation  left join Mst_UserDetails mu on con.CREATED_BY=mu.USERID where con.BILLNO=@BILLNO`;

            const params = { BILLNO };

            const { records } = await executeDbQuery(sql, params);

            const details = records.map((r: any) => {
                const amtPaid = Number(r.AMOUNTPAID || 0);
                const netAmt = Number(r.NETAMOUNT || 0);
                const paidAmtWords = numberToWords(Math.round(amtPaid));
                const netAmtWords = numberToWords(Math.round(netAmt));

                return {
                    DEPTNAME: r.DEPTNAME,
                    CompanyName: r.company_Name,
                    refsal: r.refsal,
                    Sal_Desc: r.Sal_Desc,
                    USERNAME: r.USERNAME,
                    docSal: r.docSal,
                    Expr1: r.Expr1,
                    BILLNO: r.BILLNO,
                    MEDRECNO: r.MEDRECNO,
                    BILLDATE: r.BILLDATE ? moment(r.BILLDATE).format("DD/MM/YYYY HH:mm:ss") : "",
                    PATNAME: r.PATNAME,
                    AGE: r.AGE,
                    SEX: r.SEX,
                    LETTERNO: r.LETTERNO,
                    VALIDUPTO: r.VALIDUPTO,
                    TOKENNO: r.TOKENNO,
                    TOTCOVAMT: r.TOTCOVAMT,
                    TOTUNCOVAMT: r.TOTUNCOVAMT,
                    TOTSERVAMT: r.TOTSERVAMT,
                    PATBILLAMT: r.PATBILLAMT,
                    NETAMOUNT: r.NETAMOUNT,
                    AMOUNTPAID: r.AMOUNTPAID,
                    RFNDAMOUNT: r.RFNDAMOUNT,
                    AUTHTRANID: r.AUTHTRANID,
                    IPNO: r.IPNO,
                    SERDISCOUNT: r.SERDISCOUNT,
                    QUANTITY: r.QUANTITY,
                    NET: r.NET,
                    RATE: r.RATE,
                    AMOUNT: r.AMOUNT,
                    DOCTSHARE: r.DOCTSHARE,
                    e: r.e,
                    Firstname: r.Firstname,
                    CerdAuthBy: r.CerdAuthBy,
                    DiscAuthBy: r.DiscAuthBy,
                    TARIFFDESC: r.TARIFFDESC,
                    PayMode: r.PayMode,
                    SERVNAME: r.SERVNAME,
                    RefDoctor_FName: r.refraldoctr,
                    CASHCOUNTER: r.CASHCOUNTER,
                    RCPTNO: r.RCPTNO,
                    MOBILENO: r.MOBILENO,
                    TOTDISCOUNT: parseFloat(r.TOTDISCOUNT).toFixed(2),
                    CHEQUEDDNO: r.CHEQUEDDNO,
                    CHEQUEDATE: r.CHEQUEDATE ? moment(r.CHEQUEDATE).format("DD/MM/YYYY") : "",
                    DRAWNON: r.DRAWNON,
                    Name: r.Name,
                    HospitalName: r.HospitalName,
                    Address: r.Address,
                    Phone_No: r.Phone_No,
                    WardNo: r.WardNo,
                    BedNO: r.BedNO,
                    PC_Name: r.PC_Name,
                    CREATED_BY: r.CREATED_BY,
                    SERVCODE: r.SERVCODE,
                    receiptdate: r.receiptdate
                        ? moment(r.receiptdate).format("DD/MM/YYYY HH:mm")
                        : "",
                    NETAMT: amtPaid.toFixed(2),
                    PAIDAMTWORDS: paidAmtWords,
                    NETAMTWORDS: netAmtWords
                };
            });

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }



}

