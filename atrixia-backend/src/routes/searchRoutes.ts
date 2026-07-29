import { Router } from 'express';
import {
  createSearch,
  getSearch,
  getHistory,
  getMarketplaces,
  getConversations,
  getConversation,
} from '../controllers/searchController';
import { handleChatMessage } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public — no auth needed for marketplace list
router.get('/marketplaces', getMarketplaces);

// All other search routes require auth
router.use(authenticateToken);

router.post('/', createSearch);
router.post('/chat', handleChatMessage);
router.get('/history', getHistory);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getConversation);
router.get('/:searchId', getSearch);

export default router;
