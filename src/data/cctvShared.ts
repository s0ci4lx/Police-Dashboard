import type { CctvItem } from '../types/dashboard';
import { fetchSheetData, detectLatLongColumns, parseRowLatLng } from '../services/googleSheetService';
import { getStation } from '../config/dataSources';

/**
 * Fetch CCTV installation points from a Google Sheet and map them to CctvItem[].
 * Column names are auto-detected (agency / location / address / notes + lat-lng),
 * so officers can keep their own sheet layout. Used by both CCTV pages when a
 * CCTV data source URL is configured.
 */
export async function fetchCctvFromSheet(sheetUrl: string): Promise<CctvItem[]> {
  const { data, columns } = await fetchSheetData<Record<string, any>>(sheetUrl);
  if (!data || data.length === 0) return [];

  // Handles separate lat/lng columns AND a single combined "พิกัด" column (e.g. "7.01, 100.47")
  const { latCol, lngCol, combinedCol } = detectLatLongColumns(columns);
  const center = getStation().center;

  const agencyCol = columns.find((c) => c.includes('หน่วยงาน') || c.includes('สังกัด')) || columns[0];
  const locationCol =
    columns.find((c) => c.includes('ชื่อ') || c.includes('สถานที่') || c.includes('จุด')) || columns[1] || columns[0];
  const addressCol = columns.find((c) => c.includes('ที่อยู่') || c.includes('ทำเล') || c.includes('เขต') || c.includes('พื้นที่')) || '';
  const notesCol = columns.find((c) => c.includes('หมายเหตุ') || c.includes('รายละเอียด')) || '';
  const typeCol = columns.find((c) => c.includes('ประเภท') || c.includes('ชนิด')) || '';
  const statusCol = columns.find((c) => c.includes('สถานะ')) || '';

  return data
    .filter((row) => row[locationCol] || row[agencyCol])
    .map((row, idx) => {
      const { lat, lng } = parseRowLatLng(row, latCol, lngCol, combinedCol);
      const rawType = typeCol ? String(row[typeCol] || '').trim() : '';
      const rawStatus = statusCol ? String(row[statusCol] || '').trim() : '';

      return {
        id: `sheet-cam-${idx + 1}`,
        no: idx + 1,
        agency: String(row[agencyCol] || 'หน่วยงาน').trim(),
        locationName: String(row[locationCol] || `จุดกล้องที่ ${idx + 1}`).trim(),
        address: (addressCol ? String(row[addressCol] || '').trim() : '') || '-',
        notes: String(row[notesCol] || '').trim(),
        lat: lat ?? center.lat,
        lng: lng ?? center.lng,
        type: (rawType || 'Fixed Camera') as CctvItem['type'],
        status: (rawStatus || 'ออนไลน์ (ปกติ)') as CctvItem['status'],
      };
    });
}
