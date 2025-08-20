import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";

function containsSpecialCharactersForQueries(input: string): boolean {
  const specialCharacters = /[~`@#$^&\[\]{}\\|;:"'\/?]/;
  return specialCharacters.test(input);
}


export default class opController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/op", this.router);

    this.router.get("/Duplicate", this.Check_Duplicate.bind(this));
    this.router.post("/PatientMaster", this.savePatientMaster.bind(this));
    this.router.post("/BillInsert", this.generateBillInsert.bind(this));

  }

  async Check_Duplicate(req: Request, res: Response): Promise<void> {
    const input = req.method === "GET" ? req.query : req.body;
    const MRExistDetails = input.MRExistDetails;

    let ddobjects: { idField: string }[] = [];

    try {
      let { TableName, checkonField, WhereCond, checkValue } = MRExistDetails;

      if (WhereCond) {
        WhereCond = WhereCond.replace(/&quot;/g, "'");
      }

      let query = ` SELECT COUNT(${checkonField}) as Cnt, ${checkonField} FROM ${TableName} WHERE 1=1 AND ${checkonField} = @checkValue `;

      if (WhereCond && WhereCond.length > 0) {
        query += ` AND ${WhereCond}`;
      }

      query += ` GROUP BY ${checkonField} HAVING COUNT(${checkonField}) >= 1`;

      if (containsSpecialCharactersForQueries(query)) {
        res.status(401).json([]);
        return;
      }

      const { records } = await executeDbQuery(query, { checkValue });

      for (const row of records) {
        ddobjects.push({ idField: row[checkonField] });
      }

      res.json(ddobjects);

    } catch (err: any) {
      res.status(500).json(null);
    }
  }

  async savePatientMaster(req: Request, res: Response): Promise<void> {
    const input = req.body;

    try {
      const spName =
        input.pattype === "D"
          ? "Patient_Master_INSERT_DP"
          : "Patient_Master_INSERT";

      const sql = `
      DECLARE @MRNO VARCHAR(50);
      EXEC ${spName}
        @OPDNum = @OPDNum,
        @Patient_Name = @Patient_Name,
        @Age = @Age,
        @Occupation = @Occupation,
        @Blood_Group = @Blood_Group,
        @Telephone = @Telephone,
        @Mobile = @Mobile,
        @Work_NO = @Work_NO,
        @Email = @Email,
        @Patient_DOB = @Patient_DOB,
        @Gender = @Gender,
        @weight = @weight,
        @Height = @Height,
        @Marital_Status = @Marital_Status,
        @Address1 = @Address1,
        @Address2 = @Address2,
        @Address3 = @Address3,
        @PinCode = @PinCode,
        @Country = @Country,
        @State = @State,
        @District = @District,
        @Address = @Address,
        @Patient_Category_Id = @Patient_Category_Id,
        @EmgConct_Name = @EmgConct_Name,
        @EmgConct_Relation = @EmgConct_Relation,
        @EmgConct_TeleHome = @EmgConct_TeleHome,
        @EmgConct_TeleCell = @EmgConct_TeleCell,
        @Guardian_Name = @Guardian_Name,
        @Guardian_Relation = @Guardian_Relation,
        @Guardian_TeleHome = @Guardian_TeleHome,
        @Guardian_TeleCell = @Guardian_TeleCell,
        @Regd_No = @Regd_No,
        @Children_NO = @Children_NO,
        @Pregnancies_NO = @Pregnancies_NO,
        @Complaints = @Complaints,
        @Remarks = @Remarks,
        @City_Id = @City_Id,
        @Salutation = @Salutation,
        @Cr_Address1 = @Cr_Address1,
        @Cr_Address2 = @Cr_Address2,
        @Cr_Address3 = @Cr_Address3,
        @Cr_Pincode = @Cr_Pincode,
        @Cr_City = @Cr_City,
        @Cr_Country = @Cr_Country,
        @Cr_State = @Cr_State,
        @Cr_District = @Cr_District,
        @Doctor_Id = @Doctor_Id,
        @PatientType = @PatientType,
        @Comp_Id = @Comp_Id,
        @Cat_Id = @Cat_Id,
        @Relation = @Relation,
        @Status = @Status,
        @IPNO = @IPNO,
        @Tariff_Category = @Tariff_Category,
        @Consultation_Date = @Consultation_Date,
        @Department = @Department,
        @ReferralDoctor_ID = @ReferralDoctor_ID,
        @ReferralDoctoragent_ID = @ReferralDoctoragent_ID,
        @Meternity = @Meternity,
        @UniqueId = @UniqueId,
        @EmpIdCardNo = @EmpIdCardNo,
        @LetterNo = @LetterNo,
        @Limit = @Limit,
        @ValidDate = @ValidDate,
        @Image_Name = @Image_Name,
        @AppointmentNO = @AppointmentNO,
        @EXPDUEDATE = @EXPDUEDATE,
        @CLNORGCODE = @CLNORGCODE,
        @REVISIONID = @REVISIONID,
        @FirstName = @FirstName,
        @MiddleName = @MiddleName,
        @LastName = @LastName,
        @Doctot_ID2 = @Doctot_ID2,
        @Department2 = @Department2,
        @EmpId = @EmpId,
        @EmpName = @EmpName,
        @EmpRefType = @EmpRefType,
        @EmpDept = @EmpDept,
        @EmpDesgcode = @EmpDesgcode,
        @ReasonFor = @ReasonFor,
        @NATLCODE = @NATLCODE,
        @RELGCODE = @RELGCODE,
        @fathername = @fathername,
        @CREATED_BY = @CREATED_BY,
        @CREATED_ON = GETDATE(),
         @EDITED_BY = @EDITED_BY,
        @EDITED_ON = @EDITED_ON,
        @MEDRECNO = @MRNO OUTPUT;

      SELECT @MRNO AS MRNO, @OPDNum AS OPREGNO;
    `;

      const params = {
        OPDNum: input.OPDNum,
        Patient_Name: input.patname,
        Age: input.age,
        Occupation: null,
        Blood_Group: input.bloodgroup,
        Telephone: input.telphone,
        Mobile: input.mobile,
        Work_NO: input.work,
        Email: input.email,
        Patient_DOB: input.dob || null,
        Gender: input.gender,
        weight: input.weight?.length ? input.weight : 0,
        Height: input.hieght?.length ? input.hieght : 0,
        Marital_Status: input.maritalstatus,
        Address1: input.address1,
        Address2: input.address2,
        Address3: input.address3,
        PinCode: input.pincode,
        Country: input.countryid,
        State: input.stateid,
        District: input.districtid,
        Address: `${input.address1} ${input.address2} ${input.address3}`,
        Patient_Category_Id: input.patcatid,
        EmgConct_Name: null,
        EmgConct_Relation: null,
        EmgConct_TeleHome: null,
        EmgConct_TeleCell: null,
        Guardian_Name: input.guardianname,
        Guardian_Relation: input.guardianrelation,
        Guardian_TeleHome: "",
        Guardian_TeleCell: input.guardianmobile,
        Regd_No: null,
        Children_NO: null,
        Pregnancies_NO: null,
        Complaints: null,
        Remarks: null,
        City_Id: input.cityid,
        Salutation: input.patsalutationid,
        Cr_Address1: input.guardianaddress1,
        Cr_Address2: input.guardianaddress2,
        Cr_Address3: input.guardianaddress3,
        Cr_Pincode: input.guardianpincode,
        Cr_City: input.guardiancityid,
        Cr_Country: input.guardiancountryid,
        Cr_State: input.guardianstateid,
        Cr_District: input.guardiandistrictid,
        Doctor_Id: input.doctcd,
        PatientType: input.pattype,
        Comp_Id: input.compid,
        Cat_Id: input.patcatid,
        Relation: input.guardianrelation,
        Status: input.pattype,
        IPNO: null,
        Tariff_Category: input.tarifcatid,
        Consultation_Date: null,
        Department: input.departmentid,
        ReferralDoctor_ID: input.refdoctcd,
        ReferralDoctoragent_ID: input.ReferralAgent_ID,
        Meternity: input.maritalstatus,
        UniqueId: input.uniqueid,
        EmpIdCardNo: input.empidcardno,
        LetterNo: input.letterno,
        Limit: input.limit,
        ValidDate: input.validdate || null,
        Image_Name: input.imagepath
          ? `/PatientImages/${input.imagepath}`
          : null,
        AppointmentNO: null,
        EXPDUEDATE: null,

        REVISIONID: null,
        FirstName: input.firstname,
        MiddleName: input.middlename,
        LastName: input.lastname,
        Doctot_ID2: null,
        Department2: null,
        EmpId: input.empid,
        EmpName: input.empname,
        EmpRefType: input.empreftype,
        EmpDept: input.empdeptid,
        EmpDesgcode: input.empdesgcd,
        ReasonFor: null,
        NATLCODE: input.Nationality,
        RELGCODE: input.Religion,
        fathername: input.fathername,
        CREATED_BY: input.userId,
        CLNORGCODE: input.hospitalId,
        EDITED_BY: null,
        EDITED_ON: null,
      };

      const { records } = await executeDbQuery(sql, params);
      const MRNO = records?.[0]?.MRNO;

      res.json({ status: 0, MRNO, OPDNum: input.OPDNum });
    } catch (err: any) {
      res.json({ status: 1, message: err.message });
    }
  }

  async generateBillInsert(req: Request, res: Response): Promise<void> {
    const input = req.body;

    const sql = ` INSERT INTO OPD_BILLTRN ( CLNORGCODE, FINYEAR, CASHCOUNTER, BILLTYPE, BILLNO, SERVCODE, QUANTITY, COVRATE, UNCOVRATE, NETRATE, PATAMOUNT, COMAMOUNT, PATCNAMT, COMCNAMT, PATDISC, COMDISC, OPCNNO, REMARKS, ORDGENYN, SERCANSTAT, RFNDSTAT, DGREGSTAT, DEPTCODE, LEDGRPCODE, SRVGRPCODE, TRAN_PERIOD, FUNDSOURCE, SUBGRPCODE, SRVTYPCODE, SERDISCOUNT, NET, RATE, AMOUNT, DOCTCODE, DOCTSHARE, TECHSHARE, SURCHARGE, ADDSURCHRG, DOCTAMT, HOSPSHARE, ORGDOCSHAR, TRANCODE, SURCHRGNOT, SHARDOCT, SURGCODE, PACKAGECODE, DOCTPOSTDT, SRVTAXYN, SRVTAXAMT, EDUCESAMT, SHECESAMT, RENDQTY, DOCTPOST, CREATED_BY, CREATED_ON, STATUS, Dper, RevisionId ) VALUES ( @CLNORGCODE, (SELECT finyear FROM Mst_AccYear WHERE UPPER(OpenStatus) = 'O' AND UPPER(CurrentFinancialYear) = 'Y' AND CLNORGCODE = @CLNORGCODE), @CASHCOUNTER, @BILLTYPE, @BILLNO, @SERVCODE, @QUANTITY, @COVRATE, @UNCOVRATE, @NETRATE, @PATAMOUNT, @COMAMOUNT, @PATCNAMT, @COMCNAMT, @PATDISC, @COMDISC, @OPCNNO, @REMARKS, @ORDGENYN, @SERCANSTAT, @RFNDSTAT, @DGREGSTAT, @DEPTCODE, @LEDGRPCODE, @SRVGRPCODE, @TRAN_PERIOD, @FUNDSOURCE, @SUBGRPCODE, @SRVTYPCODE, @SERDISCOUNT, @NET, @RATE, @AMOUNT, @DOCTCODE, @DOCTSHARE, @TECHSHARE, @SURCHARGE, @ADDSURCHRG, @DOCTAMT, @HOSPSHARE, @ORGDOCSHAR, @TRANCODE, @SURCHRGNOT, @SHARDOCT, @SURGCODE, @PACKAGECODE, @DOCTPOSTDT, @SRVTAXYN, @SRVTAXAMT, @EDUCESAMT, @SHECESAMT, @RENDQTY, @DOCTPOST, @CREATED_BY, GETDATE(), 'A', @Dper, @RevisionId ) `;

    try {
      const params = { CLNORGCODE: input.CLNORGCODE, CASHCOUNTER: input.CASHCOUNTER, BILLTYPE: input.BILLTYPE, BILLNO: input.BILLNO, SERVCODE: input.SERVCODE, QUANTITY: input.QUANTITY, COVRATE: input.COVRATE, UNCOVRATE: input.UNCOVRATE, NETRATE: input.NETRATE, PATAMOUNT: input.PATAMOUNT, COMAMOUNT: input.COMAMOUNT, PATCNAMT: input.PATCNAMT, COMCNAMT: input.COMCNAMT, PATDISC: input.PATDISC, COMDISC: input.COMDISC, OPCNNO: input.OPCNNO, REMARKS: input.REMARKS, ORDGENYN: input.ORDGENYN, SERCANSTAT: input.SERCANSTAT, RFNDSTAT: input.RFNDSTAT, DGREGSTAT: input.DGREGSTAT, DEPTCODE: input.DEPTCODE, LEDGRPCODE: input.LEDGRPCODE, SRVGRPCODE: input.SRVGRPCODE, TRAN_PERIOD: input.TRAN_PERIOD, FUNDSOURCE: input.FUNDSOURCE, SUBGRPCODE: input.SUBGRPCODE, SRVTYPCODE: input.SRVTYPCODE, SERDISCOUNT: input.SERDISCOUNT, NET: input.NET, RATE: input.RATE, AMOUNT: input.AMOUNT, DOCTCODE: input.DOCTCODE, DOCTSHARE: input.DOCTSHARE, TECHSHARE: input.TECHSHARE, SURCHARGE: input.SURCHARGE, ADDSURCHRG: input.ADDSURCHRG, DOCTAMT: input.DOCTAMT, HOSPSHARE: input.HOSPSHARE, ORGDOCSHAR: input.ORGDOCSHAR, TRANCODE: input.TRANCODE, SURCHRGNOT: input.SURCHRGNOT, SHARDOCT: input.SHARDOCT, SURGCODE: input.SURGCODE, PACKAGECODE: input.PACKAGECODE, DOCTPOSTDT: input.DOCTPOSTDT, SRVTAXYN: input.SRVTAXYN, SRVTAXAMT: input.SRVTAXAMT, EDUCESAMT: input.EDUCESAMT, SHECESAMT: input.SHECESAMT, RENDQTY: input.RENDQTY, DOCTPOST: input.DOCTPOST, CREATED_BY: input.CREATED_BY, Dper: input.Dper, RevisionId: input.RevisionId };

      const { rowsAffected } = await executeDbQuery(sql, params);

      if (rowsAffected[0] === 1) {
        res.json({ status: 0, result: "Inserted successfully", billNo: input.BILLNO });
      } else {
        res.json({ status: 1, result: "Insert failed" });
      }

    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }
  }

}