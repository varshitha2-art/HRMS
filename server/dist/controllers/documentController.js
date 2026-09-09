"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocuments = getDocuments;
exports.uploadDocument = uploadDocument;
exports.deleteDocument = deleteDocument;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const audit_1 = require("../middleware/audit");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rbacService_1 = require("../services/rbacService");
async function getDocuments(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { employeeId, documentType, status } = req.query;
        let baseWhere = {};
        if (employeeId)
            baseWhere.employeeId = employeeId;
        if (documentType)
            baseWhere.documentType = documentType;
        if (status)
            baseWhere.status = status;
        // Apply strict database-level RBAC filtering
        const where = await (0, rbacService_1.buildDocumentWhereClause)(req.user, baseWhere);
        const documents = await db_1.default.document.findMany({
            where,
            orderBy: { uploadedAt: 'desc' },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                        site: { select: { siteName: true } },
                    },
                },
            },
        });
        // Check and update expiring / expired status dynamically
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const evaluatedDocs = documents.map(doc => {
            let currentStatus = doc.status;
            if (doc.expiryDate) {
                const exp = new Date(doc.expiryDate);
                if (exp < now) {
                    currentStatus = 'EXPIRED';
                }
                else if (exp <= thirtyDaysFromNow) {
                    currentStatus = 'EXPIRING';
                }
                else {
                    currentStatus = 'VALID';
                }
            }
            return {
                ...doc,
                status: currentStatus,
            };
        });
        return (0, response_1.sendSuccess)(res, evaluatedDocs);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function uploadDocument(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const file = req.file;
        if (!file) {
            return (0, response_1.sendError)(res, 'No file uploaded or file rejected by validator', 400);
        }
        const { employeeId, documentType, title, expiryDate } = req.body;
        const emp = await db_1.default.employee.findFirst({
            where: { OR: [{ id: employeeId }, { employeeId }] },
        });
        if (!emp) {
            fs_1.default.unlinkSync(file.path);
            return (0, response_1.sendError)(res, 'Employee not found', 404);
        }
        // RBAC Security Check
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, emp.id);
        if (!hasAccess) {
            fs_1.default.unlinkSync(file.path);
            return (0, response_1.sendError)(res, 'Access denied: You cannot upload documents for this employee', 403);
        }
        const fileUrl = `/uploads/${file.filename}`;
        const expDate = expiryDate ? new Date(expiryDate) : null;
        let status = 'VALID';
        if (expDate) {
            const now = new Date();
            const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (expDate < now)
                status = 'EXPIRED';
            else if (expDate <= thirtyDays)
                status = 'EXPIRING';
        }
        const document = await db_1.default.document.create({
            data: {
                employeeId: emp.id,
                documentType: documentType || 'OTHER',
                title: title || file.originalname,
                fileUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                expiryDate: expDate,
                status,
                isVerified: true,
                verifiedById: req.user?.userId || null,
            },
            include: { employee: true },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'DOCUMENT', 'CREATE', document.id, { employeeId: emp.employeeId, documentType, title }, req.ip);
        return (0, response_1.sendSuccess)(res, document, 'Document uploaded successfully', undefined, 201);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function deleteDocument(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { id } = req.params;
        const doc = await db_1.default.document.findUnique({ where: { id } });
        if (!doc) {
            return (0, response_1.sendError)(res, 'Document not found', 404);
        }
        // RBAC Check
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, doc.employeeId);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You cannot delete documents for this employee', 403);
        }
        // Try to remove file from disk
        try {
            const filename = path_1.default.basename(doc.fileUrl);
            const filePath = path_1.default.join(__dirname, '../../../../uploads', filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        catch (err) {
            console.warn('File cleanup warning:', err);
        }
        await db_1.default.document.delete({ where: { id } });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'DOCUMENT', 'DELETE', id, { title: doc.title, documentType: doc.documentType }, req.ip);
        return (0, response_1.sendSuccess)(res, null, 'Document deleted successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
