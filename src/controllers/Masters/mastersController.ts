import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import { IsBase64 } from "../../utilities/base64Utils";
import sql from "mssql";
import { authenticateToken } from "../../utilities/authMiddleWare";


export default class mastersController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);

    this.router.get("/BindSalutaions", authenticateToken, this.BindSalutaions.bind(this));
    this.router.get("/TwoField", authenticateToken, this.TwoField.bind(this));
    this.router.get("/TwoFieldInnerJoin", authenticateToken, this.TwoFieldInnerJoin.bind(this));
    this.router.get("/LoadDropDowns", authenticateToken, this.LoadDropDowns.bind(this));
    this.router.get("/GenderFromSalutation", authenticateToken, this.getGenderFromSalutation.bind(this));
    this.router.get("/AgeCalculation1", authenticateToken, this.getAgeCalculation1.bind(this));
    this.router.get("/AgeCalculation", authenticateToken, this.getAgeCalculation.bind(this));
    this.router.get("/loadRevision", authenticateToken, this.loadRevision.bind(this));
    this.router.get("/getHospData", authenticateToken, this.getHospData.bind(this));
    this.router.get("/getHospDataByCounter", authenticateToken, this.getHospDataByCounter.bind(this));

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

  async getGenderFromSalutation(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const sql = `SELECT COALESCE(SAL_SEX,'') GENDER FROM MST_SALUTATION WHERE SAL_CODE=@SALCODE`;
    const params = { SALCODE: input.SalutainID }
    try {
      const { records } = await executeDbQuery(sql, params);
      res.json({ status: 0, result: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getAgeCalculation(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {
      const spName = "USP_CALCULATEAGE";
      const sql = `EXEC ${spName} @FromDate=@FromDate, @ToDate=@ToDate`;

      const params = {
        FromDate: input.FromDate,
        ToDate: input.ToDate
      };

      const { records } = await executeDbQuery(sql, params);

      const appointments = records.map((r: any) => ({
        years: r.Years?.toString() ?? "",
        Months: r.Months?.toString() ?? "",
        Days: r.Days?.toString() ?? ""
      }));

      res.json({ status: 0, result: appointments });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getAgeCalculation1(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    try {
      const sql1 = `SELECT DATEADD(YEAR, -CAST(@Years AS INT), @ToDate) AS YearDate`;
      const params1 = {
        Years: parseInt(input.Years, 10),
        ToDate: new Date(input.ToDate)
      };

      const { records: records1 } = await executeDbQuery(sql1, params1);
      const YearDate = records1[0].YearDate;

      const sql2 = `SELECT DATEADD(MONTH, -CAST(@Months AS INT), @YearDate) AS MonthDate`;
      const params2 = {
        Months: parseInt(input.Months, 10),
        YearDate: YearDate
      };

      const { records: records2 } = await executeDbQuery(sql2, params2);
      const MonthDate = records2[0].MonthDate;

      const sql3 = `SELECT FORMAT(DATEADD(DAY, -CAST(@Days AS INT), @MonthDate), 'dd/MM/yyyy') AS DateOfBirth `;
      const params3 = {
        Days: parseInt(input.Days, 10),
        MonthDate: MonthDate
      };

      const { records: records3 } = await executeDbQuery(sql3, params3);
      const DateOfBirth = records3[0].DateOfBirth;

      res.json({ status: 0, result: DateOfBirth });
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
      const cleaned = WhereCondRaw.replace(/&quot;/g, "'").trim();
      const upper = cleaned.toUpperCase();

      // Disallow any DML/DDL keywords
      const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "MERGE", "UNION"];
      if (forbidden.some(word => upper.includes(word))) {
        res.status(400).json({ status: 1, result: "Invalid WHERE condition" });
        return;
      }

      whereSQL = ` AND ${cleaned}`;
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

  async LoadDropDowns(req: Request, res: Response) {
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
      WhereCond = WhereCond.replace(/&quot;/g, "'").trim();

      const upper = WhereCond.toUpperCase();
      const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "MERGE", "UNION"];
      if (forbidden.some(word => upper.includes(word))) {
        res.status(400).json({ status: 1, result: "Invalid WHERE condition" });
        return;
      }
    }

    let query = `SELECT ${IdFiled} AS idField, ${DescField} AS descField FROM ${TableName}`;
    if (WhereCond && WhereCond.trim().length > 0) {
      query += ` WHERE ${WhereCond}`;
    }
    query += ` ORDER BY ${DescField}`;

    try {
      const { records } = await executeDbQuery(query);

      const mapped = records.map(row => ({
        "__type": "EmptyMaterialTemplate.Login+DropDownObjects",
        idField: row.idField ?? "",
        descField: (row.descField ?? "").trim(),
        TableName: TableName,
        WhereCond: WhereCond
      }));

      res.json({ d: mapped });

    } catch (err: any) {
      res.status(500).json({ d: [], error: err.message });
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
      const upper = cleaned.toUpperCase();

      // Disallow any DML/DDL keywords
      const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "MERGE", "UNION"];
      if (forbidden.some(word => upper.includes(word))) {
        res.status(400).json({ status: 1, result: "Invalid WHERE condition" });
        return;
      }

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

  async loadRevision(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;

    const sql = `select distinct SEQID,TARIFFID,Revision_id,TARIFFDISCPERC  from MST_COMPRULETRN where COMPRULEGRP='TBP' and CRDCOMPCODE=@compId  order by SEQID asc`;
    const params = { compId: input.compId };

    try {
      const { records } = await executeDbQuery(sql, params);

      let sb = `
      <thead>
        <tr>
          <th>S.No</th>
          <th>TariffId</th>
          <th>RevisionId</th>
          <th>TariffDiscount</th>
        </tr>
      </thead>
      <tbody>
    `;

      records.forEach((row: any) => {
        sb += `
        <tr>
          <td>${row.SEQID}</td>
          <td>${row.TARIFFID}</td>
          <td>${row.Revision_id}</td>
          <td>${row.TARIFFDISCPERC}</td>
        </tr>
      `;
      });

      sb += "</tbody>";

      // Return same structure as ASP.NET (response.d)
      res.json({ d: sb });

    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getHospData(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    try {
      const hospitalId = input.HospitalId || "";

      if (!hospitalId) {
        res.status(401).json({ status: 1, result: "HospitalId not found in session" });
        return;
      }

      const sql = "EXEC sp_getHospitalId @hospitalId=@hospitalId";
      const params = { hospitalId };

      const { records } = await executeDbQuery(sql, params);

      const listHospAddress = records.map((r: any) => ({
        Hospital_Id: r.Hospital_Id || "",
        HospitalName: r.HospitalName || "",
        address1: r.address1 || "",
        address2: r.address2 || "",
        address3: r.address3 || "",
        Phone_No: r.Phone_No || "",
        EMail: r.EMail || "",
        Website: r.Website || "",
        Photo: r.photo || "",
        NanoName: r.NanoName || "",
        GstNo: r.GSTNO || "",
        DlNo: r.DLNO || ""
      }));

      res.json({ status: 0, d: listHospAddress });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async getHospDataByCounter(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    let counterId = input.counterId || "";
    const hospitalId = input.HospitalId || "";

    try {
      const specialCharRegex = /[^a-zA-Z0-9_-]/;
      if (specialCharRegex.test(counterId)) {
        res.status(401).json({ status: 1, d: [], result: "Invalid counterId" });
        return;
      }
      if (counterId === "") {
        counterId = "OP1";
      }

      const sql = `select HEADERNAME,NANONAME,ADDRESS,MOBILE,EMAIL from mst_cashcounter where CashCounter_Code=@CashCounter_Code and CLNORGCODE=@CLNORGCODE and Status='A'`;

      const params = { counterId, hospitalId };

      const { records } = await executeDbQuery(sql, params);

      const listHospAddress = records.map((r: any) => ({
        HospitalName: r.HEADERNAME || "",
        Phone_No: r.MOBILE || "",
        EMail: r.EMAIL || "",
        NanoName: r.NANONAME || "",
        address1: r.ADDRESS || "",
      }));

      res.json({ status: 0, d: listHospAddress });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

}

export async function fetchCurrentFinYear() {
  const sql = ` SELECT FinYear FROM Mst_AccYear WHERE OpenStatus = 'o' AND CurrentFinancialYear = 'y'  `;

  const { records } = await executeDbQuery(sql, {});
  return records[0].FinYear;
}

export async function fetchCurrentNumber(input: { hospitalId: string; type: string; ModuleId: string }, transaction?: sql.Transaction) {
  const sqlText = ` DECLARE @RES VARCHAR(50); EXEC USP_GENERATE_DOCNO @CLNGCODE = @CLNGCODE, @DOCREFNO = @DOCREFNO, @MODULEID = @MODULEID, @RESULT = @RES OUTPUT; SELECT @RES AS DocNo; `;

  const params = { CLNGCODE: input.hospitalId, DOCREFNO: input.type, MODULEID: input.ModuleId, };

  const out = await executeDbQuery(sqlText, params, { transaction });
  // console.log(out.records?.[0]?.DocNo);
  return out.records?.[0]?.DocNo ?? null;
}



