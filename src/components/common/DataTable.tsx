import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Eye, ArrowUpDown } from 'lucide-react';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  filterCategories?: { label: string; key: keyof T; options: string[] }[];
  actionHeaderTitle?: string;
  showActionColumn?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  searchPlaceholder = 'ค้นหาในตาราง...',
  onRowClick,
  pageSize = 10,
  filterCategories,
  actionHeaderTitle = 'รายละเอียด',
  showActionColumn = true,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFilter, setSelectedFilter] = useState<{ [key: string]: string }>({});
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Category Filters
      for (const [key, val] of Object.entries(selectedFilter)) {
        if (val && String(row[key]) !== val) {
          return false;
        }
      }

      // Keyword Search
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return Object.values(row).some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term)
      );
    });
  }, [data, searchTerm, selectedFilter]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const exportToCsv = () => {
    if (!data.length) return;
    const keys = columns.map((c) => String(c.key));
    const headers = columns.map((c) => c.header).join(',');
    const rows = sortedData.map((row) =>
      keys.map((k) => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dashboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/90 shadow-xl flex flex-col h-full">
      {/* Table Header Controls */}
      <div className="p-4 bg-slate-800/60 border-b border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {title && (
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>📋</span> {title}
            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-mono">
              {filteredData.length.toLocaleString('th-TH')} รายการ
            </span>
          </h4>
        )}

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter dropdowns */}
          {filterCategories?.map((cat) => (
            <div key={String(cat.key)} className="relative">
              <select
                value={selectedFilter[String(cat.key)] || ''}
                onChange={(e) => {
                  setSelectedFilter({ ...selectedFilter, [String(cat.key)]: e.target.value });
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">-- {cat.label} (ทั้งหมด) --</option>
                {cat.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Quick Table Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCsv}
            title="ส่งออกเป็นไฟล์ CSV"
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[450px] scrollbar-thin">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-800/95 text-slate-200 font-semibold border-b border-slate-700">
            <tr>
              <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                  className={`py-3 px-4 ${
                    col.sortable !== false ? 'cursor-pointer hover:bg-slate-700/50 transition-all select-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortKey === String(col.key) ? 'text-blue-400 font-bold' : 'text-slate-500'
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
              {showActionColumn && <th className="py-3 px-4 w-16 text-center">{actionHeaderTitle}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className="hover:bg-slate-800/60 transition-all cursor-pointer group"
                  >
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400">{globalIdx}</td>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="py-2.5 px-4 text-slate-200">
                        {col.render ? col.render(row, globalIdx) : String(row[String(col.key)] ?? '-')}
                      </td>
                    ))}
                    {showActionColumn && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                          }}
                          className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                          title="ดูรายละเอียดข้อมูลเพิ่มเติม"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 2} className="py-8 text-center text-slate-400 text-xs">
                  🔍 ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer & Pagination */}
      <div className="p-3 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          แสดง {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} จากทั้งหมด{' '}
          {sortedData.length.toLocaleString('th-TH')} รายการ
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-200 font-semibold px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-lg transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row Detail View Modal */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="w-full max-w-xl glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📌</span> รายละเอียดข้อมูลเจาะลึก
              </h3>
              <button
                onClick={() => setSelectedRow(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                title="ปิดหน้าต่าง"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="space-y-3 py-4 overflow-y-auto flex-1 scrollbar-thin pr-1">
              {Object.entries(selectedRow).map(([k, v]) => (
                <div key={k} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">{k}</span>
                  <span className="text-xs text-slate-100 font-medium whitespace-pre-wrap break-words">{String(v ?? '-')}</span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-800 pt-3 shrink-0">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
