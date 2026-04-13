import express, { Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";

export default class sampleCollectionController {
  private router: Router = express.Router();

  constructor(app: Router) {
    app.use("/lab", this.router);
    this.router.get("/orders", authenticateToken, this.getOrders.bind(this));
    // this.router.get("/tests", authenticateToken, this.getTests.bind(this));
    // this.router.get("/order-details", authenticateToken, this.getOrderDetails.bind(this));
    this.router.get("/departments", authenticateToken, this.getLabDepartments.bind(this),);
    this.router.get("/companies", authenticateToken,this.getCompanies.bind(this),);
    this.router.get("/getSpecimenDropdown", authenticateToken, this.getSpecimenDropdown.bind(this),);
    this.router.get("/getContainerDropdown", authenticateToken, this.getContainerDropdown.bind(this),);
    // this.router.post("/update-status", authenticateToken, this.changeStatus.bind(this));
    this.router.post("/submitSample", authenticateToken, this.submitSample.bind(this));
    this.router.get("/getCollectedByDropdown", authenticateToken, this.getCollectedByDropdown.bind(this));
    this.router.get("/getExternalVendorsDropdown", authenticateToken, this.getExternalVendorsDropdown.bind(this));
  }

  private convertDateFormat(dateStr: string): string {
    if (!dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
      const months: { [key: string]: string } = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
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
    const { orderNo } = req.query as any;

    // ================= TEST MODE =================
    if (orderNo) {
      const testQuery = `
    SELECT 
      ot.ORDERNO,
      ot.TESTCODE,
      tm.TESTNAME AS TESTDESC,
      ld.LABDPTDESC AS LABORATORY,
      sm.SPECDESC AS SPECIMEN,
      cm.CONTNAME AS CONTAINER,
      ot.SAMLECOLNO AS SAMPLENUMBER,
      ISNULL(CONVERT(VARCHAR(11), ot.SAMCOLDATE, 106), '') AS COLLECTEDDATE,
      ISNULL(CONVERT(VARCHAR(8), ot.SAMCOLTIME, 108), '') AS COLLECTEDTIME,
      ot.SAMLECOLBY AS COLLECTEDBY
    FROM DGL_ORDERTRN ot
    INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
    INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
    LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE 
    LEFT JOIN DGL_CONTAINERMAST cm ON tm.CONTCODE = cm.CONTCODE
    WHERE ot.ORDERNO = @orderNo
    ORDER BY ot.SEQNO
  `;

      const { records } = await executeDbQuery(testQuery, { orderNo });

      res.json({
        status: 0,
        data: records,
      });
      return;
    }
    try {
      const {
        fromDate,
        toDate,
        section,
        priority,
        hospitalId,
        sampleStatus,
        patientType,
        companyId,
      } = req.query as any;

      const params: any = {
        fromDate: this.convertDateFormat(fromDate) + " 00:00:00",
        toDate: this.convertDateFormat(toDate) + " 23:59:59",
        section: section || "",
        priority: priority || "A",
        hospitalId: hospitalId || "",
        sampleStatus: sampleStatus || "A",
        patientType: patientType || "A",
        companyId: companyId || "",
      };

      // ================= BASE =================
      const baseQuery = `
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
        dm.Firstname,
        pm.Mobile
      FROM DGL_ORDERMST om
      INNER JOIN DGL_ORDERTRN ot ON om.ORDERNO = ot.ORDERNO
      LEFT JOIN Patient_Master pm ON pm.PatientMr_No = om.MEDRECNO
      LEFT JOIN Mst_DoctorMaster dm ON dm.Code = om.ORDEREDBY
    `;

      // ================= CONDITIONS =================
      let conditions = `
      WHERE om.ORDERDATE BETWEEN @fromDate AND @toDate
      AND om.STATUS = 'A'
      AND om.ORDER_STATUS <> 'OR'
      AND (@hospitalId = '' OR om.CLNORGCODE = @hospitalId)    `;

      // Sample Status
      if (
        params.sampleStatus &&
        params.sampleStatus !== "A" &&
        params.sampleStatus !== "C"
      ) {
        const statuses = params.sampleStatus
          .replace(/'/g, "")
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s);

        if (statuses.length > 0) {
          const statusParams = statuses
            .map((_: any, i: any) => `@status${i}`)
            .join(",");
          conditions += ` AND ot.TESTSTATUS IN (${statusParams})`;

          statuses.forEach((val: string, i: number) => {
            params[`status${i}`] = val;
          });
        }
      }

      // Patient Type
      if (params.patientType !== "A") {
        conditions += ` AND om.PATTYPE LIKE @patientType + '%'`;
      }

      // Priority
      if (params.priority !== "A") {
        conditions += ` AND om.PRIORITY LIKE @priority + '%'`;
      }

      // Section
      if (params.section) {
        conditions += ` AND (@section = '' OR LTRIM(RTRIM(ot.LABDPTCODE)) = LTRIM(RTRIM(@section)))`;
      }

      // ================= OP QUERY =================
      const opQuery = `
       ${baseQuery}
       LEFT JOIN OPD_BILLMST OB ON OB.BILLNO = OM.BILLNO
       ${conditions}
AND (
  @companyId LIKE '' 
  OR (
    OB.CRDCOMPCD IS NOT NULL 
    AND OB.CRDCOMPCD <> '' 
    AND OB.CRDCOMPCD LIKE @companyId + '%'
  )
)`;

      // ================= IP QUERY =================
      const ipQuery = `
      ${baseQuery}
      LEFT JOIN IPD_ADMISSION IA ON IA.IPNO = OM.IPNO
      ${conditions}
AND (
  @companyId LIKE '' 
  OR (
    IA.CRDCOMPCD IS NOT NULL 
    AND IA.CRDCOMPCD <> '' 
    AND IA.CRDCOMPCD LIKE @companyId + '%'
  )
)`;

      // ================= FINAL =================
      const finalQuery = `
      ${opQuery}
      UNION ALL
      ${ipQuery}
      ORDER BY ORDERDATE DESC, ORDERTIME DESC
    `;

      const { records } = await executeDbQuery(finalQuery, params);

      res.json({
        status: 0,
        data: records,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 1,
        message: err.message,
      });
    }
  }


  // controller/dropdownController.js
async getSpecimenDropdown(_req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        SPECCODE AS SPECIMENID, 
        SPECDESC AS SPECIMENNAME 
      FROM DGL_SPECIMENMAST 
      WHERE STATUS = 'A' 
      ORDER BY SPECDESC
    `;

    const { records } = await executeDbQuery(query);

    res.json({
      status: 0,
      data: records
    });

  } catch (err: any) {
    res.status(500).json({
      status: 1,
      message: err.message
    });
  }
}

async getContainerDropdown(_req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        CONTCODE AS CONTAINERID, 
        CONTNAME AS CONTAINERNAME 
      FROM DGL_CONTAINERMAST 
      WHERE STATUS = @status 
      ORDER BY CONTNAME
    `;

    const { records } = await executeDbQuery(query, { status: 'A' });

    res.json({
      status: 0,
      data: records
    });

  } catch (err: any) {
    res.status(500).json({
      status: 1,
      message: err.message
    });
  }
}

async getCollectedByDropdown(req: Request, res: Response) {
  try {
    const { hospitalId } = req.query as any;

    const query = `
      SELECT 
        USERID AS USERID,
        USERNAME AS USERNAME
      FROM Mst_UserDetails
      WHERE ROLES = @role
        AND (@hospitalId = '' OR CLNORGCODE = @hospitalId)
      ORDER BY USERNAME
    `;

    const { records } = await executeDbQuery(query, {
      role: '004',
      hospitalId: hospitalId || '',
    });

    res.json({
      status: 0,
      data: records
    });

  } catch (err: any) {
    res.status(500).json({
      status: 1,
      message: err.message
    });
  }
}

async getExternalVendorsDropdown(req: Request, res: Response) {
  try {
    const { hospitalId } = req.query as any;

    const query = `
      SELECT 
        EXTVNDRCODE AS VENDORID,
        EXTVNDRNAME AS VENDORNAME
      FROM DGL_EXTVENDORMST
      WHERE (@hospitalId = '' OR CLNORGCODE = @hospitalId)
      ORDER BY EXTVNDRNAME
    `;

    const { records } = await executeDbQuery(query, {
      hospitalId: hospitalId || ''
    });

    res.json({
      status: 0,
      data: records
    });

  } catch (err: any) {
    res.status(500).json({
      status: 1,
      message: err.message
    });
  }
}
  // async getTests(req: Request, res: Response) {
  //   try {
  //     const { section, hospitalId, orderNo } = req.query as any;

  //     const params = {
  //       hospitalId: hospitalId || "1",
  //       section: section || "",
  //       orderNo: orderNo,
  //     };

  //     const query = `
  //       SELECT ot.ORDERNO, ot.TESTCODE, tm.TESTNAME as TESTDESC, ld.LABDPTDESC as LABORATORY,
  //         sm.SPECDESC as SPECIMEN, cm.CONTNAME as CONTAINER, ot.SAMLECOLNO as SAMPLENUMBER,
  //         ISNULL(CONVERT(VARCHAR(11), ot.SAMCOLDATE, 106), '') as COLLECTEDDATE,
  //         ISNULL(CONVERT(VARCHAR(8), ot.SAMCOLTIME, 108), '') as COLLECTEDTIME,
  //         ot.SAMLECOLBY as COLLECTEDBY, ot.SEQNO
  //       FROM DGL_ORDERTRN ot
  //       INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
  //       INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
  //       LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
  //       LEFT JOIN DGL_ContainerMAST cm ON tm.CONTCODE = cm.CONTCODE
  //       WHERE ot.ORDERNO LIKE @orderNo + '%' AND ot.CLNORGCODE LIKE @hospitalId + '%'
  //         AND (LEN(@section) = 0 OR ot.LABDPTCODE LIKE @section + '%')
  //       ORDER BY ot.SEQNO`;

  //     const { records } = await executeDbQuery(query, params);
  //     res.json({ status: 0, data: records });
  //   } catch (err: any) {
  //     res.status(500).json({ status: 1, message: err.message });
  //   }
  // }

  // async getOrderDetails(req: Request, res: Response) {
  //   try {
  //     const { orderNo, hospitalId } = req.query;

  //     const query = `
  //       SELECT ot.ORDERNO, ot.TESTCODE, tm.TESTNAME, ld.LABDPTDESC, sm.SPECDESC,
  //         cm.CONTNAME, ot.SAMLECOLNO, ot.SAMLECOLBY, ot.TESTSTATUS, ot.SAMPLESTATUS
  //       FROM DGL_ORDERTRN ot
  //       INNER JOIN DGL_TESTMASTER tm ON ot.TESTCODE = tm.TESTCODE
  //       INNER JOIN DGL_LABDEPT ld ON tm.LABDPTCODE = ld.LABDPTCODE
  //       LEFT JOIN DGL_SPECIMENMAST sm ON tm.SPECCODE = sm.SPECCODE
  //       LEFT JOIN DGL_CONTAINERMAST cm ON tm.CONTCODE = cm.CONTCODE
  //       WHERE ot.ORDERNO = @orderNo AND ot.CLNORGCODE = @hospitalId`;

  //     const { records } = await executeDbQuery(query, {
  //       orderNo: orderNo as string,
  //       hospitalId: (hospitalId as string) || "1"
  //     });
  //     res.json({ status: 0, data: records });
  //   } catch (err: any) {
  //     res.status(500).json({ status: 1, message: err.message });
  //   }
  // }

  // async changeStatus(req: Request, res: Response) {
  //   const list = req.body;
  //   const transaction = new sql.Transaction(conpool);

  //   try {
  //     await transaction.begin();

  //     for (const row of list) {
  //       await executeDbQuery(
  //         `UPDATE DGL_ORDERTRN SET SAMPLESTATUS='SC', TESTSTATUS='SC' WHERE ORDERNO=@orderNo AND TESTCODE=@testCode`,
  //         { orderNo: row.orderNo || row.ORDERNO, testCode: row.testCode || row.TESTCODE },
  //         { transaction }
  //       );
  //     }

  //     await transaction.commit();
  //     res.json({ status: 0, message: "Updated successfully" });
  //   } catch (err: any) {
  //     await transaction.rollback();
  //     res.status(500).json({ status: 1, message: err.message });
  //   }
  // }

async submitSample(req: Request, res: Response) {
  const { selectedTests, collectionInfo } = req.body;

  if (!selectedTests || selectedTests.length === 0) {
    return res.status(400).json({ message: "No tests selected" });
  }
  const user = (req as any).user;
  const transaction = new sql.Transaction(conpool);
  

  try {
    await transaction.begin();

    for (const test of selectedTests) {
      const result = await executeDbQuery(
        `UPDATE DGL_ORDERTRN SET 
          SAMPLESTATUS = 'SC',
          TESTSTATUS = 'SC',
          SAMLECOLNO = @sampleNo,
          SAMLECOLBY = @collectedBy,
          SAMCOLDATE = @collectedDate,
          SAMCOLTIME = @collectedTime,
          UPDATEDBY = @userId,
          UPDATEDON = GETDATE()
         WHERE ORDERNO = @orderNo 
           AND TESTCODE = @testCode
           AND CLNORGCODE = @hospitalId`,
        {
          sampleNo: collectionInfo.labCode || '',
          collectedBy: collectionInfo.collectedBy,
          collectedDate: collectionInfo.collectedDate ? new Date(collectionInfo.collectedDate) : new Date(),
          collectedTime: collectionInfo.collectedTime || new Date().toTimeString().split(' ')[0],
          orderNo: test.ORDERNO,
          testCode: test.TESTCODE,
          hospitalId: collectionInfo.hospitalId || "1",
          userId: user?.id || collectionInfo.collectedBy
        },
        { transaction }
      );

      if (result.rowsAffected[0] === 0) {
        throw new Error(`No rows updated for ${test.ORDERNO}`);
      }
    }

    await transaction.commit();

    res.json({
      status: 0,
      message: "Sample collection saved successfully",
      count: selectedTests.length
    });

  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ status: 1, message: err.message });
  }
}
}
