"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const SALT = 'vphs_salt_2026';
function hashPassword(password) {
    return crypto_1.default.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}
function comparePassword(password, hash) {
    const computed = hashPassword(password);
    return computed === hash;
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, { expiresIn: env_1.config.jwtExpiresIn });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
}
