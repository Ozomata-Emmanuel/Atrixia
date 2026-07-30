import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getUserProfile } from '../services/userService';
import { AppError } from '../utils/error';
import { PreferenceRepository } from '../repositories/preferenceRepository';

const preferenceRepo = new PreferenceRepository();

const VALID_MARKETPLACES = new Set(['jumia', 'konga', 'jiji', 'ebay']);

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
 * Returns sensible defaults if none saved yet.
 */
export const getPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const prefs = await preferenceRepo.get(userId) as any;

    res.status(200).json({
      success: true,
      data: prefs
        ? {
            currency:              prefs.currency || 'USD',
            prioritizePrice:       prefs.prioritizePrice ?? false,
            prioritizeQuality:     prefs.prioritizeQuality ?? true,
            preferredMarketplaces: prefs.preferredMarketplaces ?? [],
          }
        : {
            currency:              'USD',
            prioritizePrice:       false,
            prioritizeQuality:     true,
            preferredMarketplaces: [],
          },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/preferences
 *
 * Body (all optional — only send what changed):
 * {
 *   "currency": "NGN",
 *   "prioritizePrice": false,
 *   "prioritizeQuality": true,
 *   "preferredMarketplaces": ["jumia", "konga"]   // [] or omit = search all
 * }
 *
 * Rules:
 * - prioritizePrice and prioritizeQuality are mutually exclusive.
 *   If both true, prioritizeQuality wins.
 * - preferredMarketplaces must only contain valid marketplace ids.
 */
export const updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { currency, prioritizePrice, prioritizeQuality, preferredMarketplaces } = req.body;

    // Validate marketplaces
    if (preferredMarketplaces !== undefined) {
      if (!Array.isArray(preferredMarketplaces)) {
        throw new AppError('preferredMarketplaces must be an array', 400);
      }
      const invalid = preferredMarketplaces.filter((m: any) => !VALID_MARKETPLACES.has(m));
      if (invalid.length > 0) {
        throw new AppError(
          `Invalid marketplace(s): ${invalid.join(', ')}. Valid: ${[...VALID_MARKETPLACES].join(', ')}`,
          400
        );
      }
    }

    // Load existing to merge
    const existing = await preferenceRepo.get(userId) as any;

    // Resolve scoring priority — mutually exclusive, quality wins on conflict
    let priceFlag  = prioritizePrice  !== undefined ? Boolean(prioritizePrice)  : (existing?.prioritizePrice  ?? false);
    let qualityFlag = prioritizeQuality !== undefined ? Boolean(prioritizeQuality) : (existing?.prioritizeQuality ?? true);
    if (priceFlag && qualityFlag) { priceFlag = false; } // quality wins

    const updated = {
      currency:              currency              ?? existing?.currency              ?? 'USD',
      prioritizePrice:       priceFlag,
      prioritizeQuality:     qualityFlag,
      preferredMarketplaces: preferredMarketplaces ?? existing?.preferredMarketplaces ?? [],
    };

    await preferenceRepo.save(userId, updated);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Preferences saved.',
    });
  } catch (error) {
    next(error);
  }
};
