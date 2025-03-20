import { Request, Response } from 'express';
import { Post, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { AuthenticatedRequestHandler, AsyncRequestHandler } from '../types/express';
import mongoose from 'mongoose';

// Get all posts with pagination and filtering
export const getPosts: AsyncRequestHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, search } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    
    // Build query
    const query: any = { published: true };
    
    // Add tag filter if provided
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const posts = await Post.find(query)
      .populate('author', 'username avatar')
      .sort({ publishedAt: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      totalPosts: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// Get a single post by slug
export const getPostBySlug: AsyncRequestHandler = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await Post.findOne({ slug, published: true })
      .populate('author', 'username avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post' });
  }
};

// Search posts
export const searchPosts: AsyncRequestHandler = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Build search query
    const searchQuery = {
      published: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { excerpt: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ]
    };
    
    // Execute search with pagination
    const posts = await Post.find(searchQuery)
      .populate('author', 'username avatar')
      .sort({ publishedAt: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);
    
    // Get total count for pagination
    const total = await Post.countDocuments(searchQuery);
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      totalPosts: total,
      query: q,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching posts' });
  }
};

// Get all tags
export const getTags: AsyncRequestHandler = async (_req, res) => {
  try {
    // Aggregate to get all unique tags and their counts
    const tags = await Post.aggregate([
      { $match: { published: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: '$_id', count: 1 } }
    ]);
    
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tags' });
  }
};

// Create new post
export const createPost: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, tags, published = false } = req.body;
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
    
    // Check if slug already exists
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ message: 'A post with this title already exists' });
    }
    
    const post = new Post({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 150) + '...',
      coverImage,
      tags: tags || [],
      author: req.user._id,
      published,
      publishedAt: published ? new Date() : null,
    });
    
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
};

// Update post
export const updatePost: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, coverImage, tags, published } = req.body;
    
    const post = await Post.findOne({ _id: id, author: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or you are not the author' });
    }
    
    // Update fields
    if (title) {
      post.title = title;
      // Update slug if title changes
      post.slug = title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
    }
    
    if (content) post.content = content;
    if (excerpt) post.summary = excerpt;
    if (coverImage) post.featuredImage = coverImage;
    if (tags) post.tags = tags;
    
    // Handle publishing status change
    if (published !== undefined && published !== (post.status === PostStatus.PUBLISHED)) {
      post.status = published ? PostStatus.PUBLISHED : PostStatus.DRAFT;
      if (published) {
        post.publishDate = new Date();
      }
    }
    
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post' });
  }
};

// Delete post
export const deletePost: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findOne({ _id: id, author: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or you are not the author' });
    }
    
    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post' });
  }
};

// Get user's draft posts
export const getDrafts: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const posts = await Post.find({ 
      author: req.user._id,
      published: false 
    }).sort({ updatedAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drafts' });
  }
}; 