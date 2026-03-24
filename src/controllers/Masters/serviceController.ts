import { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";

export default class serviceController {
    
  constructor(private router: Router) {

    router.use("/masters", this.router);
    
    this.router.get("/getServicesDetails", this.getServicesDetails.bind(this));
  }

  async getServicesDetails(req: Request, res: Response) {
    
    const sql = `
      SELECT 
        M.SERVCODE AS SERVCODE,
        M.SERVNAME AS SERVNAME,
        C.SRVGRPDESC AS SRVGRPDESC,
        B.SUBGRPNAME AS SUBGRPNAME
      FROM MST_SERVICES M
      LEFT JOIN MST_SERVGROUPS C 
        ON C.SRVGRPCODE = M.SRVGRPCODE
      LEFT JOIN MST_SERVSUBGRP B 
        ON B.SUBGRPCODE = M.SRVSUBGRP
      ORDER BY M.SERVCODE
    `;

    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}