import { Router } from 'express';
import { backendProxy } from './backend.proxy';
import { authenticateWorkspaceRequest } from '../workspace/workspace.middleware';

const router = Router();

/**
 * Proxy all requests to the backend API
 * Route: /api/*
 */
router.all('*', authenticateWorkspaceRequest, (req, res) => {
  return backendProxy.proxyRequest(req, res);
});

export default router;
