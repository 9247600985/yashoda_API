import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";

export default class clinicToUserLinkController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/clinicToUser", this.router);

        this.router.get("/GETITEMDETAILSCLINIC", authenticateToken, this.GETITEMDETAILSCLINIC.bind(this));
        this.router.get("/GETITEMDETAILS", authenticateToken, this.GETITEMDETAILS.bind(this));
        this.router.get("/getStore_Activities", authenticateToken, this.getStore_Activities.bind(this));
        this.router.put("/Update_UserStores", authenticateToken, this.updateClinicUsers.bind(this));


    }


    async GETITEMDETAILSCLINIC(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `select CLINIC_CODE, CLINIC_NAME,STATUS from tm_clinics  order by CLINIC_CODE`;

            const { records } = await executeDbQuery(sqlQuery);

            const clinicToUser = records.map((row: any) => ({
                STOREID: row.CLINIC_CODE ?? "",
                STORENAME: row.CLINIC_NAME ?? "",
                Status: row.STATUS ?? "",
            }));

            res.json({ status: 0, d: clinicToUser });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async GETITEMDETAILS(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `select USERID, USERNAME ,PASSWORD,STATUS from Mst_UserDetails   order by USERID`;

            const { records } = await executeDbQuery(sqlQuery);

            const clinicToUser = records.map((row: any) => ({
                USERID: row.USERID ?? "",
                USERNAME: row.USERNAME ?? "",
                PASSWORD: row.PASSWORD ?? "",
                Status: row.STATUS ?? "",
            }));

            res.json({ status: 0, d: clinicToUser });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getStore_Activities(req: Request, res: Response): Promise<void> {

        const input = req.method === "GET" ? req.query : req.body;

        try {
            const sqlQuery = `SELECT USERID FROM MST_CLINICTOUSERLINK where CLINICID=@Store_Code`;

            const { records } = await executeDbQuery(sqlQuery, { Store_Code: input.Store_Code });

            const clinicToUser = records.map((row: any) => ({
                Store_ID: row.USERID ?? ""
            }));

            res.json({ status: 0, d: clinicToUser });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async updateClinicUsers(req: Request, res: Response): Promise<void> {
        const input = req.body;
        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            await executeDbQuery(`DELETE FROM MST_CLINICTOUSERLINK WHERE CLINICID = @ClinicId`, { ClinicId: input.clinicId }, { transaction });

            const UserdIds = input.userIds;

            if (Array.isArray(UserdIds)) {
                for (const userId of UserdIds) {
                    await executeDbQuery(`INSERT INTO MST_CLINICTOUSERLINK (CLNORGCODE, CLINICID, USERID, CREATED_BY, CREATED_ON, Status) VALUES (@ClnOrgCode, @ClinicId, @UserId, @CreatedBy, GETDATE(), 'A')`, { ClnOrgCode: input.HospitalId, ClinicId: input.clinicId, UserId: userId, CreatedBy: input.Edited_By }, { transaction });

                    await executeDbQuery(`UPDATE MST_USERDETAILS SET HOSPITALNAME = @ClinicId, CLNORGCODE = @ClinicId WHERE USERID = @UserId`, { ClinicId: input.clinicId, UserId: userId }, { transaction });
                }
            }

            await transaction.commit();

            res.json({ status: 0, message: "Data Updated Successfully" });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}