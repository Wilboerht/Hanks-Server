import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Get comments for a post
export const getComments = async (req: any, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const comments = await Comment.find({ post: postId, parentComment: null })
      .populate('author', 'username avatar')
      .populate({
        path: 'likes',
        select: 'username'
      })
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);

    // Get total count
    const total = await Comment.countDocuments({ post: postId, parentComment: null });

    res.json({
      comments,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments' });
  }
};

// Get replies for a comment
export const getReplies = async (req: any, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { page = '1', limit = '5' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const replies = await Comment.find({ parentComment: commentId })
      .populate('author', 'username avatar')
      .populate({
        path: 'likes',
        select: 'username'
      })
      .sort({ createdAt: 1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);

    const total = await Comment.countDocuments({ parentComment: commentId });

    res.json({
      replies,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching replies' });
  }
};

// Create a comment
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Create comment
    const comment = new Comment({
      content,
      post: postId,
      author: userId,
      parentComment: parentCommentId || null,
    });

    await comment.save();

    // Populate author details
    await comment.populate('author', 'username avatar');

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating comment' });
  }
};

// Update a comment
export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const comment = await Comment.findOne({
      _id: commentId,
      author: userId,
    });

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating comment' });
  }
};

// Delete a comment
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const comment = await Comment.findOne({
      _id: commentId,
      author: userId,
    });

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Delete all replies
    await Comment.deleteMany({ parentComment: commentId });
    
    // Delete the comment
    await comment.deleteOne();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment' });
  }
};

// Like/Unlike a comment
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // 查找点赞
    const userIdStr = userId.toString();
    const likeIndex = comment.likes.findIndex(id => id.toString() === userIdStr);
    
    if (likeIndex === -1) {
      // 添加点赞
      comment.likes.push(new mongoose.Types.ObjectId(userIdStr));
      comment.likeCount = comment.likes.length;
    } else {
      // 取消点赞
      comment.likes.splice(likeIndex, 1);
      comment.likeCount = comment.likes.length;
    }

    await comment.save();
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like' });
  }
}; 