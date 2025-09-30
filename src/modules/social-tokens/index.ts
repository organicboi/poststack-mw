import { Router } from 'express';
import oauthController from './oauth.controller';
import socialTokensController from './social-tokens.controller';

const router = Router();

// OAuth routes
router.use('/oauth', oauthController);

// Social tokens management routes
router.use('/social-tokens', socialTokensController);

export default router;
export { SocialTokensService } from './social-tokens.service';
export { OAuthService } from './oauth.service';
export * from './social-tokens.types';