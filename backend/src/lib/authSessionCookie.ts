import type { CookieOptions, Request, Response } from "express";

export const AUTH_SESSION_COOKIE_NAME = "omds_session";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const resolveSameSite = (): CookieOptions["sameSite"] => {
  const configuredValue = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();

  if (
    configuredValue === "lax" ||
    configuredValue === "strict" ||
    configuredValue === "none"
  ) {
    return configuredValue;
  }

  return "lax";
};

const getBaseCookieOptions = (): CookieOptions => {
  const secure = parseBoolean(
    process.env.AUTH_COOKIE_SECURE,
    process.env.NODE_ENV === "production"
  );
  const sameSite = resolveSameSite();

  if (sameSite === "none" && !secure) {
    throw new Error(
      "AUTH_COOKIE_SAME_SITE=none requires AUTH_COOKIE_SECURE=true"
    );
  }

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  if (cookieDomain) {
    cookieOptions.domain = cookieDomain;
  }

  return cookieOptions;
};

export const setAuthSessionCookie = (
  res: Response,
  accessToken: string,
  options: { persistent?: boolean; maxAgeSeconds?: number } = {}
) => {
  const cookieOptions = getBaseCookieOptions();

  if (options.persistent && options.maxAgeSeconds) {
    cookieOptions.maxAge = options.maxAgeSeconds * 1000;
  }

  res.cookie(AUTH_SESSION_COOKIE_NAME, accessToken, cookieOptions);
};

export const clearAuthSessionCookie = (res: Response) => {
  res.clearCookie(AUTH_SESSION_COOKIE_NAME, getBaseCookieOptions());
};

export const getAuthSessionToken = (req: Request) => {
  const token = req.cookies?.[AUTH_SESSION_COOKIE_NAME];

  if (typeof token !== "string") {
    return undefined;
  }

  const normalizedToken = token.trim();
  return normalizedToken ? normalizedToken : undefined;
};
