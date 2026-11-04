import { Router } from 'express';
import { Login, getMe } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema } from '../schemas/auth.schema';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', validate(loginSchema), Login);
router.get('/me', authenticate, getMe);

export default router;