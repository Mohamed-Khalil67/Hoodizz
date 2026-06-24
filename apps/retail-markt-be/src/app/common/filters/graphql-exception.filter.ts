import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphQLExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();

    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as Record<string, unknown>)['message'] ??
            exception.message;

      return new GraphQLError(String(message), {
        extensions: {
          code: this.codeForStatus(status),
          status,
        },
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(`Prisma error ${exception.code} on ${info?.fieldName}`);
      const map: Record<string, { code: string; message: string }> = {
        P2002: { code: 'CONFLICT', message: 'Resource already exists' },
        P2025: { code: 'NOT_FOUND', message: 'Resource not found' },
      };
      const mapped = map[exception.code] ?? {
        code: 'DATABASE_ERROR',
        message: 'Database error',
      };
      return new GraphQLError(mapped.message, {
        extensions: { code: mapped.code },
      });
    }

    this.logger.error(
      `Unhandled error on ${info?.fieldName}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_USER_INPUT';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
