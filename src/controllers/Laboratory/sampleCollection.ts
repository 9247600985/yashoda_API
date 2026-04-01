import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";

export default class sampleCollectionController {
  private router: Router = express.Router();

  constructor(app: Router) {
    app.use("/lab", this.router);
    this.router.get("/orders", authenticateToken, this.getOrders.bind(this));
    this.router.get("/tests", authenticateToken, this.getTests.bind(this));
    this.router.get("/order-details", authenticateToken, this.getOrderDetails.bind(this));
    this.router.get("/departments", authenticateToken, this.getLabDepartments.bind(this));
    this.router.get("/companies", authenticateToken, this.getCompanies.bind(this));
    this.router.post("/update-status", authenticateToken, this.changeStatus.bind(this));
    this.router.post("/submit-sample", authenticateToken, this.submitSample.bind(this));
  }

  private convertDateFormat(dateStr: string): string {
    if (!dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
      const months: { [key: string]: string } = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const [day, month, year] = dateStr.split("-");
      return `${year}-${months[month]}-${day}`;
    }
    return dateStr;
  }

  async getLabDepartments(_req: Request, res: Response) {
    try {
      const query = `SELECT LABDPTCODE, LABDPTDESC FROM DGL_LABDEPT WHERE LABTYPE = '01' ORDER BY LABDPTDESC`;
      const { records } = await executeDbQuery(query);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getCompanies(_req: Request, res: Response) {
    try {
      const query = `SELECT Com_Id AS COMPANYID, Name AS COMPANYNAME FROM Company WHERE Status = 'A' AND CompanyType = '002' ORDER BY Name`;
      const { records } = await executeDbQuery(query);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getOrders(req: Request, res: Response) {
    try {
      const { fromDate, toDate, section, priority, hospitalId, sampleStatus, patientType } = req.query as any;

      const params = {
        fromDate: this.convertDateFormat(fromDate),
        toDate: this.convertDateFormat(toDate),
        section: section || "",
        priority: priority || "A",
        hospitalId: hospitalId || "1",
        sampleStatus: sampleStatus || "A",
        patientType: patientType || "A",
      };

      const query = `
        SELECT om.ORDERNO, CONVERT(VARCHAR(11), om.ORDERDATE, 106) as ORDERDATE,
          CONVERT(VARCHAR(8), om.ORDERTIME, 108) as ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME,
          ot.TESTSTATUS as SAMPLESTATUS, om.PRIORITY, om.WARDNO, om.AGE, om.SEX as sex,
          dm.Firstname, pm.Mobile
        FROM DGL_ORDERMST om
        INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO
        LEFT JOIN Patient_Master pm ON pm.PatientMr_No = om.MEDRECNO
        LEFT JOIN Mst_DoctorMaster dm ON dm.Code = om.ORDEREDBY
        WHERE om.ORDERDATE >= @fromDate AND om.ORDERDATE <= @toDate
          AND om.CLNORGCODE LIKE @hospitalId + '%' AND om.STATUS = 'A'
          AND (LEN(@section) = 0 OR ot.LABDPTCODE LIKE @section + '%')
          AND (@priority = 'A' OR om.PRIORITY LIKE @priority + '%')
          AND (@patientType = 'A' OR om.PATTYPE LIKE @patientType + '%')
          AND (@sampleStatus = 'A' OR ot.TESTSTATUS LIKE @sampleStatus + '%')
        GROUP BY om.ORDERNO, om.ORDERDATE, om.ORDERTIME, om.MEDRECNO, om.IPNO, om.PATNAME,
          ot.TESTSTATUS, om.PRIORITY, om.WARDNO, om.AGE, om.SEX, dm.Firstname, pm.Mobile
        ORDER BY om.ORDERDATE DESC, om.ORDERTIME DESC`;

      const { records } = await executeDbQuery(query, params);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getTests(req: Request, res: Response) {
    try {
      const { section, hospitalId, orderNo } = req.query as any;

      const params = {
        hospitalId: hospitalId || "1",
        section: section || "",
        orderNo: orderNo,
      };

      const query = `
        SELECT ot.ORDERNO, ot.TESTCODE, tm.TESTNAME as TESTDESC, ld.LABDPTDESC as LABORATORY,
          sm.SPECDESC as SPECIMEN, cm.CONTNAME as CONTAINER, ot.SAMLECOLNO as SAMPLENUMBER,
          ISNULL(CONVERT(VARCHAR(11), ot.SAMCOLDATE, 106), '') as COLLECTEDDATE,
          ISNULL(CONVERT(VARCHAR(8), ot.SAMCOLTIME, 108), '') as COLLECTEDTIME,
          ot.SAMLECOLBY as COLLECTEDBY, ot.SEQNO
        FROM DGL_ORDERTRN ot
        INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
        INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
        LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
        LEFT JOIN DGL_ContainerMAST cm ON tm.CONTCODE = cm.CONTCODE
        WHERE ot.ORDERNO LIKE @orderNo + '%' AND ot.CLNORGCODE LIKE @hospitalId + '%'
          AND (LEN(@section) = 0 OR ot.LABDPTCODE LIKE @section + '%')
        ORDER BY ot.SEQNO`;

      const { records } = await executeDbQuery(query, params);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getOrderDetails(req: Request, res: Response) {
    try {
      const { orderNo, hospitalId } = req.query;

      const query = `
        SELECT ot.ORDERNO, ot.TESTCODE, tm.TESTNAME, ld.LABDPTDESC, sm.SPECDESC,
          cm.CONTNAME, ot.SAMLECOLNO, ot.SAMLECOLBY, ot.TESTSTATUS, ot.SAMPLESTATUS
        FROM DGL_ORDERTRN ot
        INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
        INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
        LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
        LEFT JOIN DGL_CONTAINERMAST cm ON tm.CONTCODE = cm.CONTCODE
        WHERE ot.ORDERNO = @orderNo AND ot.CLNORGCODE = @hospitalId`;

      const { records } = await executeDbQuery(query, {
        orderNo: orderNo as string,
        hospitalId: (hospitalId as string) || "1"
      });
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async changeStatus(req: Request, res: Response) {
    const list = req.body;
    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const row of list) {
        await executeDbQuery(
          `UPDATE DGL_ORDERTRN SET SAMPLESTATUS='SC', TESTSTATUS='SC' WHERE ORDERNO=@orderNo AND TESTCODE=@testCode`,
          { orderNo: row.orderNo || row.ORDERNO, testCode: row.testCode || row.TESTCODE },
          { transaction }
        );
      }

      await transaction.commit();
      res.json({ status: 0, message: "Updated successfully" });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async submitSample(req: Request, res: Response) {
    const { sampleDetailsList, hospitalId } = req.body;
    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const row of sampleDetailsList) {
        await executeDbQuery(
          `UPDATE DGL_ORDERTRN SET SAMPLESTATUS='SA', TESTSTATUS='SA', SAMLECOLNO=@sampleNo,
           SAMLECOLBY=@collectedBy, SAMCOLDATE=GETDATE(), SAMCOLTIME=CONVERT(VARCHAR(8), GETDATE(), 108)
           WHERE ORDERNO=@orderNo AND TESTCODE=@testCode AND CLNORGCODE=@hospitalId`,
          {
            sampleNo: row.sampleNo,
            collectedBy: row.collectedBy,
            orderNo: row.orderNo,
            testCode: row.testCode,
            hospitalId: hospitalId || "1",
          },
          { transaction }
        );
      }

      await transaction.commit();
      res.json({ status: 0, message: "Saved successfully" });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}
