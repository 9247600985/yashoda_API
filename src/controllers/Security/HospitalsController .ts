import express, { Request, Response, Router } from "express";
import { executeDbQuery } from "../../db";
import { authenticateToken } from "../../utilities/authMiddleWare";

export default class HospitalsController {

  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/hospitals", this.router);

    this.router.get("/getHospitals", authenticateToken, this.getHospitals.bind(this));
    this.router.post("/insertHospital", authenticateToken, this.insertHospital.bind(this));
    this.router.put("/updateHospital", authenticateToken, this.updateHospital.bind(this));
    this.router.put("/cancelHospital", authenticateToken, this.cancelHospital.bind(this));
    this.router.get("/getCompCode", authenticateToken, this.getCompCode.bind(this));
  }

  async getHospitals(req: Request, res: Response) {
    const query = `SELECT * FROM HospitalsList`;
    const { records } = await executeDbQuery(query);

    const data = records.map((r: any) => ({
      CODE: r.Hospital_Id,
      NAME: r.HospitalName,
      ADDRESS1: r.Address,
      ADDRESS2: r.Phone_No,
      STATUS: r.STATUS === 'A' ? 'Active' : 'Inactive'
    }));

    res.json({ status: 0, d: data });
  }

  async insertHospital(req: Request, res: Response) {

    const d = req.body;

    await executeDbQuery(`
      INSERT INTO HospitalsList
      (Hospital_Id, HospitalName, Phone_No, Address, Email, Website, GST_No, STATUS, AllowSMS, Image)
      VALUES
      (@HospitalId, @HospitalName, @Phone_No, @Address, @Email, @Website, @GST_No, @STATUS, @AllowSMS, @Image)
    `, d);

    await executeDbQuery(`
      INSERT INTO INV_PURCOMP_CLINICLINK
      (CLINIC_ID, COMP_ID)
      VALUES (@HospitalId, @Purchase_Company)
    `, d);

    res.json({ status: 0 });
  }

  async updateHospital(req: Request, res: Response) {

    const d = req.body;

    await executeDbQuery(`
      UPDATE HospitalsList SET
      HospitalName=@HospitalName,
      Phone_No=@Phone_No,
      Address=@Address,
      Email=@Email,
      Website=@Website,
      GST_No=@GST_No,
      STATUS=@STATUS,
      AllowSMS=@AllowSMS,
      Image=@Image
      WHERE Hospital_Id=@HospitalId
    `, d);

    await executeDbQuery(`
      UPDATE INV_PURCOMP_CLINICLINK
      SET COMP_ID=@Purchase_Company
      WHERE CLINIC_ID=@HospitalId
    `, d);

    res.json({ status: 0 });
  }

  async cancelHospital(req: Request, res: Response) {
    const { HospitalId, STATUS } = req.body;

    await executeDbQuery(`
      UPDATE HospitalsList SET STATUS=@STATUS
      WHERE Hospital_Id=@HospitalId
    `, { HospitalId, STATUS });

    res.json({ status: 0 });
  }

  async getCompCode(req: Request, res: Response) {

    const { HospitalId } = req.query;

    const { records } = await executeDbQuery(`
      SELECT COMP_ID FROM INV_PURCOMP_CLINICLINK
      WHERE CLINIC_ID=@HospitalId
    `, { HospitalId });

    res.json({
      status: 0,
      d: records[0]?.COMP_ID || ''
    });
  }
}