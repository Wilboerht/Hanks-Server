import mongoose, { Document, Schema } from 'mongoose';
import { User } from './User';

// 文章状态枚举
export enum PostStatus {
  DRAFT = 'draft',        // 草稿
  PUBLISHED = 'published', // 已发布
  SCHEDULED = 'scheduled'  // 定时发布
}

// 文章接口
export interface IPost extends Document {
  title: string;
  content: string;
  summary: string;
  slug: string;
  author: mongoose.Types.ObjectId;
  featuredImage?: string;
  category: mongoose.Types.ObjectId;
  tags: mongoose.Types.ObjectId[];
  status: PostStatus;
  publishDate: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// 文章模式
const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, '文章标题是必须的'],
      trim: true,
      maxlength: [100, '标题不能超过100个字符']
    },
    content: {
      type: String,
      required: [true, '文章内容是必须的']
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [500, '摘要不能超过500个字符']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '文章必须有作者']
    },
    featuredImage: {
      type: String,
      default: null
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, '文章必须有分类']
    },
    tags: [{
      type: Schema.Types.ObjectId,
      ref: 'Tag'
    }],
    status: {
      type: String,
      enum: Object.values(PostStatus),
      default: PostStatus.DRAFT
    },
    publishDate: {
      type: Date,
      default: null
    },
    viewCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 禁止Mongoose创建重复索引的警告
PostSchema.set('autoIndex', false);

// 索引，提高查询效率
PostSchema.index({ author: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ status: 1, publishDate: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ title: 'text', content: 'text', summary: 'text' });

// 虚拟字段: 关联评论
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// 创建slug前中间件
PostSchema.pre('save', function(next) {
  const post = this;
  
  // 如果标题被修改，重新生成slug
  if (post.isModified('title')) {
    post.slug = post.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-') // 支持中文
      .replace(/^-+|-+$/g, '');
  }
  
  // 如果是发布状态，但没有发布时间，设置为当前时间
  if (post.status === PostStatus.PUBLISHED && !post.publishDate) {
    post.publishDate = new Date();
  }
  
  // 如果没有摘要，从内容中提取
  if (!post.summary && post.content) {
    // 去除HTML标签，截取前150个字符作为摘要
    const plainText = post.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    post.summary = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
  }
  
  next();
});

// 删除文章后中间件：更新相关数据
PostSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  const post = doc as IPost;
  
  try {
    // 从用户的保存列表中删除
    await User.updateMany(
      { savedPosts: post._id },
      { $pull: { savedPosts: post._id } }
    );
    
    // 删除相关评论
    await mongoose.model('Comment').deleteMany({ post: post._id });
  } catch (error) {
    console.error('删除文章关联数据失败:', error);
  }
});

export const Post = mongoose.model<IPost>('Post', PostSchema); 