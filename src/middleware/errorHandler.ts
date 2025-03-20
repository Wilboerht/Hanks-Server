import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

/**
 * MongoDB 重复键错误
 */
const handleDuplicateKeyError = (err: any) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' 已存在，请使用其他值`;
  return new AppError(message, 400);
};

/**
 * MongoDB 验证错误
 */
const handleValidationError = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `无效输入数据: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * JWT 错误处理
 */
const handleJWTError = () => new AppError('无效的令牌，请重新登录', 401);
const handleJWTExpiredError = () => new AppError('令牌已过期，请重新登录', 401);

/**
 * 开发环境错误处理 - 返回详细信息
 */
const sendErrorDev = (err: AppError, res: Response) => {
  logger.error(`ERROR 💥: ${err.message}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * 生产环境错误处理 - 返回有限信息
 */
const sendErrorProd = (err: AppError, res: Response) => {
  // 可操作错误：向客户端发送消息
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } 
  // 程序错误：不泄露详情
  else {
    logger.error(`ERROR 💥: ${err.message}`);
    
    res.status(500).json({
      status: 'error',
      message: '出现错误，请稍后再试'
    });
  }
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 开发环境：发送详细错误
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } 
  // 生产环境：处理不同类型的错误
  else {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // 处理MongoDB错误
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    
    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  // 使用类型断言确保可以访问 method 和 originalUrl
  const method = (req as any).method || 'UNKNOWN';
  const url = (req as any).originalUrl || 'UNKNOWN';
  const err = new AppError(`找不到路径: ${method} ${url}`, 404);
  next(err);
}; 