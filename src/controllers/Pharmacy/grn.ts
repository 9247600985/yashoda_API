import express, { Request, Response, Router } from "express";
import sql from 'mssql';
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class grnController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/pharmacy", this.router);

    // Endpoints
    this.router.get("/searchItems", authenticateToken, this.searchItems.bind(this));
    this.router.get("/getGrnList", authenticateToken, this.getGrnList.bind(this));
    this.router.post("/insertGrn", authenticateToken, this.insertGrn.bind(this));
    this.router.post("/updateGrn", authenticateToken, this.updateGrn.bind(this));
    this.router.get("/getHospitalStateCode", authenticateToken, this.getHospitalStateCode.bind(this));
    this.router.get("/getStoresByHospital", authenticateToken, this.getStoresByHospital.bind(this));
  }

  // ── SEARCH ITEMS DYNAMICALLY (TOP 50) ───────────────────────────────────
  async searchItems(req: Request, res: Response): Promise<void> {
    const query = (req.query.query as string || '').trim();
    const field = req.query.field as string || 'name'; // 'code' or 'name'

    let whereClause = "";
    if (query) {
      if (field === 'code') {
        whereClause = "WHERE im.ItemCode LIKE @searchQuery";
      } else {
        whereClause = "WHERE im.ItemName LIKE @searchQuery";
      }
    }

    const sqlStr = `
      SELECT TOP 50 
        Item_ID, ItemCode, ItemName, Item_Desc, GrpMst_ID,
        SubGrpMst_ID, im.Category_ID, cm.Category_Name, im.GenericId, 
        ISNULL(gm.GENERICNAME,'') AS GENERICNAME, MaterialType,
        ItemsClassification, Store_ID, im.UOM_Recieve, ISNULL(uom.UOM_NAME, im.UOM_Recieve) AS UOM_Recieve_Name, UOM_Storage, UOM_Dispense, 
        Is_BatchYN, VEDClassification, Is_IssueAllowed, VAT, CST, im.CREATED_BY, 
        im.CREATED_ON, im.EDITED_BY, im.EDITED_ON, im.STATUS, Manufact_ID, 
        Material_Cost, Mtrl_MRP, im.CLNORGCODE, Is_DecimalQtyAllowed, 
        Is_ReusableItem, LEADTIME, RACK, SHELF, MATERIALCLS, SCHEDULE, 
        SKU, HSN, GSTPRCNTG, ITEM_TYPE, ISNULL(IsMedical,'N') AS IsMedical, THRESHOLD 
      FROM INV_ITEMMAST im
      LEFT JOIN Category_Master cm ON cm.Category_ID = im.Category_ID
      LEFT JOIN INV_GENERICS gm ON gm.GENERICID = im.GenericId
      LEFT JOIN MST_UnitOfMeasurement uom ON uom.UOM_ID = im.UOM_Recieve
      ${whereClause}
      ORDER BY im.ItemName
    `;

    try {
      const { records } = await executeDbQuery(sqlStr, { 
        searchQuery: `%${query}%` 
      });
      res.json({ status: 0, records });
    } catch (err: any) {
      console.error('searchItems Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ── GET HOSPITAL STATE CODE ───────────────────────────────────────────────
  async getHospitalStateCode(req: Request, res: Response): Promise<void> {
    const hospitalId = req.query.hospitalId as string;
    try {
      if (!hospitalId) {
        res.status(400).json({ status: 1, message: 'hospitalId required' });
        return;
      }
      const sqlStr = `SELECT LEFT(gstno, 2) AS StateCode FROM hospitalslist WHERE hospital_id = @hospitalId`;
      const { records } = await executeDbQuery(sqlStr, { hospitalId });
      res.json({ status: 0, StateCode: records.length ? (records[0].StateCode || '') : '' });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ── GET STORES BY HOSPITAL ──────────────────────────────────────────────
  async getStoresByHospital(req: Request, res: Response): Promise<void> {
    const hospitalId = req.query.hospitalId as string;
    try {
      if (!hospitalId) {
        res.status(400).json({ status: 1, message: 'hospitalId required' });
        return;
      }
      const sqlStr = `SELECT Store_Code, Store_Name FROM INV_STOREMST WHERE CLNORGCODE = @hospitalId AND STATUS = 'A' ORDER BY Store_Name`;
      const { records } = await executeDbQuery(sqlStr, { hospitalId });
      const mapped = records.map(r => ({ CODE: r.Store_Code, NAME: r.Store_Name }));
      res.json({ status: 0, d: mapped });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ── GET GRN LIST ────────────────────────────────────────────────────────
  async getGrnList(req: Request, res: Response): Promise<void> {
    const sqlStr = `
      SELECT 
        m.GRNNO as grnNo,
        CONVERT(varchar(10), m.GRNDATE, 23) as grnDate,
        v.vndrLng_Nm as vendorName,
        m.GRNStatus as grnStatus,
        m.PONO as referencePo,
        m.STATUS as status,
        m.STORECODE as store,
        m.CREATED_BY as createdBy,
        m.NETAMOUNT as netAmount,
        m.INVOICENO as invoiceNo,
        CONVERT(varchar(10), m.INVDATE, 23) as invoiceDate,
        m.CHALLANNO as doNo,
        CONVERT(varchar(10), m.CHALANDT, 23) as doDate,
        m.DEPTCODE as grnDepartment,
        m.REMARKS as remarks,
        m.DISCPERC as discountPct,
        m.CSTPERC as cstPct,
        m.FREIGHAMT as transportCharges,
        m.grn_paymode as grnPayMode,
        m.OTHRAMOUNT as otherCharges,
        m.CSHDISCPER as cashDiscountPct
      FROM INV_GRNMST m
      LEFT JOIN INV_VENDORDETAILS v ON m.VENDCODE = v.vndr_id
      ORDER BY m.CREATED_ON DESC
    `;

    try {
      const { records } = await executeDbQuery(sqlStr);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getGrnList Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ── INSERT GRN (TRANSACTION SAFE) ───────────────────────────────────────
  async insertGrn(req: Request, res: Response): Promise<void> {
    const data = req.body;
    const store = data.store || '001001001000';
    const storeCode = store.substring(0, 6);
    const userId = (req as any).user?.userId || '6453'; // Use token user or fallback

    const transaction = new sql.Transaction(conpool);
    try {
      await transaction.begin();

      // 1. Get active financial year
      const yearRes = await executeDbQuery(
        `SELECT top 1 FinYear FROM Mst_AccYear WHERE UPPER(OpenStatus)='O' AND UPPER(CurrentFinancialYear)='Y' AND CLNORGCODE = @CLNORGCODE`,
        { CLNORGCODE: store },
        { transaction }
      );
      const finYear = yearRes.records?.[0]?.FinYear;
      if (!finYear) throw new Error('Active financial year not found');

      // 2. Increment and get doc no reference
      const docNoRes = await executeDbQuery(
        `UPDATE MST_DOCNOREF 
         SET CURRENTNO = COALESCE(CURRENTNO, 0) + 1 
         OUTPUT INSERTED.PREFIX, INSERTED.CURRENTNO
         WHERE STATUS = 'A' AND DOCREFNAME = 'INV_GRNMST' AND FINYEAR = @FINYEAR AND CLNORGCODE = @CLNORGCODE`,
        { FINYEAR: finYear, CLNORGCODE: store },
        { transaction }
      );
      const docNoRef = docNoRes.records?.[0];
      if (!docNoRef) throw new Error('Document number reference not found for INV_GRNMST');

      const prefix = docNoRef.PREFIX || 'INV_GRN';
      const currentNo = docNoRef.CURRENTNO;

      // 3. Get hospital shortname
      const hospRes = await executeDbQuery(
        `SELECT SHORTNAME FROM HOSPITALSLIST WHERE Hospital_Id = @CLNORGCODE`,
        { CLNORGCODE: store },
        { transaction }
      );
      const shortName = hospRes.records?.[0]?.SHORTNAME || '';

      // 4. Construct GRNNO
      const grnNo = `${prefix}${shortName}${String(currentNo).padStart(6, '0')}`;

      // 5. Insert GRN Header (INV_GRNMST)
      const mstSql = `
        INSERT INTO INV_GRNMST (
          CLNORGCODE, FINYEAR, STORECODE, VENDCODE, GRNTYPE, GRNNO, GRNDATE, PONO, PODATE,
          DESTNATION, INVOICENO, INVDUEDATE, CHALLANNO, CHALANDT, ADDCHALAN, INVDATE,
          CREDPERIOD, TOTAMOUNT, DISCPERC, DISCAMOUNT, EXCISEDUTYPER, EXCISEDUTYAMT,
          EDUCESSPER, EDUCESSAMT, HEDUCESSPER, HEDUCESSAMT, CSTPERC, CSTAMOUNT,
          VATPERC, VATAMOUNT, IMPDTYPREC, IMPDTYAMT, INSURPREC, INSUREAMT,
          FREIGPREC, FREIGHAMT, PANDFPREC, PANDFAMT, LOADPREC, LOADAMT,
          OCTRAIPREC, OCTRAIAMT, CSHDISCPER, CSHDISCAMT, OTHRAMOUNT, LESSADD,
          LAAMOUNT, ROUNDFLAG, ROUNDOFF, NETAMOUNT, REMARKS, REMARKS1, POSTFLAG,
          DEPTCODE, CANREMARKS, ISSTOACCTS, ISSTOACDAT, ISSTOACCBY, PATTYPES,
          RCVDDATE, CURRCODE, EXCHRATE, EXCHDATE, ISSRCVDBY, ISSRCVDAT,
          CREATED_BY, CREATED_ON, EDITED_BY, EDITED_ON, VERISTATUS, VERIFIEDBY,
          VERIFIEDON, STATUS, CessPer, CessValue, GRNStatus, FileRefNo,
          INWARDNO, INWARDDT, DOCNAME, DOCATTACHED, grn_paymode, GST, GSTAMT
        ) VALUES (
          @CLNORGCODE, @FINYEAR, @STORECODE, @VENDCODE, @GRNTYPE, @GRNNO, @GRNDATE, @PONO, @PODATE,
          '', @INVOICENO, @INVDUEDATE, @CHALLANNO, @CHALANDT, '', @INVDATE,
          0, @TOTAMOUNT, @DISCPERC, @DISCAMOUNT, 0, 0,
          0, 0, 0, 0, @CSTPERC, @CSTAMOUNT,
          0, 0, 0, 0, 0, 0,
          0, @FREIGHAMT, 0, 0, 0, 0,
          0, 0, @CSHDISCPER, @CSHDISCAMT, @OTHRAMOUNT, '',
          0, '', @ROUNDOFF, @NETAMOUNT, @REMARKS, '', 'N',
          @DEPTCODE, '', 'N', '', '', '',
          @GRNDATE, '', 1, @GRNDATE, '', @GRNDATE,
          @CREATED_BY, GETDATE(), '', '1900-01-01', 'N', '',
          '1900-01-01', @STATUS, 0, 0, 'Pending', '',
          '', '1900-01-01', '', '', @grn_paymode, 0, 0
        )
      `;

      await executeDbQuery(mstSql, {
        CLNORGCODE: store,
        FINYEAR: finYear,
        STORECODE: storeCode,
        VENDCODE: data.vendorId,
        GRNTYPE: data.grnType,
        GRNNO: grnNo,
        GRNDATE: data.grnDate || new Date(),
        PONO: data.poNo || '',
        PODATE: data.poDate || '1900-01-01',
        INVOICENO: data.invoiceNo,
        INVDUEDATE: data.invoiceDate || new Date(),
        CHALLANNO: data.doNo || '',
        CHALANDT: data.doDate || '1900-01-01',
        INVDATE: data.invoiceDate || new Date(),
        TOTAMOUNT: parseFloat(data.totalValue || '0'),
        DISCPERC: parseFloat(data.discountPct || '0'),
        DISCAMOUNT: parseFloat(data.discountValue || '0'),
        CSTPERC: parseFloat(data.cstPct || '0'),
        CSTAMOUNT: parseFloat(data.cstValue || '0'),
        FREIGHAMT: parseFloat(data.transportCharges || '0'),
        CSHDISCPER: parseFloat(data.cashDiscountPct || '0'),
        CSHDISCAMT: parseFloat(data.cashDiscountValue || '0'),
        OTHRAMOUNT: parseFloat(data.otherCharges || '0'),
        ROUNDOFF: parseFloat(data.roundOff || '0'),
        NETAMOUNT: parseFloat(data.netAmount || '0'),
        REMARKS: data.remarks || '',
        DEPTCODE: data.grnDepartment || '',
        CREATED_BY: userId,
        STATUS: data.status || 'A',
        grn_paymode: data.grnPayMode || 'C'
      }, { transaction });

      // 6. Insert items loop (INV_GRNTRN)
      if (Array.isArray(data.items)) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const seqNo = String(i + 1).padStart(3, '0');

          const trnSql = `
            INSERT INTO INV_GRNTRN (
              CLNORGCODE, FINYEAR, GRNNO, SEQNO, MTRLCODE, BATCHNO, MFRDATE, EXPDATE,
              QTYORD, QTYRCVD, FREQTYORD, FREEQTYREC, UNITCODE, PACKCOST, PACKMRP,
              COSTPRICE, MRP, EXCISEDUTYPER, EXCISEDUTYAMT, EDUCESSPER, EDUCESSAMT,
              HEDUCESSPER, HEDUCESSAMT, DISCPER, DISCAMT, CSTPER, CSTAMT,
              LSTPER, LSTAMT, LESSADDAMT, VATPERC, VATAMOUNT, IMPDTYPREC, IMPDTYAMT,
              INSUREAMT, PACKQTY, FREPACKQTY, CONVFACTOR, ITMTOTAL, CASHDISPER,
              CASHDISC, OTHERAMT, VATMRPPERC, PANDFPREC, INSUREPER, LOADPREC,
              OCTROIPREC, OCTRAIAMT, FREIGHTPRE, FREIGHTAMT, LOADAMT, PANDFAMT,
              ROUNDAMT, ITEMNETAMT, LANDEDCOST, ORGMRP, PURCHSTORE, DEPTCODE,
              REMARKS, RETQTY, WTAVGRATE, CREATED_BY, CREATED_ON, EDITED_BY,
              EDITED_ON, STATUS, CESSPER, CESSAMT, PURCHASEUNIT, PORATE,
              UnitCost, UnitLandedCost, HandlingCharges, OtherCharges, SALEPRICE,
              HSN, CGST, CGSTAMT, SGST, SGSTAMT, IGST, IGSTAMT, GRNSTATUS
            ) VALUES (
              @CLNORGCODE, @FINYEAR, @GRNNO, @SEQNO, @MTRLCODE, @BATCHNO, @MFRDATE, @EXPDATE,
              0, @QTYRCVD, 0, @FREEQTYREC, '', @PACKCOST, @PACKMRP,
              0, @PACKMRP, 0, 0, 0, 0,
              0, 0, @DISCPER, @DISCAMT, 0, 0,
              0, 0, 0, 0, 0, 0, 0,
              0, @QTYRCVD, @FREEQTYREC, @CONVFACTOR, @ITMTOTAL, 0,
              0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0,
              0, @ITEMNETAMT, @LANDEDCOST, @PACKMRP, @PURCHSTORE, @DEPTCODE,
              '', 0, 0, @CREATED_BY, GETDATE(), '',
              '1900-01-01', 'A', 0, 0, @PURCHASEUNIT, '',
              @UnitCost, @UnitLandedCost, 0, 0, @PACKMRP,
              @HSN, @CGST, @CGSTAMT, @SGST, @SGSTAMT, @IGST, @IGSTAMT, 'Pending'
            )
          `;

          await executeDbQuery(trnSql, {
            CLNORGCODE: store,
            FINYEAR: finYear,
            GRNNO: grnNo,
            SEQNO: seqNo,
            MTRLCODE: item.itemCode,
            BATCHNO: item.batchNo || 'N/A',
            MFRDATE: '1900-01-01',
            EXPDATE: item.expireDate || null,
            QTYRCVD: parseFloat(item.receivedQty || '0'),
            FREEQTYREC: parseFloat(item.freeQty || '0'),
            PACKCOST: parseFloat(item.packCost || '0'),
            PACKMRP: parseFloat(item.packMrp || '0'),
            DISCPER: parseFloat(item.discountPct || '0'),
            DISCAMT: parseFloat(item.discountAmount || '0'),
            CONVFACTOR: parseFloat(item.convFactor || '1'),
            ITMTOTAL: parseFloat(item.totalValue || '0'),
            ITEMNETAMT: parseFloat(item.totalValue || '0'),
            LANDEDCOST: parseFloat(item.landedCost || '0'),
            PURCHSTORE: storeCode,
            DEPTCODE: item.department || '',
            CREATED_BY: userId,
            PURCHASEUNIT: item.receiveUnit || '',
            UnitCost: parseFloat(item.unitCost || '0'),
            UnitLandedCost: parseFloat(item.unitLandedCost || '0'),
            HSN: item.hsnCode || '',
            CGST: parseFloat(item.cgstPct || '0'),
            CGSTAMT: parseFloat(item.cgstAmount || '0'),
            SGST: parseFloat(item.sgstPct || '0'),
            SGSTAMT: parseFloat(item.sgstAmount || '0'),
            IGST: parseFloat(item.igstPct || '0'),
            IGSTAMT: parseFloat(item.igstAmount || '0')
          }, { transaction });
        }
      }

      await transaction.commit();
      res.json({ status: 0, d: { grnNo } });
    } catch (err: any) {
      await transaction.rollback();
      console.error('insertGrn Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  // ── UPDATE GRN ──────────────────────────────────────────────────────────
  async updateGrn(req: Request, res: Response): Promise<void> {
    const data = req.body;
    const grnNo = data.grnNo;
    const userId = (req as any).user?.userId || '6453';

    if (!grnNo) {
      res.status(400).json({ status: 1, message: 'grnNo is required' });
      return;
    }

    const sqlStr = `
      UPDATE INV_GRNMST 
      SET 
        INVOICENO = @INVOICENO,
        INVDATE = @INVDATE,
        CHALLANNO = @CHALLANNO,
        CHALANDT = @CHALANDT,
        REMARKS = @REMARKS,
        DEPTCODE = @DEPTCODE,
        EDITED_BY = @EDITED_BY,
        EDITED_ON = GETDATE()
      WHERE GRNNO = @GRNNO
    `;

    try {
      const { rowsAffected } = await executeDbQuery(sqlStr, {
        GRNNO: grnNo,
        INVOICENO: data.invoiceNo,
        INVDATE: data.invoiceDate || new Date(),
        CHALLANNO: data.doNo || '',
        CHALANDT: data.doDate || '1900-01-01',
        REMARKS: data.remarks || '',
        DEPTCODE: data.grnDepartment || '',
        EDITED_BY: userId
      });

      if (rowsAffected[0] > 0) {
        res.json({ status: 0, message: 'GRN updated successfully' });
      } else {
        res.status(404).json({ status: 1, message: 'GRN not found' });
      }
    } catch (err: any) {
      console.error('updateGrn Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }
}
