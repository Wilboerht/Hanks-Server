import express, { RequestHandler } from 'express';
import {
  getComments,
  getReplies,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
} from '../controllers/comment';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/post/:postId', getComments as RequestHandler);
router.get('/:commentId/replies', getReplies as RequestHandler);

// Protected routes
router.post('/post/:postId', authenticateJWT as RequestHandler, createComment as RequestHandler);
router.put('/:commentId', authenticateJWT as RequestHandler, updateComment as RequestHandler);
router.delete('/:commentId', authenticateJWT as RequestHandler, deleteComment as RequestHandler);
router.post('/:commentId/like', authenticateJWT as RequestHandler, toggleLike as RequestHandler);

export default router; 