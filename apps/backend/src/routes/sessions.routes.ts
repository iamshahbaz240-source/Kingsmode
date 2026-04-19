import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { startSession, completeSession, getTodayStats, getAnalytics, getHistory } from '../controllers/sessions.controller';

const router = Router();

router.use(authenticate);

router.post('/start', startSession);
router.post('/:sessionId/complete', completeSession);
router.get('/today', getTodayStats);
router.get('/analytics', getAnalytics);
router.get('/history', getHistory);

export default router;
