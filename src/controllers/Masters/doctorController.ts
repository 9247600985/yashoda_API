import express, { Application, Request, Response, Router } from "express";
import { conpool,executeDbQuery } from "../../db";
import { IsBase64,saveFileToFolder } from "../../utilities/base64Utils";
import jwt, { JwtPayload } from "jsonwebtoken";
import sql from "mssql";
import { authenticateToken } from "../../utilities/authMiddleWare";
import path from "path";
import fs from "fs";
const moment = require('moment');

export default class doctorController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/masters", this.router);

    this.router.get("/getCountries", authenticateToken, this.getCountries.bind(this));
    this.router.get("/getTariff", authenticateToken, this.getTariff.bind(this));
    this.router.get("/getClinics", authenticateToken, this.getClinics.bind(this));
    this.router.get("/getDoctorDetails", authenticateToken, this.getDoctorDetails.bind(this));
    this.router.get("/getCurrency", authenticateToken, this.getCurrency.bind(this));
    this.router.get("/getChargeDetails", authenticateToken, this.getChargeDetails.bind(this));
    this.router.post("/insertDetails", authenticateToken, this.insertDetails.bind(this));
    this.router.post("/insertDoctorMaster", authenticateToken, this.insertDoctorMaster.bind(this));
     this.router.get("/GetDoct_Languages", authenticateToken, this.GetDoct_Languages.bind(this));
     this.router.post("/updateDoctorMaster", authenticateToken, this.updateDoctorMaster.bind(this));
     this.router.post("/cancelDoctorMaster", authenticateToken, this.cancelDoctorMaster.bind(this));
    this.router.get("/getLanguages", authenticateToken, this.getLanguages.bind(this));
    this.router.get("/onChange_UserId", authenticateToken, this.onChange_UserId.bind(this));
     this.router.get("/getDoctorMaster", authenticateToken, this.getDoctorMaster.bind(this));
     this.router.get("/getDoctorFile", authenticateToken, this.getDoctorFile.bind(this));
     this.router.get("/getRefHospitals", authenticateToken, this.getRefHospitals.bind(this));
     this.router.get("/getNextDoctorCode", authenticateToken, this.getNextDoctorCode.bind(this));
  }



  async getNextDoctorCode(req: Request, res: Response): Promise<void> {
  try {
    const data = await executeDbQuery(`SELECT ISNULL(MAX(Code),0) AS Code FROM Mst_DoctorMaster`);
    const next = (Number(data.records[0].Code) + 1).toString().padStart(6, '0');
    res.json({ status: 0, d: next });
  } catch (err: any) {
    res.status(500).json({ status: 1, message: err.message });
  }
}

  async getRefHospitals(req: Request, res: Response): Promise<void> {
  try {
    const data = await executeDbQuery(
      `SELECT REFERRAL_ID, REFERRAL_DESC FROM MST_REFERRAL ORDER BY REFERRAL_DESC`
    );
    res.json({ status: 0, d: data.records });
  } catch (err: any) {
    res.status(500).json({ status: 1, message: err.message });
  }
}

   async getCountries(req: Request, res: Response): Promise<void> {
    const sql = `select Country_ID,Country_Name,STATUS from Mst_Country order by Country_Name`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
   async getTariff(req: Request, res: Response): Promise<void> {
    const sql = `select TARIFFID,TARIFFDESC from MST_TARIFFCATGORY where STATUS='A' order by TARIFFID`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
  async getClinics(req: Request, res: Response): Promise<void> {
    const sql = `select ISNULL(USERID,'')as USERID,SHORTNAME,CLINIC_CODE,CLINIC_NAME,ADDRESS,COUNTRY,STATE,DISTRICT,CITY,EMAIL,PHONE,CONVERT(VARCHAR(10),CONTRACTSDATE,103)StartDate,CONVERT(VARCHAR(10),CONTRACTEDATE,103)EndDate,STATUS from TM_CLINICS`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
  async getDoctorDetails(req: Request, res: Response): Promise<void> {
    const sql = `select Code,Firstname from Mst_DoctorMaster where Status='A' order by Code`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
   async getCurrency(req: Request, res: Response): Promise<void> {
    
        const input = req.body || req.query;
        const Country_ID = input.Country_ID;

    const sql = `select CURRENCY from Mst_Country where Country_ID=@Country_ID`;
    const params = {
      Country_ID: Country_ID
    };
    try {
      const { records } = await executeDbQuery(sql,params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

   async getChargeDetails(req: Request, res: Response): Promise<void> {
        const input = req.body || req.query;
        const ClinicId = input.ClinicId;
         const TariffId = input.TariffId;
        const COUNTRY_ID = input.COUNTRY_ID;
        const CURRENCY = input.CURRENCY;
       
        

        const sql = `select Doctor_ID,IP_FollowUp_Visits,IP_FollowUp_Days,Valid_Days,Valid_Visits,FollowUp_Days,FreeFollowUp_No,PaidFollowUp_No,NewVisit_Charge,PaidFollowUp_Charge,Emergency_Charge,SpecialConsultation_Charge,CrossConsultation_Charge,GeneralOPD_Charge,CampConsultation_Charge,IPFollowUp_Charge,TeleConsultation_Charge,DoctorShare_Percentage,Revisionid from Mst_ChargeSheet_TM where CLNORGCODE = @ClinicId and TARIFFID = @TariffId and COUNTRY_ID = @CountryId and CURRENCY = @Currency order by  Doctor_ID`;
        const params = {
      ClinicId: ClinicId,
      TariffId:TariffId,
      CountryId:COUNTRY_ID,
      CURRENCY:CURRENCY
    };
        try {
            const data = await executeDbQuery(sql,params);
            const rows = data.records.map((r: any) => ({
                Doctor_ID: r.Doctor_ID || "",
                IP_FollowUp_Visits: r.IP_FollowUp_Visits || "",
                IP_FollowUp_Days: r.IP_FollowUp_Days || "",
                Valid_Days: r.Valid_Days || "",
                Valid_Visits: r.Valid_Visits || "",
                FollowUp_Days: r.FollowUp_Days || "",
                FreeFollowUp_No: r.FreeFollowUp_No || "",
                PaidFollowUp_No: r.PaidFollowUp_No || "",
                NewVisit_Charge: r.NewVisit_Charge || "",
                Patient_Category_Id: r.Patient_Category_Id || "",
                PaidFollowUp_Charge: r.PaidFollowUp_Charge || "",
                Emergency_Charge: r.Emergency_Charge || "",
                SpecialConsultation_Charge: r.SpecialConsultation_Charge || "",
                CrossConsultation_Charge: r.CrossConsultation_Charge || "",
                GeneralOPD_Charge: r.GeneralOPD_Charge || "",
                CampConsultation_Charge: r.CampConsultation_Charge || "",
                IPFollowUp_Charge: r.IPFollowUp_Charge || "",
                TeleConsultation_Charge: r.TeleConsultation_Charge || "",
                DoctorShare_Percentage: r.DoctorShare_Percentage || "",
                RevisionId: r.RevisionId || "",
                }));
            res.json({ status: 0, d: rows });
        } catch (err: any) {
            res.status(500).json({ status: 1, message: err.message });
        }
    }

    async insertDetails(req: Request, res: Response): Promise<void> {
  try {
    const {
      Country_ID,
      Currency,
      Clinic,
      Tariff,
      ConsTypeId,
      Doctors
    } = req.body;

    // Delete old records
    const deleteSql = `
      DELETE FROM Mst_ChargeSheet_TM
      WHERE CLNORGCODE = @Clinic
        AND TARIFFID = @Tariff
        AND COUNTRY_ID = @Country_ID
        AND CURRENCY = @Currency
    `;

    await executeDbQuery(deleteSql, {
      Clinic,
      Tariff,
      Country_ID,
      Currency
    });

    // Insert new records
    const insertSql = `
      INSERT INTO Mst_ChargeSheet_TM
      (
        Doctor_ID, IP_FollowUp_Visits, IP_FollowUp_Days,
        Valid_Days, Valid_Visits, FollowUp_Days,
        FreeFollowUp_No, PaidFollowUp_No,
        NewVisit_Charge, PaidFollowUp_Charge,
        IPFollowUp_Charge, Revisionid,
        CLNORGCODE, TARIFFID, COUNTRY_ID, CURRENCY, cons_typeid
      )
      VALUES
      (
        @Doctor_ID, @IFV, @IFD,
        @VD, @VV, @FFD,
        @FFV, @PFV,
        @NV, @PF,
        @IPF, @RI,
        @Clinic, @Tariff, @Country_ID, @Currency, @ConsTypeId
      )
    `;
//loop for parameters
    for (const d of Doctors) {
      await executeDbQuery(insertSql, {
        ...d,
        Clinic,
        Tariff,
        Country_ID,
        Currency,
        ConsTypeId
      });
    }

    res.json({ status: 0, result: Doctors.length });

  } catch (err: any) {
    res.status(500).json({ status: 1, result: err.message });
  }
}

  //doctor master
async getDoctorMaster(req: Request, res: Response): Promise<void> {
  const sql = `
    select 
      isnull(REF_HOSPID,'') as REF_HOSPID, USERID, code, FirstName, MobileNo, DM.Status,
      S.Speciality_Name, md.DEPTNAME, DM.Qualification, DM.RegistrationNo,
      DM.TELECONS, VIDEOCONS, WALKINCONS, HomeVisitCons, INPATVISITCONS, EMERGENCYCONS,
      DM.SpecializationId, DM.department,
      Convert(Varchar(10), DM.VALID_UPTO, 103) VALID_UPTO,
      CLINIC_CODE, DM.Country_Id, DM.EXPERIENCE, DM.LANGUAGES,
      DM.Hospital, DM.HospitalLocation,
      isnull(dm.Qualification1,'') as Qualification1,
      isnull(dm.Qualification2,'') as Qualification2,
      isnull(dm.Qualification3,'') as Qualification3,
      isnull(dm.Qualification4,'') as Qualification4,
      isnull(dm.IMAGE_PATH,'') as IMAGE_PATH,
      isnull(dm.SIGNATURE_PATH,'') as SIGNATURE_PATH
    from Mst_DoctorMaster DM
    Left join Speciality_Master S on S.Speciality_ID = DM.SpecializationId
    Left join Mst_Department md on md.DEPTCODE = dm.Department
    order by FirstName`;

  try {
    const data = await executeDbQuery(sql);
    const rows = data.records.map((r: any) => ({
      REF_HOSPID:     r.REF_HOSPID || "",
      USERID:         r.USERID || "",
      code:           r.code || "",
      FirstName:      r.FirstName || "",
      Mobile:         r.MobileNo || "",
      Status:         r.Status || "",
      Speciality_Name: r.Speciality_Name || "",
      Dept_Name:      r.DEPTNAME || "",
      Qualification:  r.Qualification || "",
      RegdNo:         r.RegistrationNo || "",
      Ph_Charges:     r.TELECONS || "",
      Video_Charges:  r.VIDEOCONS || "",
      WalkinCons:     r.WALKINCONS || "",
      HomeVisitCons:  r.HomeVisitCons || "",
      InpatVisitCons: r.INPATVISITCONS || "",
      EmergencyCons:  r.EMERGENCYCONS || "",
      SpecialityId:   r.SpecializationId || "",
      Dept_Id:        r.department || "",
      VALID_UPTO:     r.VALID_UPTO || "",
      CLINIC_CODE:    r.CLINIC_CODE || "",
      Country:        r.Country_Id || "",
      EXPERIENCE:     r.EXPERIENCE || "",
      LANGUAGES:      r.LANGUAGES || "",
      Hospital:       r.Hospital || "",
      HospitalLocation: r.HospitalLocation || "",
      Qualification1: r.Qualification1 || "",
      Qualification2: r.Qualification2 || "",
      Qualification3: r.Qualification3 || "",
      Qualification4: r.Qualification4 || "",
      IMAGE_PATH:     r.IMAGE_PATH || "",
      SIGNATURE_PATH: r.SIGNATURE_PATH || "",
    }));
    res.json({ status: 0, d: rows });
  } catch (err: any) {
    res.status(500).json({ status: 1, result: err.message });
  }
}

  //
  async GetDoct_Languages(req: Request, res: Response): Promise<void> {
    
        const input = req.body || req.query;
        const DOCT_ID = input.DOCT_ID;

    const sql = `select LANG_ID from TM_DOCTORLANGUAGES where DOCT_ID = @DOCT_ID  and STATUS='A'`;
    const params = {
      DOCT_ID: DOCT_ID
    };
    try {
      const { records } = await executeDbQuery(sql,params);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }
async updateDoctorMaster(req: Request, res: Response): Promise<void> {
  const DoctorData = req.body;
  try {
    if (DoctorData.Valid_Upto) {
      const [dd, mm, yyyy] = DoctorData.Valid_Upto.split("/");
      DoctorData.Valid_Upto = `${yyyy}-${mm}-${dd}`;
    }

    const CODE = DoctorData.CODE;
    let sig_path = "";
    let profile_path = "";
    let img_path = "";
    let logo_path = "";

    for (const item of DoctorData.UPLOADEDFILES || []) {
      if (item.BASE64DATA) {
        sig_path = saveFileToFolder(item.BASE64DATA, item.FILENAME, CODE, "Signature");
      } else if (item.EXISTING_PATH) {
        sig_path = item.EXISTING_PATH;
      }
    }
    for (const item of DoctorData.DOCTOR_PROFILE || []) {
      if (item.BASE64DATA) {
        profile_path = saveFileToFolder(item.BASE64DATA, item.FILENAME, CODE, "Profile");
      } else if (item.EXISTING_PATH) {
        profile_path = item.EXISTING_PATH;
      }
    }
    for (const item of DoctorData.DOCTOR_IMAGE || []) {
      if (item.BASE64DATA) {
        img_path = saveFileToFolder(item.BASE64DATA, item.FILENAME, CODE, "Image");
      } else if (item.EXISTING_PATH) {
        img_path = item.EXISTING_PATH;
      }
    }
    for (const item of DoctorData.DOCTOR_HOSPLOGO || []) {
      if (item.BASE64DATA) {
        logo_path = saveFileToFolder(item.BASE64DATA, item.FILENAME, CODE, "Hospital_Logo");
      } else if (item.EXISTING_PATH) {
        logo_path = item.EXISTING_PATH;
      }
    }

    const transaction = new sql.Transaction(conpool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("CODE", sql.VarChar, CODE)
        .query("DELETE FROM TM_DOCTORLANGUAGES WHERE DOCT_ID=@CODE");

      for (const lang of DoctorData.DOCT_LANGUAGES || []) {
        await new sql.Request(transaction)
          .input("DOCT_ID", sql.VarChar, CODE)
          .input("LANG_ID", sql.VarChar, lang.LANG_ID)
          .query(`INSERT INTO TM_DOCTORLANGUAGES(DOCT_ID, LANG_ID, STATUS, EDITED_BY, EDITED_ON)
                  VALUES (@DOCT_ID, @LANG_ID, 'A', '', GETDATE())`);
      }

      let updateQuery = `UPDATE Mst_DoctorMaster SET
        REF_HOSPID=@REF_HOSPID, USERID=@USERID, FirstName=@FirstName,
        MobileNo=@MobileNo, status=@status, SpecializationId=@SpecializationId,
        TELECONS=@TELECONS, VIDEOCONS=@VIDEOCONS, Department=@Department,
        RegistrationNo=@RegistrationNo, Qualification=@Qualification,
        WALKINCONS=@WALKINCONS, HOMEVISITCONS=@HOMEVISITCONS,
        INPATVISITCONS=@INPATVISITCONS, EMERGENCYCONS=@EMERGENCYCONS,
        VALID_UPTO=@VALID_UPTO, CLINIC_CODE=@CLINIC_CODE, Country_Id=@Country_Id,
        EXPERIENCE=@EXPERIENCE, LANGUAGES=@LANGUAGES, Hospital=@Hospital,
        HospitalLocation=@HospitalLocation, Qualification1=@Qualification1,
        Qualification2=@Qualification2, Qualification3=@Qualification3,
        Qualification4=@Qualification4`;

      if (sig_path)     updateQuery += ", SIGNATURE_PATH=@SIGNATURE_PATH";
      if (profile_path) updateQuery += ", PROFILE_PATH=@PROFILE_PATH";
      if (img_path)     updateQuery += ", IMAGE_PATH=@IMAGE_PATH";
      if (logo_path)    updateQuery += ", HospitalLogo=@HospitalLogo";
      updateQuery += " WHERE Code=@Code";

      const request = new sql.Request(transaction);
      request
        .input("REF_HOSPID",       DoctorData.Ref_HOSPID)
        .input("USERID",           DoctorData.USERID)
        .input("FirstName",        DoctorData.NAME)
        .input("MobileNo",         DoctorData.Mobile)
        .input("status",           DoctorData.status)
        .input("SpecializationId", DoctorData.Speciality ? Number(DoctorData.Speciality) : null)
        .input("TELECONS",         DoctorData.Ph_ch ? Number(DoctorData.Ph_ch) : 0)
        .input("VIDEOCONS",        DoctorData.Video_ch ? Number(DoctorData.Video_ch) : 0)
        .input("Department",       DoctorData.Dept)
        .input("RegistrationNo",   DoctorData.RegNo)
        .input("Qualification",    DoctorData.Qualification)
        .input("WALKINCONS",       DoctorData.Walkin_ch ? Number(DoctorData.Walkin_ch) : 0)
        .input("HOMEVISITCONS",    DoctorData.HomeVisit_ch ? Number(DoctorData.HomeVisit_ch) : 0)
        .input("INPATVISITCONS",   DoctorData.InpatVisit_ch ? Number(DoctorData.InpatVisit_ch) : 0)
        .input("EMERGENCYCONS",    DoctorData.Emergency_ch ? Number(DoctorData.Emergency_ch) : 0)
        .input("VALID_UPTO",       DoctorData.Valid_Upto)
        .input("CLINIC_CODE",      DoctorData.Clinic)
        .input("Country_Id",       DoctorData.Country ? Number(DoctorData.Country) : null)
        .input("EXPERIENCE",       DoctorData.Experience ? Number(DoctorData.Experience) : 0)
        .input("LANGUAGES",        DoctorData.languages)
        .input("Hospital",         DoctorData.Hospital)
        .input("HospitalLocation", DoctorData.Location)
        .input("Qualification1",   DoctorData.Qualification1)
        .input("Qualification2",   DoctorData.Qualification2)
        .input("Qualification3",   DoctorData.Qualification3)
        .input("Qualification4",   DoctorData.Qualification4)
        .input("Code",             CODE);

      if (sig_path)     request.input("SIGNATURE_PATH", sig_path);
      if (profile_path) request.input("PROFILE_PATH",   profile_path);
      if (img_path)     request.input("IMAGE_PATH",     img_path);
      if (logo_path)    request.input("HospitalLogo",   logo_path);

      await request.query(updateQuery);
      await transaction.commit();
      res.json({ status: 0, message: "Updated successfully." });

    } catch (err) {
      try { await transaction.rollback(); } catch (_) { /* ignore rollback error */ }
      throw err;
    }

  } catch (error: any) {
    res.status(500).json({ d: 0, message: error.message });
  }
}


async insertDoctorMaster(req: Request, res: Response): Promise<void> {
  try {
    const d = req.body;
    let retVal = 0;

    if (d.Valid_Upto) {
      const [dd, mm, yyyy] = d.Valid_Upto.split("/");
      d.Valid_Upto = `${yyyy}-${mm}-${dd}`;
    }

    const codeSql = `SELECT ISNULL(MAX(Code),0) AS Code FROM Mst_DoctorMaster`;
    const codeRes = await executeDbQuery(codeSql);
    const count = (Number(codeRes.records[0].Code) + 1).toString().padStart(6, "0");

    const dupSql = `SELECT COUNT(*) AS CNT FROM Mst_DoctorMaster
      WHERE FirstName=@FirstName AND STATUS='A' AND MobileNo=@MobileNo
      AND SpecializationId=@SpecializationId AND TELECONS=@TELECONS
      AND VIDEOCONS=@VIDEOCONS AND Department=@Department
      AND RegistrationNo=@RegistrationNo AND Qualification=@Qualification`;

    const dupRes = await executeDbQuery(dupSql, {
      FirstName: d.NAME,
      MobileNo: d.Mobile,
      SpecializationId: d.Speciality ? Number(d.Speciality) : null,
      TELECONS: d.Ph_ch ? Number(d.Ph_ch) : 0,
      VIDEOCONS: d.Video_ch ? Number(d.Video_ch) : 0,
      Department: d.Dept,
      RegistrationNo: d.RegNo,
      Qualification: d.Qualification
    });

    await executeDbQuery(`DELETE FROM TM_DOCTORLANGUAGES WHERE DOCT_ID=@DOCT_ID`, { DOCT_ID: count });
    for (const lang of d.DOCT_LANGUAGES || []) {
      await executeDbQuery(
        `INSERT INTO TM_DOCTORLANGUAGES(DOCT_ID, LANG_ID, STATUS, CREATED_BY, CREATED_ON)
         VALUES (@DOCT_ID,@LANG_ID,'A','',GETDATE())`,
        { DOCT_ID: count, LANG_ID: lang.LANG_ID }
      );
    }

    let sigPath = "";
    let profilePath = "";
    let imgPath = "";
    let logoPath = "";

    for (const f of d.UPLOADEDFILES || []) {
      sigPath = saveFileToFolder(f.BASE64DATA, f.FILENAME, count, "Signature");
    }
    for (const f of d.DOCTOR_PROFILE || []) {
      profilePath = saveFileToFolder(f.BASE64DATA, f.FILENAME, count, "Profile");
    }
    for (const f of d.DOCTOR_IMAGE || []) {
      imgPath = saveFileToFolder(f.BASE64DATA, f.FILENAME, count, "Image");
    }
    for (const f of d.DOCTOR_HOSPLOGO || []) {
      logoPath = saveFileToFolder(f.BASE64DATA, f.FILENAME, count, "Hospital_Logo");
    }

    if (dupRes.records[0].CNT > 0) {
      res.json({ status: 0, d: -1 });
      return;
    }

    const insertDoctorSql = `INSERT INTO Mst_DoctorMaster(
      USERID, Code, FirstName, MobileNo, STATUS,
      SpecializationId, TELECONS, VIDEOCONS, Department,
      RegistrationNo, Qualification, WALKINCONS, HOMEVISITCONS,
      INPATVISITCONS, EMERGENCYCONS, SIGNATURE_PATH,
      PROFILE_PATH, VALID_UPTO, CLINIC_CODE, Country_Id,
      EXPERIENCE, LANGUAGES, IMAGE_PATH, Hospital,
      HospitalLocation, HospitalLogo, REF_HOSPID,
      SERVICECODE, SERVICENAME,
      Qualification1, Qualification2, Qualification3, Qualification4)
    VALUES(
      @USERID,@Code,@FirstName,@MobileNo,@STATUS,
      @SpecializationId,@TELECONS,@VIDEOCONS,@Department,
      @RegistrationNo,@Qualification,@WALKINCONS,@HOMEVISITCONS,
      @INPATVISITCONS,@EMERGENCYCONS,@SIGNATURE_PATH,
      @PROFILE_PATH,@VALID_UPTO,@CLINIC_CODE,@Country_Id,
      @EXPERIENCE,@LANGUAGES,@IMAGE_PATH,@Hospital,
      @HospitalLocation,@HospitalLogo,@REF_HOSPID,
      '000101','CONSULTATION',
      @Qualification1,@Qualification2,@Qualification3,@Qualification4)`;

    await executeDbQuery(insertDoctorSql, {
      USERID:          d.USERID,
      Code:            count,
      FirstName:       d.NAME,
      MobileNo:        d.Mobile,
      STATUS:          d.status,
      SpecializationId: d.Speciality ? Number(d.Speciality) : null,
      TELECONS:        d.Ph_ch ? Number(d.Ph_ch) : 0,
      VIDEOCONS:       d.Video_ch ? Number(d.Video_ch) : 0,
      Department:      d.Dept,
      RegistrationNo:  d.RegNo,
      Qualification:   d.Qualification,
      WALKINCONS:      d.Walkin_ch ? Number(d.Walkin_ch) : 0,
      HOMEVISITCONS:   d.HomeVisit_ch ? Number(d.HomeVisit_ch) : 0,
      INPATVISITCONS:  d.InpatVisit_ch ? Number(d.InpatVisit_ch) : 0,
      EMERGENCYCONS:   d.Emergency_ch ? Number(d.Emergency_ch) : 0,
      SIGNATURE_PATH:  sigPath,
      PROFILE_PATH:    profilePath,
      VALID_UPTO:      d.Valid_Upto,
      CLINIC_CODE:     d.Clinic,
      Country_Id:      d.Country ? Number(d.Country) : null,
      EXPERIENCE:      d.Experience ? Number(d.Experience) : 0,
      LANGUAGES:       d.languages,
      IMAGE_PATH:      imgPath,
      Hospital:        d.Hospital,
      HospitalLocation: d.Location,
      HospitalLogo:    logoPath,
      REF_HOSPID:      d.Ref_HOSPID,
      Qualification1:  d.Qualification1,
      Qualification2:  d.Qualification2,
      Qualification3:  d.Qualification3,
      Qualification4:  d.Qualification4
    });

    const password = Buffer.from("123").toString("base64");
    await executeDbQuery(
      `INSERT INTO Mst_UserDetails(userid, username, password, usertype, roles,
        created_by, created_on, status, hospitalname, clnorgcode, mobile, email, IMAGEPATH)
       VALUES(@userid,@username,@password,'N','003',@created_by,GETDATE(),'A',
        @hospitalname,@clnorgcode,@mobile,'',@IMAGEPATH)`,
      {
        userid:       d.USERID,
        username:     d.NAME,
        password,
        created_by:   d.createdby,
        hospitalname: d.Hospital,
        clnorgcode:   d.Clinic,
        mobile:       d.Mobile,
        IMAGEPATH:    imgPath
      }
    );

    retVal = 1;
    res.json({ status: 0, d: retVal });
  } catch (err: any) {
    res.status(500).json({ status: 1, result: err.message });
  }
}

async  cancelDoctorMaster(req: Request,res: Response): Promise<void> {
  try {
    const { Code } = req.body;

    if (!Code) {
      res.status(400).json({ status: 1, message: "Doctor Code is required" });
      return;
    }

    const result = await executeDbQuery(
      `
      UPDATE Mst_DoctorMaster
      SET Status = 'I'
      WHERE Code = @CODE
      `,
      { CODE: Code }
    );

    const retVal = result.rowsAffected?.[0] || 0;

    res.json({
      status: 0,
      d: retVal
    });
  } catch (err: any) {
    res.status(500).json({
      status: 1,
      message: err.message
    });
  }
}
async getLanguages(req: Request, res: Response): Promise<void> {
    const sql = `select LANG_ID,LANG_NAME from mst_languages where STATUS='A'`;
    try {
      const { records } = await executeDbQuery(sql);
      res.json({ status: 0, d: records });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

  async onChange_UserId(req: Request, res: Response): Promise<void> {
      const input = req.body || req.query;
        const USERID = input.USERID;
    const sql = `SELECT COUNT(*) as CNT FROM MST_USERDETAILS WHERE USERID=@USERID`;
    try {
      const { records } = await executeDbQuery(sql,{USERID:USERID});
      res.json({ status: 0, d: records[0].CNT });
    } catch (err: any) {
      res.status(500).json({ status: 1, result: err.message });
    }
  }

async getDoctorFile(req: Request, res: Response): Promise<void> {
  const rawPath = req.query.path as string;
  if (!rawPath) { res.status(400).send('Path required'); return; }

  // replace ~\ with the actual project root (where Node was launched from)
  const absPath = path.resolve(rawPath.replace(/^~[\\\/]/, process.cwd() + path.sep));

  if (!fs.existsSync(absPath)) { res.status(404).send('Not found'); return; }

  const ext = path.extname(absPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
  };
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  fs.createReadStream(absPath).pipe(res);
}
}