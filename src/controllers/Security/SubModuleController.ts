import express, { Application, Request, Response, Router } from "express";
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql from "mssql";
import { queryObjects } from "v8";

export default class SubModuleController {

    private router: Router = express.Router();
     constructor(private app: Router) {
         app.use("/submodule", this.router);
        this.router.get("/getSubModulesDetails", authenticateToken, this.getSubModulesDetails.bind(this));
        this.router.get("/getSubModuleCount", authenticateToken, this.getSubModuleCount.bind(this));
        this.router.post("/insertSubModule", authenticateToken, this.insertSubModule.bind(this));
        this.router.put("/updateSubModule", authenticateToken, this.updateSubModule.bind(this));
        this.router.put("/cancelSubModule", authenticateToken, this.cancelSubModule.bind(this));
     }

     async getSubModulesDetails(req:Request,res:Response){
        try{
            const sqlQuery=`SELECT Submodule_Id, Submodule_Name, STATUS
             
                FROM MST_SubModules 
                ORDER BY Submodule_Id`;
                const {records}= await executeDbQuery(sqlQuery);
                const data = records.map((row: any) => ({
                SubModule_Id: row.Submodule_Id ?? "",
                SubModule_Name: row.Submodule_Name ?? "",
                Status: row.STATUS ?? "A",
               
            }));
            res.json({status:0,d:data})
         }
         catch(err:any){
        res.status(500).json({status:1,message:err.message})
     }
    }
     async getSubModuleCount(req: Request, res: Response) {
        try {

            const { records } = await executeDbQuery(`
                SELECT TOP 1 Submodule_Id 
                FROM MST_SubModules 
                ORDER BY Submodule_Id DESC
            `);

            let nextId = "001";

            if (records.length > 0) {
                const lastId = parseInt(records[0].Submodule_Id);
                nextId = (lastId + 1).toString().padStart(3, "0");
            }

            res.json({ status: 0, d: { count: nextId } });

        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    
}
     async insertSubModule(req: Request, res: Response) {

        const { SubModuleId, SubModuleName, Status, Created_By } = req.body;

        try {

            const query = `
                INSERT INTO MST_SubModules
                (Submodule_Id, Submodule_Name, STATUS)
                VALUES (@SubModuleId, @SubModuleName, @Status)
            `;

            const result = await executeDbQuery(query, {
                SubModuleId,
                SubModuleName,
                Status,
                Created_By
            });

            res.json({
                status: 0,
                message: "Inserted Successfully",
                rowsAffected: result.rowsAffected[0]
            });

        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    

     }
     async updateSubModule(req: Request, res: Response) {

        const { SubModuleId, SubModuleName, Status } = req.body;

        try {

            const query = `
                UPDATE MST_SubModules
                SET Submodule_Name = @SubModuleName,
                    STATUS = @Status
                   
                WHERE Submodule_Id = @SubModuleId
            `;

            const result = await executeDbQuery(query, {
                SubModuleId,
                SubModuleName,
                Status,
               
            });

            res.json({
                status: 0,
                message: "Updated Successfully",
                rowsAffected: result.rowsAffected[0]
            });

        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    // ================= CANCEL (SOFT DELETE) =================
    async cancelSubModule(req: Request, res: Response) {

        const { SubModuleId, Status } = req.body;

        try {

            const query = `
                UPDATE MST_SubModules
                SET STATUS = @Status
                WHERE Submodule_Id = @SubModuleId
            `;

            const result = await executeDbQuery(query, {
                SubModuleId,
                Status
            });

            res.json({
                status: 0,
                message: "Status Updated",
                rowsAffected: result.rowsAffected[0]
            });

        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }


}