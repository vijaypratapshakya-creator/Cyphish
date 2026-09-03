import express from 'express';
import {
    createSenderProfile,
    getAllSenderProfiles,
    getSenderProfileById,
    updateSenderProfile,
    deleteSenderProfile,
    testConnection,
} from '../controllers/senderProfileController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRoles(['admin', 'campaign_manager']));

// Test connection & TLS handshake
router.post('/test-connection', testConnection);

// CRUD
router.get('/', getAllSenderProfiles);
router.get('/:id', getSenderProfileById);
router.post('/', createSenderProfile);
router.put('/:id', updateSenderProfile);
router.delete('/:id', deleteSenderProfile);

export default router;
