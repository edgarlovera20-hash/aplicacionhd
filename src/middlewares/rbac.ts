import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt.js";

export const requireRole = (...allowed: string[]) => {
  const allowedLC = allowed.map((r) => r.toLowerCase());

  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = (req.headers["authorization"] || "").toString();
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) return res.status(401).json({ error: "No autenticado" });

    const payload = verifyAccessToken(token) as any;
    if (!payload) return res.status(401).json({ error: "Sesión expirada" });

    const role = (payload?.role || "").toLowerCase();

    if (allowedLC.length && !allowedLC.includes(role)) {
      return res.status(403).json({ error: "Sin permisos" });
    }

    (req as any).sess = payload;
    next();
  };
};