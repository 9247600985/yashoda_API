import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
const atob = (str: string) => Buffer.from(str, "base64").toString("utf-8");
const btoa = (str: string) => Buffer.from(str, "utf-8").toString("base64");

function isBase64(str: string) {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}


export default class mastersController {
  private router: Router = express.Router();

  constructor(private app: Application) {
    app.use("/api/masters", this.router);

    this.router.get("/BindSalutaions", this.BindSalutaions.bind(this));
    this.router.get("/TwoField", this.TwoField.bind(this));

  }

  async BindSalutaions(req: Request, res: Response): Promise<void> {
    const sql = `SELECT SAL_CODE,SAL_DESC FROM MST_SALUTATION WHERE STATUS='A' ORDER BY SAL_CODE`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

  async TwoField(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    // Decode input if base64
    const rawTableName = input.TableName as string;
    const rawIdFiled = input.IdFiled as string;
    const rawDescField = input.DescField as string;
    const rawWhereCond = input.WhereCond as string;

    const TableName = isBase64(rawTableName) ? atob(rawTableName) : rawTableName;
    const IdFiled = isBase64(rawIdFiled) ? atob(rawIdFiled) : rawIdFiled;
    const DescField = isBase64(rawDescField) ? atob(rawDescField) : rawDescField;
    const WhereCondRaw = isBase64(rawWhereCond) ? atob(rawWhereCond) : rawWhereCond;

    // Other fields
    const searchvalue = input.searchvalue as string;
    const txtidfld = input.txtidfld as string;
    const txtdescfld = input.txtdescfld as string;
    const idfldName = input.idfldName as string;
    const descfldName = input.descfldName as string;

    // Strict whitelist — only allow known tables/fields
    const validTables: Record<string, { id: string; desc: string }> = {
      Mst_ReferralDoctor: { id: "RefDoct_ID", desc: "RefDoctor_FName" },
      Mst_ReferralAgents: { id: "Ref_ID", desc: "Ref_FName" },
      Mst_Country: { id: "Country_ID", desc: "Country_Name" },
      // add more here
    };

    const tableConfig = validTables[TableName];
    if (!tableConfig) {
      res.status(400).json({ status: 1, result: "Invalid table" });
      return;
    }

    // Make sure IdFiled and DescField match whitelist
    const safeIdField = tableConfig.id;
    const safeDescField = tableConfig.desc;

    // Safe WHERE: only allow status = 'A'
    let whereSQL = "";
    const params: Record<string, any> = {
      SearchValue: `%${searchvalue || ""}%`,
    };

    if (WhereCondRaw) {
      // Replace &quot; with '
      const cleaned = WhereCondRaw.replace(/&quot;/g, "'").trim().toLowerCase();

      // Example: allow only `status = 'A'` type checks
      if (/^status\s*=\s*'a'$/.test(cleaned)) {
        whereSQL = " AND status = 'A'";
      } else {
        res.status(400).json({ status: 1, result: "Invalid WHERE condition" });
        return;
      }
    }

    const sql = ` SELECT ${safeIdField} AS Code, ${safeDescField} AS Name FROM ${TableName} WHERE 1=1 AND ( ${safeIdField} LIKE @SearchValue OR UPPER(${safeDescField}) LIKE UPPER(@SearchValue) ) ${whereSQL} ORDER BY ${safeDescField} `;

    let tableHTML = `
    <thead style='width: 100%;'>
      <tr class='success'>
        <th style='text-align: left; width: 30%'>${idfldName}</th>
        <th style='text-align: left; width: 70%'>${descfldName}</th>
        <th style='display: none'>Desc</th>
        <th style='display: none'>Desc</th>
      </tr>
    </thead><tbody>
  `;

    try {
      const { records } = await executeDbQuery(sql, params);

      for (const row of records) {
        tableHTML += `
        <tr>
          <td style='text-align: left; width: 30%'>${row.Code}</td>
          <td style='text-align: left; width: 70%'>${row.Name}</td>
          <td style='display: none'>${txtidfld}</td>
          <td style='display: none'>${txtdescfld}</td>
        </tr>
      `;
      }
      tableHTML += "</tbody>";

      res.json({ status: 0, result: tableHTML });
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

}