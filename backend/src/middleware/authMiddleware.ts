import { NextFunction, Request, Response } from "express";
import {
  AuthRole,
  AuthUser,
  getUserByIdData,
  verifyAccessToken,
} from "../lib/authData";

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

const getBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return undefined;
  }

  return token;
};

const attachAuthenticatedUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  options: { optional?: boolean } = {}
) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    if (options.optional) {
      next();
      return;
    }

    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = getUserByIdData(payload.sub);

    if (!user || user.status !== "Active") {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => attachAuthenticatedUser(req, res, next);

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => attachAuthenticatedUser(req, res, next, { optional: true });

export const requireRole = (...roles: AuthRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
};
