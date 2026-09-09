"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const response_1 = require("../utils/response");
function errorHandler(err, req, res, next) {
    console.error('🔥 Server Error:', err);
    // Prisma unique constraint error
    if (err.code === 'P2002') {
        const field = err.meta?.target ? `for ${err.meta.target}` : '';
        return (0, response_1.sendError)(res, `A duplicate record already exists ${field}`, 409);
    }
    // Prisma record not found error
    if (err.code === 'P2025') {
        return (0, response_1.sendError)(res, 'Requested record was not found in the database', 404);
    }
    // Generic handled or unhandled errors
    const message = err.message || 'An internal server error occurred';
    const statusCode = err.statusCode || 500;
    return (0, response_1.sendError)(res, message, statusCode);
}
