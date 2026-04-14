import { NextFunction, Request, Response } from "express";
import type { AuthRole, AuthUser } from "../lib/authData";
import { getAuthSessionToken } from "../lib/authSessionCookie";
import { backendRuntime } from "../lib/runtimeClient";

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

const getRequestAccessToken = (req: Request) => {
  return getBearerToken(req.headers.authorization) ?? getAuthSessionToken(req);
};

const attachAuthenticatedUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  options: { optional?: boolean } = {}
) => {
  const token = getRequestAccessToken(req);

  if (!token) {
    if (options.optional) {
      next();
      return;
    }

    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  backendRuntime.auth
    .authenticateToken(token)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(401).json({ message: "Invalid or expired token" });
    });
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
