import express,{Application,Request,Response,Router} from "express";
import { conpool,executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import sql,{query} from "mssql";
import { queryObjects } from "v8";
const moment=require('moment');
export default class moduleController {
    private router: Router = express.Router();
    constructor (private app:Router)
    {
        app.use("/modules",this.router);
        this.router.get("/getModulesCount",authenticateToken,this.getModulesCount.bind(this));
        this.router.post("/insertModule",authenticateToken,this.insertModule.bind(this));

        //  this.router.get("/TwoField", authenticateToken, this.TwoField.bind(this));
    }

   
    async  getModulesCount(req:Request,res:Response):Promise<void>{
        const sql=`select top 1 module_id From mst_modules order by Module_Id desc`;
        try{
            var result =await executeDbQuery(sql);
            var result1="00"+result;
             res.json({ status: 0, result: result1 });
        }
        catch(err:any)
        {
            res.status(500).json({status:1,result1:err.message});
        }
    }

    async insertModule(req:Request,res:Response):Promise<void>
{

}
}