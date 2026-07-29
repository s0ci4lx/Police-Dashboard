import Papa from 'papaparse';

/**
 * Extracts Google Sheet ID and GID from standard Google Sheet URL
 */
export function extractGoogleSheetId(url: string): { sheetId: string | null; gid: string | null } {
  try {
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return { sheetId, gid };
  } catch (err) {
    console.error('Error parsing sheet URL:', err);
    return { sheetId: null, gid: null };
  }
}

/**
 * Converts a Google Sheet shareable link to a public CSV export URL
 */
export function getGoogleSheetCsvUrl(url: string): string {
  // If it's already a direct CSV link or export link
  if (url.includes('/export?format=csv') || url.includes('/gviz/tq?tqx=out:csv')) {
    return url;
  }

  const { sheetId, gid } = extractGoogleSheetId(url);
  if (sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`;
  }

  return url;
}

/**
 * Fetches and parses Google Sheet CSV data into an array of objects
 */
export async function fetchSheetData<T extends Record<string, any>>(sheetUrl: string): Promise<{ data: T[]; columns: string[] }> {
  const csvUrl = getGoogleSheetCsvUrl(sheetUrl);

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet. Status: ${response.status}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse<T>(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const data = results.data;
          const columns = results.meta.fields || (data.length > 0 && data[0] ? Object.keys(data[0]) : []);
          resolve({ data, columns });
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Failed to fetch sheet data:', error);
    throw error;
  }
}

/**
 * Auto-detects Latitude and Longitude column names from headers, or handles combined coordinate string
 */
export function detectLatLongColumns(columns: string[]): { latCol?: string; lngCol?: string; combinedCol?: string } {
  let latCol: string | undefined;
  let lngCol: string | undefined;
  let combinedCol: string | undefined;

  for (const col of columns) {
    const lower = col.toLowerCase().trim();
    if (!latCol && (lower === 'lat' || lower.includes('ละติจูด') || lower === 'y')) {
      latCol = col;
    }
    if (!lngCol && (lower === 'lng' || lower === 'lon' || lower.includes('ลองจิจูด') || lower === 'x')) {
      lngCol = col;
    }
    if (!combinedCol && (lower === 'พิกัด' || lower.includes('coordinate') || lower.includes('location'))) {
      combinedCol = col;
    }
  }

  return { latCol, lngCol, combinedCol };
}

/**
 * Helper to parse lat/lng numbers from a row object
 */
export function parseRowLatLng(row: Record<string, any>, latCol?: string, lngCol?: string, combinedCol?: string): { lat?: number; lng?: number } {
  if (latCol && lngCol && row[latCol] !== undefined && row[lngCol] !== undefined) {
    const lat = parseFloat(String(row[latCol]));
    const lng = parseFloat(String(row[lngCol]));
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  if (combinedCol && row[combinedCol]) {
    const parts = String(row[combinedCol]).split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }

  // Fallback search in all values if not matched
  for (const val of Object.values(row)) {
    if (typeof val === 'string' && val.includes(',')) {
      const parts = val.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lat < 90 && lng > 0 && lng < 180) {
          return { lat, lng };
        }
      }
    }
  }

  return {};
}
