import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  content: string;
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  level: number;
  path: string;
  likes: mongoose.Types.ObjectId[];
  likeCount: number;
  isEdited: boolean;
  isApproved: boolean;
  isHighlighted: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, '评论内容不能超过2000个字符']
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    // 评论层级 (1级为顶级评论，2级及以上为回复)
    level: {
      type: Number,
      default: 1
    },
    // 评论路径 (格式: 顶级评论ID/二级评论ID/...)
    path: {
      type: String,
      default: ''
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    likeCount: {
      type: Number,
      default: 0
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    isApproved: {
      type: Boolean,
      default: true  // 默认自动通过审核
    },
    isHighlighted: {
      type: Boolean,
      default: false // 是否被置顶或高亮显示
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1 });
CommentSchema.index({ path: 1 });
CommentSchema.index({ level: 1 });
CommentSchema.index({ isApproved: 1 });
CommentSchema.index({ isDeleted: 1 });

// 虚拟字段: 子评论
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  options: { sort: { createdAt: 1 } }
});

// 保存前处理
CommentSchema.pre('save', async function(next) {
  const comment = this;
  
  // 如果是新创建的评论
  if (comment.isNew) {
    // 如果有父评论，设置层级和路径
    if (comment.parentComment) {
      try {
        const parentComment = await mongoose.model('Comment').findById(comment.parentComment);
        if (parentComment) {
          comment.level = parentComment.level + 1;
          comment.path = parentComment.path 
            ? `${parentComment.path}/${comment.parentComment}`
            : comment.parentComment.toString();
          
          // 更新文章的评论计数
          await mongoose.model('Post').findByIdAndUpdate(
            comment.post,
            { $inc: { commentCount: 1 } }
          );
        }
      } catch (error) {
        return next(error as Error);
      }
    } else {
      // 顶级评论
      comment.path = '';
      
      // 更新文章的评论计数
      try {
        await mongoose.model('Post').findByIdAndUpdate(
          comment.post,
          { $inc: { commentCount: 1 } }
        );
      } catch (error) {
        return next(error as Error);
      }
    }
  }
  
  next();
});

// "软删除"的评论内容替换
CommentSchema.pre('find', function() {
  this.where({ isDeleted: false });
});

CommentSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

export const Comment = mongoose.model<IComment>('Comment', CommentSchema); 