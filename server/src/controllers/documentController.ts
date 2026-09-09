import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import { logAuditAction } from '../middleware/audit';
import path from 'path';
import fs from 'fs';
import {
  buildDocumentWhereClause,
  canAccessEmployee,
} from '../services/rbacService';

export async function getDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { employeeId, documentType, status } = req.query as Record<string, string>;

    let baseWhere: any = {};

    if (employeeId) baseWhere.employeeId = employeeId;
    if (documentType) baseWhere.documentType = documentType;
    if (status) baseWhere.status = status;

    // Apply strict database-level RBAC filtering
    const where = await buildDocumentWhereClause(req.user, baseWhere);

    const documents = await prisma.document.findMany({
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
        } else if (exp <= thirtyDaysFromNow) {
          currentStatus = 'EXPIRING';
        } else {
          currentStatus = 'VALID';
        }
      }
      return {
        ...doc,
        status: currentStatus,
      };
    });

    return sendSuccess(res, evaluatedDocs);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const file = req.file;
    if (!file) {
      return sendError(res, 'No file uploaded or file rejected by validator', 400);
    }

    const { employeeId, documentType, title, expiryDate } = req.body;

    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeId }] },
    });

    if (!emp) {
      fs.unlinkSync(file.path);
      return sendError(res, 'Employee not found', 404);
    }

    // RBAC Security Check
    const hasAccess = await canAccessEmployee(req.user, emp.id);
    if (!hasAccess) {
      fs.unlinkSync(file.path);
      return sendError(res, 'Access denied: You cannot upload documents for this employee', 403);
    }

    const fileUrl = `/uploads/${file.filename}`;
    const expDate = expiryDate ? new Date(expiryDate) : null;

    let status = 'VALID';
    if (expDate) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expDate < now) status = 'EXPIRED';
      else if (expDate <= thirtyDays) status = 'EXPIRING';
    }

    const document = await prisma.document.create({
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

    await logAuditAction(req.user?.userId, 'DOCUMENT', 'CREATE', document.id, { employeeId: emp.employeeId, documentType, title }, req.ip);

    return sendSuccess(res, document, 'Document uploaded successfully', undefined, 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return sendError(res, 'Document not found', 404);
    }

    // RBAC Check
    const hasAccess = await canAccessEmployee(req.user, doc.employeeId);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You cannot delete documents for this employee', 403);
    }

    // Try to remove file from disk
    try {
      const filename = path.basename(doc.fileUrl);
      const filePath = path.join(__dirname, '../../../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('File cleanup warning:', err);
    }

    await prisma.document.delete({ where: { id } });
    await logAuditAction(req.user?.userId, 'DOCUMENT', 'DELETE', id, { title: doc.title, documentType: doc.documentType }, req.ip);

    return sendSuccess(res, null, 'Document deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}
