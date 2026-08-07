export type ViewMode = 'cctv' | 'poi' | 'weapons' | 'personnel' | string;

export type DisplayType = 'map-and-table' | 'table-and-chart' | 'map-only' | 'table-only';

export type PoliceDepartment = 'งานสืบสวน' | 'งานสอบสวน' | 'งานจราจร' | 'งานป้องกันปราบปราม' | 'งานส่งกำลังบำรุง' | 'งานบริหาร' | 'ข้อมูลท้องถิ่น' | 'กำลังพล' | 'งานสื่อสาร' | 'งานสวัสดิการ' | 'โครงสร้างพื้นฐาน' | 'อื่นๆ';

export interface DynamicPageConfig {
  id: string;
  title: string;
  department: PoliceDepartment;
  sheetUrl: string;
  displayType: DisplayType;
  iconName?: string;
  latColumn?: string;
  lngColumn?: string;
  titleColumn?: string;
  categoryColumn?: string;
  isCustom?: boolean;
  createdAt: number;
}

export interface CctvItem {
  id: string;
  no: number;
  agency: 'อบจ.สงขลา' | 'มหาดไทย' | 'เอกชน' | 'รฟท./สภ.' | 'หน่วยงานอื่นๆ' | string;
  locationName: string;
  address: string;
  notes: string;
  lat: number;
  lng: number;
  type: 'Fixed Camera' | 'PTZ Camera' | 'LPR/AI Camera' | 'Speed Cam';
  status: 'ออนไลน์ (ปกติ)' | 'ออฟไลน์ (ขัดข้อง)' | 'กำลังซ่อมบำรุง';
  lastChecked?: string;
}

export interface PoiItem {
  id: string;
  no: number;
  category: 'โรงเรียน' | 'วัด / มัสยิด' | 'ปั๊มน้ำมัน' | 'ร้านสะดวกซื้อ' | 'โรงพยาบาล' | 'ธนาคาร' | 'สถานที่ท่องเที่ยว' | string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  lat: number;
  lng: number;
  riskLevel?: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เฝ้าระวังพิเศษ' | 'ปกติ' | string;
  policeSubstation?: string;
  subCategory?: string;
  notes?: string;
}

export interface HousingItem {
  id: string;
  no: number;
  rank: string;
  firstName: string;
  lastName: string;
  position: string;
  agency: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  vehicle: string;
  phone: string;
}

export interface WeaponItem {
  id: string;
  no: number;
  category: 'อาวุธปืน' | 'เครื่องกระสุน' | 'อุปกรณ์สื่อสาร' | 'ยุทธภัณฑ์ป้องกัน' | 'อื่นๆ';
  name: string;
  total: number;
  issued: number;
  inStock: number;
  usable: number;
  unusable: number;
  lost: number;
  notes: string;
}

export interface PersonnelItem {
  id: string;
  no: number;
  position: string;
  authorized: number;
  assigned: number;
  vacant: number;
  detachedIn: number;
  detachedOut: number;
  effectiveTotal: number;
  category: 'นายตำรวจชั้นผู้บังคับบัญชา' | 'สัญญาบัตร (พงส./สายงาน)' | 'ชั้นประทวนปฏิบัติการ' | string;
}

export interface GenericRecord {
  [key: string]: any;
}
