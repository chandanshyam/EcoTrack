// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GOOGLE_MAPS_API_KEY = 'test-google-maps-key';
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-maps-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

// Mock Firebase Admin SDK before any imports
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(() => ({})),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
  Timestamp: {
    fromDate: jest.fn((date) => date),
    now: jest.fn(() => new Date()),
  },
}));

// Mock fetch globally for API tests
global.fetch = jest.fn();