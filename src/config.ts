/**
 * 应用配置
 * 集中管理所有应用配置
 */

// 应用程序配置
export const app = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: '/api'
};

// CORS配置
export const cors = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 身份验证配置
export const auth = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your_access_secret_key',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
  accessTokenExpiry: '15m', // 15分钟
  refreshTokenExpiry: '7d'  // 7天
};

// 数据库配置
export const database = {
  url: process.env.DATABASE_URL || 'file:./dev.db'
};

// 日志配置
export const logging = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'combined'
}; 