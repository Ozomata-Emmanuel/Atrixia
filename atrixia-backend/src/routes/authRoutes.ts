import { Router } from 'express';
import { signup, login, logout, verify, resendCode } from '../controllers/authController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verify);
router.post('/resend-code', resendCode);
router.post('/logout', logout);

export default router;
