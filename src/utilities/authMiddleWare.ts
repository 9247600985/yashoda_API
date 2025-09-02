import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { secrets } from "./jwtHelper";
import logger from "./logger";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return; 
  }

  jwt.verify(token, secrets.accessTokenKey, (err, decoded) => {
    if (err) {
      res.status(403).json({ message: "Invalid or expired token." });
      return; 
    }

    req.user = decoded as JwtPayload;

    logger.info("Token verified:", {
      userId: req.user?.userId,
      role: req.user?.role,
      route: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    next(); 
  });
}
