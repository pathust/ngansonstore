import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface KiotVietDateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
  onApply: (start: string, end: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

type ViewMode = 'DAY' | 'MONTH' | 'YEAR';

const MONTH_NAMES = [
  'Thg1', 'Thg2', 'Thg3', 'Thg4', 'Thg5', 'Thg6',
  'Thg7', 'Thg8', 'Thg9', 'Thg10', 'Thg11', 'Thg12'
];

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Format YYYY-MM-DD to DD/MM/YYYY
function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Format Date object to YYYY-MM-DD
function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD to Date (local time midnight)
function parseIsoDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export const KiotVietDateRangePicker: React.FC<KiotVietDateRangePickerProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApply,
  anchorRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Default values
  const today = new Date();
  const defaultStart = startDate || toIsoDate(today);
  const defaultEnd = endDate || toIsoDate(today);

  const [tempStart, setTempStart] = useState<string>(defaultStart);
  const [tempEnd, setTempEnd] = useState<string>(defaultEnd);

  // Left & Right calendars view mode
  const [leftViewMode, setLeftViewMode] = useState<ViewMode>('DAY');
  const [rightViewMode, setRightViewMode] = useState<ViewMode>('DAY');

  // Left calendar navigation: defaults to start date month & year
  const initialStartDate = parseIsoDate(defaultStart);
  const [leftNavYear, setLeftNavYear] = useState<number>(initialStartDate.getFullYear());
  const [leftNavMonth, setLeftNavMonth] = useState<number>(initialStartDate.getMonth()); // 0-11

  // Right calendar navigation: defaults to end date month & year
  const initialEndDate = parseIsoDate(defaultEnd);
  const [rightNavYear, setRightNavYear] = useState<number>(initialEndDate.getFullYear());
  const [rightNavMonth, setRightNavMonth] = useState<number>(initialEndDate.getMonth()); // 0-11

  // Left Decade year base for 10-year view (e.g. 2020 for 2020-2029)
  const [leftDecadeBase, setLeftDecadeBase] = useState<number>(Math.floor(initialStartDate.getFullYear() / 10) * 10);
  const [rightDecadeBase, setRightDecadeBase] = useState<number>(Math.floor(initialEndDate.getFullYear() / 10) * 10);

  // Selection step: 'START' (next click picks start date) or 'END' (next click picks end date)
  const [selectionStep, setSelectionStep] = useState<'START' | 'END'>('START');

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      const s = startDate || toIsoDate(new Date());
      const e = endDate || toIsoDate(new Date());
      setTempStart(s);
      setTempEnd(e);
      const ds = parseIsoDate(s);
      const de = parseIsoDate(e);
      setLeftNavYear(ds.getFullYear());
      setLeftNavMonth(ds.getMonth());
      setLeftDecadeBase(Math.floor(ds.getFullYear() / 10) * 10);

      setRightNavYear(de.getFullYear());
      setRightNavMonth(de.getMonth());
      setRightDecadeBase(Math.floor(de.getFullYear() / 10) * 10);

      setLeftViewMode('DAY');
      setRightViewMode('DAY');
      setSelectionStep('START');
    }
  }, [isOpen, startDate, endDate]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Handle Day Click
  const handleDayClick = (dateStr: string) => {
    if (selectionStep === 'START') {
      setTempStart(dateStr);
      // If selected start date is after current end date, push end date as well
      if (dateStr > tempEnd) {
        setTempEnd(dateStr);
      }
      setSelectionStep('END');
    } else {
      // Selecting end date
      if (dateStr < tempStart) {
        // If clicked date is before start date, treat it as new start date
        setTempStart(dateStr);
        setSelectionStep('END');
      } else {
        setTempEnd(dateStr);
        setSelectionStep('START');
      }
    }
  };

  // Quick action: Hôm nay
  const handleSelectToday = () => {
    const todayStr = toIsoDate(new Date());
    setTempStart(todayStr);
    setTempEnd(todayStr);
    const now = new Date();
    setLeftNavYear(now.getFullYear());
    setLeftNavMonth(now.getMonth());
    setRightNavYear(now.getFullYear());
    setRightNavMonth(now.getMonth());
    setLeftViewMode('DAY');
    setRightViewMode('DAY');
  };

  // Apply action
  const handleApply = () => {
    onApply(tempStart, tempEnd);
    onClose();
  };

  // Helper: Get grid of 42 days for month (Monday to Sunday)
  const getDaysGrid = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    // getDay() returns 0 for Sunday, 1 for Monday... We want 0 for Monday, 6 for Sunday
    const dayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        dateStr: toIsoDate(prevDate),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d);
      days.push({
        dayNumber: d,
        dateStr: toIsoDate(curDate),
        isCurrentMonth: true,
      });
    }

    // Next month leading days to fill up to 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(year, month + 1, n);
      days.push({
        dayNumber: n,
        dateStr: toIsoDate(nextDate),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Render a Single Calendar Panel (Left or Right)
  const renderCalendar = (
    side: 'left' | 'right',
    navYear: number,
    setNavYear: React.Dispatch<React.SetStateAction<number>>,
    navMonth: number,
    setNavMonth: React.Dispatch<React.SetStateAction<number>>,
    viewMode: ViewMode,
    setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>,
    decadeBase: number,
    setDecadeBase: React.Dispatch<React.SetStateAction<number>>
  ) => {
    // Navigate Prev / Next
    const handlePrev = () => {
      if (viewMode === 'DAY') {
        if (navMonth === 0) {
          setNavMonth(11);
          setNavYear((y) => y - 1);
        } else {
          setNavMonth((m) => m - 1);
        }
      } else if (viewMode === 'MONTH') {
        setNavYear((y) => y - 1);
      } else if (viewMode === 'YEAR') {
        setDecadeBase((b) => b - 10);
      }
    };

    const handleNext = () => {
      if (viewMode === 'DAY') {
        if (navMonth === 11) {
          setNavMonth(0);
          setNavYear((y) => y + 1);
        } else {
          setNavMonth((m) => m + 1);
        }
      } else if (viewMode === 'MONTH') {
        setNavYear((y) => y + 1);
      } else if (viewMode === 'YEAR') {
        setDecadeBase((b) => b + 10);
      }
    };

    return (
      <div className="w-[260px] select-none">
        {/* Navigation Header */}
        <div className="flex items-center justify-between px-1 py-1.5 mb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Drill-down Header Title */}
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'DAY') {
                setViewMode('MONTH');
              } else if (viewMode === 'MONTH') {
                setDecadeBase(Math.floor(navYear / 10) * 10);
                setViewMode('YEAR');
              }
            }}
            className="text-xs font-bold text-slate-700 hover:text-[#0B63E5] hover:bg-slate-50 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            {viewMode === 'DAY' && `Tháng ${navMonth + 1} ${navYear}`}
            {viewMode === 'MONTH' && `${navYear}`}
            {viewMode === 'YEAR' && `${decadeBase}-${decadeBase + 9}`}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode 1: DAY VIEW (Ảnh 2, 5 KiotViet) */}
        {viewMode === 'DAY' && (
          <div>
            {/* Weekday headers: T2, T3, T4, T5, T6, T7, CN */}
            <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-semibold text-slate-400">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {getDaysGrid(navYear, navMonth).map((item, idx) => {
                const isStart = item.dateStr === tempStart;
                const isEnd = item.dateStr === tempEnd;
                const isInRange = item.dateStr > tempStart && item.dateStr < tempEnd;
                const isSelectedEndpoint = isStart || isEnd;

                return (
                  <div
                    key={idx}
                    className={`relative py-1 flex items-center justify-center ${
                      isInRange ? 'bg-blue-50/80' : ''
                    } ${isStart && tempStart !== tempEnd ? 'rounded-l-full bg-blue-50/80' : ''} ${
                      isEnd && tempStart !== tempEnd ? 'rounded-r-full bg-blue-50/80' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(item.dateStr)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all cursor-pointer ${
                        isSelectedEndpoint
                          ? 'bg-[#2d4f82] text-white font-bold shadow-xs'
                          : item.isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100 font-medium'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.dayNumber}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 2: MONTH VIEW (Ảnh 3 KiotViet) */}
        {viewMode === 'MONTH' && (
          <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
            {MONTH_NAMES.map((mName, mIdx) => {
              const isSelected = mIdx === navMonth;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => {
                    setNavMonth(mIdx);
                    setViewMode('DAY');
                  }}
                  className={`py-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2d4f82] text-white font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        )}

        {/* View Mode 3: DECADE / YEAR VIEW (Ảnh 4 KiotViet) */}
        {viewMode === 'YEAR' && (
          <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
            {Array.from({ length: 12 }, (_, i) => decadeBase - 1 + i).map((yr) => {
              const isDecadeRange = yr >= decadeBase && yr < decadeBase + 10;
              const isSelected = yr === navYear;

              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setNavYear(yr);
                    setViewMode('MONTH');
                  }}
                  className={`py-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2d4f82] text-white font-bold border border-[#2d4f82]'
                      : isDecadeRange
                      ? 'hover:bg-slate-100 text-slate-700'
                      : 'hover:bg-slate-50 text-slate-300'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[560px] max-w-[calc(100vw-32px)] overflow-x-auto animate-in fade-in zoom-in-95 duration-150"
      style={{
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header: Từ ngày: DD/MM/YYYY - Đến ngày: DD/MM/YYYY (Ảnh 2, 5 KiotViet) */}
      <div className="pb-3 border-b border-slate-100 mb-3 flex items-center justify-between text-xs">
        <div className="text-slate-700 font-medium">
          <span>Từ ngày: </span>
          <strong className="text-slate-900 font-bold">{formatDateDisplay(tempStart)}</strong>
          <span className="text-slate-400 mx-1.5">-</span>
          <span>Đến ngày: </span>
          <strong className="text-slate-900 font-bold">{formatDateDisplay(tempEnd)}</strong>
        </div>
      </div>

      {/* Dual Calendars Body */}
      <div className="flex items-start justify-between gap-4">
        {/* Left Calendar (Chọn Từ ngày) */}
        {renderCalendar(
          'left',
          leftNavYear,
          setLeftNavYear,
          leftNavMonth,
          setLeftNavMonth,
          leftViewMode,
          setLeftViewMode,
          leftDecadeBase,
          setLeftDecadeBase
        )}

        {/* Divider */}
        <div className="w-[1px] bg-slate-100 self-stretch" />

        {/* Right Calendar (Chọn Đến ngày) */}
        {renderCalendar(
          'right',
          rightNavYear,
          setRightNavYear,
          rightNavMonth,
          setRightNavMonth,
          rightViewMode,
          setRightViewMode,
          rightDecadeBase,
          setRightDecadeBase
        )}
      </div>

      {/* Footer Bar: Hôm nay (trái), Bỏ qua & Áp dụng (phải) (Ảnh 2, 5 KiotViet) */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleSelectToday}
          className="text-slate-600 hover:text-[#0B63E5] font-medium transition-colors cursor-pointer px-1 py-1"
        >
          Hôm nay
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium rounded-lg transition-colors cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-1.5 bg-[#2d4f82] hover:bg-[#233d65] active:bg-[#1a2e4c] text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
