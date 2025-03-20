import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: [true, '标签名称是必须的'],
      trim: true,
      maxlength: [30, '标签名称不能超过30个字符'],
      unique: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, '标签描述不能超过200个字符']
    },
    color: {
      type: String,
      default: '#6b7280', // 默认颜色
      validate: {
        validator: function(v: string) {
          return /^#([0-9A-F]{3}){1,2}$/i.test(v);
        },
        message: '颜色必须是有效的十六进制颜色代码'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: false
  }
);

// 索引
TagSchema.index({ name: 'text' });

// 虚拟字段: 关联文章数
TagSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'tags',
  count: true
});

// 保存前生成slug
TagSchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-') // 支持中文
    .replace(/^-+|-+$/g, '');
  
  next();
});

export const Tag = mongoose.model<ITag>('Tag', TagSchema); 