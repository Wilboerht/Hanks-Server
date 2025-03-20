import { Post, IPost, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Tag } from '../models/Tag';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface CreatePostDTO {
  title: string;
  content: string;
  summary?: string;
  authorId: string;
  categoryId: string;
  tagIds?: string[];
  featuredImage?: string;
  status?: PostStatus;
  publishDate?: Date;
  slug?: string;
}

interface UpdatePostDTO {
  title?: string;
  content?: string;
  summary?: string;
  categoryId?: string;
  tagIds?: string[];
  featuredImage?: string;
  status?: PostStatus;
  publishDate?: Date;
  slug?: string;
}

interface PostFilters {
  search?: string;
  category?: string;
  tag?: string;
  author?: string;
  status?: PostStatus;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * 文章服务类
 * 处理文章的创建、编辑、发布和查询等功能
 */
export class PostService {
  /**
   * 创建新文章
   * @param data 文章数据
   */
  async createPost(data: CreatePostDTO): Promise<IPost> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 验证作者
      const author = await User.findById(data.authorId);
      if (!author) {
        throw new AppError('作者不存在', 404);
      }

      // 验证分类
      const category = await Category.findById(data.categoryId);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 验证标签
      if (data.tagIds && data.tagIds.length > 0) {
        const tagCount = await Tag.countDocuments({
          _id: { $in: data.tagIds }
        });
        if (tagCount !== data.tagIds.length) {
          throw new AppError('部分标签不存在', 404);
        }
      }

      // 准备文章数据
      const postData: any = {
        title: data.title,
        content: data.content,
        author: data.authorId,
        category: data.categoryId,
        tags: data.tagIds || [],
        status: data.status || PostStatus.DRAFT
      };

      // 可选字段
      if (data.summary) postData.summary = data.summary;
      if (data.featuredImage) postData.featuredImage = data.featuredImage;
      if (data.slug) postData.slug = data.slug;
      
      // 如果是定时发布，设置发布时间
      if (data.status === PostStatus.SCHEDULED && data.publishDate) {
        postData.publishDate = data.publishDate;
      }
      
      // 如果直接发布，设置发布时间为当前时间
      if (data.status === PostStatus.PUBLISHED) {
        postData.publishDate = new Date();
      }

      // 创建文章
      const post = await Post.create([postData], { session });
      
      await session.commitTransaction();
      session.endSession();
      
      logger.info(`文章创建成功: ${post[0].title}, 作者: ${author.username}`);
      return post[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('创建文章失败', error);
      throw error;
    }
  }

  /**
   * 更新文章
   * @param postId 文章ID
   * @param authorId 作者ID
   * @param data 更新数据
   */
  async updatePost(postId: string, authorId: string, data: UpdatePostDTO): Promise<IPost> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 查找并验证文章
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证是否是文章作者
      if (post.author.toString() !== authorId) {
        throw new AppError('只有作者才能更新文章', 403);
      }

      // 准备更新数据
      const updateData: any = {};

      // 更新基本字段
      if (data.title) updateData.title = data.title;
      if (data.content) updateData.content = data.content;
      if (data.summary) updateData.summary = data.summary;
      if (data.featuredImage) updateData.featuredImage = data.featuredImage;
      if (data.slug) updateData.slug = data.slug;
      
      // 如果更新状态
      if (data.status) {
        updateData.status = data.status;
        
        // 处理发布日期
        if (data.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
          // 从草稿或定时变为发布，设置当前时间为发布时间
          updateData.publishDate = new Date();
        } else if (data.status === PostStatus.SCHEDULED) {
          // 设置为定时发布
          updateData.publishDate = data.publishDate || new Date();
        }
      }

      // 如果更新分类
      if (data.categoryId) {
        const category = await Category.findById(data.categoryId);
        if (!category) {
          throw new AppError('分类不存在', 404);
        }
        updateData.category = data.categoryId;
      }

      // 如果更新标签
      if (data.tagIds) {
        const tagCount = await Tag.countDocuments({
          _id: { $in: data.tagIds }
        });
        if (tagCount !== data.tagIds.length) {
          throw new AppError('部分标签不存在', 404);
        }
        updateData.tags = data.tagIds;
      }

      // 更新文章
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        updateData,
        { new: true, runValidators: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      if (!updatedPost) {
        throw new AppError('更新文章失败', 500);
      }

      logger.info(`文章更新成功: ${updatedPost.title}, ID: ${updatedPost._id}`);
      return updatedPost;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('更新文章失败', error);
      throw error;
    }
  }

  /**
   * 发布草稿或定时文章
   * @param postId 文章ID
   * @param authorId 作者ID
   */
  async publishPost(postId: string, authorId: string): Promise<IPost> {
    try {
      // 查找并验证文章
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证是否是文章作者
      if (post.author.toString() !== authorId) {
        throw new AppError('只有作者才能发布文章', 403);
      }

      // 如果已经是发布状态
      if (post.status === PostStatus.PUBLISHED) {
        throw new AppError('文章已经处于发布状态', 400);
      }

      // 更新为已发布
      post.status = PostStatus.PUBLISHED;
      post.publishDate = new Date();
      await post.save();

      logger.info(`文章发布成功: ${post.title}, ID: ${post._id}`);
      return post;
    } catch (error) {
      logger.error('发布文章失败', error);
      throw error;
    }
  }

  /**
   * 将文章转为草稿
   * @param postId 文章ID
   * @param authorId 作者ID
   */
  async unpublishPost(postId: string, authorId: string): Promise<IPost> {
    try {
      // 查找并验证文章
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证是否是文章作者
      if (post.author.toString() !== authorId) {
        throw new AppError('只有作者才能更改文章状态', 403);
      }

      // 更新为草稿状态
      post.status = PostStatus.DRAFT;
      await post.save();

      logger.info(`文章转为草稿: ${post.title}, ID: ${post._id}`);
      return post;
    } catch (error) {
      logger.error('将文章转为草稿失败', error);
      throw error;
    }
  }

  /**
   * 设置文章为定时发布
   * @param postId 文章ID
   * @param authorId 作者ID
   * @param publishDate 发布日期
   */
  async schedulePost(postId: string, authorId: string, publishDate: Date): Promise<IPost> {
    try {
      // 查找并验证文章
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证是否是文章作者
      if (post.author.toString() !== authorId) {
        throw new AppError('只有作者才能设置定时发布', 403);
      }

      // 验证发布日期是否在未来
      const now = new Date();
      if (publishDate <= now) {
        throw new AppError('定时发布日期必须在未来', 400);
      }

      // 更新为定时发布状态
      post.status = PostStatus.SCHEDULED;
      post.publishDate = publishDate;
      await post.save();

      logger.info(`文章设置为定时发布: ${post.title}, 发布时间: ${publishDate}`);
      return post;
    } catch (error) {
      logger.error('设置定时发布失败', error);
      throw error;
    }
  }

  /**
   * 删除文章
   * @param postId 文章ID
   * @param authorId 作者ID
   */
  async deletePost(postId: string, authorId: string): Promise<void> {
    try {
      // 查找并验证文章
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证是否是文章作者
      if (post.author.toString() !== authorId) {
        throw new AppError('只有作者才能删除文章', 403);
      }

      // 删除文章 - 使用deleteOne代替已弃用的remove方法
      await Post.deleteOne({ _id: postId });

      logger.info(`文章删除成功: ${post.title}, ID: ${post._id}`);
    } catch (error) {
      logger.error('删除文章失败', error);
      throw error;
    }
  }

  /**
   * 获取文章详情
   * @param postIdOrSlug 文章ID或Slug
   * @param incrementViews 是否增加阅读数
   */
  async getPostDetail(postIdOrSlug: string, incrementViews: boolean = true): Promise<IPost> {
    try {
      // 通过ID或Slug查找文章
      const query: any = mongoose.isValidObjectId(postIdOrSlug)
        ? { _id: postIdOrSlug }
        : { slug: postIdOrSlug };

      // 只返回已发布的文章
      query.status = PostStatus.PUBLISHED;

      // 获取文章
      const post = await Post.findOne(query)
        .populate('author', 'username avatar bio')
        .populate('category', 'name slug')
        .populate('tags', 'name slug color')
        .populate({
          path: 'comments',
          match: { parentComment: null }, // 只获取顶级评论
          options: { sort: { createdAt: -1 } },
          populate: {
            path: 'author',
            select: 'username avatar'
          }
        });

      if (!post) {
        throw new AppError('文章不存在或未发布', 404);
      }

      // 增加阅读数
      if (incrementViews) {
        post.viewCount += 1;
        await post.save();
      }

      return post;
    } catch (error) {
      logger.error('获取文章详情失败', error);
      throw error;
    }
  }

  /**
   * 获取作者的文章
   * @param authorId 作者ID
   * @param page 页码
   * @param limit 每页数量
   * @param status 文章状态筛选
   */
  async getAuthorPosts(
    authorId: string,
    page: number = 1,
    limit: number = 10,
    status?: PostStatus
  ) {
    try {
      const query: any = { author: authorId };
      
      if (status) {
        query.status = status;
      }

      const total = await Post.countDocuments(query);
      const skip = (page - 1) * limit;

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .select('-content');

      return {
        data: posts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取作者文章失败', error);
      throw error;
    }
  }

  /**
   * 搜索文章
   * @param filters 过滤条件
   * @param page 页码
   * @param limit 每页数量
   * @param sort 排序字段
   * @param order 排序方向
   */
  async searchPosts(
    filters: PostFilters = {},
    page: number = 1,
    limit: number = 10,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ) {
    try {
      const query: any = {};
      
      // 默认只返回已发布的文章
      query.status = filters.status || PostStatus.PUBLISHED;
      
      // 如果提供了搜索关键字
      if (filters.search) {
        query.$text = { $search: filters.search } as any;
      }
      
      // 根据分类筛选
      if (filters.category) {
        if (mongoose.isValidObjectId(filters.category)) {
          query.category = filters.category;
        } else {
          const category = await Category.findOne({ slug: filters.category });
          if (category) {
            query.category = category._id;
          }
        }
      }
      
      // 根据标签筛选
      if (filters.tag) {
        if (mongoose.isValidObjectId(filters.tag)) {
          query.tags = filters.tag;
        } else {
          const tag = await Tag.findOne({ slug: filters.tag });
          if (tag) {
            query.tags = tag._id;
          }
        }
      }
      
      // 根据作者筛选
      if (filters.author) {
        query.author = filters.author;
      }
      
      // 根据日期范围筛选
      if (filters.fromDate || filters.toDate) {
        query.publishDate = {};
        if (filters.fromDate) {
          query.publishDate.$gte = filters.fromDate;
        }
        if (filters.toDate) {
          query.publishDate.$lte = filters.toDate;
        }
      }

      // 构建排序
      const sortOption: any = {};
      
      // 特殊处理文本搜索的情况
      if (filters.search && query.$text) {
        sortOption.score = { $meta: 'textScore' } as any;
      } else {
        sortOption[sort] = order === 'asc' ? 1 : -1;
      }

      const total = await Post.countDocuments(query);
      const skip = (page - 1) * limit;

      let postsQuery = Post.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('category', 'name slug')
        .populate('tags', 'name slug color')
        .select('-content');
      
      // 如果是文本搜索，添加投影
      if (filters.search && query.$text) {
        // 使用类型断言解决类型兼容性问题
        (postsQuery as any) = postsQuery.select({ score: { $meta: 'textScore' } } as any);
      }

      // 使用类型断言解决类型不匹配问题
      const posts = await (postsQuery as any).exec();

      return {
        data: posts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('搜索文章失败', error);
      throw error;
    }
  }

  /**
   * 获取相关文章推荐
   * @param postId 当前文章ID
   * @param limit 推荐数量
   */
  async getRelatedPosts(postId: string, limit: number = 5): Promise<IPost[]> {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 获取相同分类且相同标签的文章
      const relatedPosts = await Post.find({
        _id: { $ne: postId },
        status: PostStatus.PUBLISHED,
        $or: [
          { category: post.category },
          { tags: { $in: post.tags } }
        ]
      })
        .sort({ publishDate: -1 })
        .limit(limit)
        .populate('author', 'username avatar')
        .select('title slug summary featuredImage publishDate viewCount');

      return relatedPosts;
    } catch (error) {
      logger.error('获取相关文章失败', error);
      throw error;
    }
  }

  /**
   * 获取热门文章
   * @param limit 数量
   * @param days 天数范围
   */
  async getPopularPosts(limit: number = 10, days: number = 30): Promise<IPost[]> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);

      const popularPosts = await Post.find({
        status: PostStatus.PUBLISHED,
        publishDate: { $gte: date }
      })
        .sort({ viewCount: -1, likeCount: -1 })
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('category', 'name slug')
        .select('title slug summary featuredImage publishDate viewCount likeCount');

      return popularPosts;
    } catch (error) {
      logger.error('获取热门文章失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的收藏文章
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getSavedPosts(userId: string, page: number = 1, limit: number = 10) {
    try {
      const user = await User.findById(userId).populate('savedPosts');
      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      const total = user.savedPosts?.length || 0;
      const skip = (page - 1) * limit;

      // 根据用户保存的ID获取文章详情
      const savedPosts = await Post.find({ 
        _id: { $in: user.savedPosts },
        status: PostStatus.PUBLISHED
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('category', 'name slug')
        .select('-content');

      return {
        data: savedPosts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取收藏文章失败', error);
      throw error;
    }
  }

  /**
   * 保存/收藏文章
   * @param postId 文章ID
   * @param userId 用户ID
   */
  async savePost(postId: string, userId: string): Promise<void> {
    try {
      // 验证文章存在
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }
      
      // 只能收藏已发布的文章
      if (post.status !== PostStatus.PUBLISHED) {
        throw new AppError('只能收藏已发布的文章', 400);
      }

      // 添加到用户的收藏
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedPosts: postId } }
      );

      logger.info(`用户${userId}收藏了文章${postId}`);
    } catch (error) {
      logger.error('收藏文章失败', error);
      throw error;
    }
  }

  /**
   * 取消收藏文章
   * @param postId 文章ID
   * @param userId 用户ID
   */
  async unsavePost(postId: string, userId: string): Promise<void> {
    try {
      // 从用户的收藏中移除
      await User.findByIdAndUpdate(
        userId,
        { $pull: { savedPosts: postId } }
      );

      logger.info(`用户${userId}取消收藏了文章${postId}`);
    } catch (error) {
      logger.error('取消收藏文章失败', error);
      throw error;
    }
  }

  /**
   * 点赞文章
   * @param postId 文章ID
   * @param userId 用户ID
   */
  async likePost(postId: string, userId: string): Promise<void> {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 检查用户是否已经点赞
      if (post.likes.some(id => id.toString() === userId)) {
        throw new AppError('已经点赞过这篇文章', 400);
      }

      // 添加点赞
      post.likes.push(new mongoose.Types.ObjectId(userId));
      post.likeCount = post.likes.length;
      await post.save();

      logger.info(`用户${userId}点赞了文章${postId}`);
    } catch (error) {
      logger.error('点赞文章失败', error);
      throw error;
    }
  }

  /**
   * 取消点赞文章
   * @param postId 文章ID
   * @param userId 用户ID
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 检查用户是否已经点赞
      if (!post.likes.some(id => id.toString() === userId)) {
        throw new AppError('还没有点赞过这篇文章', 400);
      }

      // 移除点赞
      post.likes = post.likes.filter(id => id.toString() !== userId);
      post.likeCount = post.likes.length;
      await post.save();

      logger.info(`用户${userId}取消点赞了文章${postId}`);
    } catch (error) {
      logger.error('取消点赞文章失败', error);
      throw error;
    }
  }

  /**
   * 检查定时发布的文章
   * 在定时任务中调用，将到期的定时文章修改为已发布状态
   */
  async publishScheduledPosts(): Promise<number> {
    try {
      const now = new Date();
      
      const result = await Post.updateMany(
        {
          status: PostStatus.SCHEDULED,
          publishDate: { $lte: now }
        },
        {
          status: PostStatus.PUBLISHED
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`定时发布: ${result.modifiedCount}篇文章已发布`);
      }

      return result.modifiedCount;
    } catch (error) {
      logger.error('定时发布文章失败', error);
      throw error;
    }
  }
} 