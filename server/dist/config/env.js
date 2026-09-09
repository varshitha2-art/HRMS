"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load root .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
// Also load local server .env if present
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    jwtSecret: process.env.JWT_SECRET || 'vphs_erp_super_secure_jwt_secret_key_2026_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    uploadDir: path_1.default.resolve(__dirname, '../../../uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    // Optional external integrations (disabled by default)
    integrations: {
        email: process.env.ENABLE_EMAIL === 'true',
        sms: process.env.ENABLE_SMS === 'true',
        whatsapp: process.env.ENABLE_WHATSAPP === 'true',
        biometric: process.env.ENABLE_BIOMETRIC === 'true',
        maps: process.env.ENABLE_MAPS === 'true',
        ai: process.env.ENABLE_AI === 'true',
    },
};
