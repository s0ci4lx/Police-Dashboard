import type { CctvItem, PoiItem, CaseItem, DynamicPageConfig } from '../types/dashboard';

export const USER_PROVIDED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/edit?usp=sharing';
export const USER_PROVIDED_POI_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/export?format=csv&gid=1578849502';
export const USER_PROVIDED_WEAPONS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/export?format=csv&gid=1819093863';
export const USER_PROVIDED_PERSONNEL_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/gviz/tq?tqx=out:csv&sheet=%E0%B8%81%E0%B8%B3%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%9E%E0%B8%A5';

export const DEFAULT_PAGES: DynamicPageConfig[] = [
  {
    id: 'cctv',
    title: 'กล้องวงจรปิด',
    department: 'งานสืบสวน',
    sheetUrl: '',
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
    department: 'งานป้องกันปราบปราม',
    sheetUrl: USER_PROVIDED_WEAPONS_SHEET_URL,
    displayType: 'table-and-chart',
    iconName: 'ShieldAlert',
    isCustom: false,
    createdAt: Date.now(),
  },
];

// Center coordinates for Hat Yai Police Station (สภ.หาดใหญ่)
export const HAT_YAI_STATION_COORDS = {
  lat: 7.0084,
  lng: 100.4767,
  zoom: 13,
};

// Seeded random number generator for realistic Hat Yai CCTV distribution
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

const ROADS_AND_AREAS = [
  'ถ.ธรรมนูญวิถี', 'ถ.ศุภสารรังสรรค์', 'ถ.เพชรเกษม', 'ถ.กาญจนวณิชย์', 'ถ.นิพัทธ์อุทิศ 1',
  'ถ.นิพัทธ์อุทิศ 2', 'ถ.นิพัทธ์อุทิศ 3', 'ถ.ศรีภูวนาถ', 'ถ.ราษฎร์ยินดี', 'ถ.โชติวิทยะกุล',
  'สามแยกคอหงส์', 'สี่แยกวงเวียนน้ำพุ', 'สี่แยกคลองเรียน', 'ทางข้ามรถไฟคลองเตย', 'สี่แยกตลาดกิมหยง',
  'สี่แยกบิ๊กซีคลองแห', 'หน้าลานสถานีรถไฟหาดใหญ่', 'หน้าประตู ม.สงขลานครินทร์', 'ถ.ลพบุรีราเมศวร์'
];

const CAMERA_TYPES: ('Fixed Camera' | 'PTZ Camera' | 'LPR/AI Camera' | 'Speed Cam')[] = [
  'Fixed Camera', 'PTZ Camera', 'LPR/AI Camera', 'Speed Cam'
];

function generateFullHatYaiCctvData(): CctvItem[] {
  const items: CctvItem[] = [];
  let idCount = 1;

  const agencyBreakdown = [
    { agency: 'กทม/อบจ.', count: 339 },
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
        address: 'ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา',
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
  { id: 'poi-1', no: 1, category: 'โรงเรียน', name: 'โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)', address: '168 ถ.เพชรเกษม อ.หาดใหญ่ จ.สงขลา', contactPerson: 'อาจารย์ฝ่ายปกครอง', phone: '074-254100', lat: 7.0142, lng: 100.4812, riskLevel: 'เฝ้าระวังพิเศษ', policeSubstation: 'สายตรวจเขต 1' },
  { id: 'poi-2', no: 2, category: 'โรงเรียน', name: 'โรงเรียนแสงทองวิทยา', address: '93 ถ.ธรรมนูญวิถี อ.หาดใหญ่ จ.สงขลา', contactPerson: 'อธิการโรงเรียน', phone: '074-243160', lat: 7.0055, lng: 100.4750, riskLevel: 'ปานกลาง', policeSubstation: 'สายตรวจเขต 2' },
  { id: 'poi-3', no: 3, category: 'วัด / มัสยิด', name: 'วัดหาดใหญ่สระน้ำ (วัดมหัตตมังคลาราม)', address: 'ถ.โฉลกรัฐ อ.หาดใหญ่ จ.สงขลา', contactPerson: 'เจ้าอาวาสวัด', phone: '074-231566', lat: 7.0030, lng: 100.4580, riskLevel: 'ต่ำ', policeSubstation: 'สายตรวจเขต 3' },
  { id: 'poi-4', no: 4, category: 'วัด / มัสยิด', name: 'มัสยิดกลางประจำจังหวัดสงขลา', address: 'ถ.ลพบุรีราเมศวร์ ต.คลองแห อ.หาดใหญ่', contactPerson: 'อิหม่ามประจำมัสยิด', phone: '074-300100', lat: 7.0620, lng: 100.4680, riskLevel: 'เฝ้าระวังพิเศษ', policeSubstation: 'สภ.คลองแห' },
  { id: 'poi-5', no: 5, category: 'ปั๊มน้ำมัน', name: 'ปตท. สาขาหาดใหญ่ใน (ถ.เพชรเกษม)', address: 'ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่', contactPerson: 'ผู้จัดการสถานี', phone: '074-252111', lat: 7.0090, lng: 100.4480, riskLevel: 'ปานกลาง', policeSubstation: 'สายตรวจเขต 4' },
  { id: 'poi-6', no: 6, category: 'ร้านสะดวกซื้อ', name: '7-Eleven สาขา ตลาดกิมหยง', address: 'ถ.ศุภสารรังสรรค์ อ.หาดใหญ่', contactPerson: 'ผู้จัดการสาขา', phone: '074-220099', lat: 7.0068, lng: 100.4730, riskLevel: 'สูง', policeSubstation: 'สายตรวจเขต 1' },
  { id: 'poi-7', no: 7, category: 'โรงพยาบาล', name: 'โรงพยาบาลหาดใหญ่', address: '182 ถ.รัถการ อ.หาดใหญ่ จ.สงขลา', contactPerson: 'ศูนย์วิทยุ รพ.', phone: '074-273100', lat: 7.0135, lng: 100.4660, riskLevel: 'ต่ำ', policeSubstation: 'ตู้ยาม รพ.หาดใหญ่' },
  { id: 'poi-8', no: 8, category: 'โรงพยาบาล', name: 'โรงพยาบาลกรุงเทพหาดใหญ่', address: '75 ซ.15 ถ.เพชรเกษม อ.หาดใหญ่', contactPerson: 'ฉุกเฉิน 1719', phone: '074-272800', lat: 7.0098, lng: 100.4890, riskLevel: 'ต่ำ', policeSubstation: 'สายตรวจเขต 2' },
  { id: 'poi-9', no: 9, category: 'ธนาคาร', name: 'ธนาคารกสิกรไทย สาขาถนนเพชรเกษม', address: 'ถ.เพชรเกษม อ.หาดใหญ่', contactPerson: 'ฝ่ายความปลอดภัย', phone: '074-230111', lat: 7.0115, lng: 100.4755, riskLevel: 'สูง', policeSubstation: 'สายตรวจธนาคาร' },
  { id: 'poi-10', no: 10, category: 'สถานที่ท่องเที่ยว', name: 'ตลาดกิมหยง หาดใหญ่', address: 'ถ.ศุภสารรังสรรค์ อ.หาดใหญ่', contactPerson: 'ประธานชุมชน', phone: '074-233400', lat: 7.0066, lng: 100.4728, riskLevel: 'เฝ้าระวังพิเศษ', policeSubstation: 'สายตรวจท่องเที่ยว' }
];

export const SAMPLE_CASES_DATA: CaseItem[] = [
  { caseNo: '998/2567', receiptDate: '11-มิ.ย.-67', suspect: '1) นาย สมานชัย และตี', charge: '1) ตัวการช่วยซ่อนเร้น ช่วยจำหน่าย ช่วยพาเอาไปเสีย ซื้อรับจำนำ หรือรับไว้โดยประการใดซึ่งของอันตนรู้ว่าเป็นของที่ยังมิได้เสียค่าภาษี หรือของต้องจำกัด', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. ธีรเดช ตติยวัฒนชัย', duration: '9 เดือน 12 วัน', formattedDate: '11/6/2024' },
  { caseNo: '994/2566', receiptDate: '15-มี.ค.-66', suspect: '1) นาย นตพล ฉิมแก้ว 2) นาย สิทธิวัฒน์ รักษาคง 3) นาย ธนวัฒน์ รักษาคง', charge: '1) ร่วมกันหน่วงเหนี่ยวหรือกักขังผู้อื่น 2) ร่วมกันหน่วงเหนี่ยวหรือกักขังผู้อื่น', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. จิรศักดิ์ วงศ์สุริยะ', duration: '2 ปี 8 วัน', formattedDate: '15/3/2023' },
  { caseNo: '980/2566', receiptDate: '14-มี.ค.-66', suspect: '1) นาย ปกรณ์ เศวตจินดา', charge: '1) ตัวการช่วยซ่อนเร้น ช่วยจำหน่าย ช่วยพาเอาไปเสีย ซื้อรับจำนำ', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. พนมกร เภรีฤกษ์', duration: '2 ปี 9 วัน', formattedDate: '14/3/2023' },
  { caseNo: '974/2567', receiptDate: '7-มิ.ย.-67', suspect: '1) นาย จีรศักดิ์ สลีฟิน', charge: '1) ตัวการออกเช็คเพื่อชำระหนี้ที่มีอยู่จริงและบังคับได้ตามกฎหมาย โดยในขณะที่ออกเช็คนั้นไม่มีเงินอยู่ในบัญชี', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'พ.ต.ท. นิมมาน นิกูโน', duration: '9 เดือน 16 วัน', formattedDate: '7/6/2024' },
  { caseNo: '968/2567', receiptDate: '6-มิ.ย.-67', suspect: '1) นาย สุเทพ ปัญญา', charge: '1) ตัวการฉ้อโกง, ตัวการนำเข้าสู่ระบบคอมพิวเตอร์ซึ่งข้อมูลคอมพิวเตอร์ปลอม', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. พนมกร เภรีฤกษ์', duration: '9 เดือน 17 วัน', formattedDate: '6/6/2024' },
  { caseNo: '814/2567', receiptDate: '12-พ.ค.-67', suspect: '1) นาย ทินกร อ่อนคำ', charge: '1) ตัวการทำร้ายร่างกายผู้อื่น จนถึงแก่ความตาย', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.ท. อารอฟัต บินยูโซ๊ะ', duration: '10 เดือน 11 วัน', formattedDate: '12/5/2024' },
  { caseNo: '779/2567', receiptDate: '6-พ.ค.-67', suspect: '1) นาย อัจฉริยะ ไกรสุวรรณ 2) นาย สมชาย แก้วทอง', charge: '1) ร่วมกันลักทรัพย์, ร่วมกันมี ใช้ อาวุธปืน หรือเครื่องกระสุนปืน โดยมิได้อนุญาต', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. วรเมธ สุวรรณรัตน์', duration: '10 เดือน 17 วัน', formattedDate: '6/5/2024' },
  { caseNo: '738/2567', receiptDate: '25-เม.ย.-67', suspect: '1) นาย เจะฮาฟีฟุดดีน มามะ', charge: '1) ตัวการมี ใช้ อาวุธปืน หรือเครื่องกระสุนปืน โดยมิได้อนุญาต', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. วรเมธ สุวรรณรัตน์', duration: '10 เดือน 28 วัน', formattedDate: '25/4/2024' },
  { caseNo: '698/2567', receiptDate: '18-เม.ย.-67', suspect: '1) นาย ณัฐวุฒิ น้อยประเทศ 2) นาย พอเพียง บาโจนี', charge: '1) พยายามฆ่าผู้อื่น', station: 'สภ.หาดใหญ่ ภ.จว.สงขลา ภ.9', investigator: 'ร.ต.อ. จิรศักดิ์ วงศ์สุริยะ', duration: '11 เดือน 5 วัน', formattedDate: '18/4/2024' }
];
