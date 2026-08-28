import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string;            // YYYY-MM-DD
  max?: string;            // YYYY-MM-DD
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseDate(str: string | undefined): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(str: string): string {
  const d = parseDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  className = '',
  hasError = false,
  disabled = false,
  id,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? today.getMonth());
  const [yearPickMode, setYearPickMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setYearPickMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Flip direction if near bottom of viewport
  const [dropUp, setDropUp] = useState(false);
  const toggleOpen = () => {
    if (disabled) return;
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropUp(rect.bottom + 340 > window.innerHeight);
    }
    setOpen((v) => !v);
    setYearPickMode(false);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSelected = (d: Date) => selectedDate ? d.toDateString() === selectedDate.toDateString() : false;

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isDisabled(d)) return;
    onChange(toYMD(d));
    setOpen(false);
    setYearPickMode(false);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Year picker: show ±6 years from current view
  const yearRange = Array.from({ length: 13 }, (_, i) => viewYear - 6 + i);

  const borderColor = hasError ? 'border-red-500' : open ? 'border-[#f5a623]' : 'border-[#2a2a2a]';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-[#111] border ${borderColor} rounded-xl px-3.5 py-2.5 text-left transition-colors focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#444]'}`}
      >
        <span className={`text-sm ${value ? 'text-white' : 'text-[#555]'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={16} className={open ? 'text-[#f5a623]' : 'text-[#555]'} />
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute z-[9999] w-72 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl overflow-hidden ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          } left-0`}
          style={{ minWidth: '17rem' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <button
              type="button"
              onClick={prevMonth}
              className="text-[#888] hover:text-white bg-transparent border-none p-1.5 rounded-lg hover:bg-[#2a2a2a] cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => setYearPickMode((v) => !v)}
              className="text-sm font-bold text-white hover:text-[#f5a623] bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1"
            >
              {MONTHS[viewMonth]} {viewYear}
              <span className="text-[10px] text-[#666]">{yearPickMode ? '▲' : '▼'}</span>
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="text-[#888] hover:text-white bg-transparent border-none p-1.5 rounded-lg hover:bg-[#2a2a2a] cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {yearPickMode ? (
            /* ── Year picker grid ── */
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {yearRange.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => { setViewYear(yr); setYearPickMode(false); }}
                  className={`py-2 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors ${
                    yr === viewYear
                      ? 'bg-[#f5a623] text-black'
                      : yr === today.getFullYear()
                        ? 'bg-[#2a2a2a] text-amber-400'
                        : 'bg-[#111] text-[#aaa] hover:bg-[#2a2a2a] hover:text-white'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          ) : (
            /* ── Calendar grid ── */
            <div className="p-3">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1.5">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-[#555] uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Date cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;
                  const d = new Date(viewYear, viewMonth, day);
                  const disabled = isDisabled(d);
                  const sel = isSelected(d);
                  const tod = isToday(d);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={disabled}
                      className={`
                        h-9 w-full rounded-xl text-xs font-semibold border-none cursor-pointer transition-all
                        ${sel
                          ? 'bg-[#f5a623] text-black'
                          : tod
                            ? 'bg-[#2a2a2a] text-amber-400 ring-1 ring-amber-400/40'
                            : disabled
                              ? 'text-[#333] cursor-not-allowed bg-transparent'
                              : 'text-[#aaa] hover:bg-[#2a2a2a] hover:text-white bg-transparent'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div className="pt-3 border-t border-[#222] mt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDisabled(today)) {
                      onChange(toYMD(today));
                      setOpen(false);
                    }
                  }}
                  className={`text-xs font-semibold bg-transparent border-none cursor-pointer transition-colors ${
                    isDisabled(today) ? 'text-[#444] cursor-not-allowed' : 'text-[#f5a623] hover:text-amber-300'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="text-xs text-[#555] hover:text-[#888] bg-transparent border-none cursor-pointer transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker;
