import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * 请求日志中间件
 * 记录每个请求的详细信息，包括:
 * - 请求ID (用于跟踪)
 * - 方法和URL
 * - 请求体 (开发环境)
 * - 响应时间
 * - 响应状态码
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // 生成唯一请求ID
  const requestId = uuidv4();
  // 使用类型断言来设置属性
  (req as any).requestId = requestId;
  
  // 记录请求开始时间
  (req as any).startTime = Date.now();

  // 记录请求基本信息
  logger.info(`${requestId} 请求开始: ${(req as any).method} ${(req as any).originalUrl}`);
  
  // 仅在开发环境记录请求体
  if (process.env.NODE_ENV === 'development') {
    if ((req as any).method !== 'GET') {
      logger.debug(`${requestId} 请求体: ${JSON.stringify((req as any).body)}`);
    }
  }

  // 记录响应
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - (req as any).startTime;
    const status = res.statusCode;
    
    // 记录响应基本信息
    logger.info(
      `${requestId} 请求完成: ${(req as any).method} ${(req as any).originalUrl} ${status} ${responseTime}ms`
    );
    
    // 仅在开发环境且出错时记录响应体
    if (process.env.NODE_ENV === 'development' && status >= 400) {
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        logger.debug(`${requestId} 响应体: ${bodyStr}`);
      } catch (error) {
        logger.error(`${requestId} 无法序列化响应体`);
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}; 