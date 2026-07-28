import { Router } from 'express';
import { createSearch, getSearch, getHistory, getMarketplaces } from '../controllers/searchController';
import { handleChatMessage } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public — no auth needed for marketplace list (used by frontend picker)
router.get('/marketplaces', getMarketplaces);

// All other search routes require auth
router.use(authenticateToken);

router.post('/', createSearch);
router.post('/chat', handleChatMessage);
router.get('/history', getHistory);
router.get('/:searchId', getSearch);

export default router;
