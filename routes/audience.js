import express from 'express';
import {
    createAudience,
    getAllAudiences,
    getAudienceById,
    deleteAudience,
    addContactToAudience,
    deleteContactFromAudience,
    uploadCSVToAudience,
    createAudienceFromAD,
    importADToAudience,
} from '../controllers/audienceController.js';
import { uploadCSV } from '../middlewares/uploadCSV.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireAdmin from '../middlewares/requireAdmin.js';

const router = express.Router();

// Protect routes with authMiddleware
router.use(authMiddleware);
router.use(requireAdmin);

// Create
router.post('/', uploadCSV, createAudience);
router.post('/import-ad', createAudienceFromAD);
router.post('/:id/contact', addContactToAudience);
router.post('/:id/import-ad', importADToAudience);

// Upload CSV to existing audience
router.post('/:id/upload-csv', uploadCSV, uploadCSVToAudience);

// Read
router.get('/', getAllAudiences);
router.get('/:id', getAudienceById);

// Delete
router.delete('/:id', deleteAudience);
router.delete('/:id/contact/:contactId', deleteContactFromAudience);

export default router;
