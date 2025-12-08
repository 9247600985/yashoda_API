import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";

export default class activitiesController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/activities", this.router);

        this.router.get("/getActivityCount", authenticateToken, this.getActivityCount.bind(this));
        this.router.get("/getPriority", authenticateToken, this.getPriority.bind(this));
        this.router.get("/getActivityDetails", authenticateToken, this.getActivityDetails.bind(this));
        this.router.post("/insertActivity", authenticateToken, this.insertActivity.bind(this));
        this.router.put("/updateActivity", authenticateToken, this.updateActivity.bind(this));


    }

    async getActivityCount(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT FORMAT(COUNT(*) + 1, '0000') AS count FROM MST_ACTIVITIES`;

            const { records } = await executeDbQuery(sqlQuery);

            res.json({ status: 0, d: records[0] });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getPriority(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sqlQuery = `select top 1 priorty From mst_activities where Module_Id=@ModuleID order by priorty desc`;

            const { records } = await executeDbQuery(sqlQuery, { ModuleID: input.ModuleID });

            res.json({ status: 0, d: records[0] });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getActivityDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT A.Activity_Id,A.Activity_Name,A.Module_Id,M.Module_Name,A.PostbackURL, ISNULL(A.priorty,0) AS priorty,A.Status fROM MST_aCTIVITIES A INNER JOIN MST_MODULES M ON M.Module_Id = A.Module_Id
`;

            const { records } = await executeDbQuery(sqlQuery);

            const activities = records.map((row: any) => ({
                Activity_Id: row.Activity_Id ?? "",
                Activity_Name: row.Activity_Name ?? "",
                Module_Id: `${row.Module_Id ?? ""}:${row.Module_Name ?? ""}`,
                Page_Reference: row.PostbackURL ?? "",
                Priority: row.priorty ?? "",
                Status: row.Status ?? "",
            }));

            res.json({ status: 0, d: activities });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async insertActivity(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();


            const chekDup = `select COUNT(Activity_Name) AS COUNT From mst_activities where Activity_Name=@Activity_Name and  Module_Id= @Module_Id`;

            const { records } = await executeDbQuery(chekDup, { Activity_Name: input.Activity_Name, Module_Id: input.Module_Id });

            if (Number(records[0]?.COUNT) > 0) {
                res.json({ status: -1, message: "Activity already existed." });
                return;
            }

            const query = `INSERT INTO MST_ACTIVITIES(Module_Id,Activity_Id,Activity_Name ,Status,CLNORGCODE,PostbackURL,priorty,CREATED_BY,CREATED_ON) VALUES( @Module_Id, @Activity_Id, @Activity_Name, @Status, '001001001000', @Page_Reference, @Priority, @Created_By, GETDATE())`;

            const ActivityId = `${input.Module_Id}-${input.Activity_Id}`;

            const params = { Module_Id: input.Module_Id, Activity_Id: ActivityId, Activity_Name: input.Activity_Name, Status: input.Status, Page_Reference: input.Page_Reference, Priority: input.Priority, Created_By: input.Created_By };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Activity saved successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async updateActivity(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const query = `UPDATE MST_ACTIVITIES SET Module_id=@Module_Id, Activity_Name=@Activity_Name, priorty=@Priority, PostbackURL=@Page_Reference, STATUS=@Status, EDITED_BY=@Edited_By, EDITED_ON=GETDATE() WHERE Activity_Id=@Activity_Id`;

            const params = { Module_Id: input.Module_Id, Activity_Name: input.Activity_Name, Priority: input.Priority, Page_Reference: input.Page_Reference, Status: input.Status, Edited_By: input.Edited_By, Activity_Id: input.Activity_Id };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Activity updated successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}