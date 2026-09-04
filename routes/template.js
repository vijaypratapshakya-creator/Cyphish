import express from 'express';
import {
    createTemplate,
    getAllTemplates,
    getTemplateList,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
    generateAITemplate,
} from '../controllers/templateController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { uploadHTML } from '../middlewares/uploadHTML.js';
import requireAdmin from '../middlewares/requireAdmin.js';

const router = express.Router();

// Protect routes with authMiddleware
router.use(authMiddleware);
router.use(requireAdmin);

// AI Template Generation
router.post('/ai-generate', generateAITemplate);

// Create a new template (with HTML file upload)
router.post('/', uploadHTML.single('file'), createTemplate);

// Get all templates
router.get('/', getAllTemplates);

// Get templates list (search + pagination) for Saved tab
router.get('/list', getTemplateList);

// Get a specific template by ID
router.get('/:id', getTemplateById);

// Update a template by ID
router.put('/:id', uploadHTML.single('file'), updateTemplate);

// Delete a template by ID
router.delete('/:id', deleteTemplate);

export default router;
