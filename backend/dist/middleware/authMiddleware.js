"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.requireAuth = void 0;
const authData_1 = require("../lib/authData");
const getBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        return undefined;
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return undefined;
    }
    return token;
};
const attachAuthenticatedUser = (req, res, next, options = {}) => {
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
        const payload = (0, authData_1.verifyAccessToken)(token);
        const user = (0, authData_1.getUserByIdData)(payload.sub);
        if (!user || user.status !== "Active") {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
const requireAuth = (req, res, next) => attachAuthenticatedUser(req, res, next);
exports.requireAuth = requireAuth;
const optionalAuth = (req, res, next) => attachAuthenticatedUser(req, res, next, { optional: true });
exports.optionalAuth = optionalAuth;
const requireRole = (...roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
