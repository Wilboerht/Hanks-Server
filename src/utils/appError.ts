/**
 * 自定义应用错误类
 * 用于统一处理应用中的错误，包含状态码和错误信息
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // 标记为可操作错误，用于区分程序错误和可控制的业务错误
    this.isOperational = true;

    // 捕获构造函数的调用栈信息
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建不同类型错误的帮助函数
 */
export const createBadRequestError = (message: string) => new AppError(message, 400);
export const createUnauthorizedError = (message: string) => new AppError(message, 401);
export const createForbiddenError = (message: string) => new AppError(message, 403);
export const createNotFoundError = (message: string) => new AppError(message, 404);
export const createInternalError = (message: string) => new AppError(message, 500); 