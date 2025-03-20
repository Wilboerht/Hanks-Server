import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

// 用户角色枚举
export enum UserRole {
  USER = 'user',     // 普通用户
  EDITOR = 'editor', // 编辑
  ADMIN = 'admin'    // 管理员
}

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',     // 正常
  INACTIVE = 'inactive', // 未激活
  BLOCKED = 'blocked'    // 已封禁
}

// 用户接口定义
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    github?: string;
    linkedin?: string;
  };
  following: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
  savedPosts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 用户模式定义
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, '用户名是必须的'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少需要3个字符'],
      maxlength: [30, '用户名不能超过30个字符'],
      match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
    },
    email: {
      type: String,
      required: [true, '邮箱是必须的'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, '请提供有效的邮箱地址']
    },
    password: {
      type: String,
      required: [true, '密码是必须的'],
      minlength: [8, '密码至少需要8个字符'],
      select: false // 默认查询不返回密码
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, '简介不能超过300个字符'],
      default: null
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, '位置不能超过100个字符'],
      default: null
    },
    website: {
      type: String,
      trim: true,
      match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, '请提供有效的网址'],
      default: null
    },
    socialLinks: {
      twitter: { type: String, default: null },
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      github: { type: String, default: null },
      linkedin: { type: String, default: null }
    },
    following: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    followers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    savedPosts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }],
    lastLogin: {
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

// 虚拟字段：文章数量
UserSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true
});

// 虚拟字段：粉丝数量
UserSchema.virtual('followerCount', {
  get() {
    return this.followers ? this.followers.length : 0;
  }
});

// 虚拟字段：关注数量
UserSchema.virtual('followingCount', {
  get() {
    return this.following ? this.following.length : 0;
  }
});

// 保存前加密密码
UserSchema.pre('save', async function(next) {
  try {
    const user = this;
    // 仅当密码被修改时才重新加密
    if (!user.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
    next();
  } catch (error) {
    logger.error('密码加密失败', error);
    next(error as Error);
  }
});

// 密码比较方法
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    // 查询时需要特别选择密码字段
    const user = this as IUser;
    return await bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    logger.error('密码比较失败', error);
    return false;
  }
};

// 创建并导出用户模型
export const User = mongoose.model<IUser>('User', UserSchema); 