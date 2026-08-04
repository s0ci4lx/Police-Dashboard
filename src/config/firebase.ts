/* ==========================================================================
 * Firebase Authentication (ล็อกอิน Google จริง)
 * --------------------------------------------------------------------------
 * ตั้งค่าผ่าน environment variables (ปลอดภัยกว่า hardcode และตั้งใน Vercel ได้):
 *
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 *   (ไม่บังคับ) VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID
 *
 * - ในเครื่อง: สร้างไฟล์ .env.local ที่รากโปรเจกต์แล้วใส่ค่าเหล่านี้
 * - บน Vercel: Project → Settings → Environment Variables
 *
 * ถ้ายังไม่ได้ตั้งค่า (isFirebaseConfigured = false) แอปจะถอยไปใช้ล็อกอิน
 * ชั่วคราวแบบพิมพ์อีเมลแทน — ดู docs/DEPLOYMENT.md
 * ========================================================================== */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(cfg);
  auth = getAuth(app);
}

export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser (so users can pick which Google account to use)
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth };
