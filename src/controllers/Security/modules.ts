import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";

export default class modulesController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/modules", this.router);

        this.router.get("/getModulesDetails", authenticateToken, this.getModulesDetails.bind(this));
        this.router.get("/getModulesCount", authenticateToken, this.getModulesCount.bind(this));
        this.router.post("/insertModule", authenticateToken, this.insertModule.bind(this));
        this.router.put("/updateModule", authenticateToken, this.updateModule.bind(this));

    }

    async getModulesDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT MODULE_ID, MODULE_NAME, MODULEMAINPAGE, STATUS ST FROM MST_MODULES ORDER BY 2`;

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
            const sqlQuery = `SELECT RIGHT('000' + CAST(ISNULL(MAX(module_id),0) + 1 AS VARCHAR(3)), 3) AS count FROM mst_modules`;

            const { records } = await executeDbQuery(sqlQuery);

            res.json({ status: 0, d: records[0] });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async insertModule(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();


            const chekDup = `SELECT COUNT(Module_Name) AS COUNT FROM MST_MODULES WHERE MODULE_NAME = @Module_Name`;

            const { records } = await executeDbQuery(chekDup, { Module_Name: input.ModuleName });

            if (Number(records[0]?.COUNT) > 0) {
                res.json({ status: -1, message: "Module already existed." });
                return;
            }

            const query = `INSERT INTO MST_MODULES(MODULE_ID, MODULE_NAME, STATUS, CLNORGCODE, CREATED_BY, CREATED_ON) VALUES( @Module_Id, @Module_Name, @Status, @HospitalId, @Created_By, GETDATE())`;

            const params = { Module_Id: input.ModuleId, Module_Name: input.ModuleName, Status: input.status, HospitalId: '001001001000', Created_By: input.Created_By };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Module saved successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async updateModule(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const query = `UPDATE MST_MODULES SET MODULE_NAME=@Module_Name, STATUS=@Status, EDITED_BY=@Edited_By, EDITED_ON=GETDATE() WHERE MODULE_ID=@Module_Id`;

            const params = { Module_Id: input.ModuleId, Module_Name: input.ModuleName, Status: input.status, HospitalId: '001001001000', Edited_By: input.Edited_By };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Module updated successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}