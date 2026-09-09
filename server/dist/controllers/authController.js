"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.quickDemoLogin = quickDemoLogin;
exports.getMe = getMe;
exports.logout = logout;
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../utils/auth");
const response_1 = require("../utils/response");
const schemas_1 = require("../validators/schemas");
const audit_1 = require("../middleware/audit");
const rbacService_1 = require("../services/rbacService");
const USERNAME_ALIASES = {
    rahul: 'rahul',
    'k.rahul': 'rahul',
    'rahul.kumar': 'rahul',
    'k.rahul kumar': 'rahul',
    super_admin: 'rahul',
    superadmin: 'rahul',
    admin: 'admin',
    richardson: 'richardson',
    supriya: 'supriya',
    hr_admin: 'supriya',
    'supriya.gundreddy': 'supriya',
    hr: 'supriya',
    gous: 'gous',
    site_manager: 'gous',
    'abdul.gous': 'gous',
    prithviraj: 'prithviraj',
    supervisor: 'prithviraj',
    'prithviraj.heerekar': 'prithviraj',
    sairam: 'vphs0040',
    rehan: 'vphs0050',
    ramarajyam: 'vphs0010',
    employee: 'vphs0040',
};
const ROLE_DEMO_USERS = {
    SUPER_ADMIN: 'rahul',
    HR: 'supriya',
    SITE_MANAGER: 'gous',
    SUPERVISOR: 'prithviraj',
    EMPLOYEE: 'vphs0040',
};
async function login(req, res) {
    try {
        const validated = schemas_1.loginSchema.parse(req.body);
        const { username, password } = validated;
        const cleanUsername = username.trim();
        const effectiveUsername = USERNAME_ALIASES[cleanUsername.toLowerCase()] || cleanUsername;
        // Search by username or employeeId or email
        const user = await db_1.default.user.findFirst({
            where: {
                OR: [
                    { username: effectiveUsername },
                    { username: cleanUsername },
                    { employeeId: cleanUsername },
                    { email: cleanUsername },
                    { employee: { employeeId: cleanUsername } },
                ],
            },
            include: {
                employee: {
                    include: {
                        designation: true,
                        department: true,
                        site: true,
                        shift: true,
                        siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
                    },
                },
            },
        });
        if (!user || !user.isActive) {
            return (0, response_1.sendError)(res, 'Invalid credentials or inactive account', 401);
        }
        const isValid = (0, auth_1.comparePassword)(password, user.passwordHash);
        if (!isValid) {
            return (0, response_1.sendError)(res, 'Invalid credentials', 401);
        }
        // Update last login
        await db_1.default.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const token = (0, auth_1.signToken)({
            userId: user.id,
            username: user.username,
            employeeId: user.employeeId,
            role: user.role,
            email: user.email,
        });
        const accessibleSites = await (0, rbacService_1.getAccessibleSiteIds)({
            id: user.id,
            userId: user.id,
            username: user.username,
            employeeId: user.employeeId,
            role: user.role,
            email: user.email,
            employee: user.employee,
        });
        await (0, audit_1.logAuditAction)(user.id, 'AUTH', 'LOGIN', user.id, { username: user.username, role: user.role }, req.ip);
        return (0, response_1.sendSuccess)(res, {
            token,
            user: {
                id: user.id,
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                employeeId: user.employeeId,
                department: user.employee?.department?.name || 'General',
                assignedSites: accessibleSites,
                employee: user.employee,
            },
        }, 'Login successful');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message || 'Login failed', 400);
    }
}
async function quickDemoLogin(req, res) {
    try {
        const { role, username: targetUsername } = req.body;
        let user;
        if (targetUsername) {
            const cleanTarget = targetUsername.trim();
            const mapped = USERNAME_ALIASES[cleanTarget.toLowerCase()] || cleanTarget;
            user = await db_1.default.user.findFirst({
                where: {
                    OR: [
                        { username: mapped },
                        { username: cleanTarget },
                        { employeeId: cleanTarget },
                    ],
                    isActive: true,
                },
                include: {
                    employee: {
                        include: {
                            designation: true,
                            department: true,
                            site: true,
                            shift: true,
                            siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
                        },
                    },
                },
            });
        }
        if (!user && role) {
            const targetUser = ROLE_DEMO_USERS[role];
            if (targetUser) {
                user = await db_1.default.user.findFirst({
                    where: { username: targetUser, isActive: true },
                    include: {
                        employee: {
                            include: {
                                designation: true,
                                department: true,
                                site: true,
                                shift: true,
                                siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
                            },
                        },
                    },
                });
            }
        }
        if (!user) {
            user = await db_1.default.user.findFirst({
                where: { role: role || 'SUPER_ADMIN', isActive: true },
                include: {
                    employee: {
                        include: {
                            designation: true,
                            department: true,
                            site: true,
                            shift: true,
                            siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
                        },
                    },
                },
            });
        }
        if (!user) {
            return (0, response_1.sendError)(res, `No active demo user found for role ${role}`, 404);
        }
        const token = (0, auth_1.signToken)({
            userId: user.id,
            username: user.username,
            employeeId: user.employeeId,
            role: user.role,
            email: user.email,
        });
        const accessibleSites = await (0, rbacService_1.getAccessibleSiteIds)({
            id: user.id,
            userId: user.id,
            username: user.username,
            employeeId: user.employeeId,
            role: user.role,
            email: user.email,
            employee: user.employee,
        });
        await (0, audit_1.logAuditAction)(user.id, 'AUTH', 'LOGIN', user.id, { username: user.username, role: user.role, isQuickDemo: true }, req.ip);
        return (0, response_1.sendSuccess)(res, {
            token,
            user: {
                id: user.id,
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                employeeId: user.employeeId,
                department: user.employee?.department?.name || 'General',
                assignedSites: accessibleSites,
                employee: user.employee,
            },
        }, 'Demo login successful');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function getMe(req, res) {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 'Not authenticated', 401);
        }
        const user = await db_1.default.user.findUnique({
            where: { id: req.user.userId },
            include: {
                employee: {
                    include: {
                        designation: true,
                        department: true,
                        site: true,
                        shift: true,
                        siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
                    },
                },
            },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 'User not found', 404);
        }
        const accessibleSites = await (0, rbacService_1.getAccessibleSiteIds)({
            id: user.id,
            userId: user.id,
            username: user.username,
            employeeId: user.employeeId,
            role: user.role,
            email: user.email,
            employee: user.employee,
        });
        return (0, response_1.sendSuccess)(res, {
            id: user.id,
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            department: user.employee?.department?.name || 'General',
            assignedSites: accessibleSites,
            employee: user.employee,
            lastLogin: user.lastLogin,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function logout(req, res) {
    if (req.user) {
        await (0, audit_1.logAuditAction)(req.user.userId, 'AUTH', 'LOGOUT', req.user.userId, {}, req.ip);
    }
    return (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
}
