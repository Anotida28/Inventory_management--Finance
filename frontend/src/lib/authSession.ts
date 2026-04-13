import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SECONDS,
} from "./authConstants";

const isBrowser = () => typeof document !== "undefined";

export const hasAuthSession = () => {
  if (!isBrowser()) {
    return false;
  }

  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${AUTH_SESSION_COOKIE_NAME}=`));
};

export const setAuthSession = (rememberMe: boolean) => {
  if (!isBrowser()) {
    return;
  }

  const cookieParts = [
    `${AUTH_SESSION_COOKIE_NAME}=1`,
    "Path=/",
    "SameSite=Lax",
  ];

  if (rememberMe) {
    cookieParts.push(`Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`);
  }

  document.cookie = cookieParts.join("; ");
};

export const clearAuthSession = () => {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${AUTH_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
};
