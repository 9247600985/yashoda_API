import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";
import { queryObjects } from "v8";
const moment = require('moment');

export default class sampleCollectionController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/lab", this.router);

        this.router.get("/clickShow", authenticateToken, this.showData.bind(this));
        this.router.get("/tbl_OrdersListDetails", authenticateToken, this.showTest.bind(this));
        this.router.get("/DispalyData", authenticateToken, this.getDetails.bind(this));
        this.router.put("/updateDataList", authenticateToken, this.changeStatus.bind(this));
        this.router.put("/clickUpdate", authenticateToken, this.updateDGLORDERTRN.bind(this));

    }

    async showTest(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        const OrderNo = input.Order_No || '';
        let SampleStatus = input.SampleStatus ? decodeURIComponent(input.SampleStatus) : '';
        const DEPT = input.DEPT || '';
        const CLNORGCODE = input.hospitalId || '';

        let htmlRows = '';
        let countCheck = 0;

        try {
            let sqlQuery = '';
            const params: any = { ORDERNO: OrderNo, CLNORGCODE };


            if (SampleStatus) {

                const parts: string[] = [];
                SampleStatus.replace(/'/g, '')
                    .split(',')
                    .map(p => p.trim())
                    .forEach(p => {
                        if (p && parts.indexOf(p) === -1) parts.push(p);
                    });

                if (parts.every(p => p.toUpperCase() === 'A')) {
                    SampleStatus = 'A';
                } else {
                    SampleStatus = parts.join(',');
                }
            }


            if (SampleStatus) {
                sqlQuery = ` select om.ORDERNO, ot.TESTCODE, DE.EXTVNDRCODE, DE.EXTVNDRNAME, tm.TESTNAME, tm.LABDPTCODE, ld.LABDPTDESC, tm.SPECCODE, sm.SPECDESC,tm.CONTCODE, cm.CONTNAME, isnull(CONVERT(VARCHAR(11),samcoldate,106),GETDATE()) as Col_Date, isnull(samcoltime,GETDATE()) as Col_Time, ot.SAMLECOLNO, ot.SAMLECOLBY, om.PRIORITY from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO inner join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE inner join DGL_LABDEPT ld on tm.LABDPTCODE=ld.LABDPTCODE left join DGL_SPECIMENMAST sm on tm.SPECCODE=sm.SPECCODE left join DGL_EXTVENDORMST DE on ot.EXTDIGCODE = DE.EXTVNDRCODE left join DGL_ContainerMAST cm on tm.CONTCODE=cm.CONTCODE where om.ORDERNO=@ORDERNO and  tm.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE `;

                if (DEPT) {
                    sqlQuery += ' and ot.LABDPTCODE=@LABDPTCODE ';
                    params.LABDPTCODE = DEPT;
                }


                if (SampleStatus !== 'A') {

                    if (SampleStatus.indexOf(',') !== -1) {
                        const list = SampleStatus.split(',').map(s => `'${s.trim()}'`).join(',');
                        sqlQuery += ` and ot.SAMPLESTATUS in (${list})`;
                    } else {
                        sqlQuery += ' and ot.SAMPLESTATUS=@SAMPLESTATUS';
                        params.SAMPLESTATUS = SampleStatus;
                    }
                }

                sqlQuery += ' order by ot.SEQNO';
            } else {

                sqlQuery = ` select om.ORDERNO, ot.TESTCODE, DE.EXTVNDRCODE, DE.EXTVNDRNAME, tm.TESTNAME, tm.LABDPTCODE, ld.LABDPTDESC, tm.SPECCODE, sm.SPECDESC,tm.CONTCODE, cm.CONTNAME, isnull(CONVERT(VARCHAR(11),samcoldate,106),GETDATE()) as Col_Date, isnull(samcoltime,GETDATE()) as Col_Time, ot.SAMLECOLNO, ot.SAMLECOLBY, om.PRIORITY from DGL_ORDERMST om  inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO inner join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE inner join DGL_LABDEPT ld on tm.LABDPTCODE=ld.LABDPTCODE left join DGL_SPECIMENMAST sm on tm.SPECCODE=sm.SPECCODE left join DGL_EXTVENDORMST DE on ot.EXTDIGCODE = DE.EXTVNDRCODE left join DGL_ContainerMAST cm on tm.CONTCODE=cm.CONTCODE where om.ORDERNO=@ORDERNO and tm.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE `;

                if (DEPT) {
                    sqlQuery += ' and ot.LABDPTCODE=@LABDPTCODE';
                    params.LABDPTCODE = DEPT;
                }

                sqlQuery += ' order by ot.SEQNO';
            }


            const { records } = await executeDbQuery(sqlQuery, params);


            let i = 0;
            for (const row of records) {
                i++;
                const SAMPLENUMBER = row.SAMLECOLNO || '';
                const chkDisabled = SAMPLENUMBER ? 'disabled' : '';
                const chkChecked = SAMPLENUMBER ? 'checked' : '';
                if (SAMPLENUMBER) countCheck++;

                htmlRows += `
        <tr>
          <td style='width:1%;'>
            <input type='checkbox' id='txtchk${i}' onchange='checking(${i});' ${chkChecked} ${chkDisabled}/>
          </td>
          <td id='txtOrdNum${i}' style='text-align:left;'>${row.ORDERNO ?? ''}</td>
          <td id='txtTestCode${i}' style='text-align:left;'>${row.TESTCODE ?? ''}</td>
          <td id='txtTestName${i}' style='text-align:left;'>${row.TESTNAME ?? ''}</td>
          <td id='txtLabDept${i}' style='text-align:left;'>${row.LABDPTDESC ?? ''}</td>
          <td id='txtSpecimenCode${i}' style='text-align:left;display:none;'>${row.SPECCODE ?? ''}</td>
          <td id='txtSpecimen${i}' style='text-align:left;'>${row.SPECDESC ?? ''}</td>
          <td id='txtContainerCode${i}' style='text-align:left;display:none;'>${row.CONTCODE ?? ''}</td>
          <td id='txtContainer${i}' style='text-align:left;'>${row.CONTNAME ?? ''}</td>
          <td id='txtSampleNumber${i}' style='text-align:left;'>${SAMPLENUMBER}</td>
          <td id='txtColDate${i}' style='text-align:left;'>${row.Col_Date ? moment(row.Col_Date, 'DD MMM YYYY').format('DD/MM/YYYY') : ''}</td>
          <td id='txtColTime${i}' style='text-align:left;'>${row.Col_Time ? moment(row.Col_Time, 'HH:mm').format('HH:mm') : ''}</td>
          <td id='txtColByCode${i}' style='text-align:left;display:none;'>${row.SAMLECOLBY ?? ''}</td>
          <td id='txtColBy${i}' style='text-align:left;'>${row.SAMLECOLBY ?? ''}</td>
          <td id='txtPriority${i}' style='text-align:left;display:none;'>${row.PRIORITY ?? ''}</td>
          <td id='txtExtrnlVndr${i}' style='text-align:left;display:none;'>${row.EXTVNDRCODE ?? ''}</td>
          <td id='txtExtrnlVndrName${i}' style='text-align:left;'>${row.EXTVNDRNAME ?? ''}</td>
        </tr>`;
            }

            const response: string[] = [];
            if (records.length === countCheck) response.push('ChkAll');
            else response.push('');
            response.push(htmlRows);

            res.json({ status: 0, d: response });
            return;
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
            return;
        }
    }

    async showData(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        const dtFm = input.Fromdate;
        const dtTo = input.ToDate;
        const SectionID = input.SectionID || '';
        const Status = input.SampleStatus ? decodeURIComponent(input.SampleStatus) : '';
        const Priority = input.Priority || '';
        const SampleStatus = input.SampleStatus ? decodeURIComponent(input.SampleStatus) : '';
        const Patient_type = input.Patient_type || '';
        const Company_Id = input.Company_Id || '';
        const CLNORGCODE = input.hospitalId || '';

        let normalised = '';
        if (SampleStatus) {
            const rawParts = SampleStatus.replace(/'/g, '').split(',');
            const cleanedParts: string[] = [];
            for (const part of rawParts) {
                const trimmed = part.trim();
                if (trimmed && cleanedParts.indexOf(trimmed) === -1) {
                    cleanedParts.push(trimmed);
                }
            }

            if (cleanedParts.length > 0 && cleanedParts.every(s => s.toUpperCase() === 'A')) {
                normalised = 'A';
            } else if (cleanedParts.length > 0) {
                normalised = cleanedParts.join(',');
            }
        }

        let htmlRows = '';
        let i = 0;

        try {
            let sqlQuery = '';
            const params: any = {};

            if (Company_Id) {
                if (SectionID) {
                    sqlQuery += `select distinct om.ORDERNO,CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE,CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME, ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY inner join OPD_BILLMST OB on OB.BILLNO=OM.BILLNO where om.ORDERDATE>=@dtFm and om.ORDERDATE<=@dtTo and om.STATUS='A'`;

                    params.dtFm = `${dtFm} 00:00:00`;
                    params.dtTo = `${dtTo} 23:59:59`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A') {
                        sqlQuery += ` AND om.PATTYPE = @PATTYPE`;
                        params.PATTYPE = Patient_type;
                    }

                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS<>'OR' and ot.LABDPTCODE=@SectionID and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE and om.ORDERTYPE='O' and OB.CRDCOMPCD like @CompanyId`;

                    params.Priority = `%${Priority}%`;
                    params.SectionID = SectionID;
                    params.CLNORGCODE = CLNORGCODE;
                    params.CompanyId = `%${Company_Id}%`;
                }

                else {
                    sqlQuery += ` select distinct om.ORDERNO, CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE, CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME, ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY inner join OPD_BILLMST OB on OB.BILLNO=OM.BILLNO where om.ORDERDATE>=@dtFm  and om.ORDERDATE<=@dtTo and om.STATUS='A' `;

                    params.dtFm = `${dtFm} 00:00:00`;
                    params.dtTo = `${dtTo} 23:59:59`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A') {
                        sqlQuery += ` AND om.PATTYPE = @PATTYPE`;
                        params.PATTYPE = Patient_type;
                    }

                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS <>'OR' and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE and om.ORDERTYPE='O' and OB.CRDCOMPCD like @CompanyId`;

                    params.Priority = `%${Priority}%`;
                    params.CLNORGCODE = CLNORGCODE;
                    params.CompanyId = `%${Company_Id}%`;
                }

                sqlQuery += ` UNION ALL `;

                if (SectionID) {
                    sqlQuery += ` select distinct om.ORDERNO,CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE,CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME, ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY inner join IPD_ADMISSION IA on IA.IPNO=OM.IPNO where om.ORDERDATE>=@dtFmand om.ORDERDATE<=@dtTo and om.STATUS='A'`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A') {
                        sqlQuery += ` AND om.PATTYPE=@PATTYPE`;
                    }

                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS<>'OR' and ot.LABDPTCODE=@SectionID and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE and om.ORDERTYPE='I' and IA.CRDCOMPCD like @CompanyId`;

                } else {
                    sqlQuery += ` select distinct om.ORDERNO, CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE, CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME, ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY inner join IPD_ADMISSION IA on IA.IPNO=OM.IPNO where om.ORDERDATE>=@dtFm and om.ORDERDATE<=@dtTo and om.STATUS='A'`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A')
                        sqlQuery += ` AND om.PATTYPE=@PATTYPE`;

                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS <>'OR' and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE and om.ORDERTYPE='I' and IA.CRDCOMPCD like @CompanyId`;
                }

                sqlQuery += ` ORDER BY om.MEDRECNO`;
            }

            else {
                if (SectionID) {
                    sqlQuery = `select distinct om.ORDERNO,CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE,CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME,  ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile  from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO  left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO  left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY  where om.ORDERDATE>=@dtFm  and om.ORDERDATE<=@dtTo and om.STATUS='A' `;

                    params.dtFm = `${dtFm} 00:00:00`;
                    params.dtTo = `${dtTo} 23:59:59`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A') {
                        sqlQuery += ` AND om.PATTYPE=@PATTYPE`;
                        params.PATTYPE = Patient_type;
                    }
                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS<>'OR' and ot.LABDPTCODE=@SectionID and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE order by om.MEDRECNO`;

                    params.Priority = `%${Priority}%`;
                    params.SectionID = SectionID;
                    params.CLNORGCODE = CLNORGCODE;
                } else {
                    sqlQuery = `select distinct om.ORDERNO, CONVERT(VARCHAR(11),om.ORDERDATE,106) ORDERDATE, CONVERT(VARCHAR(11),om.ORDERTIME,108) ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME, ot.SAMPLESTATUS, om.PRIORITY,om.WARDNO,om.AGE,dt.Firstname,pm.Mobile from DGL_ORDERMST om inner join DGL_ORDERTRN ot on om.ORDERNO=ot.ORDERNO left join Patient_Master pm on pm.PatientMr_No=om.MEDRECNO left join Mst_DoctorMaster dt on dt.Code=om.ORDEREDBY where om.ORDERDATE>=@dtFm  and om.ORDERDATE<=@dtTo and om.STATUS='A'`;

                    params.dtFm = `${dtFm} 00:00:00`;
                    params.dtTo = `${dtTo} 23:59:59`;

                    let statusClause = '';
                    if (!normalised || normalised === 'A') {
                        statusClause = " AND ot.TESTSTATUS IN ('P','OP','SC','SA')";
                    } else if (normalised.indexOf(',') !== -1) {
                        const parts = normalised.split(',');
                        const quoted = [];
                        for (const p of parts) {
                            quoted.push("'" + p.trim() + "'");
                        }
                        const cleanList = quoted.join(',');
                        statusClause = " AND ot.TESTSTATUS IN (" + cleanList + ")";
                    } else {
                        statusClause = " AND ot.TESTSTATUS = @SampleStatus";
                        params.SampleStatus = normalised.trim();
                    }

                    sqlQuery += statusClause;

                    if (Patient_type !== 'A') {
                        sqlQuery += ` AND om.PATTYPE=@PATTYPE`;
                        params.PATTYPE = Patient_type;
                    }
                    sqlQuery += ` and om.PRIORITY like @Priority and om.ORDER_STATUS <>'OR' and om.LABTYPECD='01' and om.CLNORGCODE=@CLNORGCODE order by om.MEDRECNO`;

                    params.Priority = `%${Priority}%`;
                    params.CLNORGCODE = CLNORGCODE;
                }
            }


            const { records } = await executeDbQuery(sqlQuery, params);


            for (const row of records) {
                i++;
                if (i === 1) {
                    htmlRows += `
          <thead style='width:100%'>
            <tr class='success'>
              <th id='t1'>Order No</th>
              <th id='t2'>Order Date</th>
              <th id='t3'>Order Time</th>
              <th id='t4'>Mr.Number</th>
              <th id='t5'>Ip.Number</th>
              <th id='t6'>Patient Name</th>
              <th id='t7'>Age</th>
              <th id='t8'>Mobile No</th>
              <th id='t9'>Sample Status</th>
              <th id='t10'>Doctor</th>
              <th id='t11'>Ward</th>
            </tr>
          </thead>
          <tbody>`;
                }

                htmlRows += `
        <tr>
          <td style='text-align:left;'>${row.ORDERNO ?? ''}</td>
          <td style='text-align:left;'>${row.ORDERDATE ?? ''}</td>
          <td style='text-align:left;'>${row.ORDERTIME ?? ''}</td>
          <td style='text-align:left;'>${row.MEDRECNO ?? ''}</td>
          <td style='text-align:left;'>${row.IPNO ?? ''}</td>
          <td style='text-align:left;'>${row.PATNAME ?? ''}</td>
          <td style='text-align:left;'>${row.AGE ?? ''}</td>
          <td style='text-align:left;'>${row.Mobile ?? ''}</td>
          <td style='text-align:left;'>${row.SAMPLESTATUS ?? ''}</td>
          <td style='text-align:left;'>${row.Firstname ?? ''}</td>
          <td style='text-align:left;'>${row.WARDNO ?? ''}</td>
        </tr>`;
            }

            htmlRows += `</tbody>`;

            res.json({ status: 0, d: htmlRows });
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async changeStatus(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            for (const data of input) {
                const params = { SampleStatus: 'SC', LabCode: data.LabCode, CollectedBy: data.CollectedBy, ExternalVendor: data.ExternalVendor, OrderNo: data.OrderNo, TestCode: data.TestCode };


                await executeDbQuery(`UPDATE DGL_ORDERTRN SET samplestatus = @SampleStatus, TESTSTATUS=@SampleStatus, LABCODE = @LabCode, COLLECTEDBY = @CollectedBy, EXTDIGCODE = @ExternalVendor  WHERE orderno = @OrderNo AND testcode = @TestCode`, params, { transaction });
            }

            await transaction.commit();
            res.json({ status: 0, message: 'Status updated successfully.' });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async updateDGLORDERTRN(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const sampleDetailsList = input.sampleDetailsList;
        const invoiceNo = input.invoiceNo;
        const hospitalId = input.hospitalId;

        const sampleNo = invoiceNo;
        let orderNo = "";
        let collectedBy = "";

        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();


            for (const row of sampleDetailsList) {
                orderNo = row.OrderNo;
                collectedBy = row.CollectedBy;

                const updateParams = {
                    SPECCODE: row.SpecimenCode,
                    CONTCODE: row.ContainerCode,
                    SAMLECOLNO: sampleNo,
                    SAMCOLDATE: row.SampleCollectedDate,
                    SAMCOLTIME: row.SampleCollectedTime,
                    SAMLECOLBY: row.CollectedBy,
                    ACCEPTANNO: sampleNo,
                    ACCEPTEDBY: row.CollectedBy,
                    ACCEPTEDON: row.SampleCollectedDate,
                    ACCEPTEDAT: row.SampleCollectedTime,
                    SAMPLESTATUS: "SA",
                    TESTSTATUS: "SA",
                    RECEIVEDBY: row.CollectedBy,
                    RECEIVEDON: row.SampleCollectedDate,
                    RECEIVEDAT: row.SampleCollectedTime,
                    ORDERNO: row.OrderNo,
                    TESTCODE: row.TestCode,
                    CLNORGCODE: hospitalId,
                };

                const updateQuery = ` UPDATE DGL_ORDERTRN SET SPECCODE = @SPECCODE, CONTCODE = @CONTCODE, SAMLECOLNO = @SAMLECOLNO, SAMCOLDATE = @SAMCOLDATE, SAMCOLTIME = @SAMCOLTIME, SAMLECOLBY = @SAMLECOLBY, ACCEPTANNO = @ACCEPTANNO, ACCEPTEDBY = @ACCEPTEDBY, ACCEPTEDON = @ACCEPTEDON, ACCEPTEDAT = @ACCEPTEDAT, SAMPLESTATUS = 'SA', TESTSTATUS = 'SA', RECEIVEDBY = @RECEIVEDBY, RECEIVEDON = @RECEIVEDON, RECEIVEDAT = @RECEIVEDAT, SPEC_QTY = '0.00' WHERE ORDERNO = @ORDERNO AND TESTCODE = @TESTCODE AND CLNORGCODE = @CLNORGCODE `;

                await executeDbQuery(updateQuery, updateParams, { transaction });
            }

            // --- Check if any OP test still exists
            const testStatusParams = { ORDERNO: orderNo, CLNORGCODE: hospitalId };
            const testStatusQuery = ` SELECT TESTSTATUS FROM DGL_ORDERTRN WHERE ORDERNO = @ORDERNO AND CLNORGCODE = @CLNORGCODE `;
            const { records: orderTrnRecords } = await executeDbQuery(testStatusQuery, testStatusParams, { transaction });

            const anyPending = orderTrnRecords.some((r) => r.TESTSTATUS === "OP");

            // --- If all done, update ORDERMST
            if (!anyPending) {
                const updateMstQuery = ` UPDATE DGL_ORDERMST SET ORDER_STATUS='OA' WHERE ORDERNO = @ORDERNO AND CLNORGCODE = @CLNORGCODE `;
                await executeDbQuery(updateMstQuery, testStatusParams, { transaction });
            }

            // --- Get ORDER_STATUS to decide OS string (optional)
            let OS = "Pending";
            const orderStatusQuery = `SELECT ORDER_STATUS FROM DGL_ORDERMST WHERE ORDERNO = @ORDERNO`;
            const { records: osRecords } = await executeDbQuery(orderStatusQuery, { ORDERNO: orderNo }, { transaction });
            for (const r of osRecords) {
                OS = r.ORDER_STATUS === "OP" ? "Pending" : "Accepted";
            }

            // --- Get Current Financial Year
            const finYearQuery = ` SELECT FinYear FROM Mst_AccYear WHERE CurrentFinancialYear='y' AND CLNORGCODE=@CLNORGCODE `;
            const { records: fyRecords } = await executeDbQuery(finYearQuery, { CLNORGCODE: hospitalId }, { transaction });
            const finYear = fyRecords.length ? fyRecords[0].FinYear : null;

            // --- Get Order Type
            const orderTypeQuery = ` SELECT TOP 1 om.ORDERTYPE FROM DGL_ORDERMST om INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO=ot.ORDERNO WHERE ot.SAMLECOLNO=@SAMLECOLNO AND ot.CLNORGCODE=@CLNORGCODE `;

            const { records: orderTypeRecords } = await executeDbQuery(orderTypeQuery, { SAMLECOLNO: sampleNo, CLNORGCODE: hospitalId }, { transaction });
            const orderType = orderTypeRecords.length ? orderTypeRecords[0].ORDERTYPE : null;

            // --- If inpatient, ensure IPB_SERVICES
            if (orderType === "I") {
                const profileQuery = ` SELECT DISTINCT ot.PROFILEID, om.ORDERNO FROM DGL_ORDERMST om INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO=ot.ORDERNO WHERE ot.SAMLECOLNO=@SAMLECOLNO AND ot.CLNORGCODE=@CLNORGCODE `;
                const { records: profRecords } = await executeDbQuery(profileQuery, { SAMLECOLNO: sampleNo, CLNORGCODE: hospitalId }, { transaction });
                const profileId = profRecords.length ? profRecords[0].PROFILEID : null;
                const profOrderNo = profRecords.length ? profRecords[0].ORDERNO : null;

                if (profileId && profOrderNo) {
                    const countQuery = ` SELECT COUNT(*) AS cnt FROM IPB_SERVICES WHERE SERVCODE=@PROFID AND DOCREFNO=@ORDERNO `;
                    const { records: cntRecords } = await executeDbQuery(countQuery, { PROFID: profileId, ORDERNO: profOrderNo }, { transaction });
                    const count = cntRecords[0]?.cnt || 0;

                    if (count === 0) {
                        const insertQuery = ` INSERT INTO IPB_SERVICES ( FINYEAR, SERVDATE, IPNO, MEDRECNO, WARDNO, BEDNO, SERVCODE, SERVQTY, SERVRATE, SERVAMT, PATCATGCD, TARIFFID, BEDCATGCD, DEPTCODE, DOCREFNO, BILLNO, REMARKS, ADJAMT, HOSPSHARE, DOCTSHARE, DOCTCODE, CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, STATUS, SRVGRPCODE, SERVSUBGRP, IPACCNO, ORDEREDBY, BLTARIFFID, BLBEDCATG, BILLUNIT, ORGAMT, ORGDOCTSHR, DOCTSHRCMP, SERVSOURCE, SERVTYPE, BILLSTATUS, BILLABLE, BILLED, FOLIONO, CHRGBLEAMT, AMOUNT, DISCPER ) SELECT DISTINCT @FinYear, GETDATE(), om.IPNO, om.MEDRECNO, om.WARDNO, om.BEDNO, ot.PROFILEID, '1', ot.TOTALSERVCOST, ot.TOTALSERVCOST, ia.PATCATGCD, om.TARIFFID, ia.BEDCATGCD, ia.DEPTCODE, om.ORDERNO, om.BILLNO, om.REMARKS, '0.00', ot.TOTALSERVCOST - sc.DOCTSHAREAMT, sc.DOCTSHAREAMT, '', @Collected_By, GETDATE(), @Collected_By, GETDATE(), 'A', ms.SRVGRPCODE, ms.SRVSUBGRP, om.IPNO, om.ORDEREDBY, om.TARIFFID, ia.BEDCATGCD, ia.DEPTCODE, ot.TOTALSERVCOST, sc.DOCTSHAREAMT, ms.DOC_COMP, 'DL', ms.SERVTYPECD, 'Y', 'Y', 'N', ia.FOLIONO, ot.TOTALSERVCOST, ot.TOTALSERVCOST, '0' FROM DGL_ORDERMST om INNER JOIN IPD_ADMISSION ia ON om.IPNO = ia.IPNO INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO INNER JOIN MST_SERVICES ms ON ot.SERVCODE = ms.SERVCODE INNER JOIN MST_SERVICECOST sc ON ms.SERVCODE = sc.SERVCODE AND om.TARIFFID = sc.TARIFFID AND ia.BEDCATGCD = sc.BEDCATGCODE WHERE ot.SAMLECOLNO=@Sample_no AND ot.CLNORGCODE=@CLNORGCODE `;

                        const insertParams = { FinYear: finYear, Collected_By: collectedBy, Sample_no: sampleNo, CLNORGCODE: hospitalId, };
                        await executeDbQuery(insertQuery, insertParams, { transaction });
                    }
                }
            }

            await transaction.commit();
            res.json({ status: 0, message: "Success", data: sampleNo });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getDetails(req: Request, res: Response): Promise<void> {
        const input: any = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};

        let query = '';

        const labtypid = (input.labtypid ?? '').toString().trim();
        let TBL_ORDERMST = '';
        let TBL_ORDERTRN = '';
        let TBL_RESULTMST = '';
        let TBL_RESULTTRN = '';

        switch (labtypid) {
            case '01':
                TBL_ORDERMST = 'DGL_ORDERMST';
                TBL_ORDERTRN = 'DGL_ORDERTRN';
                TBL_RESULTMST = 'DGL_RESULTMST';
                TBL_RESULTTRN = 'DGL_RESULTTRN';
                break;
            case '02':
                TBL_ORDERMST = 'DGR_ORDERMST';
                TBL_ORDERTRN = 'DGR_ORDERTRN';
                TBL_RESULTMST = 'DGR_RESULTMST';
                TBL_RESULTTRN = 'DGR_RESULTTRN';
                break;
            case '03':
                TBL_ORDERMST = 'DGC_ORDERMST';
                TBL_ORDERTRN = 'DGC_ORDERTRN';
                TBL_RESULTMST = 'DGC_RESULTMST';
                TBL_RESULTTRN = 'DGC_RESULTTRN';
                break;
            case '04':
                TBL_ORDERMST = 'DGS_ORDERMST';
                TBL_ORDERTRN = 'DGS_ORDERTRN';
                TBL_RESULTMST = 'DGS_RESULTMST';
                TBL_RESULTTRN = 'DGS_RESULTTRN';
                break;
            default:
                res.status(400).json({ status: 1, message: 'Invalid labtypid. Expected 01/02/03/04.' });
                return;
        }

        const CompanyId = (input.Company_Id ?? '').toString().trim();

        const sampleStatusClause = (value: string): string => {
            if (value === '') return ` and  ot.SAMPLESTATUS in('SA','RE') `;
            if (value === 'SA') return ` and  ot.SAMPLESTATUS in('SA') `;
            if (value === 'RE') return ` and  ot.SAMPLESTATUS in('RE') and rm.resultno like @ResultNo `;
            return '';
        };

        const optionalFiltersClause = (): string => {
            let s = '';
            if ((input.pattype ?? '') !== '') s += ` and om.ORDERTYPE like @pattype `;
            if ((input.priority ?? '') !== '') s += ` and ot.PRIORITY like @priority `;
            if ((input.mrno ?? '') !== '') s += ` and om.opdregno like @mrno `;
            if ((input.Billno ?? '') !== '') s += ` and OM.BILLNO like @Billno `;
            if ((input.patname ?? '') !== '') s += ` and om.PATNAME like @patname `;
            return s;
        };

        const fmtDate = (v: any) => (v ? moment(v).format('DD/MM/YYYY') : '');


        if (CompanyId !== '') {

            if ((input.deptcode ?? '') !== '') {
                query += ` select rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +', ' + ot.SAMLECOLNO+','+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +',  IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT, om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECCODE left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO inner join OPD_BILLMST OB on OB.BILLNO=OM.BILLNO where tm.LABDPTCODE=@deptcode and ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            } else {
                query += ` select distinct rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +',' + ot.SAMLECOLNO+', '+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +', IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT,  om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECCODE left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO inner join OPD_BILLMST OB on OB.BILLNO=OM.BILLNO where ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            }

            query += sampleStatusClause(input.samplestatus ?? '');
            query += optionalFiltersClause();
            query += ` and om.LABTYPECD=@labtypid and om.CLNORGCODE=@CLNORGCODE and (rm.RESUSTATUS<>'RV' OR rm.RESUSTATUS IS NULL) and ot.samlecolno like @acceptno and om.ORDERTYPE='O' and OB.CRDCOMPCD like @Company_Id `;

            query += ` UNION ALL `;

            // IPD branch
            if ((input.deptcode ?? '') !== '') {
                query += ` select rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +',' + ot.SAMLECOLNO+','+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +',  IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT, om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECCODE left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO inner join IPD_ADMISSION IA on IA.IPNO=OM.IPNO where tm.LABDPTCODE=@deptcode and ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            } else {
                query += ` select distinct rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +', ' + ot.SAMLECOLNO+','+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +',  IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT,  om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECCODE left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO inner join IPD_ADMISSION IA on IA.IPNO=OM.IPNO where ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            }

            query += sampleStatusClause(input.samplestatus ?? '');
            query += optionalFiltersClause();
            query += ` and om.LABTYPECD=@labtypid and om.CLNORGCODE=@CLNORGCODE and (rm.RESUSTATUS<>'RV' OR rm.RESUSTATUS IS NULL) and ot.samlecolno like @acceptno and om.ORDERTYPE='I' and IA.CRDCOMPCD like @Company_Id `;

            query += ` ORDER BY OT.SAMLECOLNO `;
        } else {

            if ((input.deptcode ?? '') !== '') {
                query = ` select rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +', ' + ot.SAMLECOLNO+','+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +',  IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT, om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECCODE left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO where tm.LABDPTCODE=@deptcode and ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            } else {
                query = ` select distinct rm.RESULTNO, rm.RESULTDATE, rt.RESTEXT, ot.SAMLECOLNO, CASE WHEN OM.BILLNO='' THEN OT.ORDERNO ELSE OM.BILLNO END +', ' + ot.SAMLECOLNO+','+ CASE WHEN (OT.RESULTNO='' OR OT.RESULTNO IS NULL) THEN ISNULL(OT.RESULTNO,'') ELSE RM.RESULTNO END +',  IP No:'+om.IPNO+', Patient Name:'+ om.PATNAME +',  OPD No:'+ ISNULL(om.opdregno,'') as Details, ot.ACCEPTEDON, convert(varchar(8), ot.ACCEPTEDAT, 108) as ACCEPTEDAT,  om.MEDRECNO, dm.Firstname, om.ORDERNO, om.CLINICALNOTES, om.RACECD, ot.TESTCODE, tm.TESTNAME, ot.SAMCOLDATE, ot.RLTPANPROF, sm.SPECDESC from ${TBL_ORDERTRN} ot left join ${TBL_ORDERMST} om on ot.ORDERNO=om.ORDERNO left join DGL_TESTMASTER tm on ot.TESTCODE=tm.TESTCODE left join Mst_DoctorMaster dm on om.ORDEREDBY=dm.Code left join DGL_SPECIMENMAST sm on ot.SPECCODE=sm.SPECDESC left join DGL_ReportTypeMAST rt on tm.RESTYPECD=rt.RESCODE left join ${TBL_RESULTMST} rm on rm.RESULTNO=OT.RESULTNO and rm.SAMLECOLNO=ot.SAMLECOLNO where ot.ACCEPTEDON>=@fromdate and ot.ACCEPTEDON<=@todate `;
            }

            const ss = (input.samplestatus ?? '').toString();
            if (ss === '') {
                query += ` and  ot.SAMPLESTATUS in('SA','RE') `;
            } else if (ss === 'SA') {
                query += ` and  ot.SAMPLESTATUS in('SA') `;
            } else if (ss === 'RE') {
                query += ` and  ot.SAMPLESTATUS in('RE') and rm.resultno like @ResultNo `;
            }

            query += optionalFiltersClause();
            query += ` and om.LABTYPECD=@labtypid and om.CLNORGCODE=@CLNORGCODE and (rm.RESUSTATUS<>'RV' OR rm.RESUSTATUS IS NULL) and ot.samlecolno like @acceptno `;
            query += ` ORDER BY OT.SAMLECOLNO `;
        }

        // Params (LIKE values wrapped in %)
        const params = {
            deptcode: input.deptcode ?? '',
            fromdate: input.fromdate ?? '',
            todate: input.todate ?? '',
            ResultNo: `%${input.ResultNo ?? ''}%`,
            patname: `%${input.patname ?? ''}%`,
            Billno: `%${input.Billno ?? ''}%`,
            pattype: `%${input.pattype ?? ''}%`,
            mrno: `%${input.mrno ?? ''}%`,
            priority: `%${input.priority ?? ''}%`,
            labtypid,
            CLNORGCODE: input.hospitalId ?? '',
            acceptno: `%${input.acceptno ?? ''}%`,
            Company_Id: `%${CompanyId}%`,
        };

        try {
            const { records } = await executeDbQuery(query, params);

            const details = records.map((r: any) => ({
                CODE: r.Details ?? '',
                NAME: r.SAMLECOLNO ?? '',
                REGNO: fmtDate(r.ACCEPTEDON),
                ADJDATE: r.ACCEPTEDAT ?? '',
                Value: r.TESTCODE ?? '',
                TESTNAME: r.TESTNAME ?? '',
                Firstname: r.Firstname ?? '',
                qty: r.RESTEXT ?? '',
                TRANNO: fmtDate(r.ACCEPTEDON),
                STATUS: r.ORDERNO ?? '',
                RESULTNO: r.RESULTNO ?? '',
            }));

            res.json({ status: 0, d: details });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}