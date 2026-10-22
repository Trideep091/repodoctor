import express from 'express';
import cors from 'cors';
import { diagnoseRouter } from './routes/diagnose.js';
import { repairRouter } from './routes/repair.js';
import { prRouter } from './routes/pr.js';
import { historyRouter } from './routes/history.js';
import { settingsRouter } from './routes/settings.js';
export const app = express();
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*';
app.use(cors({
    origin: corsOrigin,
    credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
// Health checks under root and /health
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
// Mount routes under /api (standard path)
app.use('/api', diagnoseRouter);
app.use('/api', repairRouter);
app.use('/api', prRouter);
app.use('/api', historyRouter);
app.use('/api', settingsRouter);
// Also mount routes under / to support environments where /api prefix is stripped by rewrites
app.use('/', diagnoseRouter);
app.use('/', repairRouter);
app.use('/', prRouter);
app.use('/', historyRouter);
app.use('/', settingsRouter);
// JSON 404 Handler distinguishing missing API routes
app.use((req, res) => {
    res.status(404).json({
        error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
        code: 'API_ROUTE_NOT_FOUND',
    });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[RepoDoctor Error]', err);
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_SERVER_ERROR',
    });
});
export default app;
