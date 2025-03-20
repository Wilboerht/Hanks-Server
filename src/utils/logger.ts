/**
 * 日志工具
 * 封装控制台日志输出，未来可扩展为写入文件或发送到日志服务
 */

// 日志级别定义
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// 根据环境设置默认日志级别
const getDefaultLogLevel = (): LogLevel => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return LogLevel.ERROR; // 生产环境只记录错误
    case 'test':
      return LogLevel.WARN;  // 测试环境记录警告和错误
    default:
      return LogLevel.DEBUG; // 开发环境记录所有日志
  }
};

// 当前日志级别设置
let currentLogLevel: LogLevel = getDefaultLogLevel();

/**
 * 日志管理类
 */
class Logger {
  // 设置日志级别
  setLogLevel(level: LogLevel): void {
    currentLogLevel = level;
  }

  // 检查是否应该记录此级别的日志
  private shouldLog(level: LogLevel): boolean {
    return level <= currentLogLevel;
  }

  // 格式化日志前缀
  private formatPrefix(level: string): string {
    const now = new Date();
    return `[${now.toISOString()}] [${level}]`;
  }

  // 记录错误日志
  error(message: string | Error, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const errorMessage = message instanceof Error
      ? `${message.message}\n${message.stack}`
      : message;
      
    console.error(`${this.formatPrefix('ERROR')} ${errorMessage}`, ...args);
  }

  // 记录警告日志
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(`${this.formatPrefix('WARN')} ${message}`, ...args);
  }

  // 记录信息日志
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(`${this.formatPrefix('INFO')} ${message}`, ...args);
  }

  // 记录调试日志
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(`${this.formatPrefix('DEBUG')} ${message}`, ...args);
  }

  // 跟踪方法执行时间
  time(label: string): () => void {
    if (!this.shouldLog(LogLevel.DEBUG)) return () => {};
    
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} 耗时: ${duration}ms`);
    };
  }
}

// 导出单例
export const logger = new Logger();

// 创建请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // 当响应完成时记录请求信息
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent') || '-',
    });
  });
  
  next();
};

export default logger; 