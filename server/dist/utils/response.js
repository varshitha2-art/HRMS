"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message, meta, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
    });
}
function sendError(res, error, statusCode = 400, message) {
    return res.status(statusCode).json({
        success: false,
        message: message || error,
        error,
    });
}
