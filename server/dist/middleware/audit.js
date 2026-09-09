"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditAction = logAuditAction;
const db_1 = __importDefault(require("../config/db"));
async function logAuditAction(userId, module, action, recordId, details, ipAddress) {
    try {
        await db_1.default.auditLog.create({
            data: {
                userId: userId || null,
                module,
                action,
                recordId: recordId || null,
                details: typeof details === 'string' ? details : JSON.stringify(details || {}),
                ipAddress: ipAddress || '127.0.0.1',
            },
        });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
