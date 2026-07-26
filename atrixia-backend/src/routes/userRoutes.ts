import { Router } from 'express';
import { getProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.get('/profile', getProfile);

export default router;
