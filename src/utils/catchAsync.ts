import { Request, Response, NextFunction } from 'express';

/**
 * 捕获异步路由处理器中的异常并传递给错误处理中间件
 * @param fn 异步路由处理函数
 */
export const catchAsync = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}; 