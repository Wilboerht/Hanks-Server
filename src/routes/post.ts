import { Router } from 'express';
import {
  getPosts,
  getPostBySlug,
  searchPosts,
  getTags,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/post';
import { authenticateJWT } from '../middleware/auth';
import { RequestHandler } from 'express';

const router = Router();

// Public routes
router.get('/', getPosts as RequestHandler);
router.get('/search', searchPosts as RequestHandler);
router.get('/tags', getTags as RequestHandler);
router.get('/:slug', getPostBySlug as RequestHandler);

// Protected routes
router.post('/', authenticateJWT as RequestHandler, createPost as RequestHandler);
router.put('/:id', authenticateJWT as RequestHandler, updatePost as RequestHandler);
router.delete('/:id', authenticateJWT as RequestHandler, deletePost as RequestHandler);

export default router; 