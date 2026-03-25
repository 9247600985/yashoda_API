import { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import express from "express";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class serviceController {

  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);
    this.router.get("/getServicesDetails", authenticateToken, this.getServicesDetails.bind(this));
    this.router.get("/getMainGroupDropDown", authenticateToken, this.getMainGroupDropDown.bind(this));
    this.router.get("/getSubGroupDropDown", authenticateToken, this.getSubGroupDropDown.bind(this));
    this.router.get("/getDepartmentDropDown", authenticateToken, this.getDepartmentDropDown.bind(this));
    this.router.get("/getServiceTypeDropDown", authenticateToken, this.getServiceTypeDropDown.bind(this));
    this.router.get("/getDoctorComponentDropDown", authenticateToken, this.getDoctorComponentDropDown.bind(this));
  }

  async getServicesDetails(req: Request, res: Response) {

  const sql = `    select M.SERVCODE,M.SERVNAME,M.SRVGRPCODE,C.SRVGRPDESC,B.SUBGRPCODE,B.SUBGRPNAME,t.SRVTYPCODE,t.SRVTYPNAME,M.STATUS,M.MNEUNONIC,M.DEPTCODE,M.DOC_COMP,M.IsDiscountAlwd,M.MaxDiscountPer,M.PATIENTTYPE,M.RATEEDIT,M.NAMEEDIT,M.OPIPPACKGE,M.SERVTESTTYPE,M.SERVAPPSEX,M.ISTESTEXTCNTR,M.QTY_EDITABLE,M.ISDAYCARE,M.ONLINEBOOK_YN from MST_SERVICES M  left join MST_SERVGROUPS C on C.SRVGRPCODE = M.SRVGRPCODE left join  MST_SERVSUBGRP B on B.SUBGRPCODE=M.SRVSUBGRP left join  MST_SERTYPEMST t on t.SRVTYPCODE= M.SERVTYPECD    order by M.SERVCODE   `;

  try {
    const { records } = await executeDbQuery(sql);
    res.json({ status: 0, d: records });
  } catch (err: any) {
    res.status(500).json({ status: 1, message: err.message });
  }
}

  async getMainGroupDropDown(req: Request, res: Response) {
    const sql = `
    SELECT 
      SRVGRPCODE AS value,
      SRVGRPDESC AS label
    FROM MST_SERVGROUPS
    WHERE REC_STATUS = 'A'
    ORDER BY SRVGRPDESC
  `;

    try {
      const { records } = await executeDbQuery(sql);

      const dropdownData = [
        { value: '', label: '-Select-' },
        ...records
      ];

      res.json({ status: 0, d: dropdownData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getSubGroupDropDown(req: Request, res: Response) {
    const sql = `
    SELECT 
      SUBGRPCODE AS value,
      SUBGRPNAME AS label
    FROM MST_SERVSUBGRP
    WHERE REC_STATUS = 'A'
    ORDER BY SUBGRPNAME
  `;

    try {
      const { records } = await executeDbQuery(sql);

      const dropdownData = [
        { value: '', label: '-Select-' },
        ...records
      ];

      res.json({ status: 0, d: dropdownData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getDepartmentDropDown(req: Request, res: Response) {
    const sql = `
SELECT 
  DEPTCODE AS value,
  DEPTNAME AS label 
FROM Mst_Department
ORDER BY DEPTNAME
`;

    try {
      const { records } = await executeDbQuery(sql);

      const dropdownData = [
        { value: '', label: '-Select-' },
        ...records
      ];

      res.json({ status: 0, d: dropdownData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getServiceTypeDropDown(req: Request, res: Response) {
    const sql = `
SELECT 
  SRVTYPCODE AS value,
  SRVTYPNAME AS label
FROM MST_SERTYPEMST

ORDER BY SRVTYPNAME
`;

    try {
      const { records } = await executeDbQuery(sql);

      const dropdownData = [
        { value: '', label: '-Select-' },
        ...records
      ];

      res.json({ status: 0, d: dropdownData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getDoctorComponentDropDown(req: Request, res: Response) {
    const sql = `
SELECT 
  Code AS value,
  Doctor_Component AS label
FROM Mst_DoctorShare
ORDER BY Doctor_Component
`;

    try {
      const { records } = await executeDbQuery(sql);

      const dropdownData = [
        { value: '', label: '-Select-' },
        ...records
      ];
      res.json({ status: 0, d: dropdownData });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  
  }
}
