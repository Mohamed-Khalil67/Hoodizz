import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthenticatedRequest } from './firebase-auth.guard';

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => {
    const req =
      context.getType<'graphql' | 'http'>() === 'graphql'
        ? (GqlExecutionContext.create(context).getContext()
            .req as AuthenticatedRequest)
        : context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!req.userId) {
      throw new UnauthorizedException('No authenticated user on request');
    }
    return req.userId;
  },
);
