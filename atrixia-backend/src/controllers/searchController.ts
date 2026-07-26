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
      data: {
        searchId: searchRecord.id,
        query: searchRecord.query,
        filters: searchRecord.filters,
        results: searchRecord.results
      }
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

    const searchId = req.params.searchId as string;
    if (!searchId) {
      throw new AppError('Invalid search ID format', 400);
    }

    const searchRecord = await getSearchById(userId, searchId);

    res.status(200).json({
      success: true,
      data: {
        id: searchRecord.id,
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

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const data = await getSearchHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
