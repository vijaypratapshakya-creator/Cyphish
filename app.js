import express from 'express';
import mongoose from 'mongoose';
import logger from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { getClientIP } from './utils/utils.js';
import { getMongoUri } from './utils/dbUtils.js';
import { getSystemSettings } from './services/systemSettingService.js';
import { startReportScheduler } from './services/reportScheduler.js';
import { startCampaignScheduler } from './services/campaignScheduler.js';

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Validate minimum required environment variables
const validateEnvVars = () => {
    const requiredEnvVars = ['NODE_ENV', 'ADMIN_PASSWORD', 'SESSION_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required bootstrap environment variable(s): ${missingVars.join(', ')}`);
    }
};

try {
    validateEnvVars();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 8080;
const dbUri = getMongoUri();

// Trust proxy headers for reverse proxy setups (Nginx, ALB, Caddy)
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1);

// Middlewares
app.use(express.json({ limit: '256kb' }));
app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
    contentSecurityPolicy: false, // Allows flexible intranet dashboard rendering and avatars
}));

if (process.env.NODE_ENV === 'development') {
    const sensitivePaths = ['/api/users/me/change-password', '/api/integrations/ai', '/api/system/settings'];
    const redactKeys = ['password', 'currentPassword', 'newPassword', 'apiKey', 'bindPassword'];
    logger.token("body", (req) => {
        const url = (req.originalUrl || req.url || '').split('?')[0];
        if (sensitivePaths.some((p) => url.includes(p)) && req.body && typeof req.body === 'object') {
            const redacted = { ...req.body };
            redactKeys.forEach((k) => { if (redacted[k] !== undefined) redacted[k] = '[REDACTED]'; });
            return JSON.stringify(redacted);
        }
        return JSON.stringify(req.body);
    });
    logger.token("ip", (req) => getClientIP(req));
    app.use(logger(":method :url :status :res[content-length] - :response-time ms :ip :body"));
}

// API Routes
app.use(routes);
app.use(errorHandler);

// Serve React static files
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'client/build')));

// React routing fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Connect to MongoDB and start background services
mongoose.connect(dbUri)
    .then(async () => {
        console.log('Connected to MongoDB successfully.');
        
        // Initialize database-backed system settings
        await getSystemSettings().catch((e) => console.warn('System settings init warning:', e.message));

        app.listen(port, () => {
            console.log(`CyPhish server started on Port ${port}`);
            startReportScheduler();
            startCampaignScheduler();
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });

export default app;
