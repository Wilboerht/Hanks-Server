import { Request as ExpressRequest, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// 扩展 Express 的 Request 类型
interface Request extends ExpressRequest {
  body: any;
  headers: {
    authorization?: string;
    [key: string]: string | undefined;
  };
}

const prisma = new PrismaClient();

// 生成访问令牌
const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || 'access_secret',
    { expiresIn: '15m' }
  );
};

// 生成刷新令牌
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: '7d' }
  );
};

// 用户注册
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    // 验证请求数据
    if (!name || !email || !password) {
      res.status(400).json({ message: '请提供所有必填字段' });
      return;
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: '该邮箱已被注册' });
      return;
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
      },
    });

    // 从响应中移除密码
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: '注册成功',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
};

// 用户登录
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    // 验证请求数据
    if (!email || !password) {
      res.status(400).json({ message: '请提供电子邮箱和密码' });
      return;
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ message: '电子邮箱或密码不正确' });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: '电子邮箱或密码不正确' });
      return;
    }

    // 生成令牌
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // 保存刷新令牌
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      },
    });

    // 从响应中移除密码
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: '登录成功',
      user: userWithoutPassword,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
};

// 刷新令牌
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      res.status(400).json({ message: '刷新令牌不能为空' });
      return;
    }

    // 验证刷新令牌
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh_secret'
      ) as { userId: string };

      // 检查数据库中的刷新令牌
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!storedToken) {
        res.status(401).json({ message: '无效的刷新令牌' });
        return;
      }

      // 生成新的访问令牌
      const newAccessToken = generateAccessToken(decoded.userId);

      res.status(200).json({
        token: newAccessToken,
      });
    } catch (error) {
      res.status(401).json({ message: '无效的刷新令牌' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
};

// 登出
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取访问令牌
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // 验证访问令牌
        const decoded = jwt.verify(
          token, 
          process.env.JWT_ACCESS_SECRET || 'access_secret'
        ) as { userId: string };
        
        userId = decoded.userId;
      } catch (error) {
        // 如果token无效，尝试从请求体获取刷新令牌
        console.error('Invalid access token during logout:', error);
      }
    }
    
    // 如果从请求头无法获取有效的userId，尝试从请求体获取refreshToken
    const { refreshToken } = req.body as { refreshToken?: string };
    
    if (!userId && refreshToken) {
      try {
        // 验证刷新令牌
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || 'refresh_secret'
        ) as { userId: string };
        
        userId = decoded.userId;
      } catch (error) {
        console.error('Invalid refresh token during logout:', error);
      }
    }
    
    // 如果有userId，删除该用户的所有刷新令牌
    if (userId) {
      await prisma.refreshToken.deleteMany({
        where: {
          userId: userId,
        },
      });
    } 
    // 如果有refreshToken，但无法解析userId，尝试直接删除该令牌
    else if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
        },
      });
    }

    res.status(200).json({ message: '登出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
}; 