import express, { Request, Response, Router } from "express";
import sql from 'mssql';
import { conpool, executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class stockEntryController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/pharmacy", this.router);

    // Endpoints for Stock Entry
    this.router.get("/getStoreDetails", authenticateToken, this.getStoreDetails.bind(this));
    this.router.get("/searchStockItems", authenticateToken, this.searchStockItems.bind(this));
    this.router.post("/insertStockEntry", authenticateToken, this.insertStockEntry.bind(this));
  }

  /**
   * Fetch stores using query:
   * select l.STORE_ID, store_name from inv_storeMst S 
   * join INV_CLINIC_STORELINK L on L.Store_ID = S.Store_Code 
   * where S.status = 'A' and L.clnorgcode = '001001001000'
   */
  async getStoreDetails(req: Request, res: Response): Promise<void> {
    const clnorgcode = (req.query.clnorgcode as string) || '001001001000';
    const sqlQuery = `
      SELECT L.STORE_ID, S.store_name 
      FROM inv_storeMst S 
      JOIN INV_CLINIC_STORELINK L ON L.Store_ID = S.Store_Code 
      WHERE S.status = 'A' AND L.clnorgcode = @clnorgcode
      ORDER BY S.store_name
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, { clnorgcode });
      res.json({ status: 0, d: records });
    } catch (err: any) {
      console.error('getStoreDetails Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  /**
   * Search stock items by Code or Name
   */
  async searchStockItems(req: Request, res: Response): Promise<void> {
    const query = (req.query.query as string || '').trim();

    const sqlQuery = `
      SELECT TOP 50 
        Item_ID, ItemCode, ItemName, HSN, Mtrl_MRP AS MRP, Material_Cost AS COST_PRICE, GSTPRCNTG
      FROM INV_ITEMMAST
      WHERE STATUS = 'A' AND (ItemCode LIKE @searchQuery OR ItemName LIKE @searchQuery)
      ORDER BY ItemName
    `;

    try {
      const { records } = await executeDbQuery(sqlQuery, {
        searchQuery: `%${query}%`
      });
      res.json({ status: 0, records });
    } catch (err: any) {
      console.error('searchStockItems Error:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  /**
   * Insert/Save Stock Entry - Exactly implementing the legacy SaveData() DB logic:
   * 1. Check if item exists in INV_STOCKMST -> Update YOPBAL OR Insert new INV_STOCKMST
   * 2. Insert into STOCK_ENTRY_LOG
   * 3. Check if item exists in INV_STOCKLGR -> Update TRANQTY & TRANAMOUNT OR Insert new INV_STOCKLGR
   */
  async insertStockEntry(req: Request, res: Response): Promise<void> {
    const data = req.body;
    const storeCode = data.storeId;
    const items = data.items || [];
    const userId = (req as any).user?.userId || data.createdBy || '6453';
    const hospId = data.hospId || storeCode || '001001001000';

    if (!storeCode) {
      res.status(400).json({ status: 1, message: 'Please Select Store then Save the Records...' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ status: 1, message: 'Please Enter At least One Item to save....' });
      return;
    }

    const transaction = new sql.Transaction(conpool);
    try {
      await transaction.begin();

      // 1. Financial year lookup
      const yearRes = await executeDbQuery(
        `SELECT TOP 1 FinYear FROM Mst_AccYear WHERE UPPER(OpenStatus)='O' AND UPPER(CurrentFinancialYear)='Y'`,
        {},
        { transaction }
      );
      const finYear = yearRes.records?.[0]?.FinYear || '2025-2026';

      // 2. Loop over items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mtrlCode = (item.itemCode || '').trim();
        if (!mtrlCode) continue;

        const mtrlName = (item.itemName || '').trim();
        const batchNo = (item.batchNo || '').trim();
        const qty = parseFloat(item.qty || '0');
        const mrp = parseFloat(item.mrp || '0');
        const costPrice = parseFloat(item.costPrice || '0');
        const hsn = (item.hsn || '').trim();
        const cgst = parseFloat(item.cgst || '0');
        const sgst = parseFloat(item.sgst || '0');
        const tranAmount = mrp * qty;

        // Expiry Date conversion (dd/mm/yyyy -> yyyy-mm-dd)
        let expDate = '1900-01-01';
        if (item.expiryDate && item.expiryDate.includes('/')) {
          const parts = item.expiryDate.split('/');
          if (parts.length === 3) {
            expDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else if (item.expiryDate) {
          expDate = item.expiryDate;
        }

        // ==========================================
        // A. INV_STOCKMST Check & Update / Insert
        // ==========================================
        const checkStockSql = `
          SELECT COUNT(MTRLCODE) AS cnt 
          FROM INV_STOCKMST 
          WHERE MTRLCODE = @MTRLCODE 
            AND BATCHNO = @BATCHNO 
            AND EXPIRYDATE = @EXPDATE 
            AND COSTPRICE = @COSTPRICE 
            AND MRP = @MRP 
            AND STORECODE = @STORECODE
        `;

        const checkStockRes = await executeDbQuery(checkStockSql, {
          MTRLCODE: mtrlCode,
          BATCHNO: batchNo,
          EXPDATE: expDate,
          COSTPRICE: costPrice,
          MRP: mrp,
          STORECODE: storeCode
        }, { transaction });

        const stockCount = checkStockRes.records?.[0]?.cnt || 0;

        if (stockCount > 0) {
          // Update Stock
          const updateStockSql = `
            UPDATE INV_STOCKMST 
            SET YOPBAL = YOPBAL + @QTY 
            WHERE MTRLCODE = @MTRLCODE 
              AND BATCHNO = @BATCHNO 
              AND EXPIRYDATE = @EXPDATE 
              AND COSTPRICE = @COSTPRICE 
              AND MRP = @MRP 
              AND STORECODE = @STORECODE 
              AND HSN = @HSN 
              AND CGST = @CGST 
              AND SGST = @SGST
          `;
          await executeDbQuery(updateStockSql, {
            QTY: qty,
            MTRLCODE: mtrlCode,
            BATCHNO: batchNo,
            EXPDATE: expDate,
            COSTPRICE: costPrice,
            MRP: mrp,
            STORECODE: storeCode,
            HSN: hsn,
            CGST: cgst,
            SGST: sgst
          }, { transaction });

        } else {
          // Insert Stock Master
          const insertStockMstSql = `
            INSERT INTO INV_STOCKMST (
              CLNORGCODE, FINYEAR, STORECODE, MTRLCODE, BATCHNO, MFRDATE, EXPIRYDATE, COSTPRICE, LANDEDCOST, MRP,
              WTAVGRATE, PACKCOST, PACKMRP, YOPBAL, TOTRCPTS, TOTSUPRET, TOTIPISS, TOTIPRET, TOTDEPTISS, TOTDEPTRET,
              TOTTRFIN, TOTTRFOUT, TOTCASHSALE, TOTCASHRET, TOTPOSADJS, TOTNEGADJS, TOTLOANIN, TOTLOANOUT, TOTCONSIN,
              TOTCONSOUT, LASTPURCDT, VENDCODE, REMARKS, HSN, CGST, SGST, IGST
            ) VALUES (
              @HOSPID, @FINYEAR, @STORECODE, @MTRLCODE, @BATCHNO, '1900-01-01', @EXPDATE, @COSTPRICE, 0.000, @MRP,
              0.0000, @COSTPRICE, @MRP, @QTY, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000,
              0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000,
              0.000, '1900-01-01', '', '', @HSN, @CGST, @SGST, 0.000
            )
          `;
          await executeDbQuery(insertStockMstSql, {
            HOSPID: hospId,
            FINYEAR: finYear,
            STORECODE: storeCode,
            MTRLCODE: mtrlCode,
            BATCHNO: batchNo,
            EXPDATE: expDate,
            COSTPRICE: costPrice,
            MRP: mrp,
            QTY: qty,
            HSN: hsn,
            CGST: cgst,
            SGST: sgst
          }, { transaction });
        }

        // ==========================================
        // B. STOCK_ENTRY_LOG Insert
        // ==========================================
        const insertLogSql = `
          INSERT INTO STOCK_ENTRY_LOG (
            STORECODE, MTRLCODE, BATCHNO, EXPIRYDATE, QTY, COSTPRICE, MRP, HSN, CGST, SGST, CREATED_BY, CREATED_ON
          ) VALUES (
            @STORECODE, @MTRLCODE, @BATCHNO, @EXPDATE, @QTY, @COSTPRICE, @MRP, @HSN, @CGST, @SGST, @CREATED_BY, GETDATE()
          )
        `;
        await executeDbQuery(insertLogSql, {
          STORECODE: storeCode,
          MTRLCODE: mtrlCode,
          BATCHNO: batchNo,
          EXPDATE: expDate,
          QTY: qty,
          COSTPRICE: costPrice,
          MRP: mrp,
          HSN: hsn,
          CGST: cgst,
          SGST: sgst,
          CREATED_BY: userId
        }, { transaction });

        // ==========================================
        // C. INV_STOCKLGR Check & Update / Insert
        // ==========================================
        const checkLgrSql = `
          SELECT COUNT(*) AS cnt 
          FROM INV_STOCKLGR 
          WHERE MTRLCODE = @MTRLCODE 
            AND BATCHNO = @BATCHNO 
            AND EXPIRYDATE = @EXPDATE 
            AND COSTPRICE = @COSTPRICE 
            AND MRP = @MRP 
            AND STORECODE = @STORECODE 
            AND HSN = @HSN 
            AND CGST = @CGST 
            AND SGST = @SGST
        `;
        const checkLgrRes = await executeDbQuery(checkLgrSql, {
          MTRLCODE: mtrlCode,
          BATCHNO: batchNo,
          EXPDATE: expDate,
          COSTPRICE: costPrice,
          MRP: mrp,
          STORECODE: storeCode,
          HSN: hsn,
          CGST: cgst,
          SGST: sgst
        }, { transaction });

        const lgrCount = checkLgrRes.records?.[0]?.cnt || 0;

        if (lgrCount > 0) {
          // Update Stock Ledger
          const updateLgrSql = `
            UPDATE INV_STOCKLGR 
            SET TRANQTY = TRANQTY + @QTY, 
                TRANAMOUNT = TRANAMOUNT + @TRANAMOUNT, 
                EDITED_BY = '', 
                EDITED_ON = GETDATE() 
            WHERE MTRLCODE = @MTRLCODE 
              AND BATCHNO = @BATCHNO 
              AND EXPIRYDATE = @EXPDATE 
              AND COSTPRICE = @COSTPRICE 
              AND MRP = @MRP 
              AND STORECODE = @STORECODE 
              AND HSN = @HSN 
              AND CGST = @CGST 
              AND SGST = @SGST
          `;
          await executeDbQuery(updateLgrSql, {
            QTY: qty,
            TRANAMOUNT: tranAmount,
            MTRLCODE: mtrlCode,
            BATCHNO: batchNo,
            EXPDATE: expDate,
            COSTPRICE: costPrice,
            MRP: mrp,
            STORECODE: storeCode,
            HSN: hsn,
            CGST: cgst,
            SGST: sgst
          }, { transaction });

        } else {
          // Insert Stock Ledger
          const insertLgrSql = `
            INSERT INTO INV_STOCKLGR (
              CLNORGCODE, FINYEAR, TRANTYPE, TRANNO, TRANDATE, STORECODE,
              DEPTCODE, MEDRECNO, IPNO, EMPCODE, VENDCODE, MTRLCODE,
              BATCHNO, EXPIRYDATE, TRANQTY, TRANRATE, TRANAMOUNT, REMARKS,
              COSTPRICE, LANDEDCOST, MRP, WTAVGRATE, CREATED_BY, CREATED_ON,
              EDITED_BY, EDITED_ON, STATUS, SALEPRICE, CGST, SGST, IGST, HSN
            ) VALUES (
              @HOSPID, @FINYEAR, '00', 'OPBAL', GETDATE(), @STORECODE,
              '', '', '', '', '', @MTRLCODE,
              @BATCHNO, @EXPDATE, @QTY, @MRP, @TRANAMOUNT, '',
              @COSTPRICE, @MRP, @MRP, 0.0000, @CREATED_BY, GETDATE(),
              '', '', 'A', @MRP, @CGST, @SGST, 0.000, @HSN
            )
          `;
          await executeDbQuery(insertLgrSql, {
            HOSPID: hospId,
            FINYEAR: finYear,
            STORECODE: storeCode,
            MTRLCODE: mtrlCode,
            BATCHNO: batchNo,
            EXPDATE: expDate,
            QTY: qty,
            MRP: mrp,
            TRANAMOUNT: tranAmount,
            COSTPRICE: costPrice,
            CREATED_BY: userId,
            CGST: cgst,
            SGST: sgst,
            HSN: hsn
          }, { transaction });
        }
      }

      await transaction.commit();
      res.json({ status: 0, d: "Success", message: 'Details are saved Successfully' });
    } catch (err: any) {
      try { await transaction.rollback(); } catch (_) {}
      console.error('insertStockEntry error:', err);
      res.status(500).json({ status: 1, d: "Fail", message: err.message });
    }
  }
}
