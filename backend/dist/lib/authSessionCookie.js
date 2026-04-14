"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthSessionToken = exports.clearAuthSessionCookie = exports.setAuthSessionCookie = exports.AUTH_SESSION_COOKIE_NAME = void 0;
exports.AUTH_SESSION_COOKIE_NAME = "omds_session";
const parseBoolean = (value, fallback) => {
    if (typeof value !== "string") {
        return fallback;
    }
    return value.toLowerCase() === "true";
};
const resolveSameSite = () => {
    var _a;
    const configuredValue = (_a = process.env.AUTH_COOKIE_SAME_SITE) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (configuredValue === "lax" ||
        configuredValue === "strict" ||
        configuredValue === "none") {
        return configuredValue;
    }
    return "lax";
};
const getBaseCookieOptions = () => {
    var _a;
    const secure = parseBoolean(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === "production");
    const sameSite = resolveSameSite();
    if (sameSite === "none" && !secure) {
        throw new Error("AUTH_COOKIE_SAME_SITE=none requires AUTH_COOKIE_SECURE=true");
    }
    const cookieOptions = {
        httpOnly: true,
        path: "/",
        sameSite,
        secure,
    };
    const cookieDomain = (_a = process.env.AUTH_COOKIE_DOMAIN) === null || _a === void 0 ? void 0 : _a.trim();
    if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
    }
    return cookieOptions;
};
const setAuthSessionCookie = (res, accessToken, options = {}) => {
    const cookieOptions = getBaseCookieOptions();
    if (options.persistent && options.maxAgeSeconds) {
        cookieOptions.maxAge = options.maxAgeSeconds * 1000;
    }
    res.cookie(exports.AUTH_SESSION_COOKIE_NAME, accessToken, cookieOptions);
};
exports.setAuthSessionCookie = setAuthSessionCookie;
const clearAuthSessionCookie = (res) => {
    res.clearCookie(exports.AUTH_SESSION_COOKIE_NAME, getBaseCookieOptions());
};
exports.clearAuthSessionCookie = clearAuthSessionCookie;
const getAuthSessionToken = (req) => {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[exports.AUTH_SESSION_COOKIE_NAME];
    if (typeof token !== "string") {
        return undefined;
    }
    const normalizedToken = token.trim();
    return normalizedToken ? normalizedToken : undefined;
};
exports.getAuthSessionToken = getAuthSessionToken;
