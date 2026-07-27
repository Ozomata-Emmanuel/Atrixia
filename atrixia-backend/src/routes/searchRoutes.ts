import { Router } from 'express';
import { createSearch, getSearch, getHistory } from '../controllers/searchController';
import { handleChatMessage } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Protect all search routes
router.use(authenticateToken);

router.post('/', createSearch);
router.post('/chat', handleChatMessage);
router.get('/history', getHistory);
router.get('/:searchId', getSearch);

export default router;
