import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { AuthController } from './auth.controller';
import { loginSchema, registerSchema, updateProfileSchema } from './auth.schema';

const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), AuthController.register);
authRouter.post('/login', validateBody(loginSchema), AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.patch('/me', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);
authRouter.patch(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  AuthController.updateProfile
);

export default authRouter;
