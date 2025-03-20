import express, { Response, Router, RequestHandler } from 'express';
import { Request as ExpressRequest } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

interface Request extends ExpressRequest {
  body: any;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  params: ParamsDictionary;
  query: ParsedQs;
}

// 创建测试路由器
const router: Router = express.Router();

// 健康检查端点
router.get('/health', ((req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'API服务器运行正常',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
}) as RequestHandler);

// 创建测试用户
router.post('/create-test-user', (async (req: Request, res: Response) => {
  try {
    // 创建一个测试用户，用于API测试
    // 注意: 这里我们模拟创建测试用户，实际项目请使用真实的用户创建逻辑
    res.status(200).json({
      success: true,
      message: '测试用户创建成功',
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: '创建测试用户失败',
      error: error.message
    });
  }
}) as RequestHandler);

// 测试登录路由
router.post('/auth/login', ((req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // 简单的测试验证
  if (email === 'test@example.com' && password === 'password123') {
    res.status(200).json({
      success: true,
      message: '登录成功',
      token: 'test-jwt-token-12345',
      refreshToken: 'test-refresh-token-67890',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '邮箱或密码不正确'
    });
  }
}) as RequestHandler);

// 测试获取用户信息路由
router.get('/users/profile', ((req: Request, res: Response) => {
  // 在真实应用中，这里应该验证token，从token中提取用户ID，然后查询用户
  // 这里简化为直接返回测试用户数据
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供有效的身份验证令牌'
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      bio: '这是一个测试用户',
      avatar: 'https://via.placeholder.com/150',
      createdAt: new Date().toISOString()
    }
  });
}) as RequestHandler);

// 测试刷新token路由
router.post('/auth/refresh-token', ((req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: '未提供刷新令牌'
    });
  }
  
  // 简单校验 - 实际应用中应该验证token的有效性
  if (refreshToken === 'test-refresh-token-67890') {
    res.status(200).json({
      success: true,
      message: 'Token刷新成功',
      token: 'new-test-jwt-token-' + Date.now(),
    });
  } else {
    res.status(401).json({
      success: false,
      message: '无效的刷新令牌'
    });
  }
}) as RequestHandler);

// 测试登出路由
router.post('/auth/logout', ((req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: '登出成功'
  });
}) as RequestHandler);

// 测试博客文章列表
router.get('/posts', ((req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const currentPage = parseInt(page as string) || 1;
  const postsPerPage = parseInt(limit as string) || 10;
  
  res.status(200).json({
    success: true,
    posts: [
      {
        id: 'post-1',
        title: '测试文章 1',
        slug: 'test-post-1',
        summary: '这是第一篇测试文章的摘要',
        featuredImage: 'https://via.placeholder.com/800x400',
        author: {
          name: 'Test User',
          avatar: 'https://via.placeholder.com/150'
        },
        createdAt: new Date().toISOString(),
        tags: ['测试', '前端']
      },
      {
        id: 'post-2',
        title: '测试文章 2',
        slug: 'test-post-2',
        summary: '这是第二篇测试文章的摘要',
        featuredImage: 'https://via.placeholder.com/800x400',
        author: {
          name: 'Test User',
          avatar: 'https://via.placeholder.com/150'
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        tags: ['测试', '后端']
      }
    ],
    totalPages: 1
  });
}) as RequestHandler);

// 测试获取博客标签
router.get('/posts/tags', ((req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      tags: [
        { name: '前端', count: 5 },
        { name: '后端', count: 3 },
        { name: 'JavaScript', count: 7 },
        { name: 'React', count: 4 },
        { name: 'Node.js', count: 3 },
        { name: '测试', count: 2 }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tags'
    });
  }
}) as RequestHandler);

export default router; 