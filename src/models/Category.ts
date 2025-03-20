import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentCategory?: mongoose.Types.ObjectId;
  featuredImage?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, '分类名称是必须的'],
      trim: true,
      maxlength: [50, '分类名称不能超过50个字符'],
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
      maxlength: [500, '分类描述不能超过500个字符']
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    featuredImage: {
      type: String,
      default: null
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 禁止Mongoose创建重复索引的警告
CategorySchema.set('autoIndex', false);

// 索引
CategorySchema.index({ order: 1 });
CategorySchema.index({ parentCategory: 1 });

// 虚拟字段: 子分类
CategorySchema.virtual('childCategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// 虚拟字段: 关联文章数
CategorySchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// 保存前生成slug
CategorySchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-') // 支持中文
    .replace(/^-+|-+$/g, '');
  
  next();
});

export const Category = mongoose.model<ICategory>('Category', CategorySchema); 