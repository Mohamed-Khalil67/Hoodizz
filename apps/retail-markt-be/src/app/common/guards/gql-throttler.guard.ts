import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * The default `ThrottlerGuard.getRequestResponse(context)` calls
 * `context.switchToHttp()`, which returns empty stubs for GraphQL executions.
 * The downstream `getTracker(req)` then crashes with
 * `Cannot read properties of undefined (reading 'ip')`.
 *
 * This guard overrides `getRequestResponse` to pull the real Express
 * `Request`/`Response` out of `GqlExecutionContext` when the call is GraphQL,
 * and falls back to the parent implementation for REST routes (e.g. the
 * checkout + Stripe webhook controllers).
 *
 * `getTracker` is also overridden defensively so a missing `ip` (proxy
 * mis-configuration, tests) downgrades to the socket remote address rather
 * than throwing.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return { req: gqlContext.req, res: gqlContext.res };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest<Request>(), res: http.getResponse<Response>() };
  }

  protected override async getTracker(req: Request): Promise<string> {
    const ip =
      req?.ip ??
      req?.ips?.[0] ??
      req?.socket?.remoteAddress ??
      'unknown';
    return ip;
  }
}
