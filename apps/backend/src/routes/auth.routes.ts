import { Router } from 'express';
import {
  register, login, getMe, updateProfile, changePassword, deleteAccount,
  googleAuth, googleCallback,
  appleAuth, appleCallback,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Email / password
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/profile',  authenticate, updateProfile);
router.patch('/password', authenticate, changePassword);
router.delete('/account', authenticate, deleteAccount);

// Google OAuth
router.get('/google',          googleAuth);
router.get('/google/callback', googleCallback);

// Apple Sign In  (Apple POSTs back with form data)
router.get('/apple',           appleAuth);
router.post('/apple/callback', appleCallback);

export default router;
