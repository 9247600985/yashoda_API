import express, { Request, Response, Router } from "express";
import sql from "mssql";

import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class sampleCollectionController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/lab", this.router);

    this.router.get("/clickShow", authenticateToken, this.showData.bind(this));
    this.router.get(
      "/tbl_OrdersListDetails",
      authenticateToken,
      this.showTest.bind(this),
    );
    this.router.get(
      "/DispalyData",
      authenticateToken,
      this.getDetails.bind(this),
    );
    this.router.post(
      "/updateDataList",
      authenticateToken,
      this.changeStatus.bind(this),
    );
    this.router.post(
      "/clickUpdate",
      authenticateToken,
      this.updateDGLORDERTRN.bind(this),
    );
    this.router.get(
      "/getLabDepartments",
      authenticateToken,
      this.getLabDepartments.bind(this),
    );
    this.router.get(
      "/getCompanies",
      authenticateToken,
      this.getCompanies.bind(this),
    );
    this.router.get(
      "/getExternalVendors",
      authenticateToken,
      this.getExternalVendors.bind(this),
    );
    this.router.get(
      "/getSpecimens",
      authenticateToken,
      this.getSpecimens.bind(this),
    );
    this.router.get(
      "/getContainers",
      authenticateToken,
      this.getContainers.bind(this),
    );
    this.router.get(
      "/getCollectedByUsers",
      authenticateToken,
      this.getCollectedByUsers.bind(this),
    );
  }

  async getExternalVendors(req: Request, res: Response): Promise<void> {
    try {
      const hospitalId = String(req.query.hospitalId || "");

      const sqlQuery = `
      SELECT
        EXTVNDRCODE AS id,
        EXTVNDRNAME AS name
      FROM DGL_EXTVENDORMST
      WHERE CLNORGCODE = @hospitalId
      ORDER BY EXTVNDRNAME
    `;

      const { records } = await executeDbQuery(sqlQuery, { hospitalId });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getSpecimens(req: Request, res: Response): Promise<void> {
    try {
      const sqlQuery = `
      SELECT
        SPECCODE AS id,
        SPECDESC AS name
      FROM DGL_SPECIMENMAST
      WHERE STATUS = 'A'
      ORDER BY SPECDESC
    `;

      const { records } = await executeDbQuery(sqlQuery);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getContainers(req: Request, res: Response): Promise<void> {
    try {
      const sqlQuery = `
      SELECT
        CONTCODE AS id,
        CONTNAME AS name
      FROM DGL_ContainerMAST
      WHERE STATUS = 'A'
      ORDER BY CONTNAME
    `;

      const { records } = await executeDbQuery(sqlQuery);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getCollectedByUsers(req: Request, res: Response): Promise<void> {
    try {
      const hospitalId = String(req.query.hospitalId || "");

      const sqlQuery = `
      SELECT
        USERID AS id,
        USERNAME AS name
      FROM Mst_UserDetails
      WHERE ROLES = '004'
        AND CLNORGCODE = @hospitalId
      ORDER BY USERNAME
    `;

      const { records } = await executeDbQuery(sqlQuery, { hospitalId });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }
  async getCompanies(req: Request, res: Response): Promise<void> {
    try {
      const sqlQuery = `
        SELECT Com_Id AS id, NAME AS name
        FROM Company
        WHERE STATUS = 'A'
          AND CompanyType = '002'
        ORDER BY NAME
      `;

      const { records } = await executeDbQuery(sqlQuery);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getLabDepartments(req: Request, res: Response): Promise<void> {
    try {
      const hospitalId = String(req.query.hospitalId || "");
      const labType = String(req.query.labType || "");

      const sqlQuery = `
      SELECT LABDPTCODE AS id, LABDPTDESC AS name
      FROM DGL_LABDEPT
      WHERE STATUS = 'A'
        AND LABTYPE = @labType
        AND CLNORGCODE = @hospitalId
      ORDER BY LABDPTDESC
    `;

      const { records } = await executeDbQuery(sqlQuery, {
        hospitalId,
        labType,
      });

      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async showData(req: Request, res: Response): Promise<void> {
    const input = req.body || req.query;

    const dtFm = input.Fromdate;
    const dtTo = input.ToDate;
    const SectionID = input.SectionID || "";
    const Priority = input.Priority || "";
    const Company_Id = input.Company_Id || "";
    const CLNORGCODE = input.hospitalId || "";
    const Patient_type = input.Patient_type || "All";
    const SampleStatus = input.SampleStatus || "All";

    try {
      let sqlQuery = `
      SELECT DISTINCT
        om.ORDERNO,
        CONVERT(VARCHAR(11), om.ORDERDATE, 106) AS ORDERDATE,
        CONVERT(VARCHAR(8), om.ORDERTIME, 108) AS ORDERTIME,
        om.MEDRECNO,
        om.IPNO,
        om.PATNAME,
        ot.SAMPLESTATUS,
        om.PRIORITY,
        om.AGE,
        dt.Firstname,
        pm.Mobile
      FROM DGL_ORDERMST om
      INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO
      LEFT JOIN Patient_Master pm ON pm.PatientMr_No = om.MEDRECNO
      LEFT JOIN Mst_DoctorMaster dt ON dt.Code = om.ORDEREDBY
      INNER JOIN OPD_BILLMST ob ON ob.BILLNO = om.BILLNO
      WHERE om.ORDERDATE >= @dtFm
        AND om.ORDERDATE <= @dtTo
        AND om.STATUS = 'A'
        AND om.PRIORITY LIKE @Priority
        AND om.ORDER_STATUS <> 'OR'
        AND om.LABTYPECD = '01'
        AND om.CLNORGCODE = @CLNORGCODE
        AND ob.CRDCOMPCD LIKE @CompanyId
    `;

      const params: any = {
        dtFm: `${dtFm} 00:00:00`,
        dtTo: `${dtTo} 23:59:59`,
        Priority:
          Priority === "A" || Priority === "" || Priority === "All"
            ? "%%"
            : `%${Priority}%`,
        CLNORGCODE,
        CompanyId:
          Company_Id === "" || Company_Id === "All" ? "%%" : `%${Company_Id}%`,
      };

      if (SectionID && SectionID !== "All") {
        sqlQuery += ` AND ot.LABDPTCODE = @SectionID`;
        params.SectionID = SectionID;
      }

      if (Patient_type && Patient_type !== "All") {
        let mappedPatientType = Patient_type;

        if (Patient_type === "OP") mappedPatientType = "O";
        if (Patient_type === "IP") mappedPatientType = "I";
        if (Patient_type === "D") mappedPatientType = "D";

        sqlQuery += ` AND om.ORDERTYPE = @PatientType`;
        params.PatientType = mappedPatientType;
      }

      if (SampleStatus && SampleStatus !== "All") {
        if (SampleStatus === "Pending") {
          sqlQuery += ` AND ot.SAMPLESTATUS IN ('OP')`;
        } else if (SampleStatus === "Collected") {
          sqlQuery += ` AND ot.SAMPLESTATUS IN ('SC', 'SA', 'C')`;
        }
      }

      sqlQuery += ` ORDER BY om.ORDERNO DESC`;

      const { records } = await executeDbQuery(sqlQuery, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async showTest(req: Request, res: Response): Promise<void> {
    const input = req.body || req.query;

    const OrderNo = input.Order_No || "";
    const DEPT = input.DEPT || "";
    const CLNORGCODE = input.hospitalId || "";

    try {
      let sqlQuery = `
        SELECT
          om.ORDERNO,
          ot.TESTCODE,
          tm.TESTNAME,
          ld.LABDPTDESC,
          sm.SPECDESC,
          cm.CONTNAME,
          ot.SAMLECOLNO,
          ot.SAMPLESTATUS,
          ot.COLLECTEDBY,
          ot.SAMLECOLBY
        FROM DGL_ORDERMST om
        INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO
        INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
        INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
        LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
        LEFT JOIN DGL_ContainerMAST cm ON tm.CONTCODE = cm.CONTCODE
        WHERE om.ORDERNO = @OrderNo
          AND om.CLNORGCODE = @CLNORGCODE
      `;

      const params: any = {
        OrderNo,
        CLNORGCODE,
      };

      if (DEPT) {
        sqlQuery += ` AND ot.LABDPTCODE = @DEPT`;
        params.DEPT = DEPT;
      }

      sqlQuery += ` ORDER BY ot.TESTCODE`;

      const { records } = await executeDbQuery(sqlQuery, params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async changeStatus(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const data of input) {
        const params = {
          SampleStatus: "SC",
          LabCode: data.LabCode || "",
          CollectedBy: data.CollectedBy || "",
          ExternalVendor: data.ExternalVendor || "",
          OrderNo: data.OrderNo,
          TestCode: data.TestCode,
        };

        const query = `
          UPDATE DGL_ORDERTRN
          SET SAMPLESTATUS = @SampleStatus,
              TESTSTATUS = @SampleStatus,
              LABCODE = @LabCode,
              COLLECTEDBY = @CollectedBy,
              EXTDIGCODE = @ExternalVendor
          WHERE ORDERNO = @OrderNo
            AND TESTCODE = @TestCode
        `;

        await executeDbQuery(query, params, { transaction });
      }

      await transaction.commit();
      res.json({ status: 0, message: "Updated successfully" });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async updateDGLORDERTRN(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const sampleDetailsList = input.sampleDetailsList || [];
    const invoiceNo = input.invoiceNo || "";
    const hospitalId = input.hospitalId || "";

    const transaction = new sql.Transaction(conpool);

    try {
      await transaction.begin();

      for (const row of sampleDetailsList) {
        const params = {
          ORDERNO: row.OrderNo,
          TESTCODE: row.TestCode,
          CLNORGCODE: hospitalId,
          SAMLECOLNO: invoiceNo,
          COLLECTEDBY: row.CollectedBy,
        };

        const query = `
          UPDATE DGL_ORDERTRN
          SET SAMLECOLNO = @SAMLECOLNO,
              SAMLECOLBY = @COLLECTEDBY,
              SAMPLESTATUS = 'SA',
              TESTSTATUS = 'SA'
          WHERE ORDERNO = @ORDERNO
            AND TESTCODE = @TESTCODE
            AND CLNORGCODE = @CLNORGCODE
        `;

        await executeDbQuery(query, params, { transaction });
      }

      await transaction.commit();
      res.json({ status: 0, message: "Success", data: invoiceNo });
    } catch (err: any) {
      await transaction.rollback();
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getDetails(req: Request, res: Response): Promise<void> {
    const input = req.body || req.query;

    try {
      const query = `
        SELECT TOP 100 *
        FROM DGL_ORDERTRN
        WHERE CLNORGCODE = @CLNORGCODE
      `;

      const { records } = await executeDbQuery(query, {
        CLNORGCODE: input.hospitalId,
      });

      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}
