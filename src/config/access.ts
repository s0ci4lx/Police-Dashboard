/* ==========================================================================
 * ระบบสิทธิ์การใช้งาน (Role-Based Access Control)
 * --------------------------------------------------------------------------
 * โมเดล: อีเมล → บทบาท (Admin / User) → หน้าที่ดูได้
 *   - Admin  : เห็นทุกหน้า + เข้าหน้าตั้งค่าได้
 *   - User   : เห็นเฉพาะหน้าที่ถูกติ๊กเลือกให้
 *   - อีเมลที่ไม่อยู่ในรายชื่อ : เข้าใช้งานไม่ได้ (ต้องให้ Admin เพิ่มก่อน)
 *
 * ⚠️ การบังคับสิทธิ์ "จริง" อยู่ที่ Cloudflare Access (กั้นหน้าเว็บก่อนเข้า)
 *    ส่วนนี้เป็นการจัดการสิทธิ์ระดับหน้า/UX ในแอป — ดูไฟล์ docs/DEPLOYMENT.md
 *
 * BOOTSTRAP_ADMINS ด้านล่างคือ "อีเมลผู้ดูแลตั้งต้น" ที่เป็น Admin เสมอ
 * (กันโดนล็อกตัวเองออก) — แก้ให้เป็นอีเมลผู้ดูแลจริงของ สภ. ก่อน deploy
 * ========================================================================== */

import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export type Role = 'admin' | 'user';

export interface UserAccess {
  email: string;
  role: Role;
  pages: string[]; // page ids the user may view (ignored for admins — they see all)
}

/** อีเมลผู้ดูแลตั้งต้น — เป็น Admin เสมอ ไม่ว่าจะมีในรายชื่อหรือไม่ (กันล็อกเอาต์) */
export const BOOTSTRAP_ADMINS: string[] = ['tummarat@gmail.com', 'investigate.thepha@gmail.com'];

const STORAGE_KEY = 'police_dashboard_access_v1';

const norm = (e: string) => e.trim().toLowerCase();

function read(): UserAccess[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserAccess[]) : [];
  } catch {
    return [];
  }
}

function write(list: UserAccess[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('บันทึกสิทธิ์ผู้ใช้ไม่สำเร็จ:', e);
  }
}

export function getUsers(): UserAccess[] {
  return read();
}

export function upsertUser(user: UserAccess): UserAccess[] {
  const list = read();
  const idx = list.findIndex((u) => norm(u.email) === norm(user.email));
  const clean: UserAccess = { email: user.email.trim(), role: user.role, pages: user.role === 'admin' ? [] : user.pages };
  if (idx >= 0) list[idx] = clean;
  else list.push(clean);
  write(list);
  return list;
}

export function removeUser(email: string): UserAccess[] {
  const list = read().filter((u) => norm(u.email) !== norm(email));
  write(list);
  return list;
}

export function setUsers(list: UserAccess[]): void {
  write(list);
}

export interface ResolvedAccess {
  email: string | null;
  role: Role | null;
  pages: string[];
  isAdmin: boolean;
  known: boolean; // true if the email is authorized (bootstrap admin or in the list)
}

/** ตัดสินสิทธิ์ของอีเมลที่ล็อกอินเข้ามา */
export function resolveAccess(email: string | null): ResolvedAccess {
  if (!email) return { email: null, role: null, pages: [], isAdmin: false, known: false };

  if (BOOTSTRAP_ADMINS.map(norm).includes(norm(email))) {
    return { email, role: 'admin', pages: [], isAdmin: true, known: true };
  }

  const found = read().find((u) => norm(u.email) === norm(email));
  if (found) {
    return {
      email,
      role: found.role,
      pages: found.role === 'admin' ? [] : found.pages,
      isAdmin: found.role === 'admin',
      known: true,
    };
  }

  return { email, role: null, pages: [], isAdmin: false, known: false };
}

/** ผู้ใช้รายนี้ดูหน้านี้ได้ไหม */
export function canViewPage(access: ResolvedAccess, pageId: string): boolean {
  if (access.isAdmin) return true;
  if (!access.known) return false;
  return access.pages.includes(pageId);
}

/* ==========================================================================
 * Firestore-backed store (ส่วนกลาง — ใช้ร่วมกันทุกเครื่อง)
 * ถ้าตั้งค่า Firebase/Firestore แล้ว จะเก็บสิทธิ์ใน Firestore (collection "access")
 * ไม่งั้น fallback ไป localStorage (ในเครื่องเท่านั้น)
 * ========================================================================== */
const COLLECTION = 'access';

export const isCentralStore = (): boolean => !!db;

/** ตัดสินสิทธิ์แบบ async — bootstrap admin → Firestore → (fallback) localStorage */
export async function resolveAccessAsync(email: string | null): Promise<ResolvedAccess> {
  if (!email) return { email: null, role: null, pages: [], isAdmin: false, known: false };

  if (BOOTSTRAP_ADMINS.map(norm).includes(norm(email))) {
    return { email, role: 'admin', pages: [], isAdmin: true, known: true };
  }

  if (db) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, norm(email)));
      if (snap.exists()) {
        const d = snap.data() as { role: Role; pages?: string[] };
        return {
          email,
          role: d.role,
          pages: d.role === 'admin' ? [] : d.pages || [],
          isAdmin: d.role === 'admin',
          known: true,
        };
      }
      return { email, role: null, pages: [], isAdmin: false, known: false };
    } catch (e) {
      console.warn('อ่านสิทธิ์จาก Firestore ไม่สำเร็จ:', e);
    }
  }
  return resolveAccess(email); // localStorage fallback
}

export async function getUsersAsync(): Promise<UserAccess[]> {
  if (db) {
    try {
      const qs = await getDocs(collection(db, COLLECTION));
      return qs.docs.map((d) => {
        const data = d.data() as { email?: string; role: Role; pages?: string[] };
        return { email: data.email || d.id, role: data.role, pages: data.pages || [] };
      });
    } catch (e) {
      console.warn('อ่านรายชื่อผู้ใช้จาก Firestore ไม่สำเร็จ:', e);
    }
  }
  return getUsers();
}

export async function upsertUserAsync(user: UserAccess): Promise<void> {
  const clean = { email: user.email.trim(), role: user.role, pages: user.role === 'admin' ? [] : user.pages };
  if (db) {
    await setDoc(doc(db, COLLECTION, norm(user.email)), clean);
    return;
  }
  upsertUser(user);
}

export async function removeUserAsync(email: string): Promise<void> {
  if (db) {
    await deleteDoc(doc(db, COLLECTION, norm(email)));
    return;
  }
  removeUser(email);
}
