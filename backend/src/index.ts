import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import creatorsRouter from './routes/creators';
import usersRouter from './routes/users';
import gatedRouter from './routes/gated';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
