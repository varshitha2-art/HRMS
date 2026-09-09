"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRoles = requireRoles;
const auth_1 = require("../utils/auth");
const response_1 = require("../utils/response");
const db_1 = __importDefault(require("../config/db"));
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return (0, response_1.sendError)(res, 'Authentication token missing or invalid', 401);
        }
        const token = authHeader.split(' ')[1];
        const payload = (0, auth_1.verifyToken)(token);
        let employee = null;
        if (payload.employeeId) {
            employee = await db_1.default.employee.findUnique({
                where: { employeeId: payload.employeeId },
                include: {
                    siteAssignments: { where: { status: 'ACTIVE' } },
                    department: true,
                    designation: true,
                    site: true,
                },
            });
        }
        req.user = {
            ...payload,
            id: payload.userId,
            employee,
        };
        next();
    }
    catch (error) {
        return (0, response_1.sendError)(res, 'Session expired or invalid token', 401);
    }
}
function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        // SUPER_ADMIN has access to everything
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        if (!allowedRoles.includes(req.user.role)) {
            return (0, response_1.sendError)(res, `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`, 403);
        }
        next();
    };
}
