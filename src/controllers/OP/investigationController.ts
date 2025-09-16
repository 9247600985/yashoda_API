import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";


export default class investigationController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/op", this.router);
        this.router.get("/getServicesInfo", this.getServicesInfo.bind(this));
        this.router.get("/getPaymentType", this.getPaymentType.bind(this));
        this.router.get("/loadRevision", this.loadRevision.bind(this));
        this.router.get("/GetDocFavDetails", this.GetDocFavDetails.bind(this));
        this.router.get("/getProfileServices", this.getProfileServices.bind(this));
        this.router.get("/GetPACKAGEServices", this.GetPACKAGEServices.bind(this));
        this.router.get("/GET_FACILITYSETUP_BEDCATG", this.GET_FACILITYSETUP_BEDCATG.bind(this));
        this.router.get("/getServicesCost", this.getServicesCost.bind(this));
        this.router.get("/LoadCrdauthLtr", this.LoadCrdauthLtr.bind(this));
        this.router.get("/LoadCrdAuthDetServCode", this.LoadCrdAuthDetServCode.bind(this));
        this.router.get("/LoadCompruletrn", this.LoadCompruletrn.bind(this));
        this.router.get("/loadSplServCost", this.loadSplServCost.bind(this));
        this.router.get("/GetAuthDetails", this.GetAuthDetails.bind(this));
        this.router.get("/GetTrnCount", this.GetTrnCount.bind(this));
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

}

