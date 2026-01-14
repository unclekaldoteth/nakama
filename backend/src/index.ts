import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import creatorsRouter from './routes/creators';
import usersRouter from './routes/users';
import gatedRouter from './routes/gated';
import ethosRouter from './routes/ethos';
import tokensRouter from './routes/tokens';
import { createIndexer } from './indexer/eventIndexer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware
const rawOriginList = [
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URLS,
    process.env.FRONTEND_URL,
]
    .filter(Boolean)
    .join(',');
const allowedOrigins = rawOriginList
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => origin.replace(/\/$/, ''));
const allowAllOrigins = allowedOrigins.includes('*')
    || process.env.CORS_ALLOW_ALL === 'true'
    || process.env.NODE_ENV !== 'production';

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        if (allowAllOrigins) return callback(null, true);
        if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/creator', creatorsRouter);
app.use('/api/me', usersRouter);
app.use('/api/gated', gatedRouter);
app.use('/api/ethos', ethosRouter);
app.use('/api/tokens', tokensRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server and indexer
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start event indexer if configured
    const indexer = createIndexer(pool);
    if (indexer) {
        indexer.start().catch(console.error);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down...');
            indexer.stop();
            pool.end();
            process.exit(0);
        });
    }
});

export default app;
