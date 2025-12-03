import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";
import { queryObjects } from "v8";
const moment = require('moment');

export default class modulesController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/modules", this.router);

        this.router.get("/getModulesDetails", authenticateToken, this.getModulesDetails.bind(this));
        this.router.get("/getModulesCount", authenticateToken, this.getModulesCount.bind(this));


    }

    async getModulesDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT MODULE_ID, MODULE_NAME, MODULEMAINPAGE, STATUS ST FROM MST_MODULES WHERE STATUS='A'`;

            const { records } = await executeDbQuery(sqlQuery);

            const modules = records.map((row: any) => ({
                Module_Id: row.MODULE_ID ?? "",
                Module_Name: row.MODULE_NAME ?? "",
                Status: row.ST ?? "",
            }));

            res.json({ status: 0, d: modules });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getModulesCount(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `select top 1 module_id From mst_modules order by Module_Id desc`;

            const { records } = await executeDbQuery(sqlQuery);

            res.json({ status: 0, d: records[0] });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }


}