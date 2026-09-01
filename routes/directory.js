import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import { directoryStatus, searchDirectory } from '../controllers/directoryController.js';

const router = express.Router();
router.use(authMiddleware, requireAdmin);
router.get('/status', directoryStatus);
router.get('/users', searchDirectory);
export default router;
