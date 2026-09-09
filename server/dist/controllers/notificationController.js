"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
async function getNotifications(req, res) {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const notifications = await db_1.default.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        const unreadCount = await db_1.default.notification.count({
            where: { userId: req.user.userId, isRead: false },
        });
        return (0, response_1.sendSuccess)(res, {
            notifications,
            unreadCount,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function markNotificationAsRead(req, res) {
    try {
        const { id } = req.params;
        if (id === 'all') {
            await db_1.default.notification.updateMany({
                where: { userId: req.user.userId },
                data: { isRead: true },
            });
            return (0, response_1.sendSuccess)(res, null, 'All notifications marked as read');
        }
        await db_1.default.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return (0, response_1.sendSuccess)(res, null, 'Notification marked as read');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
