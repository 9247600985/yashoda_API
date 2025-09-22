import express, { Application, Request, Response, Router } from "express";
import { executeDbQuery } from "../db";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utilities/jwtHelper";

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

    try {
      const result = await executeDbQuery(query, params);
      const user = result.records?.[0];

      if (user) {
        const payload = { userId: user.USERID, role: user.Role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        
        res.json({ status: 0, result: "Logged in successfully", accessToken, refreshToken });
      } else {
        res.json({ status: 1, result: "Login failed" });
      }
    } catch (err: any) {
      res.json({ status: 1, result: err.message });
    }

  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ status: 1, result: "No refresh token provided" });
      return;
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);

      const payload = { userId: decoded.userId, role: decoded.role };

      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload); 

      res.json({
        status: 0,
        result: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, 
      });
    } catch (err: any) {
      res.status(403).json({ status: 1, result: "Invalid or expired refresh token" });
    }
  }
}