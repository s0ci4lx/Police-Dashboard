import type { CctvItem, PoiItem, CaseItem, DynamicPageConfig } from '../types/dashboard';
import { getDataSource, getStation } from '../config/dataSources';

// Resolved at load from the central config (respects in-app overrides in localStorage).
// To change these permanently for everyone, edit src/config/dataSources.ts.
export const USER_PROVIDED_SHEET_URL = getDataSource('cases');
export const USER_PROVIDED_POI_SHEET_URL = getDataSource('poi');
export const USER_PROVIDED_WEAPONS_SHEET_URL = getDataSource('weapons');
export const USER_PROVIDED_PERSONNEL_SHEET_URL = getDataSource('personnel');
export const USER_PROVIDED_CCTV_SHEET_URL = getDataSource('cctv');
export const USER_PROVIDED_HOUSING_SHEET_URL = getDataSource('housing');

export const DEFAULT_PAGES: DynamicPageConfig[] = [
  {
    id: 'cctv',
    title: 'กล้องวงจรปิด',
    department: 'งานสืบสวน',
    sheetUrl: USER_PROVIDED_CCTV_SHEET_URL,
    displayType: 'map-and-table',
    iconName: 'Camera',
    isCustom: false,
    createdAt: Date.now(),
  },

  {
    id: 'poi',
    title: 'ข้อมูลท้องถิ่น',
    department: 'ข้อมูลท้องถิ่น',
    sheetUrl: USER_PROVIDED_POI_SHEET_URL,
    displayType: 'map-and-table',
    iconName: 'MapPin',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'cases',
    title: 'คดีระหว่างสอบสวน',
    department: 'งานสอบสวน',
    sheetUrl: USER_PROVIDED_SHEET_URL,
    displayType: 'table-and-chart',
    iconName: 'FileText',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'personnel',
    title: 'ข้อมูลกำลังพล',
    department: 'งานบริหาร',
    sheetUrl: USER_PROVIDED_PERSONNEL_SHEET_URL,
    displayType: 'table-and-chart',
    iconName: 'Users',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'traffic',
    title: 'ติดตามงานจราจร',
    department: 'งานจราจร',
    sheetUrl: '',
    displayType: 'map-and-table',
    iconName: 'Car',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'weapons',
    title: 'อาวุธปืนสิ่งของหลวง',
    department: 'งานส่งกำลังบำรุง',
    sheetUrl: USER_PROVIDED_WEAPONS_SHEET_URL,
    displayType: 'table-and-chart',
    iconName: 'ShieldAlert',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'weapons-readiness',
    title: 'ภาพรวมความพร้อม',
    department: 'งานส่งกำลังบำรุง',
    sheetUrl: USER_PROVIDED_WEAPONS_SHEET_URL,
    displayType: 'table-and-chart',
    iconName: 'Gauge',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'reports',
    title: 'สถิติรายงานจุดตรวจ',
    department: 'งานสื่อสาร',
    sheetUrl: '',
    displayType: 'table-and-chart',
    iconName: 'LayoutGrid',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'housing',
    title: 'บ้านพักตำรวจ',
    department: 'งานสวัสดิการ',
    sheetUrl: USER_PROVIDED_HOUSING_SHEET_URL,
    displayType: 'map-and-table',
    iconName: 'Home',
    isCustom: false,
    createdAt: Date.now(),
  },
];

// Map center for the station — sourced from central config (edit in Settings or
// src/config/dataSources.ts). Kept under the original name for compatibility.
export const HAT_YAI_STATION_COORDS = getStation().center;

// Seeded random number generator for realistic Sathon CCTV distribution
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

const ROADS_AND_AREAS = [
  'ถ.สะท้อน-นาทวี', 'ถ.จนะ-นาทวี', 'สายป่าบ่อ-สะท้อน', 'หน้าวัดสะท้อน', 'หน้าโรงเรียนบ้านสะท้อน',
  'สี่แยกสะท้อน', 'สามแยกบ้านวังใหญ่', 'จุดตรวจตู้ยามสะท้อน', 'ถ.ลพบุรีราเมศวร์'
];

const CAMERA_TYPES: ('Fixed Camera' | 'PTZ Camera' | 'LPR/AI Camera' | 'Speed Cam')[] = [
  'Fixed Camera', 'PTZ Camera', 'LPR/AI Camera', 'Speed Cam'
];

function generateFullHatYaiCctvData(): CctvItem[] {
  const items: CctvItem[] = [];
  let idCount = 1;

  const agencyBreakdown = [
    { agency: 'อบจ.สงขลา', count: 339 },
    { agency: 'มหาดไทย', count: 332 },
    { agency: 'เอกชน', count: 85 },
    { agency: 'รฟท./สภ.', count: 42 },
    { agency: 'หน่วยงานอื่นๆ', count: 27 },
  ];

  agencyBreakdown.forEach(({ agency, count }) => {
    for (let i = 0; i < count; i++) {
      const seed = idCount * 137;
      const road = ROADS_AND_AREAS[Math.floor(pseudoRandom(seed) * ROADS_AND_AREAS.length)];
      const subNumber = Math.floor(pseudoRandom(seed + 1) * 30) + 1;
      const camType = CAMERA_TYPES[Math.floor(pseudoRandom(seed + 2) * CAMERA_TYPES.length)];

      const latOffset = (pseudoRandom(seed + 3) - 0.5) * 0.065;
      const lngOffset = (pseudoRandom(seed + 4) - 0.5) * 0.075;

      const isOffline = pseudoRandom(seed + 5) < 0.05;
      const isMaint = !isOffline && pseudoRandom(seed + 6) < 0.03;

      const status = isOffline
        ? 'ออฟไลน์ (ขัดข้อง)'
        : isMaint
        ? 'กำลังซ่อมบำรุง'
        : 'ออนไลน์ (ปกติ)';

      items.push({
        id: `cam-${idCount}`,
        no: idCount,
        agency: agency as any,
        locationName: `${road} ซอย ${subNumber} (จุดที่ ${i + 1})`,
        address: 'ต.สะท้อน อ.นาทวี จ.สงขลา',
        notes: `กล้องเฝ้าระวังความปลอดภัยสังกัด ${agency} จุดส่องการจราจรและพื้นที่เสี่ยง`,
        lat: Number((HAT_YAI_STATION_COORDS.lat + latOffset).toFixed(6)),
        lng: Number((HAT_YAI_STATION_COORDS.lng + lngOffset).toFixed(6)),
        type: camType,
        status: status as any,
        lastChecked: `${Math.floor(pseudoRandom(seed + 7) * 45) + 1} นาทีที่แล้ว`,
      });

      idCount++;
    }
  });

  return items;
}

export const SAMPLE_CCTV_DATA: CctvItem[] = generateFullHatYaiCctvData();

export const SAMPLE_POI_DATA: PoiItem[] = [
  { id: 'poi-1', no: 1, category: 'โรงเรียน', name: 'โรงเรียนบ้านสะท้อน', address: 'ต.สะท้อน อ.นาทวี จ.สงขลา', contactPerson: 'คุณครูฝ่ายปกครอง', phone: '074-371100', lat: 6.7580, lng: 100.6730, riskLevel: 'เฝ้าระวังพิเศษ', policeSubstation: 'สายตรวจเขต 1' },
  { id: 'poi-2', no: 2, category: 'วัด / มัสยิด', name: 'วัดสะท้อน', address: 'หมู่ 1 ต.สะท้อน อ.นาทวี จ.สงขลา', contactPerson: 'เจ้าอาวาสวัด', phone: '074-371200', lat: 6.7565, lng: 100.6715, riskLevel: 'ต่ำ', policeSubstation: 'สายตรวจเขต 2' },
  { id: 'poi-3', no: 3, category: 'วัด / มัสยิด', name: 'มัสยิดบ้านสะท้อน', address: 'หมู่ 2 ต.สะท้อน อ.นาทวี จ.สงขลา', contactPerson: 'อิหม่ามประจำมัสยิด', phone: '074-371300', lat: 6.7550, lng: 100.6700, riskLevel: 'ต่ำ', policeSubstation: 'สายตรวจเขต 3' },
  { id: 'poi-4', no: 4, category: 'ปั๊มน้ำมัน', name: 'ปตท. สาขาสะท้อน-นาทวี', address: 'ถ.จะนะ-นาทวี ต.สะท้อน อ.นาทวี', contactPerson: 'ผู้จัดการสถานี', phone: '074-371400', lat: 6.7590, lng: 100.6740, riskLevel: 'ปานกลาง', policeSubstation: 'สายตรวจเขต 4' },
  { id: 'poi-5', no: 5, category: 'ร้านสะดวกซื้อ', name: '7-Eleven สาขา ตลาดสะท้อน', address: 'ตลาดสะท้อน ต.สะท้อน อ.นาทวี', contactPerson: 'ผู้จัดการสาขา', phone: '074-371500', lat: 6.7575, lng: 100.6728, riskLevel: 'สูง', policeSubstation: 'สายตรวจเขต 1' },
  { id: 'poi-6', no: 6, category: 'โรงพยาบาล', name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลสะท้อน (รพ.สต.สะท้อน)', address: 'ต.สะท้อน อ.นาทวี จ.สงขลา', contactPerson: 'ผู้อำนวยการ รพ.สต.', phone: '074-371600', lat: 6.7585, lng: 100.6735, riskLevel: 'ต่ำ', policeSubstation: 'ตู้ยาม รพ.สต.สะท้อน' },
];

export const SAMPLE_CASES_DATA: CaseItem[] = [
  { caseNo: '998/2567', receiptDate: '11-มิ.ย.-67', suspect: '1) นาย สมานชัย และตี', charge: '1) ตัวการช่วยซ่อนเร้น ช่วยจำหน่าย ช่วยพาเอาไปเสีย ซื้อรับจำนำ หรือรับไว้โดยประการใดซึ่งของอันตนรู้ว่าเป็นของที่ยังมิได้เสียค่าภาษี หรือของต้องจำกัด', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. ธีรเดช ตติยวัฒนชัย', duration: '9 เดือน 12 วัน', formattedDate: '11/6/2024' },
  { caseNo: '994/2566', receiptDate: '15-มี.ค.-66', suspect: '1) นาย นตพล ฉิมแก้ว 2) นาย สิทธิวัฒน์ รักษาคง 3) นาย ธนวัฒน์ รักษาคง', charge: '1) ร่วมกันหน่วงเหนี่ยวหรือกักขังผู้อื่น 2) ร่วมกันหน่วงเหนี่ยวหรือกักขังผู้อื่น', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. จิรศักดิ์ วงศ์สุริยะ', duration: '2 ปี 8 วัน', formattedDate: '15/3/2023' },
  { caseNo: '980/2566', receiptDate: '14-มี.ค.-66', suspect: '1) นาย ปกรณ์ เศวตจินดา', charge: '1) ตัวการช่วยซ่อนเร้น ช่วยจำหน่าย ช่วยพาเอาไปเสีย ซื้อรับจำนำ', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. พนมกร เภรีฤกษ์', duration: '2 ปี 9 วัน', formattedDate: '14/3/2023' },
  { caseNo: '974/2567', receiptDate: '7-มิ.ย.-67', suspect: '1) นาย จีรศักดิ์ สลีฟิน', charge: '1) ตัวการออกเช็คเพื่อชำระหนี้ที่มีอยู่จริงและบังคับได้ตามกฎหมาย โดยในขณะที่ออกเช็คนั้นไม่มีเงินอยู่ในบัญชี', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'พ.ต.ท. นิมมาน นิกูโน', duration: '9 เดือน 16 วัน', formattedDate: '7/6/2024' },
  { caseNo: '968/2567', receiptDate: '6-มิ.ย.-67', suspect: '1) นาย สุเทพ ปัญญา', charge: '1) ตัวการฉ้อโกง, ตัวการนำเข้าสู่ระบบคอมพิวเตอร์ซึ่งข้อมูลคอมพิวเตอร์ปลอม', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. พนมกร เภรีฤกษ์', duration: '9 เดือน 17 วัน', formattedDate: '6/6/2024' },
  { caseNo: '814/2567', receiptDate: '12-พ.ค.-67', suspect: '1) นาย ทินกร อ่อนคำ', charge: '1) ตัวการทำร้ายร่างกายผู้อื่น จนถึงแก่ความตาย', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.ท. อารอฟัต บินยูโซ๊ะ', duration: '10 เดือน 11 วัน', formattedDate: '12/5/2024' },
  { caseNo: '779/2567', receiptDate: '6-พ.ค.-67', suspect: '1) นาย อัจฉริยะ ไกรสุวรรณ 2) นาย สมชาย แก้วทอง', charge: '1) ร่วมกันลักทรัพย์, ร่วมกันมี ใช้ อาวุธปืน หรือเครื่องกระสุนปืน โดยมิได้อนุญาต', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. วรเมธ สุวรรณรัตน์', duration: '10 เดือน 17 วัน', formattedDate: '6/5/2024' },
  { caseNo: '738/2567', receiptDate: '25-เม.ย.-67', suspect: '1) นาย เจะฮาฟีฟุดดีน มามะ', charge: '1) ตัวการมี ใช้ อาวุธปืน หรือเครื่องกระสุนปืน โดยมิได้อนุญาต', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. วรเมธ สุวรรณรัตน์', duration: '10 เดือน 28 วัน', formattedDate: '25/4/2024' },
  { caseNo: '698/2567', receiptDate: '18-เม.ย.-67', suspect: '1) นาย ณัฐวุฒิ น้อยประเทศ 2) นาย พอเพียง บาโจนี', charge: '1) พยายามฆ่าผู้อื่น', station: 'สภ.สะท้อน ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. จิรศักดิ์ วงศ์สุริยะ', duration: '11 เดือน 5 วัน', formattedDate: '18/4/2024' }
];
