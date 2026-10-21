import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { diagnoseRouter } from './routes/diagnose.js';
import { repairRouter } from './routes/repair.js';
import { prRouter } from './routes/pr.js';
import { historyRouter } from './routes/history.js';
import { settingsRouter } from './routes/settings.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));

// Root service status and platform health checks
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Repo Doctor API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      diagnose: '/api/diagnose',
      repair: '/api/repair/generate',
      pr: '/api/pr/create',
      settings: '/api/settings',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check under /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Repo Doctor API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Register API routes
app.use('/api', diagnoseRouter);
app.use('/api', repairRouter);
app.use('/api', prRouter);
app.use('/api', historyRouter);
app.use('/api', settingsRouter);

app.listen(PORT, () => {
  console.log(`🩺 Repo Doctor Server running on http://localhost:${PORT}`);
});
