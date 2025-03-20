import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: IUser & { _id: string };
      startTime?: number;
      requestId?: string;
      body: any;
      params: ParamsDictionary;
      query: ParsedQs;
    }

    interface Response {
      success?: (data?: any, message?: string) => Response;
      error?: (message: string, statusCode?: number) => Response;
      notFound?: (message?: string) => Response;
      unauthorized?: (message?: string) => Response;
      forbidden?: (message?: string) => Response;
      badRequest?: (message?: string) => Response;
    }
  }
}

export type RequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: ExpressRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;

export type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: ExpressRequest<P, ResBody, ReqBody, ReqQuery> & {
    body: ReqBody;
    params: P;
    query: ReqQuery;
  },
  res: Response
) => Promise<void | Response> | void | Response;

export type AuthenticatedRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: ExpressRequest<P, ResBody, ReqBody, ReqQuery> & {
    user: IUser;
    body: ReqBody;
    params: P;
    query: ReqQuery;
  },
  res: Response
) => Promise<void | Response> | void | Response;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationQuery extends ParsedQs {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filter?: string;
} 