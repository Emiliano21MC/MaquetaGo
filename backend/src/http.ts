import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface AuthRequest extends Request {
  studentId?: number;
}
export function auth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) throw new Error();
    const payload = jwt.verify(token, env.jwt) as jwt.JwtPayload;
    if (payload.purpose !== "session" || !Number.isInteger(Number(payload.sub)))
      throw new Error();
    req.studentId = Number(payload.sub);
    next();
  } catch {
    next(new HttpError(401, "Vuelve a iniciar sesión."));
  }
}
export const session = (id: number) =>
  jwt.sign({ purpose: "session" }, env.jwt, {
    subject: String(id),
    expiresIn: "7d",
  });
export function student(req: Request) {
  const id = (req as AuthRequest).studentId;
  if (!id) throw new HttpError(401, "Inicia sesión.");
  return id;
}
