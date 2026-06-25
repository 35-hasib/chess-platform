import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "./jwt.js";

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

/** Rejects the request with 401 if no valid token is present. */
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = payload;
  next();
}

/** Attaches user if a valid token exists, but never rejects. */
export function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) req.user = payload;
  next();
}
