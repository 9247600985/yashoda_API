import { Express,Request,Response,Router } from "express";
import sql from 'mssql';
import { conpool,executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";
import express from "express";
export default class vendorController{
    private router:Router=express.Router();

    constructor(private app:Router){
        app.use("/pharmacy",this.router);


        
        this.router.get("/getSubGroup",authenticateToken,this.getSubGroup.bind(this));
        this.router.get("/getMainGroup",authenticateToken,this.getMainGroup.bind(this));
        this.router.get("/getCategory",authenticateToken,this.getCategory.bind(this));
        this.router.get("/getStores",authenticateToken,this.getStores.bind(this));
        this.router.get("/getManufacturer",authenticateToken,this.getManufacturer.bind(this));
        this.router.get("/getPurchaseUnit",authenticateToken,this.getUnitOfMeasurement.bind(this));
        this.router.get("/getStorageUnit",authenticateToken,this.getUnitOfMeasurement.bind(this));
        this.router.get("/getDispenseUnit",authenticateToken,this.getUnitOfMeasurement.bind(this));
        this.router.get("/getMaterialType",authenticateToken,this.getPHMaterial.bind(this));
        this.router.get("/getGenericNames",authenticateToken,this.getPHGenericNames.bind(this));
        this.router.get("/getMaterialClassification",authenticateToken,this.getPHMaterialClassification.bind(this));
        this.router.get("/getRacks",authenticateToken,this.getPHRaks.bind(this));
        this.router.get("/getSelfs",authenticateToken,this.getPHSelfs.bind(this));


        this.router.get("/getItemMasterdetails",authenticateToken,this.getItemMaster.bind(this));

        this.router.get("/getVendorMasterdetails",authenticateToken,this.getvendordetails.bind(this));
        this.router.get("/getvendortypes",authenticateToken,this.loadVendortype.bind(this));
        this.router.post("/insertVendorMaster", authenticateToken, this.saveVendorMasterdetails.bind(this));

        this.router.post("/updateVendorMaster", authenticateToken, this.updateVendorMasterdetails.bind(this));
    }
    async getvendordetails(req:Request,res:Response)
    {
        const sql=`SELECT vndr_id,vndrLng_Nm,Vndr_AddO1,Cell_No1,VndrShrt_Nm,Vndr_AddO2,Vndr_AddO3,City,Country,State,District
,Zip,ContPrsn_Nm,Land_No,Other_No,Email_ID,Status,Created_By,Created_On,Edited_By,Edited_On,CREDITRPERIOD,VENDORTYPE
,CLNORGCODE,Type,Vndr_web_site,ContPrsn_mobile_no,ContPrsn_mailid,TINNo,faxno,GSTIN,REGTYPE,GSTNO,STATECODE,STATENAME
,PARTICULAR,ISNULL(TDS,0) AS TDS
FROM INV_VENDORDETAILS `;
try{
const {records}=await executeDbQuery(sql);
res.json({status:0,records});
}
catch(err:any){
res.status(500).json({status:1,message:err.message});
}
    }

     async getItemMaster(req:Request,res:Response)
    {
        const sql=`SELECT Item_ID,ItemCode,ItemName,Item_Desc,GrpMst_ID,
SubGrpMst_ID,im.Category_ID,cm.Category_Name,im.GenericId,ISNULL(gm.GENERICNAME,'') AS GENERICNAME,MaterialType
,ItemsClassification,Store_ID,UOM_Recieve,UOM_Storage,UOM_Dispense,Is_BatchYN,VEDClassification
,Is_IssueAllowed,VAT,CST,im.CREATED_BY,im.CREATED_ON
,im.EDITED_BY,im.EDITED_ON,im.STATUS,Manufact_ID,Material_Cost,Mtrl_MRP,im.CLNORGCODE
,Is_DecimalQtyAllowed,Is_ReusableItem,LEADTIME,RACK,SHELF,MATERIALCLS,SCHEDULE,SKU,HSN,GSTPRCNTG
,ITEM_TYPE,ISNULL(IsMedical,'N') AS IsMedical,THRESHOLD FROM INV_ITEMMAST IM
LEFT JOIN Category_Master CM ON CM.Category_ID=IM.Category_ID
LEFT JOIN INV_GENERICS GM ON GM.GENERICID=IM.GenericId `;
try{
const {records}=await executeDbQuery(sql);
res.json({status:0,records});
}
catch(err:any){
res.status(500).json({status:1,message:err.message});
}
    }

    async loadVendortype(req: Request, res: Response): Promise<void> {
    const sql = `select vendorid,vendortype as vendortypename from inv_VendorTypes where status='A' order by vendortype`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

   async updateVendorMasterdetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
        UPDATE INV_VENDORDETAILS SET
          vndrLng_Nm = @vndrLng_Nm,         
          Vndr_AddO1=  @Vndr_AddO1,
          Cell_No1     =@Cell_No,
          VndrShrt_Nm=@VndrShrt_Nm,
          Vndr_AddO2 =@Vndr_AddO2,
          Vndr_AddO3 =@Vndr_AddO3,
          City =@City,
          Country=@Country,
          State  =@State,
          District  =@District,
          Zip  =@Zip,
          ContPrsn_Nm  =@ContPrsn_Nm,
          Land_No  =@Land_No,
          Other_No  =@Other_No,
          Email_ID  =@Email_ID,
          Status  =@Status,          
          Edited_By  =@Edited_By,
          Edited_On  =getdate(),
          CREDITRPERIOD  =@CREDITRPERIOD,
          VENDORTYPE  =@VENDORTYPE,
          CLNORGCODE  =@CLNORGCODE,
          Type  =@Type,        
          ContPrsn_mobile_no  =@ContPrsn_mobile_no,
          ContPrsn_mailid  =@ContPrsn_mailid,
          TINNo  =@TINNo,   
          REGTYPE  =@REGTYPE,
          GSTNO  =@GSTNO,
          STATECODE  =@STATECODE,
          STATENAME  =@STATENAME,
          PARTICULAR  =@PARTICULAR,
          TDS  =@TDS
        WHERE vndr_id = @vndr_id
      `;

    try {
      await executeDbQuery(sql, {
        vndr_id: data.code,
        vndrLng_Nm: data.Name,
        VndrShrt_Nm: data.chequeInFavourOf,
        Vndr_AddO1: data.address1,
        Vndr_AddO2: data.address2,
        Vndr_AddO3: data.address3,
        Cell_No: data.contactMobile,
        City: data.city,
        Country: data.country,
        State: data.state,
        District: data.district,
        Zip : data.pinCode,
        ContPrsn_Nm : data.contactPerson,
        Land_No : data.contactLandline,
        Other_No : data.contactOther,
        Email_ID : data.contactEmail,
        Status : data.status,
        Edited_By : '6453',
          
           CREDITRPERIOD:data.creditPeriod,
           VENDORTYPE:data.vendorType,
           CLNORGCODE:data.location,
           Type:'P',
         
           ContPrsn_mobile_no:data.contactMobile,
           ContPrsn_mailid:data.contactEmail,
           TINNo:data.dlNo,
          
           REGTYPE:data.registrationType,
           GSTNO:data.gstNo,
           STATECODE:data.stateCode,
           STATENAME:data.stateName,
           PARTICULAR:data.particular,
           TDS : data.tdsPercent

      });

      res.json({ status: 0, message: 'Vendor updated successfully' });

    } catch (err: any) {
      console.error('UPDATE ERROR:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async saveVendorMasterdetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
        INSERT INTO INV_VENDORDETAILS (
        vndr_id
         , vndrLng_Nm      
         , Vndr_AddO1      
         , Cell_No1        
         , VndrShrt_Nm     
         , Vndr_AddO2      
         , Vndr_AddO3      
         , City            
         , Country         
         , State           
         , District        
         , Zip             
         , ContPrsn_Nm     
         , Land_No         
         , Other_No        
         , Email_ID        
         , Status          
         , created_By       
         , created_On       
         , CREDITRPERIOD   
         , VENDORTYPE      
         , CLNORGCODE      
         , Type            
         , ContPrsn_mobile_no
         , ContPrsn_mailid 
         , TINNo           
         , REGTYPE         
         , GSTNO           
         , STATECODE       
         , STATENAME       
         , PARTICULAR      
         , TDS)
        values(
        @vndr_id,
        @vndrLng_Nm,         
  @Vndr_AddO1,
@Cell_No,
@VndrShrt_Nm,
@Vndr_AddO2,
@Vndr_AddO3,
@City,
@Country,
@State,
@District,
@Zip,
@ContPrsn_Nm,
@Land_No,
@Other_No,
@Email_ID,
@Status,          
@created_By,
getdate(),
@CREDITRPERIOD,
@VENDORTYPE,
@CLNORGCODE,
@Type,        
@ContPrsn_mobile_no,
@ContPrsn_mailid,
@TINNo,   
@REGTYPE,
@GSTNO,
@STATECODE,
@STATENAME,
@PARTICULAR,
@TDS)   `        
      ;

    try {
      await executeDbQuery(sql, {
        vndr_id: data.code,
        vndrLng_Nm: data.Name,
        VndrShrt_Nm: data.chequeInFavourOf,
        Vndr_AddO1: data.address1,
        Vndr_AddO2: data.address2,
        Vndr_AddO3: data.address3,
        Cell_No: data.contactMobile,
        City: data.city,
        Country: data.country,
        State: data.state,
        District: data.district,
        Zip : data.pinCode,
        ContPrsn_Nm : data.contactPerson,
        Land_No : data.contactLandline,
        Other_No : data.contactOther,
        Email_ID : data.contactEmail,
        Status : data.status,
        created_By : '6453',
          
           CREDITRPERIOD:data.creditPeriod,
           VENDORTYPE:data.vendorType,
           CLNORGCODE:data.location,
           Type:'P',
         
           ContPrsn_mobile_no:data.contactMobile,
           ContPrsn_mailid:data.contactEmail,
           TINNo:data.dlNo,
          
           REGTYPE:data.registrationType,
           GSTNO:data.gstNo,
           STATECODE:data.stateCode,
           STATENAME:data.stateName,
           PARTICULAR:data.particular,
           TDS : data.tdsPercent

      });

      res.json({ status: 0, message: 'Vendor saved successfully' });

    } catch (err: any) {
      console.error('UPDATE ERROR:', err);
      res.status(500).json({ status: 1, message: err.message });
    }
  }


    async getMainGroup(req: Request, res: Response) {
    const sql = `
        select MTRLGRPID,MTRLGRPNM from INV_MTRLGROUP where status='A'  ORDER BY MTRLGRPID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

    async getSubGroup(req: Request, res: Response) {
    const sql = `
        SELECT MTRLSUBGRPID,MTRLSUBGRPNAME  fROM INV_MTRLSUBGRP WHERE STATUS='A'  ORDER BY MTRLSUBGRPID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getCategory(req: Request, res: Response) {
    const sql = `
       SELECT Category_ID,Category_Name FROM Category_Master WHERE STATUS='A' ORDER BY Category_ID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getStores(req: Request, res: Response) {
    const sql = `
       SELECT Store_Code,Store_Name FROM INV_STOREMST WHERE STATUS='A' ORDER BY Store_Code
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getManufacturer(req: Request, res: Response) {
    const sql = `
       SELECT Manufact_ID,ManufactLng_Nm FROM Manufacturer_Master WHERE STATUS='A' ORDER BY Manufact_ID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getUnitOfMeasurement(req: Request, res: Response) {
    const sql = `
       SELECT UOM_ID,UOM_NAME FROM MST_UnitOfMeasurement WHERE STATUS='A' ORDER BY UOM_ID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getPHMaterial(req: Request, res: Response) {
    const sql = `
       SELECT MaterialID,MaterialName FROM Material_Master WHERE STATUS='A' ORDER BY MaterialID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

  async getPHGenericNames(req: Request, res: Response) {
    const sql = `
       SELECT GENERICID,GENERICNAME FROM INV_GENERICS WHERE STATUS='A' ORDER BY GENERICID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getPHMaterialClassification(req: Request, res: Response) {
    const sql = `
       SELECT MClassID,NAME FROM MaterialClassification_Master WHERE STATUS='A' ORDER BY MClassID
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getPHRaks(req: Request, res: Response) {
    const sql = `
       SELECT RACKNO,RACKNAME FROM INV_RACKMST WHERE STATUS='A' ORDER BY RACKNO
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }

   async getPHSelfs(req: Request, res: Response) {
    const sql = `
       SELECT SHELFNO,SHELFNAME FROM INV_SHELFMST WHERE STATUS='A' ORDER BY SHELFNO
      `;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: [{ value: '', label: '-Select-' }, ...records] });
    } catch (err: any) {
      res.status(500).json({ status: 1, message: err.message });
    }
  }


  async saveItemMasterDetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
    INSERT INTO INV_ITEMMAST
    (
        CLNORGCODE,
        Item_ID,
        ItemCode,
        ITEM_TYPE,
        ItemName,
        Item_Desc,
        GrpMst_ID,
        SubGrpMst_ID,
        Category_ID,
        GenericId,
        MaterialType,
        ItemsClassification,
        Store_ID,
        UOM_Recieve,
        UOM_Storage,
        UOM_Dispense,
        Is_BatchYN,
        IsMedical,
        VEDClassification,
        Is_IssueAllowed,
        Is_DecimalQtyAllowed,
        Is_ReusableItem,
        CREATED_BY,
        CREATED_ON,
        Manufact_ID,
        LEADTIME,
        RACK,
        SHELF,
        MATERIALCLS,
        SKU,
        HSN,
        GSTPRCNTG,
        SCHEDULE,
        Material_Cost,
        Mtrl_MRP,
        THRESHOLD
    )
    VALUES
    (
        @CLNORGCODE,
        @Item_ID,
        @ItemCode,
        @ITEM_TYPE,
        @ItemName,
        @Item_Desc,
        @GrpMst_ID,
        @SubGrpMst_ID,
        @Category_ID,
        @GenericId,
        @MaterialType,
        @ItemsClassification,
        @Store_ID,
        @UOM_Recieve,
        @UOM_Storage,
        @UOM_Dispense,
        @Is_BatchYN,
        @IsMedical,
        @VEDClassification,
        @Is_IssueAllowed,
        @Is_DecimalQtyAllowed,
        @Is_ReusableItem,
        @CREATED_BY,
        GETDATE(),
        @Manufact_ID,
        @LEADTIME,
        @RACK,
        @SHELF,
        @MATERIALCLS,
        @SKU,
        @HSN,
        @GSTPRCNTG,
        @SCHEDULE,
        @Material_Cost,
        @Mtrl_MRP,
        @THRESHOLD
    )`;

    try {

        await executeDbQuery(sql, {
            CLNORGCODE: data.location,
            Item_ID: data.itemId,
            ItemCode: data.itemCode,
            ITEM_TYPE: data.itemType,
            ItemName: data.itemName,
            Item_Desc: data.itemDescription,

            GrpMst_ID: data.groupId,
            SubGrpMst_ID: data.subGroupId,
            Category_ID: data.categoryId,
            GenericId: data.genericId,

            MaterialType: data.materialType,
            ItemsClassification: data.itemsClassification,
            Store_ID: data.storeId,

            UOM_Recieve: data.uomReceive,
            UOM_Storage: data.uomStorage,
            UOM_Dispense: data.uomDispense,

            Is_BatchYN: data.isBatchYN,
            IsMedical: data.isMedical,
            VEDClassification: data.vedClassification,

            Is_IssueAllowed: data.isIssueAllowed,
            Is_DecimalQtyAllowed: data.isDecimalQtyAllowed,
            Is_ReusableItem: data.isReusableItem,

            CREATED_BY: data.createdBy,

            Manufact_ID: data.manufactureId,
            LEADTIME: data.leadTime,
            RACK: data.rack,
            SHELF: data.shelf,
            MATERIALCLS: data.materialClass,

            SKU: data.sku,
            HSN: data.hsn,
            GSTPRCNTG: data.gstPercentage,
            SCHEDULE: data.schedule,

            Material_Cost: data.materialCost,
            Mtrl_MRP: data.mrp,
            THRESHOLD: data.threshold
        });

        res.json({
            status: 0,
            message: 'Item saved successfully'
        });

    } catch (err: any) {
        console.error('INSERT ERROR:', err);

        res.status(500).json({
            status: 1,
            message: err.message
        });
    }
}

async updateItemMasterDetails(req: Request, res: Response) {
    const data = req.body;

    const sql = `
    UPDATE INV_ITEMMAST
    SET
        CLNORGCODE = @CLNORGCODE,
        ItemCode = @ItemCode,
        ITEM_TYPE = @ITEM_TYPE,
        ItemName = @ItemName,
        Item_Desc = @Item_Desc,
        GrpMst_ID = @GrpMst_ID,
        SubGrpMst_ID = @SubGrpMst_ID,
        Category_ID = @Category_ID,
        GenericId = @GenericId,
        MaterialType = @MaterialType,
        ItemsClassification = @ItemsClassification,
        Store_ID = @Store_ID,
        UOM_Recieve = @UOM_Recieve,
        UOM_Storage = @UOM_Storage,
        UOM_Dispense = @UOM_Dispense,
        Is_BatchYN = @Is_BatchYN,
        IsMedical = @IsMedical,
        VEDClassification = @VEDClassification,
        Is_IssueAllowed = @Is_IssueAllowed,
        Is_DecimalQtyAllowed = @Is_DecimalQtyAllowed,
        Is_ReusableItem = @Is_ReusableItem,
        Manufact_ID = @Manufact_ID,
        LEADTIME = @LEADTIME,
        RACK = @RACK,
        SHELF = @SHELF,
        MATERIALCLS = @MATERIALCLS,
        SKU = @SKU,
        HSN = @HSN,
        GSTPRCNTG = @GSTPRCNTG,
        SCHEDULE = @SCHEDULE,
        Material_Cost = @Material_Cost,
        Mtrl_MRP = @Mtrl_MRP,
        THRESHOLD = @THRESHOLD
    WHERE Item_ID = @Item_ID`;

    try {

        await executeDbQuery(sql, {
            Item_ID: data.itemId,

            CLNORGCODE: data.location,
            ItemCode: data.itemCode,
            ITEM_TYPE: data.itemType,
            ItemName: data.itemName,
            Item_Desc: data.itemDescription,

            GrpMst_ID: data.groupId,
            SubGrpMst_ID: data.subGroupId,
            Category_ID: data.categoryId,
            GenericId: data.genericId,

            MaterialType: data.materialType,
            ItemsClassification: data.itemsClassification,
            Store_ID: data.storeId,

            UOM_Recieve: data.uomReceive,
            UOM_Storage: data.uomStorage,
            UOM_Dispense: data.uomDispense,

            Is_BatchYN: data.isBatchYN,
            IsMedical: data.isMedical,
            VEDClassification: data.vedClassification,

            Is_IssueAllowed: data.isIssueAllowed,
            Is_DecimalQtyAllowed: data.isDecimalQtyAllowed,
            Is_ReusableItem: data.isReusableItem,

            Manufact_ID: data.manufactureId,
            LEADTIME: data.leadTime,
            RACK: data.rack,
            SHELF: data.shelf,
            MATERIALCLS: data.materialClass,

            SKU: data.sku,
            HSN: data.hsn,
            GSTPRCNTG: data.gstPercentage,
            SCHEDULE: data.schedule,

            Material_Cost: data.materialCost,
            Mtrl_MRP: data.mrp,
            THRESHOLD: data.threshold
        });

        res.json({
            status: 0,
            message: 'Item updated successfully'
        });

    } catch (err: any) {

        console.error('UPDATE ERROR:', err);

        res.status(500).json({
            status: 1,
            message: err.message
        });
    }
}
}