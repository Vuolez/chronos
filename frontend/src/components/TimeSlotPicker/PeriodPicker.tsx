// Окно выбора периода (начало и конец времени)
// Часы 00-23, минуты 00-59 (при сохранении округляется до 30-мин слотов)

import React, { useState, useCallback, useRef, useEffect } from 'react';
import './PeriodPicker.css';

const SLOT_COUNT = 48;
const SLOT_MINUTES = 30;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Только 00 и 30 — бэкенд использует 30-минутные слоты */
const MINUTES = [0, 30];

/** Индекс слота -> часы и минуты */
function slotToTime(slotIndex: number): { h: number; m: number } {
  const totalMinutes = slotIndex * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m };
}

/** Часы и минуты -> индекс слота (округление вниз для начала) */
function timeToStartSlot(h: number, m: number): number {
  const totalMinutes = h * 60 + m;
  return Math.min(Math.floor(totalMinutes / SLOT_MINUTES), SLOT_COUNT - 1);
}

/**
 * Часы и минуты -> endSlot (exclusive).
 * Период 13:00-16:00 включает слот 15:30-16:00 (slot 31).
 * 16:00 = 960 мин: граница слотов 31 и 32 → endSlot = 32.
 */
function timeToEndSlot(h: number, m: number): number {
  const totalMinutes = h * 60 + m;
  if (totalMinutes >= 24 * 60) return SLOT_COUNT;
  if (totalMinutes === 0) return 0;
  const slotIndex = Math.floor(totalMinutes / SLOT_MINUTES);
  const remainder = totalMinutes % SLOT_MINUTES;
  return Math.min(
    remainder === 0 ? slotIndex : slotIndex + 1,
    SLOT_COUNT
  );
}

function formatTimePart(n: number, pad: number = 2): string {
  return String(n).padStart(pad, '0');
}

interface PeriodPickerProps {
  /** Для создания нового периода — слот, по которому кликнули */
  anchorSlot?: number;
  /** Для редактирования — начальный и конечный (inclusive) слоты периода */
  initialRange?: { start: number; end: number };
  onApply: (startSlot: number, endSlot: number) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Минимальное время окончания: начало + 30 минут */
function getMinEndMinutes(startH: number, startM: number): number {
  return Math.min(startH * 60 + startM + SLOT_MINUTES, 24 * 60);
}

const PeriodPicker: React.FC<PeriodPickerProps> = ({
  anchorSlot,
  initialRange,
  onApply,
  onDelete,
  onClose
}) => {
  const startDefault = initialRange
    ? slotToTime(initialRange.start)
    : slotToTime(anchorSlot ?? 0);
  const endDefault = initialRange
    ? slotToTime(Math.min(initialRange.end, SLOT_COUNT))
    : slotToTime(Math.min((anchorSlot ?? 0) + 1, SLOT_COUNT - 1));

  const [startH, setStartH] = useState(startDefault.h);
  const [startM, setStartM] = useState(startDefault.m);
  const [endH, setEndH] = useState(endDefault.h);
  const [endM, setEndM] = useState(endDefault.m);

  const minEndMinutes = getMinEndMinutes(startH, startM);

  /** Часы, доступные для выбора конца (конец >= начало + 30 мин) */
  const validEndHours =
    minEndMinutes > 23 * 60 + 30
      ? [24]
      : HOURS.filter(h => h * 60 + 30 >= minEndMinutes);
  /** Минуты для выбора конца при выбранном endH */
  const validEndMinutes =
    endH === 24 ? [0] : MINUTES.filter(m => endH * 60 + m >= minEndMinutes);

  const [openDropdown, setOpenDropdown] = useState<
    'startH' | 'startM' | 'endH' | 'endM' | null
  >(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleApply = useCallback(() => {
    const startSlot = timeToStartSlot(startH, startM);
    let endSlot = timeToEndSlot(endH, endM);
    if (endSlot <= startSlot) {
      endSlot = Math.min(startSlot + 1, SLOT_COUNT);
    }
    endSlot = Math.min(endSlot + 1, SLOT_COUNT);
    onApply(startSlot, endSlot);
    onClose();
  }, [startH, startM, endH, endM, onApply, onClose]);

  const toggleDropdown = useCallback(
    (key: 'startH' | 'startM' | 'endH' | 'endM') => {
      setOpenDropdown(prev => (prev === key ? null : key));
    },
    []
  );

  // Корректируем конец, если он стал раньше начала (при изменении начала)
  useEffect(() => {
    const endMinutes = endH * 60 + endM;
    if (endMinutes < minEndMinutes) {
      const newTotal = Math.min(minEndMinutes, 24 * 60);
      const newH = Math.floor(newTotal / 60);
      const newM = newTotal % 60;
      setEndH(newH);
      setEndM(newM === 0 ? 0 : 30);
    }
  }, [startH, startM, endH, endM, minEndMinutes]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openDropdown &&
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  return (
    <div
      className="period-picker-overlay"
      onClick={handleOverlayClick}
      ref={overlayRef}
    >
      <div
        className="period-picker-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="period-picker-title">Выбор периода</div>

        <div className="period-picker-row">
          <span className="period-picker-label">Начало</span>
          <div className="period-picker-time-group">
            <div className="period-picker-dropdown-wrapper">
              <button
                type="button"
                className="period-picker-dropdown-trigger"
                onClick={() => toggleDropdown('startH')}
              >
                {formatTimePart(startH)}
              </button>
              {openDropdown === 'startH' && (
                <div className="period-picker-dropdown-list">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className={`period-picker-dropdown-item ${
                        startH === h ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setStartH(h);
                        setOpenDropdown(null);
                      }}
                    >
                      {formatTimePart(h)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="period-picker-separator">:</span>
            <div className="period-picker-dropdown-wrapper">
              <button
                type="button"
                className="period-picker-dropdown-trigger"
                onClick={() => toggleDropdown('startM')}
              >
                {formatTimePart(startM)}
              </button>
              {openDropdown === 'startM' && (
                <div className="period-picker-dropdown-list">
                  {MINUTES.map(m => (
                    <div
                      key={m}
                      className={`period-picker-dropdown-item ${
                        startM === m ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setStartM(m);
                        setOpenDropdown(null);
                      }}
                    >
                      {formatTimePart(m)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="period-picker-row">
          <span className="period-picker-label">Конец</span>
          <div className="period-picker-time-group">
            <div className="period-picker-dropdown-wrapper">
              <button
                type="button"
                className="period-picker-dropdown-trigger"
                onClick={() => toggleDropdown('endH')}
              >
                {formatTimePart(endH)}
              </button>
              {openDropdown === 'endH' && (
                <div className="period-picker-dropdown-list">
                  {validEndHours.map(h => (
                    <div
                      key={h}
                      className={`period-picker-dropdown-item ${
                        endH === h ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setEndH(h);
                        setOpenDropdown(null);
                      }}
                    >
                      {formatTimePart(h)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="period-picker-separator">:</span>
            <div className="period-picker-dropdown-wrapper">
              <button
                type="button"
                className="period-picker-dropdown-trigger"
                onClick={() => toggleDropdown('endM')}
              >
                {formatTimePart(endM)}
              </button>
              {openDropdown === 'endM' && (
                <div className="period-picker-dropdown-list">
                  {validEndMinutes.map(m => (
                    <div
                      key={m}
                      className={`period-picker-dropdown-item ${
                        endM === m ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setEndM(m);
                        setOpenDropdown(null);
                      }}
                    >
                      {formatTimePart(m)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="period-picker-actions">
          {initialRange && onDelete && (
            <button
              type="button"
              className="period-picker-btn-delete"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              Удалить
            </button>
          )}
          <button
            type="button"
            className="period-picker-btn-cancel"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="period-picker-btn-apply"
            onClick={handleApply}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeriodPicker;
