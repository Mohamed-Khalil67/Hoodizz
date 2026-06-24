import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Credential resolution:
 *  - Production (Render): FIREBASE_SERVICE_ACCOUNT_BASE64 env var is set —
 *    decode and parse. The JSON file is gitignored and not shipped.
 *  - Local dev: read `apps/retail-markt-be/service-account.json` from disk
 *    at runtime so prod builds don't need the file at bundle time.
 */
function resolveCredential(): admin.ServiceAccount {
  const fromEnv = process.env['FIREBASE_SERVICE_ACCOUNT_BASE64'];
  if (fromEnv) {
    const decoded = Buffer.from(fromEnv, 'base64').toString('utf-8');
    return JSON.parse(decoded) as admin.ServiceAccount;
  }
  const filepath = resolve(__dirname, '..', '..', 'service-account.json');
  return JSON.parse(readFileSync(filepath, 'utf-8')) as admin.ServiceAccount;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(resolveCredential()),
      });
    }
  }

  async verifyToken(token: string): Promise<string | undefined> {
    if (!token) return undefined;
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return decoded.uid;
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return undefined;
    }
  }

  async verifyTokenOrThrow(token: string): Promise<string> {
    const uid = await this.verifyToken(token);
    if (!uid) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return uid;
  }
}
