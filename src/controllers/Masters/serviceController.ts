import { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import express from "express";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class serviceController {

  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);

    // Dropdowns
    this.router.get("/getServicesDetails", authenticateToken, this.getServicesDetails.bind(this));
    this.router.get("/getMainGroupDropDown", authenticateToken, this.getMainGroupDropDown.bind(this));
    this.router.get("/getSubGroupDropDown", authenticateToken, this.getSubGroupDropDown.bind(this));
    this.router.get("/getDepartmentDropDown", authenticateToken, this.getDepartmentDropDown.bind(this));
    this.router.get("/getServiceTypeDropDown", authenticateToken, this.getServiceTypeDropDown.bind(this));
    this.router.get("/getDoctorComponentDropDown", authenticateToken, this.getDoctorComponentDropDown.bind(this));

    // CRUD
    this.router.post("/saveServiceDetails", authenticateToken, this.saveServiceDetails.bind(this));
    this.router.post("/updateServiceDetails", authenticateToken, this.updateServiceDetails.bind(this));

    // New: Auto-generate service code
    this.router.get("/getNextServiceCode", authenticateToken, this.getNextServiceCode.bind(this));
  }

  // =========================
  // AUTO GENERATE SERVCODE
  // =========================
  // =========================
// AUTO GENERATE SERVCODE
// =========================
async getNextServiceCode(req: Request, res: Response) {
  const sql = `
    SELECT TOP 1 SERVCODE
    FROM MST_SERVICES
    ORDER BY SERVCODE DESC
  `;

  try {
    const { records } = await executeDbQuery(sql);

    let lastCode = (records.length > 0 && records[0].SERVCODE != null)
                   ? Number(records[0].SERVCODE)
                   : 1000;

    if (isNaN(lastCode)) lastCode = 1000;

    const nextCode = lastCode + 1;

    res.json({ status: 0, SERVCODE: nextCode.toString() });
  } catch (err: any) {
    console.error('GENERATE SERVCODE ERROR:', err);
    res.status(500).json({ status: 1, message: err.message });
  }
}
  // =========================
  // SAVE
  // =========================
  async saveServiceDetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
      INSERT INTO MST_SERVICES (
        SERVCODE,
        SERVNAME,
        SRVGRPCODE,
        SRVSUBGRP,
        SERVTYPECD,
        STATUS,
        MNEUNONIC,
        DEPTCODE,
        DOC_COMP,
        IsDiscountAlwd,
        MaxDiscountPer,
        PATIENTTYPE,
        RATEEDIT,
        NAMEEDIT,
        OPIPPACKGE,
        SERVTESTTYPE,
        SERVAPPSEX,
        ISTESTEXTCNTR,
        QTY_EDITABLE,
        ISDAYCARE,
        ONLINEBOOK_YN
      )
      VALUES (
        @SERVCODE,
        @SERVNAME,
        @SRVGRPCODE,
        @SRVSUBGRP,
        @SERVTYPECD,
        @STATUS,
        @MNEUNONIC,
        @DEPTCODE,
        @DOC_COMP,
        @IsDiscountAlwd,
        @MaxDiscountPer,
        @PATIENTTYPE,
        @RATEEDIT,
        @NAMEEDIT,
        @OPIPPACKGE,
        @SERVTESTTYPE,
        @SERVAPPSEX,
        @ISTESTEXTCNTR,
        @QTY_EDITABLE,
        @ISDAYCARE,
        @ONLINEBOOK_YN
      )
    `;

    try {
      await executeDbQuery(sql, {
        SERVCODE: data.SERVCODE,
        SERVNAME: data.SERVNAME,
        SRVGRPCODE: data.SRVGRPCODE,
        SRVSUBGRP: data.SUBGRPCODE,
        SERVTYPECD: data.SRVTYPCODE,
        STATUS: data.STATUS,
        MNEUNONIC: data.SERVNAME?.slice(0, 10),
        DEPTCODE: data.DEPTCODE,
        DOC_COMP: data.DOC_COMP,
        IsDiscountAlwd: 'Y',
        MaxDiscountPer: data.MaxDiscountPer ?? 0,
        PATIENTTYPE: data.PATIENTTYPE,
        RATEEDIT: data.RATEEDIT,
        NAMEEDIT: data.NAMEEDIT,
        OPIPPACKGE: data.OPIPPACKGE,
        SERVTESTTYPE: data.SERVTESTTYPE,
        SERVAPPSEX: data.SERVAPPSEX,
        ISTESTEXTCNTR: data.ISTESTEXTCNTR === 'Y' ? 'Y' : 'N',
        QTY_EDITABLE: data.QTY_EDITABLE === 'Y' ? 'Y' : 'N',
        ISDAYCARE: data.ISDAYCARE === 'Y' ? 'Y' : 'N',
        ONLINEBOOK_YN: data.ONLINEBOOK_YN
      });

      res.json({ status: 0, message: 'Service inserted successfully' });

    } catch (err: any) {
      console.error('INSERT ERROR:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // =========================
  // UPDATE
  // =========================
  async updateServiceDetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
      UPDATE MST_SERVICES SET
        SERVNAME = @SERVNAME,
        SRVGRPCODE = @SRVGRPCODE,
        SRVSUBGRP = @SRVSUBGRP,
        SERVTYPECD = @SERVTYPECD,
        STATUS = @STATUS,
        MNEUNONIC = @MNEUNONIC,
        DEPTCODE = @DEPTCODE,
        DOC_COMP = @DOC_COMP,
        IsDiscountAlwd = @IsDiscountAlwd,
        MaxDiscountPer = @MaxDiscountPer,
        PATIENTTYPE = @PATIENTTYPE,
        RATEEDIT = @RATEEDIT,
        NAMEEDIT = @NAMEEDIT,
        OPIPPACKGE = @OPIPPACKGE,
        SERVTESTTYPE = @SERVTESTTYPE,
        SERVAPPSEX = @SERVAPPSEX,
        ISTESTEXTCNTR = @ISTESTEXTCNTR,
        QTY_EDITABLE = @QTY_EDITABLE,
        ISDAYCARE = @ISDAYCARE,
        ONLINEBOOK_YN = @ONLINEBOOK_YN
      WHERE SERVCODE = @SERVCODE
    `;

    try {
      await executeDbQuery(sql, {
        SERVCODE: data.SERVCODE,
        SERVNAME: data.SERVNAME,
        SRVGRPCODE: data.SRVGRPCODE,
        SRVSUBGRP: data.SUBGRPCODE,
        SERVTYPECD: data.SRVTYPCODE,
        STATUS: data.STATUS,
        MNEUNONIC: data.SERVNAME?.slice(0, 10),
        DEPTCODE: data.DEPTCODE,
        DOC_COMP: data.DOC_COMP,
        IsDiscountAlwd: 'Y',
        MaxDiscountPer: data.MaxDiscountPer ?? 0,
        PATIENTTYPE: data.PATIENTTYPE,
        RATEEDIT: data.RATEEDIT,
        NAMEEDIT: data.NAMEEDIT,
        OPIPPACKGE: data.OPIPPACKGE,
        SERVTESTTYPE: data.SERVTESTTYPE,
        SERVAPPSEX: data.SERVAPPSEX,
        ISTESTEXTCNTR: data.ISTESTEXTCNTR === 'Y' ? 'Y' : 'N',
        QTY_EDITABLE: data.QTY_EDITABLE === 'Y' ? 'Y' : 'N',
        ISDAYCARE: data.ISDAYCARE === 'Y' ? 'Y' : 'N',
        ONLINEBOOK_YN: data.ONLINEBOOK_YN
      });

      res.json({ status: 0, message: 'Service updated successfully' });

    } catch (err: any) {
      console.error('UPDATE ERROR:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // =========================
  // GET ALL SERVICES
  // =========================
  async getServicesDetails(req: Request, res: Response) {
    const sql = `
      SELECT 
        M.SERVCODE, M.SERVNAME, M.SRVGRPCODE, C.SRVGRPDESC, 
        B.SUBGRPCODE, B.SUBGRPNAME, T.SRVTYPCODE, T.SRVTYPNAME,
        M.STATUS, M.DEPTCODE, M.DOC_COMP, M.IsDiscountAlwd,
        M.MaxDiscountPer, M.PATIENTTYPE, M.RATEEDIT, M.NAMEEDIT,
        M.OPIPPACKGE, M.SERVTESTTYPE, M.SERVAPPSEX, M.ISTESTEXTCNTR,
        M.QTY_EDITABLE, M.ISDAYCARE, M.ONLINEBOOK_YN
      FROM MST_SERVICES M
      LEFT JOIN MST_SERVGROUPS C ON C.SRVGRPCODE = M.SRVGRPCODE
      LEFT JOIN MST_SERVSUBGRP B ON B.SUBGRPCODE = M.SRVSUBGRP
      LEFT JOIN MST_SERTYPEMST T ON T.SRVTYPCODE = M.SERVTYPECD
      ORDER BY M.SERVCODE
    `;

    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // =========================
  // DROPDOWN APIs
  // =========================
  async getMainGroupDropDown(req: Request, res: Response) {
    const sql = `
      SELECT SRVGRPCODE AS value, SRVGRPDESC AS label
      FROM MST_SERVGROUPS
      WHERE REC_STATUS = 'A'
      ORDER BY SRVGRPDESC
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getSubGroupDropDown(req: Request, res: Response) {
    const sql = `
      SELECT SUBGRPCODE AS value, SUBGRPNAME AS label
      FROM MST_SERVSUBGRP
      WHERE REC_STATUS = 'A'
      ORDER BY SUBGRPNAME
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getDepartmentDropDown(req: Request, res: Response) {
    const sql = `
      SELECT DEPTCODE AS value, DEPTNAME AS label
      FROM Mst_Department
      ORDER BY DEPTNAME
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getServiceTypeDropDown(req: Request, res: Response) {
    const sql = `
      SELECT SRVTYPCODE AS value, SRVTYPNAME AS label
      FROM MST_SERTYPEMST
      ORDER BY SRVTYPNAME
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getDoctorComponentDropDown(req: Request, res: Response) {
    const sql = `
      SELECT Code AS value, Doctor_Component AS label
      FROM Mst_DoctorShare
      ORDER BY Doctor_Component
    `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}