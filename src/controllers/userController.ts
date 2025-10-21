import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from "../utilities/jwtHelper";

export default class UserController {
  private router: Router = express.Router();

  constructor(private app: Router) {
    app.use("/user", this.router);

    this.router.post("/login", this.login.bind(this));
    this.router.post("/refreshToken", this.refreshToken.bind(this));

  }

  async login(req: Request, res: Response): Promise<void> {
    const input = req.body;
    const encryptedPassword = Buffer.from(input.password, "utf8").toString("base64");

    const query = `SELECT U.USERID, U.USERNAME, R.Role FROM MST_USERDETAILS U LEFT JOIN MST_ROLES R ON U.ROLES = R.CODE WHERE U.USERID = @userId AND U.PASSWORD = @Password AND U.STATUS = 'A'`;
    const params = { userId: input.userId, Password: encryptedPassword };

    const query1 = `select  UM.USERID, UM.USERNAME, UM.ROLES, UM.MOBILE, UL.CLINICID as CLNORGCODE, TM.CLINIC_NAME as HOSPITALNAME from MST_CLINICTOUSERLINK  UL  inner join Mst_UserDetails UM ON UM.USERID = UL.USERID INNER JOIN TM_CLINICS TM ON TM.CLINIC_CODE = UL.CLINICID where UL.userid = @userId ORDER BY UL.CLINICID `;

    const params1 = { userId: input.userId };

    try {
      const result = await executeDbQuery(query, params);
      const sessions = await executeDbQuery(query1, params1);
      const user = result.records?.[0];

      if (user) {
        const payload = { userId: user.USERID, role: user.Role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.json({ status: 0, result: "Logged in successfully", accessToken, refreshToken, SessionValues: sessions });

      } else {
        res.json({ status: 1, result: "Login failed" });
      }
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }

  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(401).json({ status: 1, result: "No access token provided" });
      return;
    }

    try {
      // Verify the access token instead of refresh token
      const decoded = verifyAccessToken(accessToken);

      const payload = { userId: decoded.userId, role: decoded.role };

      // Issue new tokens
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      res.json({
        status: 0,
        result: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err: any) {
      res.status(403).json({ status: 1, result: "Invalid or expired access token" });
    }
  }

}