const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');

const { connectMongo } = require('./config/mongoose');
const { rateLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { authenticate } = require('./middleware/auth.middleware');
const cleanupService = require('./services/cleanup.service');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const studentRoutes = require('./routes/student.routes');
const { seedAll } = require('./services/seed.service');

const app = express();
const server = createServer(app);

app.set('trust proxy', true);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

app.use(cors({
  origin: [
    'http://localhost', 'http://localhost:80',
    'http://localhost:5173', 'http://localhost:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'examslot-backend',
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'ExamSlot Backend API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      admin: '/api/admin/*',
      student: '/api/student/*',
    },
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/student', authenticate, studentRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await connectMongo();

    // RabbitMQ is optional — don't crash if unavailable
    try {
      const { connectRabbitMQ } = require('./config/rabbitmq');
      await connectRabbitMQ();
    } catch (err) {
      console.warn('[RabbitMQ] Not available, skipping:', err.message);
    }

    await seedAll();
    server.listen(PORT, () => {
      console.log(`ExamSlot Backend running on port ${PORT}`);
      cleanupService.start();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

module.exports = app;
