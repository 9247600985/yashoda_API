import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql, { query } from "mssql";
import { queryObjects } from "v8";
const moment = require('moment');

export default class securityController {
    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/security", this.router);

        this.router.get("/getRoles", authenticateToken, this.getRolesDetails.bind(this));
        this.router.get("/getModules", authenticateToken, this.getModulesDetails.bind(this));
        this.router.get("/getEvents", authenticateToken, this.getEvents.bind(this));
        this.router.get("/getUsersByRole", authenticateToken, this.getUsersByRole.bind(this));
        this.router.get("/getActivitesByUserRole", authenticateToken, this.getActivitiesByUserRole.bind(this));
        this.router.get("/getActivityDetailsByModule", authenticateToken, this.getActivityDetailsByModule.bind(this));
        this.router.get("/getSub_Modules", authenticateToken, this.getSubModules.bind(this));
        this.router.get("/get_Activities", authenticateToken, this.getActivities.bind(this));
        this.router.post("/UpdateAccessRights", authenticateToken, this.UpdateAccessRights.bind(this));
    }

    async getRolesDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT CODE, ROLE, AdminType, Status FROM MST_ROLES WHERE STATUS = 'A'`;

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

    async getModulesDetails(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT Module_Id, Module_Name, Status FROM MST_MODULES WHERE STATUS = 'A'`;

            const { records } = await executeDbQuery(sqlQuery);

            const modules = records.map((row: any) => ({
                Module_Id: row.Module_Id ?? "",
                Module_Name: row.Module_Name ?? "",
                Status: row.Status ?? "",
            }));

            res.json({ status: 0, d: modules });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getEvents(req: Request, res: Response): Promise<void> {
        try {
            const sqlQuery = `SELECT EVENT_ID, EVENT_NAME, STATUS FROM MST_EVENTS WHERE STATUS = 'A' `;

            const { records } = await executeDbQuery(sqlQuery);

            const events = records.map((row: any) => ({
                Event_ID: row.EVENT_ID ?? "",
                Event_Name: row.EVENT_NAME ?? "",
                Status: row.STATUS ?? "",
            }));

            res.json({ status: 0, d: events });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getUsersByRole(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;

        try {

            const sqlQuery = `SELECT USERID, USERNAME FROM MST_USERDETAILS WHERE Roles = @Roles AND STATUS = 'A' `;

            const params = { Roles: input.Roles };

            const { records } = await executeDbQuery(sqlQuery, params);

            const users = records.map((row: any) => ({
                USERID: row.USERID ?? "",
                USERNAME: row.USERNAME ?? "",
            }));

            res.json({ status: 0, d: users });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getActivitiesByUserRole(req: Request, res: Response): Promise<void> {

        const input = req.body || req.query;
        try {

            const sqlQuery = `SELECT ACTIVITYID FROM Mst_AccessRights WHERE STATUS = 'A' AND PROFILEID = @Role_ID`;

            const params = { Role_ID: input.Role_ID };

            const { records } = await executeDbQuery(sqlQuery, params);

            const activities = records.map((row: any) => ({
                Activity_ID: row.ACTIVITYID ?? "",
            }));

            res.json({ status: 0, data: activities });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getActivityDetailsByModule(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        try {

            const sqlQuery = `SELECT A.Activity_Id,A.Activity_Name,A.Module_Id,M.Module_Name,A.PostbackURL, ISNULL(A.priorty,0) AS priorty,A.Status fROM MST_aCTIVITIES A INNER JOIN MST_MODULES M ON M.Module_Id = A.Module_Id  where A.Module_Id=@Module_Id`;

            const params = { Module_Id: input.Module_Id };

            const { records } = await executeDbQuery(sqlQuery, params);

            const activities = records.map((row: any) => ({
                Activity_Id: row.Activity_Id ?? "",
                Activity_Name: row.Activity_Name ?? "",
                Module_Id: `${row.Module_Id ?? ""}:${row.Module_Name ?? ""}`,
                Page_Reference: row.PostbackURL ?? "",
                Priority: Number(row.priorty ?? 0),
                Status: row.Status ?? "",
            }));

            res.json({ status: 0, d: activities });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getSubModules(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        try {


            const sqlQuery = `select act.Activity_Name, act.Activity_Id  from MST_Activities act where Module_Id = @ModuleId and act.Status = 'A' order by act.Activity_Id`;

            const params = { ModuleId: input.ModuleID };

            const { records } = await executeDbQuery(sqlQuery, params);

            const activities = records.map((row: any) => ({
                Activity_Id: row.Activity_Id ?? "",
                Activity_Name: row.Activity_Name ?? "",
                EVENTS: [],
            }));

            res.json({ status: 0, d: activities });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async getActivities(req: Request, res: Response): Promise<void> {

        const input = req.body || req.query;
        try {


            const sqlQuery = `select BTNSAVE,BTNUPDATE,BTNCANCEL,BTNPRINT,BTNVIEW,BTNSHOW,BTNSEARCH,BTNVERIFY,BTNDELIVERY,BTNPOST,BTNEXCEL,BTNUNPOST,ACTIVITYID from mst_accessrights where PROFILEID=@RoleId and MODULEID=@ModuleId order by ActivityId`;

            const params = { RoleId: input.RoleId, ModuleID: input.ModuleID };

            const { records } = await executeDbQuery(sqlQuery, params);

            const accessRights = records.map((row: any) => ({
                BTNSAVE: row.BTNSAVE ?? "",
                BTNUPDATE: row.BTNUPDATE ?? "",
                BTNCANCEL: row.BTNCANCEL ?? "",
                BTNPRINT: row.BTNPRINT ?? "",
                BTNVIEW: row.BTNVIEW ?? "",
                BTNSHOW: row.BTNSHOW ?? "",
                BTNSEARCH: row.BTNSEARCH ?? "",
                BTNVERIFY: row.BTNVERIFY ?? "",
                BTNDELIVERY: row.BTNDELIVERY ?? "",
                BTNPOST: row.BTNPOST ?? "",
                BTNEXCEL: row.BTNEXCEL ?? "",
                BTNUNPOST: row.BTNUNPOST ?? "",
                Activity_ID: row.ACTIVITYID ?? "",
            }));

            res.json({ status: 0, d: accessRights });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async UpdateAccessRights(req: Request, res: Response): Promise<void> {
        const inputArr = Array.isArray(req.body) ? req.body : [req.body];

        const transaction = new sql.Transaction(conpool);

        try {
            await transaction.begin();

            const first = inputArr[0];
            await executeDbQuery(`DELETE FROM MST_AccessRights WHERE PROFILEID = @RoleID AND MODULEID = @ModuleID`, { RoleID: first.RoleID, ModuleID: first.ModuleID }, { transaction });


            const insertq = `INSERT INTO MST_AccessRights(CLNORGCODE, PROFILEID, MODULEID, ACTIVITYID, BTNSAVE, BTNUPDATE, BTNCANCEL, BTNPRINT, BTNVIEW, BTNSHOW, BTNSEARCH, BTNVERIFY, BTNDELIVERY, BTNPOST, BTNEXCEL, BTNUNPOST, ACTIONATTR, Created_By, Created_On) values('001001001000', @RoleID, @ModuleID, @Activity, @Save, @Change, @Cancel, @Print, @View, @Show, @Search, @Verify, @Delivery, @Post, @Excel, @UnPost, 'N', @USER, GetDate())`;

            for (const item of inputArr) {
                const params = {
                    Clinic: item.Clinic,
                    RoleID: item.RoleID,
                    ModuleID: item.ModuleID,
                    Activity: item.Activity,
                    Save: item.Save,
                    Change: item.Change,
                    Cancel: item.Cancel,
                    Print: item.Print,
                    View: item.View,
                    Show: item.Show,
                    Search: item.Search,
                    Verify: item.Verify,
                    Delivery: item.Delivery,
                    Post: item.Post,
                    Excel: item.Excel,
                    UnPost: item.UnPost,
                    USER: item.USER,
                };

                await executeDbQuery(insertq, params, { transaction });
            }

            await transaction.commit();
            res.json({ status: 0, message: "access rights updated successfully." });
        } catch (err: any) {
            await transaction.rollback();
            res.status(500).json({ status: 1, message: err.message });
        }
    }

}