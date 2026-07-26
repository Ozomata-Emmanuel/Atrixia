import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { AppError } from '../utils/error';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    const { userId, token } = await registerUser(email, password);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId,
      token
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const { userId, email: userEmail, token } = await loginUser(email, password);
    
    res.status(200).json({
      success: true,
      token,
      userId,
      email: userEmail
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};
