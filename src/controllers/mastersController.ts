import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
import { decodeBase64, IsBase64 } from "../utilities/base64Utils";


export default class mastersController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);

    this.router.get("/BindSalutaions", this.BindSalutaions.bind(this));
    this.router.get("/TwoField", this.TwoField.bind(this));
    this.router.get("/TwoFieldInnerJoin", this.TwoFieldInnerJoin.bind(this));
    this.router.get("/LoadDropDowns", this.LoadDropDowns.bind(this));

  }

  async BindSalutaions(req: Request, res: Response): Promise<void> {
    const sql = `SELECT SAL_CODE,SAL_DESC FROM MST_SALUTATION WHERE STATUS='A' ORDER BY SAL_CODE`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async TwoField(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const rawTableName = input.TableName as string;
    const rawIdFiled = input.IdFiled as string;
    const rawDescField = input.DescField as string;
    const rawWhereCond = input.WhereCond as string;

    const TableName = IsBase64(rawTableName) ? atob(rawTableName) : rawTableName;
    const IdFiled = IsBase64(rawIdFiled) ? atob(rawIdFiled) : rawIdFiled;
    const DescField = IsBase64(rawDescField) ? atob(rawDescField) : rawDescField;
    const WhereCondRaw = IsBase64(rawWhereCond) ? atob(rawWhereCond) : rawWhereCond;

    const searchvalue = input.searchvalue as string;
    const txtidfld = input.txtidfld as string;
    const txtdescfld = input.txtdescfld as string;
    const idfldName = input.idfldName as string;
    const descfldName = input.descfldName as string;

    let whereSQL = "";
    const params: Record<string, any> = {
      SearchValue: `%${searchvalue || ""}%`,
    };

    if (WhereCondRaw) {
      const cleaned = WhereCondRaw.replace(/&quot;/g, "'").trim().toLowerCase();

      if (/^status\s*=\s*'a'(\s+and\s+(country_id|state_id|district_id|District_ID|CLNORGCODE)\s*=\s*'\w+')?$/i.test(cleaned)) {
        whereSQL = ` AND ${cleaned}`;
      } else {
        res.status(400).json({ status: 1, result: "Invalid WHERE condition" });
        return;
      }
    }

    const sql = ` SELECT ${IdFiled} AS Code, ${DescField} AS Name FROM ${TableName} WHERE 1=1 AND ( ${IdFiled} LIKE @SearchValue OR UPPER(${DescField}) LIKE UPPER(@SearchValue) ) ${whereSQL} ORDER BY ${DescField} `;

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
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async LoadDropDowns(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const rawTableName = input.TableName as string;
    const rawIdFiled = input.IdFiled as string;
    const rawDescField = input.DescField as string;
    const rawWhereCond = input.WhereCond as string;

    const TableName = IsBase64(rawTableName) ? atob(rawTableName) : rawTableName;
    const IdFiled = IsBase64(rawIdFiled) ? atob(rawIdFiled) : rawIdFiled;
    const DescField = IsBase64(rawDescField) ? atob(rawDescField) : rawDescField;
    let WhereCond = IsBase64(rawWhereCond) ? atob(rawWhereCond) : rawWhereCond;

    if (WhereCond) {
      WhereCond = WhereCond.replace(/&quot;/g, "'");
    }

    // Build query exactly like C#
    let query = `SELECT ${IdFiled}, ${DescField} FROM ${TableName}`;
    if (WhereCond && WhereCond.trim().length > 0) {
      query += ` WHERE ${WhereCond}`;
    }
    query += ` ORDER BY ${DescField}`;

    try {
      const { records } = await executeDbQuery(query);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });

    }
  }

  async TwoFieldInnerJoin(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const rawTableName = input.TableName as string;
    const rawIdFiled = input.IdFiled as string;
    const rawDescField = input.DescField as string;
    const rawWhereCond = input.WhereCond as string;
    const rawInnerJoin = input.InnerJoin as string;

    const TableName = IsBase64(rawTableName) ? atob(rawTableName) : rawTableName;
    const IdFiled = IsBase64(rawIdFiled) ? atob(rawIdFiled) : rawIdFiled;
    const DescField = IsBase64(rawDescField) ? atob(rawDescField) : rawDescField;
    const WhereCondRaw = IsBase64(rawWhereCond) ? atob(rawWhereCond) : rawWhereCond;
    const InnerJoinRaw = IsBase64(rawInnerJoin) ? atob(rawInnerJoin) : rawInnerJoin;

    const searchvalue = input.searchvalue as string;
    const txtidfld = input.txtidfld as string;
    const txtdescfld = input.txtdescfld as string;
    const idfldName = input.idfldName as string;
    const descfldName = input.descfldName as string;

    let whereSQL = "";
    const params: Record<string, any> = {
      SearchValue: `%${searchvalue || ""}%`,
    };

    if (WhereCondRaw) {
      const cleaned = WhereCondRaw.replace(/&quot;/g, "'").trim();
      whereSQL = ` AND ${cleaned}`;
    }

    const sql = ` SELECT ${IdFiled} AS Code, ${DescField} AS Name FROM ${TableName} ${InnerJoinRaw ? InnerJoinRaw.replace(/&quot;/g, "'") : ""} WHERE 1=1 AND ( ${IdFiled} LIKE @SearchValue OR UPPER(${DescField}) LIKE UPPER(@SearchValue) ) ${whereSQL} ORDER BY ${DescField} `;

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
      res.status(500).json({ status: 1, result: err.message });
    }
  }



}