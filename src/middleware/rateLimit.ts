import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/appError';

// 基本速率限制器
export const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 在 windowMs 内最多 100 个请求
  standardHeaders: true, // 返回标准的 RateLimit 头部信息
  legacyHeaders: false, // 禁用 X-RateLimit-* 头部信息
  message: '请求过于频繁，请稍后再试',
  handler: (req, res, next, options) => {
    next(new AppError('请求过于频繁，请稍后再试', 429));
  },
});

// 登录速率限制器
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 每个 IP 在 windowMs 内最多 10 次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: '登录尝试次数过多，请 1 小时后再试',
  handler: (req, res, next, options) => {
    next(new AppError('登录尝试次数过多，请 1 小时后再试', 429));
  },
});

// API 速率限制器
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 60, // 每个 IP 在 windowMs 内最多 60 个 API 请求
  standardHeaders: true,
  legacyHeaders: false,
  message: 'API 请求过于频繁，请稍后再试',
  handler: (req, res, next, options) => {
    next(new AppError('API 请求过于频繁，请稍后再试', 429));
  },
});

// 创建评论速率限制器
export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 10, // 每个 IP 在 windowMs 内最多 10 个评论
  standardHeaders: true,
  legacyHeaders: false,
  message: '评论过于频繁，请稍后再试',
  handler: (req, res, next, options) => {
    next(new AppError('评论过于频繁，请稍后再试', 429));
  },
}); 