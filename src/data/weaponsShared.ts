import { useState, useEffect } from 'react';
import type { WeaponItem } from '../types/dashboard';
import { USER_PROVIDED_WEAPONS_SHEET_URL } from './mockInitialData';
import { getDataSource } from '../config/dataSources';
import { fetchSheetData } from '../services/googleSheetService';

// ---- Categorisation ---------------------------------------------------------
export function categoryOf(name: string): WeaponItem['category'] {
  if (name.includes('ปืน') && !name.includes('ช๊อต') && !name.includes('กระสุน')) return 'อาวุธปืน';
  if (name.includes('กระสุน')) return 'เครื่องกระสุน';
  if (name.includes('วิทยุ')) return 'อุปกรณ์สื่อสาร';
  if (name.includes('เกราะ') || name.includes('โล่') || name.includes('ช๊อต')) return 'ยุทธภัณฑ์ป้องกัน';
  return 'อื่นๆ';
}

export const WEAPON_CATEGORIES = ['อาวุธปืน', 'เครื่องกระสุน', 'อุปกรณ์สื่อสาร', 'ยุทธภัณฑ์ป้องกัน'] as const;

export const WEAPON_CAT_COLOR: Record<string, string> = {
  'อาวุธปืน': '#ef4444',
  'เครื่องกระสุน': '#f59e0b',
  'อุปกรณ์สื่อสาร': '#3b82f6',
  'ยุทธภัณฑ์ป้องกัน': '#10b981',
  'อื่นๆ': '#64748b',
};

export const WEAPON_CAT_UNIT: Record<string, string> = {
  'อาวุธปืน': 'กระบอก',
  'เครื่องกระสุน': 'นัด',
  'อุปกรณ์สื่อสาร': 'เครื่อง',
  'ยุทธภัณฑ์ป้องกัน': 'ชิ้น',
  'อื่นๆ': 'รายการ',
};

// Firearm sub-type grouping for distribution views
export function firearmSubtype(name: string): string {
  if (name.includes('ลูกโม่')) return 'ปืนพกลูกโม่ .38';
  if (name.includes('กึ่งอัตโนมัติ')) return 'ปืนพกกึ่งอัตโนมัติ 9มม.';
  if (name.includes('ปืนกลมือ')) return 'ปืนกลมือ';
  if (name.includes('ลูกซอง')) return 'ปืนลูกซอง';
  if (name.includes('เล็กสั้น') || name.includes('เล็กยาว')) return 'ปืนเล็ก 5.56มม.';
  return 'อื่นๆ';
}

// Short caliber label from an ammunition row name
export function ammoLabel(name: string): string {
  return name.replace('กระสุนปืนลูกซอง', 'ลูกซอง').replace('กระสุนปืน', '').replace('ขนาด', '').replace(/\(.*?\)/g, '').trim() || name;
}

// ---- Condition model --------------------------------------------------------
// total = available (พร้อมใช้ในคลัง) + issued (เบิกจ่าย) + unusable (ชำรุด) + lost (สูญหาย)
export interface WeaponSegments {
  available: number;
  issued: number;
  unusable: number;
  lost: number;
}

export function deriveSegments(w: WeaponItem): WeaponSegments {
  const issued = w.issued || 0;
  const unusable = w.unusable || 0;
  const lost = w.lost || 0;
  const available = Math.max(0, w.total - issued - unusable - lost);
  return { available, issued, unusable, lost };
}

// Readiness = usable share of the total (available + issued are considered serviceable)
export function readinessPct(w: WeaponItem): number {
  if (w.total <= 0) return 100;
  const s = deriveSegments(w);
  return ((s.available + s.issued) / w.total) * 100;
}

// ---- Aggregation ------------------------------------------------------------
export interface CatSummary {
  category: string;
  count: number; // number of line items
  total: number;
  available: number;
  issued: number;
  unusable: number;
  lost: number;
  readiness: number; // %
}

export function summarizeByCategory(data: WeaponItem[]): CatSummary[] {
  const map = new Map<string, CatSummary>();
  data.forEach((w) => {
    const cat = w.category;
    if (!map.has(cat)) {
      map.set(cat, { category: cat, count: 0, total: 0, available: 0, issued: 0, unusable: 0, lost: 0, readiness: 0 });
    }
    const s = map.get(cat)!;
    const seg = deriveSegments(w);
    s.count += 1;
    s.total += w.total;
    s.available += seg.available;
    s.issued += seg.issued;
    s.unusable += seg.unusable;
    s.lost += seg.lost;
  });
  const order = ['อาวุธปืน', 'เครื่องกระสุน', 'อุปกรณ์สื่อสาร', 'ยุทธภัณฑ์ป้องกัน', 'อื่นๆ'];
  return Array.from(map.values())
    .map((s) => ({ ...s, readiness: s.total > 0 ? ((s.available + s.issued) / s.total) * 100 : 100 }))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}

// ---- Fallback data (mirror of the live sheet) -------------------------------
// [name, total, issued, inStock, usable, unusable, lost]
const FALLBACK_ROWS: Array<[string, number, number, number, number, number, number]> = [
  ['อาวุธปืนพกลูกโม่แบบ 91 ขนาด .38 นิ้ว ยี่ห้อ Smith & Wesson (Model 13-4)', 82, 0, 82, 82, 0, 0],
  ['อาวุธปืนพกลูกโม่แบบ 91 ขนาด .38 นิ้ว ยี่ห้อ Smith & Wesson (Model 10 หางหนู)', 1, 0, 1, 1, 0, 0],
  ['อาวุธปืนพกสั้นกึ่งอัตโนมัติ ขนาด 9 มม. ยี่ห้อ Glock รุ่น 19', 147, 72, 75, 75, 0, 0],
  ['อาวุธปืนพกสั้นกึ่งอัตโนมัติ ขนาด 9 มม. ยี่ห้อ Sig Sauer รุ่น P320SP', 82, 20, 62, 62, 0, 0],
  ['อาวุธปืนกลมือ ขนาด 9 มม. ยี่ห้อ Sig sauer รุ่น SIG MPX', 6, 5, 1, 1, 0, 0],
  ['อาวุธปืนเล็กสั้น ขนาด 5.56 มม. ยี่ห้อ Colt M4 Carbine รุ่น R0979', 40, 6, 34, 34, 0, 0],
  ['อาวุธปืนเล็กยาว เอ็ม.16 ขนาด 5.56 มม. A1', 6, 0, 6, 6, 0, 0],
  ['อาวุธปืนเล็กยาวแบบ 11 HK33 ขนาด 5.56 มม.', 50, 0, 50, 50, 0, 0],
  ['อาวุธปืนลูกซอง ขนาด 12 เกจ ยี่ห้อ Hatsan รุ่น Escort MPS-TS', 15, 0, 15, 15, 0, 0],
  ['อาวุธปืนลูกซองแบบ 02 ขนาด 12 เกจ ยี่ห้อ Benelli รุ่น Super Nova', 4, 1, 3, 3, 0, 0],
  ['กระสุนปืน ขนาด 9 มม. (จริง)', 14211, 0, 0, 14211, 0, 0],
  ['กระสุนปืน ขนาด .38 นิ้ว (จริง)', 4600, 0, 0, 1600, 3000, 0],
  ['กระสุนปืน ขนาด 5.56 มม. (M193)', 142425, 0, 0, 0, 142425, 0],
  ['กระสุนปืน ขนาด .30 มม.คาบิน', 16234, 0, 0, 0, 16234, 0],
  ['กระสุนปืน ขนาด 7.62 มม. (นาโต้)', 480, 0, 0, 0, 480, 0],
  ['กระสุนปืนลูกซอง ขนาด 12 เกจ', 556, 0, 0, 556, 0, 0],
  ['วิทยุสื่อสารดิจิตอล ยี่ห้อ HUAWEI รุ่น EP821', 24, 18, 6, 6, 0, 0],
  ['วิทยุสื่อสารดิจิตอล ยี่ห้อ HUAWEI รุ่น EP682', 346, 312, 34, 26, 8, 0],
  ['ปืนช๊อตไฟฟ้า Taser', 3, 3, 0, 3, 0, 0],
  ['เสื้อเกราะอ่อน', 135, 0, 0, 0, 0, 0],
  ['แผ่นเกราะ', 12, 0, 0, 0, 0, 0],
  ['โล่กันกระสุน', 0, 0, 0, 0, 0, 0],
];

export function buildFallbackWeapons(): WeaponItem[] {
  return FALLBACK_ROWS.map(([name, total, issued, inStock, usable, unusable, lost], idx) => ({
    id: `wfb-${idx + 1}`,
    no: idx + 1,
    category: categoryOf(name),
    name,
    total,
    issued,
    inStock,
    usable,
    unusable,
    lost,
    notes: '-',
  }));
}

// ---- Live-data hook (shared by both weapons pages) --------------------------
export function useWeaponsData() {
  const [data, setData] = useState<WeaponItem[]>(buildFallbackWeapons());
  const [loading, setLoading] = useState<boolean>(true);
  const [syncMsg, setSyncMsg] = useState<string>('');

  const reload = async () => {
    setLoading(true);
    setSyncMsg('');
    try {
      const sheetUrl = getDataSource('weapons') || USER_PROVIDED_WEAPONS_SHEET_URL;
      const { data: rows, columns } = await fetchSheetData<Record<string, any>>(sheetUrl);
      if (rows && rows.length > 0) {
        const nameCol = columns.find((c) => c.includes('ประเภท') || c.includes('ชนิด')) || columns[1] || columns[0];
        const totalCol = columns.find((c) => c.includes('ทั้งหมด') || c.includes('จำนวน')) || columns[2];
        const issuedCol = columns.find((c) => c.includes('เบิกจ่าย')) || columns[3];
        const stockCol = columns.find((c) => c.includes('คงคลัง')) || columns[4];
        const usableCol = columns.find((c) => c.includes('ใช้งานได้') && !c.includes('ไม่ได้')) || columns[5];
        const unusableCol = columns.find((c) => c.includes('ใช้งานไม่ได้')) || columns[6];
        const lostCol = columns.find((c) => c.includes('สูญหาย')) || columns[7];
        const notesCol = columns.find((c) => c.includes('หมายเหตุ')) || columns[8] || '';

        const num = (v: any) => {
          if (!v) return 0;
          const n = parseInt(String(v).replace(/,/g, '').trim(), 10);
          return isNaN(n) ? 0 : n;
        };

        const mapped: WeaponItem[] = rows
          .filter((r) => r[nameCol] && String(r[nameCol]).trim() !== '')
          .map((r, idx) => {
            const name = String(r[nameCol]).trim();
            return {
              id: `wep-${idx + 1}`,
              no: idx + 1,
              category: categoryOf(name),
              name,
              total: num(r[totalCol]),
              issued: num(r[issuedCol]),
              inStock: num(r[stockCol]),
              usable: num(r[usableCol]),
              unusable: num(r[unusableCol]),
              lost: num(r[lostCol]),
              notes: String(r[notesCol] || '-'),
            };
          });

        setData(mapped);
        setSyncMsg(`✅ ดึงข้อมูลทะเบียนยุทธภัณฑ์สำเร็จ ทั้งหมด ${mapped.length} รายการ`);
      }
    } catch (err: any) {
      console.warn('Failed to load weapons sheet:', err);
      setSyncMsg('⚠️ ไม่สามารถอ่านจาก Google Sheet ได้ — กำลังแสดงชุดข้อมูลสำรองล่าสุด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { data, loading, syncMsg, reload };
}
