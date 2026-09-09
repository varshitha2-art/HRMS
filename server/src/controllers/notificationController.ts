import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });

    return sendSuccess(res, {
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'All notifications marked as read');
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return sendSuccess(res, null, 'Notification marked as read');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}
