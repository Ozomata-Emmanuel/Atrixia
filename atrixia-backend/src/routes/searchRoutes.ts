import { Router } from 'express';
import {
  createSearch,
  getSearch,
  getHistory,
  deleteSearch,
  clearHistory,
  getMarketplaces,
  getConversations,
  getConversation,
  deleteConversation,
} from '../controllers/searchController';
import { handleChatMessage } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.get('/marketplaces', getMarketplaces);

// ── All routes below require auth ─────────────────────────────────────────────
router.use(authenticateToken);

// Search
router.post('/', createSearch);
router.post('/chat', handleChatMessage);

// History — order matters: specific paths before /:id wildcard
router.get('/history',              getHistory);
router.delete('/history',           clearHistory);          // DELETE /api/search/history        — clear all
router.delete('/history/:searchId', deleteSearch);          // DELETE /api/search/history/:id    — delete one

// Conversations
router.get('/conversations',                       getConversations);
router.get('/conversations/:conversationId',       getConversation);
router.delete('/conversations/:conversationId',    deleteConversation);

// Fetch a saved search by ID (must come last — wildcard)
router.get('/:searchId', getSearch);

export default router;
