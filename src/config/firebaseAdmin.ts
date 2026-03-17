// src/firebaseAdmin.ts
import * as admin from "firebase-admin";
import {
  initializeApp,
  cert,
  getApps,
  getApp,
  App,
  applicationDefault,
} from "firebase-admin/app";
import * as env from "../config/env.config";

const serviceAccount: admin.ServiceAccount = {
  projectId: env.FCM_PROJECT_ID!,
  clientEmail: env.FCM_CLIENT_EMAIL!,
  privateKey: env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Inicializa solo si no existe
const hasExplicitCreds = Boolean(
  env.FCM_PROJECT_ID && env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY,
);
const firebaseAdmin: App =
  getApps().length === 0
    ? initializeApp({
        credential: hasExplicitCreds
          ? cert(serviceAccount)
          : applicationDefault(),
      })
    : getApp();

// Exporta tanto el namespace como la app inicializada
export { admin, firebaseAdmin };
