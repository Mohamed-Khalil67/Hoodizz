import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AdminNs = typeof import('firebase-admin');

/**
 * Credential resolution:
 *  - Production (Render/Vercel): FIREBASE_SERVICE_ACCOUNT_BASE64 env var is
 *    set — decode and parse. The JSON file is gitignored and not shipped.
 *  - Local dev: read `apps/retail-markt-be/service-account.json` from disk
 *    at runtime so prod builds don't need the file at bundle time.
 */
function resolveCredential() {
  const fromEnv = process.env['FIREBASE_SERVICE_ACCOUNT_BASE64'];
  if (fromEnv) {
    const decoded = Buffer.from(fromEnv, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }
  const filepath = resolve(__dirname, '..', '..', 'service-account.json');
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

/**
 * firebase-admin is loaded lazily — its top-level require pulls in gRPC
 * and a lot of code, which inflates serverless cold-start. Deferring it
 * until the first token verification keeps boot fast and only pays the
 * cost when an authenticated request actually arrives.
 */
let cachedAdmin: AdminNs | undefined;

function getAdmin(): AdminNs {
  if (cachedAdmin) return cachedAdmin;
  const t0 = Date.now();
  console.log('[FIREBASE] loading firebase-admin');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin: AdminNs = require('firebase-admin');
  console.log(`[FIREBASE] firebase-admin loaded (+${Date.now() - t0}ms)`);
  if (!admin.apps.length) {
    const tInit = Date.now();
    admin.initializeApp({
      credential: admin.credential.cert(resolveCredential()),
    });
    console.log(`[FIREBASE] initializeApp ok (+${Date.now() - tInit}ms)`);
  }
  cachedAdmin = admin;
  return admin;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  async verifyToken(token: string): Promise<string | undefined> {
    if (!token) return undefined;
    try {
      const decoded = await getAdmin().auth().verifyIdToken(token);
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
