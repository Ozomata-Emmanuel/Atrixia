import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getUserProfile } from '../services/userService';
import { AppError } from '../utils/error';
import { PreferenceRepository } from '../repositories/preferenceRepository';

const preferenceRepo = new PreferenceRepository();

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userProfile = await getUserProfile(userId);
    if (!userProfile) throw new AppError('User not found', 404);

    res.status(200).json({ success: true, data: userProfile });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/preferences
 * Returns the saved preferences for the authenticated user.
 * Returns defaults if no preferences saved yet.
 */
export const getPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const prefs = await preferenceRepo.get(userId);

    res.status(200).json({
      success: true,
      data: prefs || {
        currency: 'USD',
        budgetMin: 0,
        budgetMax: 10000,
        prioritizePrice: true,
        prioritizeQuality: false,
        prioritizeShipping: false,
        prioritizeSeller: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/preferences
 * Saves or updates preferences for the authenticated user.
 * Body: { currency?, budgetMin?, budgetMax?, prioritizePrice?, prioritizeQuality?,
 *         prioritizeShipping?, prioritizeSeller? }
 */
export const updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const {
      currency,
      budgetMin,
      budgetMax,
      prioritizePrice,
      prioritizeQuality,
      prioritizeShipping,
      prioritizeSeller,
    } = req.body;

    // Basic validation
    if (budgetMin !== undefined && (isNaN(Number(budgetMin)) || Number(budgetMin) < 0)) {
      throw new AppError('budgetMin must be a non-negative number', 400);
    }
    if (budgetMax !== undefined && (isNaN(Number(budgetMax)) || Number(budgetMax) < 0)) {
      throw new AppError('budgetMax must be a non-negative number', 400);
    }

    const existing = await preferenceRepo.get(userId);
    const updated = {
      currency:           currency          ?? existing?.currency          ?? 'USD',
      budgetMin:          budgetMin          !== undefined ? Number(budgetMin) : (existing?.budgetMin ?? 0),
      budgetMax:          budgetMax          !== undefined ? Number(budgetMax) : (existing?.budgetMax ?? 10000),
      prioritizePrice:    prioritizePrice    !== undefined ? Boolean(prioritizePrice)    : (existing?.prioritizePrice    ?? true),
      prioritizeQuality:  prioritizeQuality  !== undefined ? Boolean(prioritizeQuality)  : (existing?.prioritizeQuality  ?? false),
      prioritizeShipping: prioritizeShipping !== undefined ? Boolean(prioritizeShipping) : (existing?.prioritizeShipping ?? false),
      prioritizeSeller:   prioritizeSeller   !== undefined ? Boolean(prioritizeSeller)   : (existing?.prioritizeSeller   ?? false),
    };

    await preferenceRepo.save(userId, updated);

    res.status(200).json({ success: true, data: updated, message: 'Preferences saved.' });
  } catch (error) {
    next(error);
  }
};
