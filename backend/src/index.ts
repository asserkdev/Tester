import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './storage/database.js';
import apiRouter from './api/index.js';
import './analyzers/index.js';

dotenv.config();

// CommonJS compatibility for __dirname
const appDir = __dirname;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend dist
const frontendDistPath = path.join(appDir, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// API routes
app.use('/api/v1', apiRouter);

// Serve frontend for all non-API routes (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

initializeDatabase();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     L.A.I. Web Inspector - Complete Platform             ║
║                                                           ║
║     Server running on http://localhost:${PORT}               ║
║     Frontend available at http://localhost:${PORT}         ║
║     API available at http://localhost:${PORT}/api/v1       ║
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
