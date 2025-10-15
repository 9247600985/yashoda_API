import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logInfo } from "./logger";

// const accessTokenKey = crypto.randomBytes(32).toString("hex");
// const refreshTokenKey = crypto.randomBytes(32).toString("hex");
// logInfo(`AccessToken Secret:, ${accessTokenKey}`);
// logInfo(`RefreshToken Secret:", ${refreshTokenKey}`);


export const secrets = {
  accessTokenKey: "ThisIsYourFixedAccessTokenSecretKey12345",
  refreshTokenKey: "ThisIsYourFixedRefreshTokenSecretKeyABCDE"
};


export function generateAccessToken(payload: object): string {
    return jwt.sign(payload, secrets.accessTokenKey); // , { expiresIn: "15m" }
}

export function generateRefreshToken(payload: object): string {
    return jwt.sign(payload, secrets.refreshTokenKey); // , { expiresIn: "7d" }
}

export function verifyAccessToken(token: string): any {
    return jwt.verify(token, secrets.accessTokenKey);
}

export function verifyRefreshToken(token: string): any {
    return jwt.verify(token, secrets.refreshTokenKey);
}
