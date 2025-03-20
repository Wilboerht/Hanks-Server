import { Request, Response, NextFunction } from 'express';

/**
 * 响应处理中间件
 * 为 Response 对象添加辅助方法，以便统一 API 响应格式
 */
export const responseHandler = (req: Request, res: Response, next: NextFunction) => {
  // 成功响应
  (res as any).success = function(data = {}, message = 'Success', statusCode = 200) {
    return this.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  // 错误响应
  (res as any).error = function(message = 'Error', statusCode = 500, errors = null) {
    return this.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  };

  // 特定HTTP状态码响应
  (res as any).notFound = function(message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };

  (res as any).badRequest = function(message = 'Bad request', errors = null) {
    return res.status(400).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  };

  (res as any).unauthorized = function(message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };

  (res as any).forbidden = function(message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };

  // 分页响应
  (res as any).paginate = function<T>(
    data: T[], 
    page: number, 
    limit: number, 
    total: number, 
    message = 'Success'
  ) {
    return res.status(200).json({
      success: true,
      message,
      data: {
        items: data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  };

  next();
}; 