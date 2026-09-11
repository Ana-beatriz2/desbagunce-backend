import { Test, TestingModule } from '@nestjs/testing';
import type { App } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { FirebaseService } from './firebase.service';

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

describe('FirebaseService', () => {
  let service: FirebaseService;
  const mockApp = {} as App;
  const mockAuth = {} as Auth;
  const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetAuth.mockReturnValue(mockAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseService,
        { provide: 'FIREBASE_APP', useValue: mockApp },
      ],
    }).compile();

    service = module.get<FirebaseService>(FirebaseService);
  });

  describe('getAuth', () => {
    it('should return the Auth instance bound to the injected Firebase app', () => {
      const auth = service.getAuth();

      expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
      expect(auth).toBe(mockAuth);
    });
  });
});
