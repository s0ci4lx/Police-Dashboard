import React, { useState } from 'react';
import type { PoliceDepartment, DisplayType } from '../../types/dashboard';
import { X, Link2, FolderKanban, Check, Info } from 'lucide-react';

interface DynamicPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePage: (page: {
    title: string;
    department: PoliceDepartment;
    sheetUrl: string;
    displayType: DisplayType;
    iconName?: string;
  }) => void;
}

export const DynamicPageModal: React.FC<DynamicPageModalProps> = ({
  isOpen,
  onClose,
  onSavePage,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<PoliceDepartment>('งานสืบสวน');
  const [sheetUrl, setSheetUrl] = useState('');
  const [displayType, setDisplayType] = useState<DisplayType>('map-and-table');
  const [iconName] = useState('Table');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อหน้าแดชบอร์ด');
      return;
    }
    if (!sheetUrl.trim()) {
      setErrorMsg('กรุณากรอก URL ของ Google Sheet');
      return;
    }

    onSavePage({
      title: title.trim(),
      department,
      sheetUrl: sheetUrl.trim(),
      displayType,
      iconName,
    });

    // Reset form
    setTitle('');
    setSheetUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">เพิ่มหน้าแดชบอร์ดใหม่</h3>
              <p className="text-xs text-slate-400">นำเข้าข้อมูลจาก Google Sheets เพื่อสร้างหน้าแดชบอร์ดสายงาน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Title input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">ชื่อหน้าแดชบอร์ด *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น รายงานอุบัติเหตุจราจร, ข้อมูลสถานประกอบการ, อาวุธปืน"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Department selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">สังกัดสายงาน</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as PoliceDepartment)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="งานสืบสวน">งานสืบสวน</option>
                <option value="งานสอบสวน">งานสอบสวน</option>
                <option value="งานจราจร">งานจราจร</option>
                <option value="งานป้องกันปราบปราม">งานป้องกันปราบปราม</option>
                <option value="งานบริหาร">งานบริหาร</option>
                <option value="ข้อมูลท้องถิ่น">ข้อมูลท้องถิ่น</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">รูปแบบการแสดงผล</label>
              <select
                value={displayType}
                onChange={(e) => setDisplayType(e.target.value as DisplayType)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="map-and-table">🗺️ แผนที่ปักหมุด + ตารางข้อมูล</option>
                <option value="table-and-chart">📊 ตารางข้อมูล + กราฟสรุป</option>
                <option value="map-only">🗺️ แผนที่แบบเต็มหน้าจอ</option>
                <option value="table-only">📋 ตารางข้อมูลแบบเต็มหน้าจอ</option>
              </select>
            </div>
          </div>

          {/* Sheet URL input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-400" /> ลิงก์ Google Sheet URL *
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1C0TSUo2oqRcOlbixjymsLFZerkQ1xVTBrlaLHkCdoAU/edit?usp=sharing"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
            />
            <div className="mt-2 flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <b>คำแนะนำ:</b> ตั้งค่า Google Sheet ให้ "ทุกคนที่มีลิงก์สามารถดูได้" ระบบจะอ่านหัวคอลัมน์และพิกัด Lat/Long หรือข้อความมาสร้างแผนที่และตารางอัตโนมัติ
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" /> สร้างหน้าแดชบอร์ด
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
