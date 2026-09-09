import dotenv from 'dotenv';
import path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also load local server .env if present
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'vphs_erp_super_secure_jwt_secret_key_2026_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: path.resolve(__dirname, '../../../uploads'),
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
