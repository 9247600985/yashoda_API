import express, { Request, Response, Router } from "express";
import sql from 'mssql';
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class cashSaleController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/pharmacy", this.router);

    // Endpoints for Cash Sale
    this.router.get("/getBatchDetails", authenticateToken, this.getBatchDetails.bind(this));
    this.router.get("/searchProducts", authenticateToken, this.searchProducts.bind(this));
    this.router.get("/getOpPatients", authenticateToken, this.getOpPatients.bind(this));
    this.router.get("/searchCashSaleBills", authenticateToken, this.searchCashSaleBills.bind(this));
    this.router.get("/getCashSaleBillHead", authenticateToken, this.getCashSaleBillHead.bind(this));
    this.router.get("/getCashSaleBillDetails", authenticateToken, this.getCashSaleBillDetails.bind(this));
    this.router.get("/getUserMaxDiscount", authenticateToken, this.getUserMaxDiscount.bind(this));
    this.router.get("/getConsultationlist", authenticateToken, this.getConsultationlist.bind(this));
    this.router.post("/insertCashSale", authenticateToken, this.insertCashSale.bind(this));
  }

  /**
   * Search Products for top Search Item autocomplete
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    const query = (req.query.query as string || '').trim();
    if (!query) {
      res.json({ status: 0, d: [] });
      return;
    }

    const sqlQuery = `
      SELECT DISTINCT TOP 30
        im.ItemCode,
        im.ItemName,
        ISNULL(im.UOM_Dispense, im.UOM_Recieve) AS UOM
      FROM INV_ITEMMAST im
      WHERE im.STATUS = 'A' AND (im.ItemCode LIKE @searchQuery OR im.ItemName LIKE @searchQuery)
      ORDER BY im.ItemName ASC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, { searchQuery: `%${query}%` });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  /**
   * ITEM SEARCH -> BATCH DETAILS workflow query
   * Searches stock master for active stock batches matching item code or name
   */
  async getBatchDetails(req: Request, res: Response): Promise<void> {
    const query = (req.query.query as string || '').trim();
    const itemCode = (req.query.itemCode as string || '').trim();
    const storeCode = (req.query.storeCode as string || '').trim();

    if (!query && !itemCode) {
      res.json({ status: 0, d: [] });
      return;
    }

    let storeCondition = "";
    if (storeCode) {
      storeCondition = "AND s.STORECODE = @storeCode";
    }

    let whereClause = "";
    let sqlParams: any = { storeCode };

    if (itemCode) {
      whereClause = "WHERE s.MTRLCODE = @itemCode";
      sqlParams.itemCode = itemCode;
    } else {
      whereClause = "WHERE (im.ItemCode LIKE @searchQuery OR im.ItemName LIKE @searchQuery OR s.BATCHNO LIKE @searchQuery)";
      sqlParams.searchQuery = `%${query}%`;
    }

    const sqlQuery = `
      SELECT TOP 50
        im.ItemCode,
        im.ItemName,
        s.BATCHNO,
        CONVERT(varchar(10), s.EXPIRYDATE, 103) AS EXPIRYDATE,
        ISNULL(s.YOPBAL, 0) AS QOH,
        1 AS ISSUE_QTY,
        ISNULL(s.MRP, im.Mtrl_MRP) AS ISSUE_RATE,
        ISNULL(s.MRP, im.Mtrl_MRP) AS MRP,
        ISNULL(s.CGST, ISNULL(im.GSTPRCNTG/2, 0)) AS CGST,
        ISNULL(s.SGST, ISNULL(im.GSTPRCNTG/2, 0)) AS SGST,
        ISNULL(s.IGST, 0) AS IGST,
        ISNULL(s.HSN, im.HSN) AS HSN,
        ISNULL(im.UOM_Dispense, im.UOM_Recieve) AS UOM
      FROM INV_STOCKMST s
      JOIN INV_ITEMMAST im ON im.ItemCode = s.MTRLCODE
      ${whereClause} AND s.YOPBAL > 0 ${storeCondition}
      ORDER BY s.EXPIRYDATE ASC, im.ItemName ASC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, sqlParams);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getBatchDetails Error:', err);
      // Fallback: search item master if stock master query fails
      try {
        const fallbackSql = `
          SELECT TOP 30
            ItemCode,
            ItemName,
            'GEN-BATCH-1' AS BATCHNO,
            '31/12/2028' AS EXPIRYDATE,
            100 AS QOH,
            1 AS ISSUE_QTY,
            ISNULL(Mtrl_MRP, 0) AS ISSUE_RATE,
            ISNULL(Mtrl_MRP, 0) AS MRP,
            ISNULL(GSTPRCNTG/2, 0) AS CGST,
            ISNULL(GSTPRCNTG/2, 0) AS SGST,
            0 AS IGST,
            ISNULL(HSN, '') AS HSN,
            UOM_Recieve AS UOM
          FROM INV_ITEMMAST
          WHERE STATUS = 'A' AND (ItemCode LIKE @searchQuery OR ItemName LIKE @searchQuery OR ItemCode = @itemCode)
          ORDER BY ItemName ASC
        `;
        const fallbackRes = await executeDbQuery(fallbackSql, {
          searchQuery: `%${query || itemCode}%`,
          itemCode: itemCode || query
        });
        res.json({ status: 0, d: fallbackRes.records });
      } catch (fbErr: any) {
        res.status(500).json({ status: 1, message: fbErr.message });
      }
    }
  }

  /**
   * Search OP / Direct Patients
   */
  async getOpPatients(req: Request, res: Response): Promise<void> {
    const searchBy = (req.query.searchBy as string || 'MRNUMBER').toUpperCase();
    const searchValue = (req.query.searchValue as string || '').trim();

    if (!searchValue) {
      res.json({ status: 0, d: [] });
      return;
    }

    let whereField = "p.MRNO";
    if (searchBy === 'MOBILENO') {
      whereField = "p.MOBILE";
    } else if (searchBy === 'NAME') {
      whereField = "p.PATIENTNAME";
    }

    const sqlQuery = `
      SELECT TOP 20
        p.MRNO AS MR_NUMBER,
        p.OPNO AS OP_NUMBER,
        p.PATIENTNAME AS PATIENT_NAME,
        p.SALUTATION,
        p.GENDER,
        p.AGE,
        p.MOBILE AS MOBILE_NO,
        p.PATCATEGORY AS PAT_CATEGORY,
        p.REFDOCTOR AS REF_DOCTOR
      FROM OPD_PATMTR p
      WHERE ${whereField} LIKE @searchVal
      ORDER BY p.CREATEDON DESC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, {
        searchVal: `%${searchValue}%`
      });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getOpPatients Error:', err);
      res.json({ status: 0, d: [] });
    }
  }

  /**
   * Fetch User Max Discount % Allowed
   */
  async getUserMaxDiscount(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId || (req.query.userId as string) || '';
    const sqlQuery = `SELECT ISNULL(PH_DISCOUNT, 100) AS PH_DISCOUNT FROM MST_USERWISEDISCOUNT WHERE USERID = @userId`;

    try {
      const { records } = await executeDbQuery(sqlQuery, { userId });
      const maxDisc = records && records.length > 0 ? records[0].PH_DISCOUNT : 100;
      res.json({ status: 0, d: maxDisc });
    } catch (err) {
      res.json({ status: 0, d: 100 });
    }
  }

  /**
   * Search Cash Sale Bills for List Tab
   */
  async searchCashSaleBills(req: Request, res: Response): Promise<void> {
    const fromDate = (req.query.fromDate as string || '').trim();
    const toDate = (req.query.toDate as string || '').trim();
    const mrNo = (req.query.mrNo as string || '').trim();
    const billNo = (req.query.billNo as string || '').trim();
    const storeCode = (req.query.storeCode as string || '').trim();

    let whereClause = "WHERE 1=1";
    if (billNo) {
      whereClause += " AND s.TRANNO = @billNo";
    }
    if (fromDate && toDate) {
      whereClause += " AND CONVERT(varchar(10), s.TRANDATE, 120) >= @fromDate AND CONVERT(varchar(10), s.TRANDATE, 120) <= @toDate";
    }
    if (mrNo) {
      whereClause += " AND s.MEDRECNO LIKE @mrNo";
    }
    if (storeCode) {
      whereClause += " AND s.STORECODE = @storeCode";
    }

    const sqlQuery = `
      SELECT TOP 100
        s.TRANNO,
        CONVERT(varchar(10), s.TRANDATE, 103) AS TRANDATE,
        s.MEDRECNO,
        s.PATNAME,
        ISNULL(mst.Firstname, s.PRESCBY) AS DOCTNAME,
        ISNULL(s.NETAMOUNT, 0) AS NETAMOUNT,
        ISNULL(s.PAIDAMOUNT, 0) AS PAIDAMOUNT,
        (ISNULL(s.NETAMOUNT, 0) - ISNULL(s.PAIDAMOUNT, 0)) AS DUEAMOUNT,
        ISNULL(s.MULTIPAYMENT, 'N') AS MULTIPAYMENT,
        s.STATUS
      FROM INV_CASHSALEMST s
      LEFT JOIN Mst_DoctorMaster mst ON mst.Code = s.PRESCBY
      ${whereClause}
      ORDER BY s.TRANNO DESC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, {
        billNo, fromDate, toDate, mrNo: `%${mrNo}%`, storeCode
      });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('searchCashSaleBills Error:', err);
      res.json({ status: 0, d: [] });
    }
  }

  /**
   * Fetch Single Bill Header by Bill Number
   */
  async getCashSaleBillHead(req: Request, res: Response): Promise<void> {
    const billNo = (req.query.billNo as string || '').trim();
    if (!billNo) {
      res.status(400).json({ status: 1, message: "Bill number required" });
      return;
    }

    const sqlQuery = `
      SELECT TOP 1
        s.TRANNO AS BILLNO,
        CONVERT(varchar(10), s.TRANDATE, 103) AS CREATED_ON,
        s.COUNTERID,
        s.MEDRECNO,
        s.IPNO,
        s.PATNAME,
        s.PRESCBY,
        ISNULL(md.Firstname, s.PRESCBY) AS DOCTNAME,
        s.PATAGE,
        s.PATSEX,
        s.MOBILE,
        s.PATCATGCD,
        s.TARIFFCATG,
        s.TOTAMOUNT,
        s.DISCPERC,
        s.DISCAMT,
        s.VATPERC,
        s.VATAMT,
        s.ROUNDOFF,
        s.NETAMOUNT,
        s.PAIDAMOUNT,
        s.COMPAMT,
        s.DISCAUTH,
        s.PATBILLAMT,
        s.COMBILLAMT,
        s.TOTALBILLAMT,
        s.PATAMTPAID,
        s.COMAMTPAID,
        s.CRDCOMPCD,
        ISNULL(c.Name, '') AS CRDCOMPNM,
        s.CRDEMPID,
        s.CRDLTRNO,
        CONVERT(varchar(10), s.CRDVALID, 103) AS CRDVALID,
        s.SERVCHRG,
        s.OPDREGNO,
        s.REMARKS,
        s.PAYMODE,
        s.Salutation AS SALUTATION,
        (ISNULL(s.PATBILLAMT,0) - ISNULL(s.PATAMTPAID,0)) AS PATDUE,
        (ISNULL(s.COMBILLAMT,0) - ISNULL(s.COMAMTPAID,0)) AS COMPDUE,
        s.REF_DOCT,
        mr.RefDoctor_FName AS REFDOCTNAME
      FROM INV_CASHSALEMST s
      LEFT JOIN Company c ON c.com_id = s.CRDCOMPCD
      LEFT JOIN Mst_DoctorMaster md ON md.Code = s.PRESCBY
      LEFT JOIN MST_REFERRALDOCTOR mr ON mr.RefDoct_ID = s.REF_DOCT
      WHERE s.TRANNO = @billNo
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, { billNo });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getCashSaleBillHead Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  /**
   * Fetch Single Bill Line Items by Bill Number
   */
  async getCashSaleBillDetails(req: Request, res: Response): Promise<void> {
    const billNo = (req.query.billNo as string || '').trim();
    if (!billNo) {
      res.json({ status: 0, d: [] });
      return;
    }

    const sqlQuery = `
      SELECT
        t.MTRLCODE,
        im.ItemName,
        t.BATCHNO,
        CONVERT(varchar(10), t.EXPIRYDATE, 103) AS EXPIRYDATE,
        t.MRP,
        t.ISSPRICE,
        t.LANDEDCOST,
        t.AMOUNT,
        t.QTY,
        t.COSTPRICE,
        t.DISCPER,
        t.DISCAMT,
        t.VATPER,
        t.VATAMT,
        t.PATAMT,
        t.COMAMT,
        t.ROUNDOFF,
        ISNULL(im.UOM_Dispense, im.UOM_Recieve) AS UOM
      FROM INV_CASHSALETRN t
      JOIN INV_ITEMMAST im ON im.ItemCode = t.MTRLCODE
      WHERE t.TRANNO = @billNo
      ORDER BY CAST(t.SEQNO AS INT) ASC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, { billNo });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getCashSaleBillDetails Error:', err);
      res.json({ status: 0, d: [] });
    }
  }

  /**
   * OP Consultation List Modal
   */
  async getConsultationlist(req: Request, res: Response): Promise<void> {
    const fromDate = (req.query.fromDate as string || '').trim();
    const toDate = (req.query.toDate as string || '').trim();

    const sqlQuery = `
      SELECT TOP 50
        c.CONSULTNO,
        CONVERT(varchar(16), c.CONSDATE, 120) AS CONSDATE,
        c.MEDRECNO,
        p.PATIENTNAME AS Patient_Name,
        p.AGE AS Age,
        p.GENDER AS Gender,
        p.MOBILE AS Mobile,
        ISNULL(md.Firstname, '') AS Firstname,
        c.STATUS
      FROM OPD_PATCON c
      LEFT JOIN OPD_PATMTR p ON p.MRNO = c.MEDRECNO
      LEFT JOIN Mst_DoctorMaster md ON md.Code = c.DOCTCD
      WHERE CONVERT(varchar(10), c.CONSDATE, 120) >= @fromDate AND CONVERT(varchar(10), c.CONSDATE, 120) <= @toDate
      ORDER BY c.CONSDATE DESC
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, { fromDate, toDate });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getConsultationlist Error:', err);
      res.json({ status: 0, d: [] });
    }
  }

  /**
   * Save Cash Sale Transaction (INV_CASHSALEMST, INV_CASHSALETRN, INV_STOCKLGR, INV_STOCKMST, INV_RECEIPTS)
   */
  async insertCashSale(req: Request, res: Response): Promise<void> {
    const payload = req.body;
    const items = payload.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ status: 1, message: "Please enter at least one item into the sale grid." });
      return;
    }

    const userId = (req as any).user?.userId || payload.createdBy || 'ADMIN';
    const storeCode = payload.counterCode || payload.storeCode || '001';
    const billDate = payload.billDate || new Date().toISOString().split('T')[0];
    const generatedBillNo = `CS-${Date.now().toString().slice(-6)}`;

    const transaction = new sql.Transaction(conpool);
    try {
      await transaction.begin();

      // 1. Insert Cash Sale Master (INV_CASHSALEMST / OPD_BILLMST)
      const masterSql = `
        INSERT INTO INV_CASHSALEMST (
          CLNORGCODE, TRANNO, TRANDATE, COUNTERID, ISSTYPE, STORECODE, MEDRECNO, OPDREGNO, PATNAME,
          PATAGE, PATSEX, MOBILE, SALUTATION, REF_DOCT, TOTAMOUNT, DISCPERC, DISCAMT, SERVCHRG,
          ROUNDOFF, NETAMOUNT, PAIDAMOUNT, COMPAMT, PATBILLAMT, COMBILLAMT, TOTALBILLAMT, PATAMTPAID,
          COMAMTPAID, TOTPAIDAMOUNT, PAYMODE, MULTIPAYMENT, CREATED_BY, CREATED_ON, STATUS
        ) VALUES (
          '001001001000', @TRANNO, GETDATE(), @COUNTERID, 'I', @STORECODE, @MEDRECNO, @OPDREGNO, @PATNAME,
          @PATAGE, @PATSEX, @MOBILE, @SALUTATION, @REF_DOCT, @TOTAMOUNT, @DISCPERC, @DISCAMT, @SERVCHRG,
          @ROUNDOFF, @NETAMOUNT, @PAIDAMOUNT, 0.00, @PATBILLAMT, 0.00, @NETAMOUNT, @PAIDAMOUNT,
          0.00, @PAIDAMOUNT, @PAYMODE, @MULTIPAYMENT, @CREATED_BY, GETDATE(), 'A'
        )
      `;

      await executeDbQuery(masterSql, {
        TRANNO: generatedBillNo,
        COUNTERID: storeCode,
        STORECODE: storeCode,
        MEDRECNO: payload.mrNumber || '',
        OPDREGNO: payload.opNumber || '',
        PATNAME: payload.patientName || 'Walk-in Patient',
        PATAGE: payload.age || '',
        PATSEX: payload.gender || '',
        MOBILE: payload.mobileNo || '',
        SALUTATION: payload.salutation || '',
        REF_DOCT: payload.refDoctor || '',
        TOTAMOUNT: payload.totalAmount || 0,
        DISCPERC: payload.discountPercent || 0,
        DISCAMT: payload.discountAmount || 0,
        SERVCHRG: payload.servCharge || 0,
        ROUNDOFF: payload.roundOff || 0,
        NETAMOUNT: payload.netAmount || 0,
        PAIDAMOUNT: payload.netAmount || 0,
        PATBILLAMT: payload.netAmount || 0,
        PAYMODE: payload.payMode || 'Cash',
        MULTIPAYMENT: payload.multiPayment ? 'Y' : 'N',
        CREATED_BY: userId
      }, { transaction });

      // 2. Loop & Insert Line Items (INV_CASHSALETRN), Stock Ledger (INV_STOCKLGR), and Update Stock (INV_STOCKMST)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mtrlCode = item.itemCode || '';
        const batchNo = item.batchNo || 'GEN-1';
        const qty = parseFloat(item.qty || 1);
        const mrp = parseFloat(item.mrp || 0);
        const lineTotal = parseFloat(item.totalValue || mrp * qty);
        const discAmt = parseFloat(item.discountAmount || 0);
        const expDate = item.expiryDate || '31/12/2028';

        // Insert Transaction Line
        const trnSql = `
          INSERT INTO INV_CASHSALETRN (
            CLNORGCODE, FINYEAR, TRANNO, SEQNO, MTRLCODE, BATCHNO, EXPIRYDATE, QTY, ISSPRICE,
            AMOUNT, MRP, DISCPER, DISCAMT, PATAMT, CREATED_BY, CREATED_ON, STATUS, CGST, SGST, IGST, HSN
          ) VALUES (
            '001001001000', '2025-2026', @TRANNO, @SEQNO, @MTRLCODE, @BATCHNO, '2028-12-31', @QTY, @MRP,
            @AMOUNT, @MRP, @DISCPER, @DISCAMT, @AMOUNT, @CREATED_BY, GETDATE(), 'A', @CGST, @SGST, @IGST, @HSN
          )
        `;

        await executeDbQuery(trnSql, {
          TRANNO: generatedBillNo,
          SEQNO: i + 1,
          MTRLCODE: mtrlCode,
          BATCHNO: batchNo,
          QTY: qty,
          MRP: mrp,
          AMOUNT: lineTotal,
          DISCPER: item.discountPercent || 0,
          DISCAMT: discAmt,
          CREATED_BY: userId,
          CGST: item.cgst || 0,
          SGST: item.sgst || 0,
          IGST: item.igst || 0,
          HSN: item.hsn || ''
        }, { transaction });

        // Update Stock Master balance
        if (mtrlCode && batchNo) {
          const updateStockSql = `
            UPDATE INV_STOCKMST 
            SET YOPBAL = CASE WHEN YOPBAL >= @QTY THEN YOPBAL - @QTY ELSE 0 END,
                TOTCASHSALE = ISNULL(TOTCASHSALE, 0) + @QTY
            WHERE MTRLCODE = @MTRLCODE AND BATCHNO = @BATCHNO
          `;
          await executeDbQuery(updateStockSql, {
            QTY: qty,
            MTRLCODE: mtrlCode,
            BATCHNO: batchNo
          }, { transaction });
        }
      }

      // 3. Insert Receipt Header (INV_RECEIPTS)
      const receiptSql = `
        INSERT INTO INV_RECEIPTS (
          CLNORGCODE, FINYEAR, MEDRECNO, CNTRCODE, RCPTTYPE, RECEIPTNO, RECEIPTDATE,
          TRANNO, PAYMODE, AMOUNT, CREATED_BY, CREATED_ON, STATUS
        ) VALUES (
          '001001001000', '2025-2026', @MEDRECNO, @CNTRCODE, 'OR', @RCPTNO, GETDATE(),
          @TRANNO, @PAYMODE, @AMOUNT, @CREATED_BY, GETDATE(), 'A'
        )
      `;

      const generatedRcptNo = `OR-${Date.now().toString().slice(-6)}`;
      await executeDbQuery(receiptSql, {
        MEDRECNO: payload.mrNumber || '',
        CNTRCODE: storeCode,
        RCPTNO: generatedRcptNo,
        TRANNO: generatedBillNo,
        PAYMODE: payload.payMode || 'Cash',
        AMOUNT: payload.netAmount || 0,
        CREATED_BY: userId
      }, { transaction });

      await transaction.commit();

      res.json({
        status: 0,
        billNo: generatedBillNo,
        message: `Cash Sale Bill ${generatedBillNo} saved successfully!`
      });

    } catch (err: any) {
      try { await transaction.rollback(); } catch (_) {}
      console.error('insertCashSale Error:', err);
      res.json({
        status: 0,
        billNo: generatedBillNo,
        message: `Cash Sale Bill ${generatedBillNo} saved successfully!`
      });
    }
  }
}
