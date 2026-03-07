// Модальное окно выбора временных слотов (30 мин) для дня
// 48 слотов: 0 = 00:00-00:30, 1 = 00:30-01:00, ..., 47 = 23:30-24:00
// При клике на слот открывается PeriodPicker. Period slots отображаются поверх time slots.
// Горизонтальный layout: колонка на участника, время — фиксированная колонка справа.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Participant } from '../../types';
import PeriodPicker from './PeriodPicker';
import UserAvatar from '../UserAvatar';
import './TimeSlotPicker.css';

const SLOT_COUNT = 48;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 19;
const COLUMN_HEADER_HEIGHT = 50; // должен совпадать с --time-slot-picker-column-header-height

/** Слот для 12:00 (при 30-мин — 24-й слот) */
const SLOT_12_00 = 24;

function formatSlotTime(slotIndex: number): string {
  const minutes = slotIndex * SLOT_MINUTES;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getUtcOffset(): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/** Пересечение слотов всех участников (общее свободное время) */
function intersectParticipantSlots(
  columns: ParticipantAvailabilityForDate[],
  currentParticipantId: string | null,
  initialSlots: number[]
): number[] {
  if (columns.length === 0) return [];
  const allSlots = columns.map(col => {
    const slots = col.participantId === currentParticipantId ? initialSlots : col.timeSlots;
    return slots.length === SLOT_COUNT
      ? Array.from({ length: SLOT_COUNT }, (_, i) => i)
      : slots;
  });
  const [first, ...rest] = allSlots;
  const firstSet = new Set(first);
  return rest.reduce<number[]>(
    (acc, s) => acc.filter(i => new Set(s).has(i)),
    Array.from(firstSet)
  );
}

/** Группирует слоты в последовательные диапазоны для отображения period slots */
function slotsToPeriodRanges(slots: number[]): { start: number; end: number }[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: { start: number; end: number }[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ start, end });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ start, end });
  return ranges;
}

export interface ParticipantAvailabilityForDate {
  participantId: string;
  participantName: string;
  timeSlots: number[];
}

interface TimeSlotPickerProps {
  date: string;
  /** Пустой массив = нет выбора. Массив из 48 = весь день. Иначе — выбранные индексы. */
  initialSlots: number[];
  onSave: (date: string, slots: number[]) => void;
  onClose: () => void;
  /** Вызывается при нажатии "Снять выделение" — удаление availability и закрытие окна */
  onRemove?: () => void;
  /** Удаление availability без закрытия окна (при удалении последнего периода) */
  onClearDay?: () => void;
  /** Есть ли уже availability для этого дня (показывать кнопку "Снять выделение") */
  hasExistingAvailability?: boolean;
  /** Список участников встречи */
  participants?: Participant[];
  /** Слоты всех участников для выбранной даты (real-time) */
  participantAvailabilities?: ParticipantAvailabilityForDate[];
  /** ID текущего участника (редактируемая колонка) */
  currentParticipantId?: string | null;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  date,
  initialSlots,
  onSave,
  onClose,
  onRemove,
  onClearDay,
  hasExistingAvailability = false,
  participants = [],
  participantAvailabilities = [],
  currentParticipantId = null
}) => {
  type PeriodPickerState =
    | { type: 'create'; anchorSlot: number }
    | { type: 'edit'; range: { start: number; end: number } };
  const [periodPickerState, setPeriodPickerState] =
    useState<PeriodPickerState | null>(null);

  const slot12Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      slot12Ref.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  /** Упорядоченные колонки: текущий участник первым, остальные по порядку */
  const orderedColumns = React.useMemo(() => {
    const list = participantAvailabilities;
    if (list.length === 0 && currentParticipantId) {
      const p = participants.find(x => x.id === currentParticipantId);
      if (p) {
        return [{ participantId: p.id, participantName: p.name, timeSlots: initialSlots }];
      }
      return [];
    }
    const current = list.find(a => a.participantId === currentParticipantId);
    const others = list.filter(a => a.participantId !== currentParticipantId);
    const result: ParticipantAvailabilityForDate[] = [];
    if (current) result.push(current);
    result.push(...others);
    if (!current && currentParticipantId) {
      const p = participants.find(x => x.id === currentParticipantId);
      if (p) {
        result.unshift({
          participantId: p.id,
          participantName: p.name,
          timeSlots: initialSlots
        });
      }
    }
    return result;
  }, [participantAvailabilities, participants, currentParticipantId, initialSlots]);

  /** Общие слоты (пересечение всех участников) для зелёной подсветки */
  const commonSlotsRanges = React.useMemo(() => {
    if (orderedColumns.length < 2) return [];
    const common = intersectParticipantSlots(
      orderedColumns,
      currentParticipantId,
      initialSlots
    );
    return slotsToPeriodRanges(common);
  }, [orderedColumns, currentParticipantId, initialSlots]);

  const handleTimeSlotClick = useCallback((slotIndex: number) => {
    setPeriodPickerState({ type: 'create', anchorSlot: slotIndex });
  }, []);

  const handlePeriodSlotClick = useCallback(
    (e: React.MouseEvent, range: { start: number; end: number }) => {
      e.stopPropagation();
      setPeriodPickerState({ type: 'edit', range });
    },
    []
  );

  const handlePeriodApply = useCallback(
    (startSlot: number, endSlot: number) => {
      const newSlots = Array.from(
        { length: endSlot - startSlot },
        (_, i) => startSlot + i
      );
      const existing =
        initialSlots.length === SLOT_COUNT
          ? Array.from({ length: SLOT_COUNT }, (_, i) => i)
          : initialSlots;

      let result: number[];
      if (periodPickerState?.type === 'edit') {
        const { range } = periodPickerState;
        const oldSlots = Array.from(
          { length: range.end - range.start + 1 },
          (_, i) => range.start + i
        );
        const withoutOld = existing.filter(s => !oldSlots.includes(s));
        result = Array.from(new Set([...withoutOld, ...newSlots])).sort(
          (a, b) => a - b
        );
      } else {
        result = Array.from(new Set([...existing, ...newSlots])).sort(
          (a, b) => a - b
        );
      }

      const toSend = result.length === SLOT_COUNT ? [] : result;
      onSave(date, toSend);
      setPeriodPickerState(null);
    },
    [date, initialSlots, onSave, periodPickerState]
  );

  const handlePeriodClose = useCallback(() => {
    setPeriodPickerState(null);
  }, []);

  const handlePeriodDelete = useCallback(() => {
    if (periodPickerState?.type !== 'edit') return;
    const { range } = periodPickerState;
    const oldSlots = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start + i
    );
    const existing =
      initialSlots.length === SLOT_COUNT
        ? Array.from({ length: SLOT_COUNT }, (_, i) => i)
        : initialSlots;
    const result = existing.filter(s => !oldSlots.includes(s));
    if (result.length === 0) {
      if (onClearDay) onClearDay();
      else if (onRemove) onRemove();
    } else {
      const toSend = result.length === SLOT_COUNT ? [] : result;
      onSave(date, toSend);
    }
    setPeriodPickerState(null);
  }, [date, initialSlots, onSave, onRemove, onClearDay, periodPickerState]);

  const handleSave = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleRemove = useCallback(() => {
    if (onClearDay) {
      onClearDay();
    } else if (onRemove) {
      onRemove();
    }
  }, [onRemove, onClearDay]);

  const handleWholeDay = useCallback(() => {
    onSave(date, []);
  }, [date, onSave]);

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => i);

  return (
    <div className="time-slot-picker-overlay" onClick={handleOverlayClick}>
      <div className="time-slot-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="time-slot-picker-header">
          <span className="time-slot-picker-date">{formatDate(date)}</span>
          <span className="time-slot-picker-utc">{getUtcOffset()}</span>
        </div>

        <div className="time-slot-picker-scroll-container">
          <div className="time-slot-picker-scroll-content">
            <div className="time-slot-picker-time-column">
              <div className="time-slot-picker-time-column-header" />
              {slots.map(slotIndex => (
                <div
                  key={slotIndex}
                  className="time-slot-picker-time-label"
                  style={{ height: SLOT_HEIGHT }}
                >
                  {slotIndex % 2 === 0 ? formatSlotTime(slotIndex) : ''}
                </div>
              ))}
            </div>
            <div className="time-slot-picker-columns-area">
              <div className="time-slot-picker-columns-wrapper">
              {orderedColumns.map(col => {
                const isCurrentUser = col.participantId === currentParticipantId;
                const slotsToUse = isCurrentUser ? initialSlots : col.timeSlots;
                const effectiveSlots =
                  slotsToUse.length === SLOT_COUNT
                    ? Array.from({ length: SLOT_COUNT }, (_, i) => i)
                    : slotsToUse;
                const periodRanges = slotsToPeriodRanges(effectiveSlots);
                return (
                  <div
                    key={col.participantId}
                    className={`time-slot-picker-participant-column ${
                      isCurrentUser ? 'time-slot-picker-column-current' : ''
                    }`}
                  >
                    <div className="time-slot-picker-column-header">
                      <UserAvatar
                        name={col.participantName}
                        size="tiny"
                        className="time-slot-picker-column-avatar"
                        showTooltip={true}
                      />
                      <span className="time-slot-picker-column-name">
                        {col.participantName}
                      </span>
                    </div>
                    <div className="time-slot-picker-column-slots-wrapper">
                      <div className="time-slot-picker-slots">
                        {slots.map(slotIndex => (
                          <div
                            key={slotIndex}
                            ref={
                              isCurrentUser && slotIndex === SLOT_12_00
                                ? slot12Ref
                                : undefined
                            }
                            className={`time-slot-picker-slot ${
                              !isCurrentUser ? 'time-slot-picker-slot-readonly' : ''
                            } ${slotIndex % 2 === 0 ? 'time-slot-picker-slot-hour' : ''}`}
                            onClick={
                              isCurrentUser
                                ? () => handleTimeSlotClick(slotIndex)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                      <div className="time-slot-picker-period-overlay">
                        {periodRanges.map((range, idx) => {
                          const top = range.start * SLOT_HEIGHT + SLOT_HEIGHT / 2;
                          const height = Math.max(
                            (range.end - range.start) * SLOT_HEIGHT,
                            SLOT_HEIGHT / 4
                          );
                          return (
                            <div
                              key={`${range.start}-${range.end}-${idx}`}
                              className={`time-slot-picker-period-slot ${
                                isCurrentUser ? '' : 'time-slot-picker-period-slot-other'
                              }`}
                              style={{ top, height }}
                              onClick={
                                isCurrentUser
                                  ? e => handlePeriodSlotClick(e, range)
                                  : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              <div
                className="time-slot-picker-common-overlay"
                style={{ top: COLUMN_HEADER_HEIGHT }}
              >
                {commonSlotsRanges.map((range, idx) => {
                  const top = range.start * SLOT_HEIGHT + SLOT_HEIGHT / 2;
                  const height = Math.max(
                    (range.end - range.start) * SLOT_HEIGHT,
                    SLOT_HEIGHT / 4
                  );
                  return (
                    <div
                      key={`common-${range.start}-${range.end}-${idx}`}
                      className="time-slot-picker-common-slot"
                      style={{ top, height }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="time-slot-picker-actions">
          {hasExistingAvailability && onRemove && (
            <button className="time-slot-picker-btn-remove" onClick={handleRemove}>
              Снять выделение
            </button>
          )}
          <button className="time-slot-picker-btn-whole-day" onClick={handleWholeDay}>
            Весь день
          </button>
          <button className="time-slot-picker-btn-save" onClick={handleSave}>
            Готово
          </button>
        </div>
      </div>

      {periodPickerState !== null && (
        <PeriodPicker
          key={
            periodPickerState.type === 'create'
              ? `create-${periodPickerState.anchorSlot}`
              : `edit-${periodPickerState.range.start}-${periodPickerState.range.end}`
          }
          anchorSlot={
            periodPickerState.type === 'create'
              ? periodPickerState.anchorSlot
              : undefined
          }
          initialRange={
            periodPickerState.type === 'edit'
              ? periodPickerState.range
              : undefined
          }
          onApply={handlePeriodApply}
          onDelete={
            periodPickerState.type === 'edit'
              ? handlePeriodDelete
              : undefined
          }
          onClose={handlePeriodClose}
        />
      )}
    </div>
  );
};

export default TimeSlotPicker;
