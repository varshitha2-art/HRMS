"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
async function getAuditLogs(req, res) {
    try {
        const { module, action, search, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (module)
            where.module = module;
        if (action)
            where.action = action;
        if (search) {
            where.OR = [
                { details: { contains: search } },
                { user: { username: { contains: search } } },
                { recordId: { contains: search } },
            ];
        }
        const [logs, total] = await Promise.all([
            db_1.default.auditLog.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, username: true, role: true, email: true },
                    },
                    employee: {
                        select: { id: true, employeeId: true, firstName: true, lastName: true },
                    },
                },
            }),
            db_1.default.auditLog.count({ where }),
        ]);
        return (0, response_1.sendSuccess)(res, logs, undefined, {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
