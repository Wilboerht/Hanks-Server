import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// 导入配置
import { app as appConfig, cors as corsConfig } from './config';

// 导入中间件
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { responseHandler } from './middleware/responseHandler';

// 导入路由
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post';
import commentRoutes from './routes/comment';
import userRelationRoutes from './routes/userRelationRoutes';
import blogRoutes from './routes/blogRoutes';
import testRoutes from './routes/testRoutes';

// 创建 Express 应用
const app = express();

// 安全中间件
app.use(helmet()); // 设置安全相关的 HTTP 头
app.use(cors(corsConfig)); // 配置跨域
app.use(mongoSanitize()); // 防止 MongoDB 注入
app.use(hpp()); // 防止参数污染

// 请求解析
app.use(express.json({ limit: '10kb' })); // 限制请求 JSON 大小
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // 解析 cookie

// 性能优化
app.use(compression()); // gzip 压缩

// 日志记录
app.use(requestLogger);

// 响应格式化
app.use(responseHandler);

// 设置 API 版本前缀
const apiPrefix = appConfig.apiPrefix;

// 健康检查 - 根路径
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the API',
    timestamp: new Date().toISOString()
  });
});

// 健康检查 - 不带API前缀
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API 健康检查 - 带API前缀
app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 仅在开发环境下注册测试路由
if (process.env.NODE_ENV === 'development') {
  app.use(apiPrefix, testRoutes);
}

// API 路由
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/posts`, postRoutes);
app.use(`${apiPrefix}/comments`, commentRoutes);
app.use(`${apiPrefix}/relations`, userRelationRoutes);
app.use(`${apiPrefix}/blog`, blogRoutes);

// 处理 404 错误
app.all('*', notFoundHandler);

// 全局错误处理
app.use(errorHandler);

export default app; 