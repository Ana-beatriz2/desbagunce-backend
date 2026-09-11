import { Inject, Injectable } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  constructor(@Inject('FIREBASE_APP') private readonly firebaseApp: App) {}

  getAuth(): Auth {
    return getAuth(this.firebaseApp);
  }
}
