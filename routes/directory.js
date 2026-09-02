import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import { directoryStatus, searchDirectory, testConnection } from '../controllers/directoryController.js';

const router = express.Router();
router.use(authMiddleware, requireAdmin);
router.get('/status', directoryStatus);
router.get('/users', searchDirectory);
router.post('/test-connection', testConnection);

export default router;
