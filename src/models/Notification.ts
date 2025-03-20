import mongoose, { Document, Schema } from 'mongoose';

// 通知类型枚举
export enum NotificationType {
  FOLLOW = 'follow',           // 关注通知
  COMMENT = 'comment',         // 评论通知
  REPLY = 'reply',             // 回复通知
  LIKE_POST = 'like_post',     // 点赞文章通知
  LIKE_COMMENT = 'like_comment', // 点赞评论通知
  MENTION = 'mention',         // @提及通知
  SYSTEM = 'system'            // 系统通知
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;    // 接收者
  sender?: mongoose.Types.ObjectId;      // 发送者（可选，系统通知没有发送者）
  type: NotificationType;                // 通知类型
  title: string;                        // 通知标题
  content: string;                       // 通知内容
  isRead: boolean;                       // 是否已读
  relatedPost?: mongoose.Types.ObjectId; // 相关文章
  relatedComment?: mongoose.Types.ObjectId; // 相关评论
  link?: string;                         // 跳转链接
  createdAt: Date;                       // 创建时间
  readAt?: Date;                         // 阅读时间
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    relatedPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null
    },
    relatedComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    link: {
      type: String,
      default: null
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// 索引
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1 });
NotificationSchema.index({ relatedPost: 1 });
NotificationSchema.index({ relatedComment: 1 });

/**
 * 标记通知为已读
 */
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema); 