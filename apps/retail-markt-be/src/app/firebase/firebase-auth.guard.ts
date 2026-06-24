import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { FirebaseService } from './firebase.service';
import { AUTH } from '../common/constants';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    req.userId = await this.firebase.verifyTokenOrThrow(token);
    return true;
  }

  private getRequest(context: ExecutionContext): AuthenticatedRequest {
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext().req as AuthenticatedRequest;
    }
    return context.switchToHttp().getRequest<AuthenticatedRequest>();
  }

  private extractToken(req: AuthenticatedRequest | undefined): string | null {
    const header = req?.headers?.authorization;
    if (!header || !header.startsWith(AUTH.BEARER_PREFIX)) return null;
    return header.slice(AUTH.BEARER_PREFIX.length).trim() || null;
  }
}
