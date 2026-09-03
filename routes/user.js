import express from 'express';
import userController from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.use(authMiddleware);

// Self account management
router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.post('/me/change-password', userController.changePassword);

// Delegated Administration & User Provisioning (Admin only)
router.get('/', requireAdmin, userController.listUsers);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireAdmin, userController.updateUser);
router.patch('/:id/toggle-lock', requireAdmin, userController.toggleLockUser);
router.delete('/:id', requireAdmin, userController.deleteUser);
router.get('/username/:username', requireAdmin, userController.getUserByUsername);
router.get('/email/:email', requireAdmin, userController.getUserByEmail);

export default router;