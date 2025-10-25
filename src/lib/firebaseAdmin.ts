import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let serviceAccount: ServiceAccount | null = null;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
  }
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  serviceAccount?.project_id ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  undefined;

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || serviceAccount?.client_email;

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || serviceAccount?.private_key;
const privateKey = rawPrivateKey?.replace(/\\n/g, '\n');

if (!getApps().length) {
  if (clientEmail && privateKey && projectId) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ clientEmail, privateKey }),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
