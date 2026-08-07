/* ==========================================================================
 * ศูนย์รวมการตั้งค่าแหล่งข้อมูล (Data Source Configuration)
 * --------------------------------------------------------------------------
 * ไฟล์นี้คือ "จุดเดียว" ที่ควบคุมว่าแต่ละหน้าดึงข้อมูลจาก Google Sheet ไหน
 * และข้อมูลสถานี (ชื่อ/พิกัดแผนที่)
 *
 * วิธีเปลี่ยนข้อมูลมี 2 ทาง:
 *
 *  1) แก้ในแอป (แนะนำ / ง่ายสุด — ไม่ต้องแตะโค้ด):
 *     กดปุ่มรูปเฟือง (⚙️) มุมขวาบน → "ตั้งค่าแหล่งข้อมูล" → วางลิงก์ Google Sheet
 *     → กด "ทดสอบการเชื่อมต่อ" → บันทึก  (ค่าจะถูกจำไว้ในเครื่องนี้)
 *
 *  2) แก้ค่าเริ่มต้นถาวร (สำหรับทุกเครื่อง — ต้อง deploy ใหม่):
 *     แก้ค่าใน DEFAULT_DATA_SOURCES และ DEFAULT_STATION ด้านล่างนี้
 *
 * ลิงก์ Google Sheet ที่ใช้ได้ ต้องตั้งแชร์เป็น "ทุกคนที่มีลิงก์ ดูได้" และเป็น
 * ลิงก์แบบใดแบบหนึ่ง:
 *   - ลิงก์ปกติ:  https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>
 *   - CSV export: https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
 * (ระบบจะแปลงลิงก์ปกติเป็น CSV ให้อัตโนมัติ)
 * ========================================================================== */

export type DataSourceKey = 'cctv' | 'poi' | 'cases' | 'personnel' | 'weapons' | 'housing';

/** ค่าเริ่มต้นถาวร (ใช้กับทุกเครื่องที่ยังไม่ได้ตั้งค่าเอง) */
export const DEFAULT_DATA_SOURCES: Record<DataSourceKey, string> = {
  cctv: 'https://docs.google.com/spreadsheets/d/1T9pdnK9RvjfIlBlwefOfrbYP5R4gFAJKzibR6vOLpe4/gviz/tq?tqx=out:csv&headers=1&gid=1321923979',
  poi: 'https://docs.google.com/spreadsheets/d/1T9pdnK9RvjfIlBlwefOfrbYP5R4gFAJKzibR6vOLpe4/gviz/tq?tqx=out:csv&headers=1&gid=1578849502',
  cases: 'https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/gviz/tq?tqx=out:csv&headers=1&gid=0',
  personnel: 'https://docs.google.com/spreadsheets/d/1T9pdnK9RvjfIlBlwefOfrbYP5R4gFAJKzibR6vOLpe4/gviz/tq?tqx=out:csv&headers=1&gid=1365763701',
  weapons: 'https://docs.google.com/spreadsheets/d/1T9pdnK9RvjfIlBlwefOfrbYP5R4gFAJKzibR6vOLpe4/gviz/tq?tqx=out:csv&headers=1&gid=1819093863',
  housing: 'https://docs.google.com/spreadsheets/d/1T9pdnK9RvjfIlBlwefOfrbYP5R4gFAJKzibR6vOLpe4/gviz/tq?tqx=out:csv&headers=1&gid=1461295631',
};

export interface StationConfig {
  name: string;
  shortName: string;
  center: { lat: number; lng: number; zoom: number };
}

export const DEFAULT_STATION: StationConfig = {
  name: 'สถานีตำรวจภูธรสะท้อน',
  shortName: 'สภ.สะท้อน',
  center: { lat: 6.7571, lng: 100.6725, zoom: 13 },
};

/** ข้อมูลประกอบสำหรับหน้าตั้งค่า (ลำดับ + ป้ายกำกับ + คำอธิบาย) */
export const DATA_SOURCE_META: Array<{
  key: DataSourceKey;
  label: string;
  page: string;
  optional?: boolean;
  hint?: string;
}> = [
  { key: 'cctv', label: 'กล้องวงจรปิด (CCTV)', page: 'กล้องวงจรปิด · สารบบกล้อง CCTV', optional: true, hint: 'เว้นว่างไว้ = ใช้ข้อมูลตัวอย่างจำลอง' },
  { key: 'poi', label: 'ข้อมูลท้องถิ่น (จุดสำคัญ)', page: 'ข้อมูลท้องถิ่น' },
  { key: 'cases', label: 'คดีระหว่างสอบสวน', page: 'คดีระหว่างสอบสวน' },
  { key: 'personnel', label: 'ข้อมูลกำลังพล', page: 'ข้อมูลกำลังพล' },
  { key: 'weapons', label: 'อาวุธปืน / ยุทธภัณฑ์', page: 'อาวุธปืนสิ่งของหลวง · ภาพรวมความพร้อม' },
  { key: 'housing', label: 'ข้อมูลบ้านพักตำรวจ', page: 'บ้านพักตำรวจ' },
];

/* ----------------------------- ตัว resolver ------------------------------ */
/* ค่าที่ตั้งในแอปจะถูกเก็บใน localStorage และมี "สิทธิ์เหนือกว่า" ค่าเริ่มต้น */

const STORAGE_KEY = 'police_dashboard_config_v1';

interface OverrideBlob {
  sources?: Partial<Record<DataSourceKey, string>>;
  station?: Partial<StationConfig>;
  hiddenPages?: string[];
}

/** หน้าที่ซ่อนไว้เป็นค่าเริ่มต้น (ยังปรับปรุงอยู่) — ในโหมด dev/localhost ยังเห็นได้ */
export const DEFAULT_HIDDEN_PAGES: string[] = ['cases', 'traffic'];

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function readBlob(): OverrideBlob {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OverrideBlob) : {};
  } catch {
    return {};
  }
}

function writeBlob(blob: OverrideBlob): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch (e) {
    console.error('ไม่สามารถบันทึกการตั้งค่าได้:', e);
  }
}

async function syncConfigToFirebase(): Promise<void> {
  if (!db) return;
  try {
    const blob = readBlob();
    await setDoc(doc(db, 'system', 'config'), blob);
  } catch (e) {
    console.error('Failed to sync config to Firebase:', e);
  }
}

export async function loadConfigFromFirebase(): Promise<void> {
  if (!db) return;
  try {
    const docSnap = await getDoc(doc(db, 'system', 'config'));
    if (docSnap.exists()) {
      const data = docSnap.data() as OverrideBlob;
      writeBlob(data);
    }
  } catch (e) {
    console.error('Failed to load config from Firebase:', e);
  }
}

/** URL ที่ควรใช้จริงของแต่ละแหล่งข้อมูล (override ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น) */
export function getDataSource(key: DataSourceKey): string {
  const override = readBlob().sources?.[key];
  return override !== undefined ? override : DEFAULT_DATA_SOURCES[key];
}

export function getAllDataSources(): Record<DataSourceKey, string> {
  const overrides = readBlob().sources || {};
  const out = { ...DEFAULT_DATA_SOURCES };
  (Object.keys(out) as DataSourceKey[]).forEach((k) => {
    if (overrides[k] !== undefined) out[k] = overrides[k] as string;
  });
  return out;
}

export function isDataSourceOverridden(key: DataSourceKey): boolean {
  return readBlob().sources?.[key] !== undefined;
}

export function setDataSource(key: DataSourceKey, url: string): void {
  const blob = readBlob();
  blob.sources = { ...(blob.sources || {}), [key]: url.trim() };
  writeBlob(blob);
  syncConfigToFirebase();
}

export function resetDataSource(key: DataSourceKey): void {
  const blob = readBlob();
  if (blob.sources) {
    delete blob.sources[key];
    writeBlob(blob);
    syncConfigToFirebase();
  }
}

/** ข้อมูลสถานี (override ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น) */
export function getStation(): StationConfig {
  const s = readBlob().station;
  return {
    ...DEFAULT_STATION,
    ...s,
    center: { ...DEFAULT_STATION.center, ...(s?.center || {}) },
  };
}

export function setStation(patch: Partial<StationConfig>): void {
  const blob = readBlob();
  const current = blob.station || {};
  blob.station = {
    ...current,
    ...patch,
    center: { ...(current.center || {}), ...(patch.center || {}) } as StationConfig['center'],
  };
  writeBlob(blob);
  syncConfigToFirebase();
}

export function isStationOverridden(): boolean {
  return readBlob().station !== undefined;
}

/** รายชื่อหน้าที่ถูกซ่อน (override ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น) */
export function getHiddenPages(): string[] {
  const h = readBlob().hiddenPages;
  return h !== undefined ? h : DEFAULT_HIDDEN_PAGES;
}

export function setHiddenPages(ids: string[]): void {
  const blob = readBlob();
  blob.hiddenPages = ids;
  writeBlob(blob);
  syncConfigToFirebase();
}

/** true เมื่อรันบน localhost/dev (ให้เห็นหน้าที่ซ่อนไว้ตอนปรับปรุง) */
export function isDevHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local');
  } catch {
    return false;
  }
}

/** ผู้ใช้ทั่วไปควรเห็นหน้านี้ไหม (ซ่อนในโปรดักชัน แต่ dev เห็นได้) */
export function isPageVisible(pageId: string): boolean {
  if (isDevHost()) return true;
  return !getHiddenPages().includes(pageId);
}

/** ล้างการตั้งค่าทั้งหมด กลับไปใช้ค่าเริ่มต้น */
export function resetAllConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    syncConfigToFirebase();
  } catch {
    /* ignore */
  }
}

/** ส่งออกการตั้งค่าเป็น JSON (ไว้คัดลอกไปตั้งในเครื่องอื่น หรือเก็บสำรอง) */
export function exportConfig(): string {
  return JSON.stringify(readBlob(), null, 2);
}

/** นำเข้าการตั้งค่าจาก JSON — คืน true ถ้าสำเร็จ */
export function importConfig(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as OverrideBlob;
    const clean: OverrideBlob = {};
    const validKeys: DataSourceKey[] = ['cctv', 'poi', 'cases', 'personnel', 'weapons', 'housing'];

    if (parsed.sources && typeof parsed.sources === 'object') {
      clean.sources = {};
      validKeys.forEach((k) => {
        if (typeof parsed.sources![k] === 'string') clean.sources![k] = parsed.sources![k] as string;
      });
    }
    if (parsed.station && typeof parsed.station === 'object') {
      clean.station = {};
      if (typeof parsed.station.name === 'string') clean.station.name = parsed.station.name;
      if (typeof parsed.station.shortName === 'string') clean.station.shortName = parsed.station.shortName;
      if (parsed.station.center && typeof parsed.station.center === 'object') {
        const c = parsed.station.center;
        clean.station.center = {
          lat: Number(c.lat) || DEFAULT_STATION.center.lat,
          lng: Number(c.lng) || DEFAULT_STATION.center.lng,
          zoom: Number(c.zoom) || DEFAULT_STATION.center.zoom,
        };
      }
    }
    if (Array.isArray(parsed.hiddenPages)) {
      clean.hiddenPages = parsed.hiddenPages.filter((x) => typeof x === 'string');
    }
    writeBlob(clean);
    return true;
  } catch {
    return false;
  }
}
