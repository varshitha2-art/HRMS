"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
// Ensure uploads directory exists
if (!fs_1.default.existsSync(env_1.config.uploadDir)) {
    fs_1.default.mkdirSync(env_1.config.uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, env_1.config.uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const basename = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    },
});
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
];
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: env_1.config.maxFileSizeMb * 1024 * 1024, // in bytes
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: Images, PDFs, Excel/CSV.`));
        }
    },
});
