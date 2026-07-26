import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { executeSearch, getSearchById, getSearchHistory } from '../services/searchService';
import { AppError } from '../utils/error';

export const createSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { query, filters } = req.body;

    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required and must be a string', 400);
    }

    if (filters && !Array.isArray(filters)) {
      throw new AppError('Filters must be an array', 400);
    }

    const searchRecord = await executeSearch(userId, query, filters || []);

    res.status(200).json({
      success: true,
      data: searchRecord.results,
      searchId: searchRecord.id
    });
  } catch (error) {
    next(error);
  }
};

export const getSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const searchId = parseInt(req.params.searchId, 10);
    if (isNaN(searchId)) {
      throw new AppError('Invalid search ID format', 400);
    }

    const searchRecord = await getSearchById(userId, searchId);

    if (!searchRecord) {
      throw new AppError('Search not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        query: searchRecord.query,
        filters: searchRecord.filters,
        results: searchRecord.results,
        created_at: searchRecord.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const history = await getSearchHistory(userId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};
