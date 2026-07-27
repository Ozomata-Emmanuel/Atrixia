import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, verifyEmail, resendVerificationCode } from '../services/authService';
import { AppError } from '../utils/error';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password } = req.body;
    
    if (!fullName || typeof fullName !== 'string') {
      throw new AppError('Full name is required', 400);
    }
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    const userData = await registerUser(fullName, email, password);
    
    res.status(201).json({
      success: true,
      message: 'Account created. A 6-digit code has been sent to your email.',
      data: userData
    });
  } catch (error) {
    next(error);
  }
};

export const verify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      throw new AppError('Email and code are required', 400);
    }

    const data = await verifyEmail(email, code);
    
    res.status(200).json({
      success: true,
      message: 'Email verified! You can now login.',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const resendCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await resendVerificationCode(email);
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
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

    const data = await loginUser(email, password);
    
    res.status(200).json({
      success: true,
      data
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
