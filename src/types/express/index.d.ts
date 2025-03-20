import { IUser } from '../../models/User';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// 扩展 Express 命名空间中的 Request 接口
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      requestId?: string;
      startTime?: number;
      body: any;
      params: ParamsDictionary;
      query: ParsedQs;
      originalUrl: string;
      method: string;
      path: string;
      protocol: string;
      hostname: string;
    }

    interface Response {
      // 成功响应
      success?: (data?: any, message?: string, statusCode?: number) => Response;
      
      // 错误响应
      error?: (message: string, statusCode?: number, errors?: any) => Response;
      
      // 特定HTTP状态响应
      notFound?: (message?: string) => Response;
      badRequest?: (message?: string, errors?: any) => Response;
      unauthorized?: (message?: string) => Response;
      forbidden?: (message?: string) => Response;
      
      // 分页响应
      paginate?: <T>(
        data: T[],
        page: number,
        limit: number, 
        total: number,
        message?: string
      ) => Response;
    }
  }
} 