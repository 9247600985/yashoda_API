import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";

export default class numberGenController {

    private router: Router = express.Router();

    constructor(private app: Router) {
        app.use("/noGen", this.router);

        this.router.get("/TMCurrNumber", this.getTMCurrNumber.bind(this));
        this.router.get("/CurrNumberWExt", this.GetCurrNumberWExt.bind(this));
    }

    async getTMCurrNumber(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;

        const sql = `DECLARE @RES VARCHAR(50); EXEC USP_GENERATE_DOCNO @CLNGCODE = @CLNGCODE, @DOCREFNO =  @DOCREFNO, @MODULEID = @MODULEID, @RESULT = @RES OUTPUT; SELECT @RES AS Result; `;

        try {
            const { records } = await executeDbQuery(sql, { CLNGCODE: input.hospitalId, DOCREFNO: input.prefix, MODULEID: "002" });

            const docNo = records?.[0]?.Result;

            if (docNo) {
                res.json({ status: 0, result: docNo });
            } else {
                res.json({ status: 1, result: "No number generated" });
            }
        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }

    async GetCurrNumberWExt(req: Request, res: Response): Promise<void> {
        const input = req.method === "GET" ? req.query : req.body;
        const hospitalId = input.hospitalId as string;
        const prefix = input.prefix as string;

        try {
           
            const sql = ` DECLARE @RES VARCHAR(50); EXEC USP_GENERATECOUNT_WEXT @prefix = @prefix, @CLNORGCODE = @CLNORGCODE, @finalnumber = @RES OUTPUT; SELECT @RES AS Result; `;

            const { records } = await executeDbQuery(sql, { prefix: input.prefix, CLNORGCODE: input.hospitalId });

            const finalNumber = records?.[0]?.Result;

            if (finalNumber) {
                res.json({ status: 0, result: finalNumber });
            } else {
                res.json({ status: 1, result: "No number generated" });
            }

        } catch (err: any) {
            res.status(500).json({ status: 1, result: err.message });
        }
    }


}