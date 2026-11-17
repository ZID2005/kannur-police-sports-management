import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { AuthController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), AuthController.register);
authRouter.post('/login', validateBody(loginSchema), AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);

export default authRouter;
