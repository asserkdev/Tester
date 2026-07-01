import express from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './storage/database.js';
import apiRouter from './api/index.js';
import './analyzers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'L.A.I. Web Inspector API',
    version: '1.0.0',
    description: 'Automated website analysis platform',
    endpoints: {
      health: '/api/v1/health',
      scans: '/api/v1/scans',
      analyzers: '/api/v1/analyzers',
    },
  });
});

initializeDatabase();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     L.A.I. Web Inspector - Backend API                    ║
║                                                           ║
║     Server running on http://localhost:${PORT}               ║
║     API available at http://localhost:${PORT}/api/v1         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
