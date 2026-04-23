import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import serviceAccount from '../../../service-account.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
      });
    }
  }

  async verifyToken(token: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return undefined;
    }
  }
}
