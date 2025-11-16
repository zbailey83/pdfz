import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';
import dataRoutes from './routes/data';
import modelRoutes from './routes/models';
import optimizerRoutes from './routes/optimizer';
import forecastRoutes from './routes/forecast';
import reportRoutes from './routes/reports';
import integrationRoutes from './routes/integrations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/v1/models', modelRoutes);
app.use('/api/v1/optimizer', optimizerRoutes);
app.use('/api/v1/forecast', forecastRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/integrations', integrationRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;

