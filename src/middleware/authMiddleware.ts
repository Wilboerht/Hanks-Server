import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';

// 扩展用户接口，添加密码变更后的检查方法
interface IUserWithMethods extends IUser {
  changedPasswordAfter?: (timestamp: number) => boolean;
}

/**
 * 用户身份验证中间件
 * 验证用户是否已登录
 */
export const authenticate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1) 获取token
  let token;
  if ((req as any).headers.authorization && (req as any).headers.authorization.startsWith('Bearer')) {
    token = (req as any).headers.authorization.split(' ')[1];
  } else if ((req as any).cookies?.jwt) {
    token = (req as any).cookies.jwt;
  }

  if (!token) {
    return next(new AppError('您未登录，请先登录', 401));
  }

  try {
    // 2) 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { id: string, iat: number };
    
    // 3) 检查用户是否仍然存在
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('此token的用户不再存在', 401));
    }

    // 4) 检查用户是否在token签发后更改了密码
    // 注意: 这里假设用户模型中存在该方法，如果没有实现可以暂时跳过此检查
    const userWithMethods = currentUser as unknown as IUserWithMethods;
    if (userWithMethods.changedPasswordAfter && userWithMethods.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('用户最近修改了密码，请重新登录', 401));
    }

    // 将用户信息添加到请求对象
    (req as any).user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('身份验证失败，请重新登录', 401));
  }
}); 