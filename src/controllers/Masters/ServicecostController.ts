import { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import express from "express";
import { authenticateToken } from "../../utilities/authMiddleWare";
export default class servicecostController {

    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/masters", this.router);
        this.router.get("/getServicecostDetails", authenticateToken, this.getServicescostDetails.bind(this));

        this.router.get("/getTariffCategoryDropDown", authenticateToken, this.getTariffCategoryDropDown.bind(this));
    }

 async getServicescostDetails(req: Request, res: Response) {
  const sql = `
    SELECT 
      M.SERVCODE, M.SERVNAME, M.SRVGRPCODE, C.SRVGRPDESC, 
      B.SUBGRPCODE, B.SUBGRPNAME, T.SRVTYPCODE, T.SRVTYPNAME,
      M.STATUS, M.DEPTCODE, M.DOC_COMP, M.IsDiscountAlwd,
      M.MaxDiscountPer, M.PATIENTTYPE, M.RATEEDIT, M.NAMEEDIT,
      M.OPIPPACKGE, M.SERVTESTTYPE, M.SERVAPPSEX, M.ISTESTEXTCNTR,
      M.QTY_EDITABLE, M.ISDAYCARE, M.ONLINEBOOK_YN,
      M.TARIFFID,                  -- Add this
      TC.TARIFFDESC                 -- Add this
    FROM MST_SERVICES M
    LEFT JOIN MST_SERVGROUPS C ON C.SRVGRPCODE = M.SRVGRPCODE
    LEFT JOIN MST_SERVSUBGRP B ON B.SUBGRPCODE = M.SRVSUBGRP
    LEFT JOIN MST_SERTYPEMST T ON T.SRVTYPCODE = M.SERVTYPECD
    LEFT JOIN MST_TARIFFCATGORY TC ON TC.TARIFFID = M.TARIFFID   -- Join tariff table
    ORDER BY M.SERVCODE
  `;

  try {
    const { records } = await executeDbQuery(sql);
    res.json({ status: 0, d: records });
  } catch (err: any) {
    res.status(500).json({ status: 1, message: err.message });
  }
}

    async getTariffCategoryDropDown(req: Request, res: Response) {
        const sql = `
    SELECT TARIFFID, TARIFFDESC 
    FROM  MST_TARIFFCATGORY
    WHERE REC_STATUS = 'A'
    ORDER BY TARIFFDESC
  `;
        try {
            const { records } = await executeDbQuery(sql);
            res.json({ status: 0, d: records });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }
}
