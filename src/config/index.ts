import dotenv from 'dotenv';
import path from 'path';

// 首先加载 .env 文件
dotenv.config();

// 环境变量
const env = process.env.NODE_ENV || 'development';

// 配置对象
export const config = {
  // 应用基础配置
  app: {
    name: 'Blog API',
    env,
    port: parseInt(process.env.PORT || '5001', 10),
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.BASE_URL || `http://localhost:5001`,
    apiPrefix: '/api',
    isDev: env === 'development',
    isProd: env === 'production',
    isTest: env === 'test',
  },
  
  // 数据库配置
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blog',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // 跨域配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true
  },
  
  // 限流配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 每个 IP 在 windowMs 内允许 100 个请求
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // 上传配置
  upload: {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    directory: path.join(__dirname, '../../uploads'),
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || (env === 'production' ? 'error' : 'debug'),
    file: {
      enabled: process.env.LOG_FILE === 'true',
      dir: path.join(__dirname, '../../logs'),
      maxSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    },
  },
  
  // 安全配置
  security: {
    saltRounds: 10,
    csrfProtection: process.env.CSRF_PROTECTION === 'true',
  }
};

// 导出特定配置
export const { app, db, jwt, cors, rateLimit, upload, logging, security } = config; 