"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middleware/error");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// CORS
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', env_1.config.clientUrl],
    credentials: true,
}));
// Body parsers
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Static upload files
app.use('/uploads', express_1.default.static(env_1.config.uploadDir));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), app: 'VPHS Services ERP' });
});
// Root landing redirect to frontend
app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
});
// API Routes
app.use('/api', routes_1.default);
// Centralized Error Handling
app.use(error_1.errorHandler);
app.listen(env_1.config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 VPHS Services Pvt. Ltd. ERP Server is running!`);
    console.log(`📍 Port: ${env_1.config.port}`);
    console.log(`🌐 Environment: ${env_1.config.nodeEnv}`);
    console.log(`📁 Uploads Directory: ${env_1.config.uploadDir}`);
    console.log(`🔗 API Base: http://localhost:${env_1.config.port}/api`);
    console.log(`=======================================================`);
});
exports.default = app;
