import { Router } from 'express';
import { getProfile, getPreferences, updatePreferences } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/profile',              getProfile);
router.get('/preferences',          getPreferences);
router.put('/preferences',          updatePreferences);

export default router;
