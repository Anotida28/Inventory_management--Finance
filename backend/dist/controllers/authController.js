"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.registerInitialUser = exports.getAuthBootstrapStatus = void 0;
const authData_1 = require("../lib/authData");
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected server error";
};
const getAuthBootstrapStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, authData_1.getAuthBootstrapStatusData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving auth status" });
    }
});
exports.getAuthBootstrapStatus = getAuthBootstrapStatus;
const registerInitialUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authResponse = (0, authData_1.registerInitialUserData)({
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
        });
        res.status(201).json(authResponse);
    }
    catch (error) {
        const message = getErrorMessage(error);
        if (message === "The system has already been initialized" ||
            message === "Missing required user fields" ||
            message === "A valid email address is required" ||
            message === "Password must be at least 8 characters long" ||
            message.includes("Username must be")) {
            res.status(400).json({ message });
            return;
        }
        if (message === "Username is already in use" ||
            message === "Email is already in use") {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Error creating initial user" });
    }
});
exports.registerInitialUser = registerInitialUser;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authResponse = (0, authData_1.loginUserData)({
            username: req.body.username,
            password: req.body.password,
        });
        res.json(authResponse);
    }
    catch (error) {
        const message = getErrorMessage(error);
        if (message === "Username and password are required") {
            res.status(400).json({ message });
            return;
        }
        if (message === "Invalid username or password" ||
            message === "This account is disabled") {
            res.status(401).json({ message });
            return;
        }
        res.status(500).json({ message: "Error logging in" });
    }
});
exports.login = login;
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const user = (0, authData_1.getUserByIdData)(req.user.userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving current user" });
    }
});
exports.getCurrentUser = getCurrentUser;
