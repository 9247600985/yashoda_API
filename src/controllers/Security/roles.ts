import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";

export default class rolesController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/roles", this.router);

        this.router.get("/getRolesCount", authenticateToken, this.getRolesCount.bind(this));
        this.router.get("/getRolesDetails", authenticateToken, this.getRolesDetails.bind(this));
        this.router.post("/insertRole", authenticateToken, this.insertRole.bind(this));
        this.router.put("/updateRole", authenticateToken, this.updateRole.bind(this));


    }

    async getRolesCount(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT RIGHT('000' + CAST(ISNULL(MAX(CODE),0) + 1 AS VARCHAR(3)), 3) AS count FROM MST_ROLES`;

            const { records } = await executeDbQuery(sqlQuery);

            res.json({ status: 0, d: records[0] });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getRolesDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT CODE, ROLE, AdminType, Status FROM MST_ROLES ORDER BY 2`;

            const { records } = await executeDbQuery(sqlQuery);

            const roles = records.map((row: any) => ({
                Role_Id: row.CODE ?? "",
                Role_Name: row.ROLE ?? "",
                Type: row.AdminType ?? "",
                Status: row.Status ?? "",
            }));

            res.json({ status: 0, d: roles });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async insertRole(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();


            const chekDup = `SELECT COUNT(ROLE) AS COUNT FROM MST_ROLES WHERE ROLE = @Role_Name`;

            const { records } = await executeDbQuery(chekDup, { Role_Name: input.RoleName });

            if (Number(records[0]?.COUNT) > 0) {
                res.json({ status: -1, message: "Role already existed." });
                return;
            }

            const query = `INSERT INTO MST_ROLES(CODE, ROLE, STATUS, ADMINTYPE, CLNORGCODE, CREATED_BY, CREATED_ON) VALUES( @Role_Id, @Role_Name, @Status, @Type, @HospitalId, @Created_By, GETDATE())`;

            const params = { Role_Id: input.RoleId, Role_Name: input.RoleName, Status: input.status, Type: input.AdminType, HospitalId: '001001001000', Created_By: input.Created_By };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Role saved successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async updateRole(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const query = `UPDATE MST_ROLES SET ADMINTYPE=@Type, ROLE=@Role_Name, STATUS= @Status, EDITED_BY= @Edited_By, EDITED_ON=GETDATE() WHERE code= @Role_Id`;

            const params = { Type: input.AdminType, Role_Name: input.RoleName, Status: input.status, Edited_By: input.Edited_By, Role_Id: input.RoleId };

            await executeDbQuery(query, params, { transaction });

            await transaction.commit();

            res.json({ status: 0, message: "Role updated successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}