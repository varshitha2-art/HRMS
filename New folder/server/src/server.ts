import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', config.clientUrl],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static upload files
app.use('/uploads', express.static(config.uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), app: 'VPHS Services ERP' });
});

// Root landing redirect to frontend
app.get('/', (req, res) => {
  res.redirect('http://localhost:5173');
});

// API Routes
app.use('/api', routes);

// Centralized Error Handling
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VPHS Services Pvt. Ltd. ERP Server is running!`);
  console.log(`📍 Port: ${config.port}`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`📁 Uploads Directory: ${config.uploadDir}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api`);
  console.log(`=======================================================`);
});

export default app;
