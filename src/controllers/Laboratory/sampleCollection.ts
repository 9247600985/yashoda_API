import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";

export default class sampleCollectionController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/lab", this.router);

    this.router.get("/orders", authenticateToken, this.getOrders.bind(this));
    this.router.get("/tests", authenticateToken, this.getTests.bind(this));
    this.router.get(
      "/order-details",
      authenticateToken,
      this.getOrderDetails.bind(this),
    );

    this.router.post(
      "/update-status",
      authenticateToken,
      this.changeStatus.bind(this),
    );
    this.router.post(
      "/submit-sample",
      authenticateToken,
      this.updateDGLORDERTRN.bind(this),
    );

    this.router.get(
      "/departments",
      authenticateToken,
      this.getLabDepartments.bind(this),
    );
    this.router.get(
      "/companies",
      authenticateToken,
      this.getCompanies.bind(this),
    );
  }

  // ===== COMPANIES =====
  async getCompanies(req: Request, res: Response) {
    try {
      const query = `
        SELECT Com_Id AS id, NAME AS name
        FROM Company
        WHERE STATUS = 'A' AND CompanyType = '002'
        ORDER BY NAME
      `;
      const { records } = await executeDbQuery(query);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== DEPARTMENTS =====
  async getLabDepartments(req: Request, res: Response) {
    try {
      const query = `
        SELECT LABDPTCODE AS id, LABDPTDESC AS name
        FROM DGL_LABDEPT
        WHERE STATUS = 'A' AND LABTYPE = '01'
        ORDER BY LABDPTDESC
      `;
      const { records } = await executeDbQuery(query);
      res.json({ status: 0, data: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== ORDERS =====
  async getOrders(req: Request, res: Response) {
    try {
      const input = req.query;
      const { fromDate, toDate, section, priority, hospitalId, sampleStatus, patientType, companyId } = input as any;

      const params: any = {
        fromDate,
        toDate,
        section: section || "",
        priority: priority || "",
        hospitalId,
        sampleStatus: sampleStatus || "A",
        patientType: patientType || "A",
        companyId: companyId || "",
        labType: "01",
      };

      console.log("ORDERS PARAMS:", params);

      // Test query to check if there's any data
      const testQuery = `SELECT COUNT(*) as total FROM DGL_ORDERMST WHERE CLNORGCODE = @hospitalId`;
      const testResult = await executeDbQuery(testQuery, { hospitalId });
      console.log("Total orders in database for hospital:", testResult.records[0]);

      const query = `
      SELECT DISTINCT
    om.sex,
    om.ORDERNO,
    CONVERT(VARCHAR(11), om.ORDERDATE, 106) AS ORDERDATE,
    CONVERT(VARCHAR(8), om.ORDERTIME, 108) AS ORDERTIME,
    om.MEDRECNO,
    om.IPNO,
    om.PATNAME,
    ot.TESTSTATUS AS SAMPLESTATUS,
    om.PRIORITY,
    om.WARDNO,
    om.AGE,
    dt.Firstname,
    pm.Mobile
FROM DGL_ORDERMST om
INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO

-- COMMON JOINS
LEFT JOIN Patient_Master pm ON pm.PatientMr_No = om.MEDRECNO
LEFT JOIN Mst_DoctorMaster dt ON dt.Code = om.ORDEREDBY

-- CONDITIONAL JOINS
LEFT JOIN OPD_BILLMST OB 
    ON OB.BILLNO = om.BILLNO AND om.ORDERTYPE = 'O'

LEFT JOIN IPD_ADMISSION IA 
    ON IA.IPNO = om.IPNO AND om.ORDERTYPE = 'I'

WHERE 
    CAST(om.ORDERDATE AS DATE) BETWEEN CAST(@fromDate AS DATE) AND CAST(@toDate AS DATE)
    AND om.STATUS = 'A'
    AND om.ORDER_STATUS <> 'OR'
    AND om.LABTYPECD = @labType
    AND om.CLNORGCODE = @hospitalId

-- SECTION
AND (LEN(@section) = 0 OR ot.LABDPTCODE = @section)

-- PATIENT TYPE
AND (@patientType = 'A' OR om.PATTYPE = @patientType)

-- PRIORITY
AND (LEN(@priority) = 0 OR om.PRIORITY LIKE '%' + @priority + '%')

-- SAMPLE STATUS LOGIC
AND (
    @sampleStatus = 'A'
    OR (
        @sampleStatus = 'C' 
        AND ot.TESTSTATUS IN ('SA','RE','RV','RD')
    )
    OR (
        @sampleStatus LIKE '%,%' 
        AND ot.TESTSTATUS IN (
            SELECT LTRIM(RTRIM(value)) 
            FROM STRING_SPLIT(@sampleStatus, ',')
        )
    )
    OR (
        @sampleStatus NOT LIKE '%,%' 
        AND @sampleStatus <> 'A' 
        AND @sampleStatus <> 'C'
        AND ot.TESTSTATUS = @sampleStatus
    )
)

-- COMPANY FILTER (BOTH OP + IP)
AND (
    LEN(@companyId) = 0
    OR (
        (om.ORDERTYPE = 'O' AND (OB.CRDCOMPCD = @companyId OR OB.CRDCOMPCD LIKE @companyId + '%'))
        OR
        (om.ORDERTYPE = 'I' AND (IA.CRDCOMPCD = @companyId OR IA.CRDCOMPCD LIKE @companyId + '%'))
    )
)

ORDER BY om.MEDRECNO`;

      const { records } = await executeDbQuery(query, params);

      res.json({ status: 0, data: records });
    } catch (err: any) {
      console.error("getOrders error:", err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== TESTS =====
  async getTests(req: Request, res: Response) {
    try {
      const input = req.query;

      const params: any = {
        fromDate: `${input.fromDate} 00:00:00`,
        toDate: `${input.toDate} 23:59:59`,
        hospitalId: input.hospitalId,
        deptcode: input.section ?? "",
        orderNo: input.orderNo,
      };

      console.log("TESTS PARAMS:", params);

      const query = `
        SELECT 
          ot.ORDERNO,
          ot.TESTCODE,
          tm.TESTNAME AS TESTDESC,
          ld.LABDPTDESC AS LABORATORY,
          sm.SPECDESC AS SPECIMEN,
          cm.CONTNAME AS CONTAINER,
          ot.SAMLECOLNO AS SAMPLENUMBER,
          CONVERT(VARCHAR(10), ot.SAMCOLDATE, 120) AS COLLECTEDDATE,
          CONVERT(VARCHAR(8), ot.SAMCOLTIME, 108) AS COLLECTEDTIME,
          ot.SAMLECOLBY AS COLLECTEDBY
        FROM DGL_ORDERTRN ot
        INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
        INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
        LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
        LEFT JOIN DGL_ContainerMAST cm ON tm.CONTCODE = cm.CONTCODE
        WHERE ot.SAMCOLDATE BETWEEN @fromDate AND @toDate
          AND ot.ORDERNO = @orderNo
          AND ot.CLNORGCODE = @hospitalId
          AND (@deptcode = '' OR tm.LABDPTCODE = @deptcode)
        ORDER BY ot.SAMCOLDATE DESC
      `;

      const { records } = await executeDbQuery(query, params);

      res.json({ status: 0, data: records });
    } catch (err: any) {
      console.error("getTests error:", err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== ORDER DETAILS =====
  async getOrderDetails(req: Request, res: Response) {
    try {
      const { orderNo, hospitalId } = req.query;

      const query = `
        SELECT 
          ot.ORDERNO,
          ot.TESTCODE,
          tm.TESTNAME,
          ld.LABDPTDESC,
          sm.SPECDESC,
          cm.CONTNAME,
          ot.SAMLECOLNO,
          ot.SAMLECOLBY
        FROM DGL_ORDERTRN ot
        INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
        INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
        LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
        LEFT JOIN DGL_ContainerMAST cm ON tm.CONTCODE = cm.CONTCODE
        WHERE ot.ORDERNO = @orderNo
          AND ot.CLNORGCODE = @hospitalId
      `;

      const { records } = await executeDbQuery(query, {
        orderNo,
        hospitalId,
      });

      res.json({ status: 0, data: records });
    } catch (err: any) {
      console.error("getOrderDetails error:", err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== UPDATE STATUS =====
  async changeStatus(req: Request, res: Response) {
    const list = req.body;
    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const row of list) {
        await executeDbQuery(
          `UPDATE DGL_ORDERTRN 
           SET SAMPLESTATUS='SC', TESTSTATUS='SC'
           WHERE ORDERNO=@orderNo AND TESTCODE=@testCode`,
          {
            orderNo: row.ORDERNO,
            testCode: row.TESTCODE,
          },
          { transaction },
        );
      }

      await transaction.commit();
      res.json({ status: 0, message: "Updated successfully" });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ===== FINAL SAVE =====
  async updateDGLORDERTRN(req: Request, res: Response) {
    const { sampleDetailsList, hospitalId } = req.body;
    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const row of sampleDetailsList) {
        await executeDbQuery(
          `UPDATE DGL_ORDERTRN 
           SET SAMPLESTATUS='SA', TESTSTATUS='SA',
               SAMLECOLNO=@sampleNo,
               SAMLECOLBY=@collectedBy
           WHERE ORDERNO=@orderNo 
             AND TESTCODE=@testCode 
             AND CLNORGCODE=@hospitalId`,
          {
            sampleNo: row.sampleNo,
            collectedBy: row.collectedBy,
            orderNo: row.orderNo,
            testCode: row.testCode,
            hospitalId,
          },
          { transaction },
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
