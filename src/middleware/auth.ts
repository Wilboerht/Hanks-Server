import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';
import { User, IUser } from '../models/User';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { auth as authConfig } from '../config';

// 定义一个更完整的 AuthRequest 类型，包含 Express Request 常用属性
export interface AuthRequest extends Request {
  user?: IUser;
  body: any;
  params: ParamsDictionary;
  query: ParsedQs;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

const JWT_SECRET = authConfig.accessTokenSecret;

// 不再使用 auth 函数名，全部更改为 authenticateJWT
export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'No authentication token provided' });
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ message: 'Invalid authentication token format' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Authentication token expired' });
      return;
    }
    res.status(401).json({ message: 'Invalid authentication token' });
    return;
  }
};

export const optionalAuthenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    next();
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: string };
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // 忽略错误，继续执行，不附加用户信息
  }
  next();
};

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Please authenticate' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Access denied' });
    return;
  }
  next();
};

/**
 * 保护路由中间件，要求用户已登录
 * 作为authenticateJWT的别名，兼容RESTful API风格
 */
export const protect = authenticateJWT;

/**
 * 限制特定角色访问的中间件
 * @param roles 允许访问的角色数组或单个角色
 */
export const restrictTo = (roles: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: '请先登录' });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: '您没有权限执行此操作' });
      return;
    }
    
    next();
  };
};

// 为了兼容已有代码，提供一个 auth 的别名，指向 authenticateJWT
export const auth = authenticateJWT; 