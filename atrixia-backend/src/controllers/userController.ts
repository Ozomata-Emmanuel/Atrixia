import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getUserProfile } from '../services/userService';
import { AppError } from '../utils/error';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    next(error);
  }
};
