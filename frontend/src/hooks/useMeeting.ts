// Custom hook для управления встречей
// Централизует всю логику работы с API

import { useState, useCallback, useRef } from 'react';
import { meetingApi, authApi } from '../services';
import { 
  Meeting, 
  MeetingDetail, 
  Participant, 
  Availability,
  Vote,
  CommonTimeSlots,
  CreateMeetingRequest,
  AddParticipantRequest,
  UpdateAvailabilityRequest,
  ParticipantStatus
} from '../types';

// Уникальные даты из commonAvailableTimeSlots (для проверки голоса)
function deriveCommonDates(slots: CommonTimeSlots[]): string[] {
  return Array.from(new Set(slots.map(s => s.date))).sort();
}

interface UseMeetingState {
  // Данные
  meeting: Meeting | null;
  participants: Participant[];
  availabilities: Availability[];
  commonAvailableTimeSlots: CommonTimeSlots[];
  commonDates: string[]; // производное из commonAvailableTimeSlots
  votes: Vote[];
  
  // Состояние загрузки
  isLoading: boolean;
  error: string | null;
  
  // Локальное состояние для UI
  selectedDates: string[];
  currentParticipantId: string | null;
}

interface UseMeetingActions {
  createMeeting: (request: CreateMeetingRequest) => Promise<Meeting | null>;
  loadMeeting: (shareToken: string) => Promise<boolean>;
  addParticipant: (name: string) => Promise<Participant | null>;
  updateAvailability: (participantId: string, dates: string[]) => Promise<boolean>;
  setCurrentParticipant: (participantId: string) => void;
  toggleDateSelection: (date: string) => void;
  saveAvailabilityWithTimeSlots: (participantId: string, date: string, slots: number[]) => Promise<boolean>;
  removeAvailabilityForDate: (participantId: string, date: string) => Promise<void>;
  castFinalVote: (date: string, timeStart?: string, timeEnd?: string) => void;
  clearError: () => void;
  
  // Автообновление
  startAutoRefresh: (shareToken: string, intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}

export const useMeeting = (): UseMeetingState & UseMeetingActions => {
  const [state, setState] = useState<UseMeetingState>({
    meeting: null,
    participants: [],
    availabilities: [],
    commonAvailableTimeSlots: [],
    commonDates: [],
    votes: [],
    isLoading: false,
    error: null,
    selectedDates: [],
    currentParticipantId: null,
  });

  // Ref для автообновления
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Обновление состояния (поддерживает функциональные обновления для актуального state)
  const updateState = useCallback((updates: Partial<UseMeetingState> | ((prev: UseMeetingState) => Partial<UseMeetingState>)) => {
    setState(prev => {
      const resolved = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolved };
    });
  }, []);

  // Создание новой встречи
  const createMeeting = useCallback(async (request: CreateMeetingRequest): Promise<Meeting | null> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const meeting = await meetingApi.createMeeting(request);
      updateState({ 
        meeting,
        isLoading: false,
        participants: [],
        availabilities: [],
        votes: [],
        selectedDates: [],
        currentParticipantId: null
      });
      return meeting;
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Ошибка создания встречи'
      });
      return null;
    }
  }, [updateState]);

  // Загрузка существующей встречи
  const loadMeeting = useCallback(async (shareToken: string): Promise<boolean> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const meetingDetail = await meetingApi.getMeetingByToken(shareToken);
      
      console.log('🏗️ loadMeeting: Полученные данные встречи:', meetingDetail);
      console.log('👥 loadMeeting: Участники из API:', meetingDetail.participants.map(p => ({
        id: p.id,
        name: p.name,
        isAuthenticated: p.isAuthenticated,
        user: p.user,
        email: p.email
      })));

      // Загружаем голоса отдельным запросом
      let votes: Vote[] = [];
      try {
        votes = await meetingApi.getVotes(meetingDetail.meeting.id);
      } catch (e) {
        console.warn('⚠️ Не удалось загрузить голоса:', e);
      }
      
      const slots = meetingDetail.commonAvailableTimeSlots ?? [];
      updateState({
        meeting: meetingDetail.meeting,
        participants: meetingDetail.participants,
        availabilities: meetingDetail.availabilities,
        commonAvailableTimeSlots: slots,
        commonDates: deriveCommonDates(slots),
        votes,
        isLoading: false,
        selectedDates: [],
        currentParticipantId: null
      });
      return true;
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Ошибка загрузки встречи'
      });
      return false;
    }
  }, [updateState]);

  // Добавление участника
  const addParticipant = useCallback(async (name: string): Promise<Participant | null> => {
    if (!state.meeting) return null;
    
    updateState({ isLoading: true, error: null });
    
    try {
      const participant = await meetingApi.addParticipant(state.meeting.id, { name });
      updateState({ 
        participants: [...state.participants, participant],
        isLoading: false,
        // Если это первый участник, делаем его текущим
        currentParticipantId: state.participants.length === 0 ? participant.id : state.currentParticipantId
      });
      return participant;
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Ошибка добавления участника'
      });
      return null;
    }
  }, [state.meeting, state.participants, updateState]);

  // Вычисление статуса участника по availabilities, votes и commonDates
  const computeParticipantStatus = useCallback((
    participantId: string,
    availabilities: { participantId: string; date: string }[],
    votes: { participantId: string; votedDate: string }[],
    commonDates: string[]
  ): ParticipantStatus => {
    const participantAvailabilities = availabilities.filter(a => a.participantId === participantId);
    const participantVote = votes.find(v => v.participantId === participantId);

    if (participantAvailabilities.length === 0) return ParticipantStatus.THINKING;
    if (participantVote && commonDates.includes(participantVote.votedDate)) return ParticipantStatus.VOTED;
    return ParticipantStatus.CHOOSEN_DATE;
  }, []);

  // Вычисление общих дат из availabilities
  const computeCommonDates = useCallback((
    availabilities: { participantId: string; date: string }[],
    participants: Participant[]
  ): string[] => {
    if (participants.length === 0) return [];

    const dateParticipants = new Map<string, Set<string>>();
    for (const a of availabilities) {
      if (!dateParticipants.has(a.date)) {
        dateParticipants.set(a.date, new Set());
      }
      dateParticipants.get(a.date)!.add(a.participantId);
    }

    return Array.from(dateParticipants.entries())
      .filter(([, pIds]) => pIds.size === participants.length)
      .map(([date]) => date)
      .sort();
  }, []);

  // Обновление доступности участника
  const updateAvailability = useCallback(async (participantId: string, dates: string[]): Promise<boolean> => {
    console.log('🔄 updateAvailability: участник =', participantId, 'даты =', dates);
    
    if (!state.meeting) {
      console.error('❌ Нет данных о встрече');
      return false;
    }
    
    updateState({ isLoading: true, error: null });
    
    try {
      // Фильтруем только новые даты (которых еще нет у участника)
      const existingDates = state.availabilities
        .filter(a => a.participantId === participantId)
        .map(a => a.date);
      
      console.log('📋 Существующие даты на сервере:', existingDates);
      
      const newDates = dates.filter(date => !existingDates.includes(date));
      
      console.log('✨ Новые даты для отправки:', newDates);
      
      if (newDates.length === 0) {
        console.log('ℹ️ Нет новых дат для отправки');
        updateState({ isLoading: false });
        return true;
      }
      
      // Отправляем только новые даты
      const promises = newDates.map(date => {
        console.log('📤 Отправляем запрос для даты:', date);
        return meetingApi.updateAvailability(state.meeting!.id, participantId, { date });
      });
      
      const newAvailabilities = promises.length > 0 ? await Promise.all(promises) : [];
      
      console.log('✅ Получены новые availabilities:', newAvailabilities);
      
      updateState(prev => {
        const updatedAvailabilities = [...prev.availabilities, ...newAvailabilities];
        const newCommonDates = computeCommonDates(updatedAvailabilities, prev.participants);
        const updatedParticipants = prev.participants.map(p => {
          if (p.id !== participantId) return p;
          const newStatus = computeParticipantStatus(
            p.id,
            updatedAvailabilities,
            prev.votes,
            newCommonDates
          );
          return { ...p, status: newStatus };
        });
        return {
          availabilities: updatedAvailabilities,
          commonDates: newCommonDates,
          participants: updatedParticipants,
          isLoading: false
        };
      });
      
      console.log('💾 Состояние обновлено, availabilities:', newAvailabilities.length, 'добавлено');
      return true;
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Ошибка обновления доступности'
      });
      return false;
    }
  }, [state.meeting, state.participants, state.availabilities, state.votes, updateState, computeCommonDates, computeParticipantStatus]);

  // Установка текущего участника
  const setCurrentParticipant = useCallback((participantId: string) => {
    // Восстанавливаем выбранные даты для этого участника из availabilities
    const participantAvailabilities = state.availabilities.filter(
      availability => availability.participantId === participantId
    );
    const selectedDates = participantAvailabilities.map(availability => availability.date);
    
    updateState({ 
      currentParticipantId: participantId,
      selectedDates: selectedDates
    });
  }, [updateState, state.availabilities]);

  // Удаление доступности для даты
  const removeAvailabilityForDate = useCallback(async (participantId: string, date: string) => {
    if (!state.meeting) return;
    
    try {
      await meetingApi.removeAvailability(state.meeting.id, participantId, date);
      
      const updatedAvailabilities = state.availabilities.filter(
        a => !(a.participantId === participantId && a.date === date)
      );
      const newSelectedDates = updatedAvailabilities
        .filter(a => a.participantId === participantId)
        .map(a => a.date);

      let slotsData: CommonTimeSlots[] = [];
      try {
        const detail = await meetingApi.getMeetingByToken(state.meeting.shareToken);
        slotsData = detail.commonAvailableTimeSlots ?? [];
      } catch {
        // Используем пустой список при ошибке refetch
      }

      const newCommonDates = deriveCommonDates(slotsData);
      updateState(prev => {
        const updatedParticipants = prev.participants.map(p => {
          if (p.id !== participantId) return p;
          const newStatus = computeParticipantStatus(
            p.id,
            updatedAvailabilities,
            prev.votes,
            newCommonDates
          );
          return { ...p, status: newStatus };
        });
        return {
          availabilities: updatedAvailabilities,
          selectedDates: newSelectedDates,
          commonAvailableTimeSlots: slotsData,
          commonDates: newCommonDates,
          participants: updatedParticipants
        };
      });
    } catch (error) {
      console.error('❌ Ошибка удаления доступности:', error);
    }
  }, [state.meeting, state.availabilities, updateState, computeParticipantStatus]);

  // Сохранение доступности с временными слотами (вызывается из TimeSlotPicker или при подтверждении дня без выбора времени)
  const saveAvailabilityWithTimeSlots = useCallback(async (
    participantId: string,
    date: string,
    slots: number[]
  ): Promise<boolean> => {
    if (!state.meeting) return false;

    updateState({ isLoading: true, error: null });

    try {
      const availability = await meetingApi.updateAvailability(
        state.meeting.id,
        participantId,
        { date, timeSlots: Array.isArray(slots) ? slots : [] }
      );

      // Refetch для получения актуальных commonAvailableTimeSlots (пересечение считается на бэке)
      const detail = await meetingApi.getMeetingByToken(state.meeting.shareToken);
      const slotsData = detail.commonAvailableTimeSlots ?? [];

      updateState(prev => {
        const withoutThis = prev.availabilities.filter(
          a => !(a.participantId === participantId && a.date === date)
        );
        const updatedAvailabilities = [...withoutThis, availability];
        const newSelectedDates = updatedAvailabilities
          .filter(a => a.participantId === participantId)
          .map(a => a.date);
        const newCommonDates = deriveCommonDates(slotsData);
        const updatedParticipants = prev.participants.map(p => {
          if (p.id !== participantId) return p;
          const newStatus = computeParticipantStatus(
            p.id,
            updatedAvailabilities,
            prev.votes,
            newCommonDates
          );
          return { ...p, status: newStatus };
        });
        return {
          availabilities: updatedAvailabilities,
          selectedDates: newSelectedDates,
          commonAvailableTimeSlots: slotsData,
          commonDates: newCommonDates,
          participants: updatedParticipants,
          isLoading: false
        };
      });

      return true;
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления доступности'
      });
      return false;
    }
  }, [state.meeting, updateState, computeParticipantStatus]);

  // Переключение выбора даты (no-op — API вызывается через onSaveSlots/onRemoveDay)
  const toggleDateSelection = useCallback((_date: string) => {
    // Клик по дню обрабатывается Calendar: показ кнопок, onOpenTimePicker, onSaveSlots, onRemoveDay
  }, []);

  // Голосование за финальную дату (с опциональным временным диапазоном)
  const castFinalVote = useCallback((date: string, timeStart?: string, timeEnd?: string) => {
    if (!state.meeting || !state.currentParticipantId) {
      console.warn('⚠️ Нет встречи или текущего участника для голосования');
      return;
    }

    const currentVote = state.votes.find(v => v.participantId === state.currentParticipantId);
    const isUnvoting =
      currentVote?.votedDate === date &&
      (timeStart === undefined
        ? !currentVote?.timeStart && !currentVote?.timeEnd
        : currentVote?.timeStart === timeStart && currentVote?.timeEnd === timeEnd);

    const participantId = state.currentParticipantId;
    if (isUnvoting) {
      updateState(prev => ({
        votes: prev.votes.filter(v => v.participantId !== participantId),
        participants: prev.participants.map(p =>
          p.id === participantId ? { ...p, status: ParticipantStatus.CHOOSEN_DATE } : p
        )
      }));

      meetingApi.removeVote(state.meeting.id, participantId).catch(err => {
        console.error('❌ Ошибка удаления голоса:', err);
      });
    } else {
      const optimisticVote: Vote = {
        id: `optimistic-${Date.now()}`,
        participantId,
        meetingId: state.meeting.id,
        votedDate: date,
        timeStart,
        timeEnd,
        createdAt: new Date().toISOString()
      };
      updateState(prev => ({
        votes: [
          ...prev.votes.filter(v => v.participantId !== participantId),
          optimisticVote
        ],
        participants: prev.participants.map(p =>
          p.id === participantId ? { ...p, status: ParticipantStatus.VOTED } : p
        )
      }));

      meetingApi.castVote(state.meeting.id, participantId, { date, timeStart, timeEnd }).then(realVote => {
        setState(prev => ({
          ...prev,
          votes: prev.votes.map(v => v.id === optimisticVote.id ? realVote : v)
        }));
      }).catch(err => {
        console.error('❌ Ошибка голосования:', err);
      });
    }
  }, [state.meeting, state.currentParticipantId, state.votes, state.participants, updateState]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Автообновление данных встречи
  const refreshMeetingData = useCallback(async (shareToken: string) => {
    try {
      const meetingDetail = await meetingApi.getMeetingByToken(shareToken);
      
      // Загружаем голоса (при ошибке сохраняем текущие)
      let newVotes: Vote[] | null = null;
      try {
        newVotes = await meetingApi.getVotes(meetingDetail.meeting.id);
      } catch (e) {
        console.warn('⚠️ Не удалось загрузить голоса при обновлении:', e);
      }

      // Используем загруженные голоса или текущие (если загрузка не удалась)
      const votesToCompare = newVotes ?? state.votes;

      // Сравниваем хэш данных чтобы обновлять только при изменениях (включая status участников)
      const slots = meetingDetail.commonAvailableTimeSlots ?? [];
      const newDataHash = JSON.stringify({
        participants: meetingDetail.participants.map(p => ({ id: p.id, name: p.name, status: p.status, isAuthenticated: p.isAuthenticated })),
        availabilities: meetingDetail.availabilities.map(a => ({ participantId: a.participantId, date: a.date, timeSlots: a.timeSlots })),
        commonAvailableTimeSlots: slots,
        votes: votesToCompare.map(v => ({ participantId: v.participantId, votedDate: v.votedDate, timeStart: v.timeStart, timeEnd: v.timeEnd }))
      });
      
      const currentDataHash = JSON.stringify({
        participants: state.participants.map(p => ({ id: p.id, name: p.name, status: p.status, isAuthenticated: p.isAuthenticated })),
        availabilities: state.availabilities.map(a => ({ participantId: a.participantId, date: a.date, timeSlots: a.timeSlots })),
        commonDates: state.commonDates,
        votes: state.votes.map(v => ({ participantId: v.participantId, votedDate: v.votedDate, timeStart: v.timeStart, timeEnd: v.timeEnd }))
      });
      
      // Обновляем только если данные изменились
      if (newDataHash !== currentDataHash) {
        console.log('🔄 Обновление данных встречи (изменения обнаружены)');

        // Синхронизация: если проголосовали с другого устройства — показать выбранный день
        let newCurrentParticipantId = state.currentParticipantId;
        let newSelectedDates = state.selectedDates;
        try {
          const currentUser = await authApi.getCurrentUser();
          const myParticipantIds = meetingDetail.participants
            .filter((p) => p.user?.id === currentUser.id)
            .map((p) => p.id);
          const myVote = votesToCompare.find((v) =>
            myParticipantIds.includes(v.participantId)
          );
          if (
            myVote &&
            (!state.currentParticipantId ||
              state.currentParticipantId !== myVote.participantId)
          ) {
            newCurrentParticipantId = myVote.participantId;
          }
          // Всегда синхронизируем selectedDates с availabilities текущего участника,
          // чтобы визуал календаря (синий/зелёный) обновлялся при изменениях с другого устройства
          const participantIdToSync =
            newCurrentParticipantId ?? state.currentParticipantId;
          if (participantIdToSync) {
            newSelectedDates = meetingDetail.availabilities
              .filter((a) => a.participantId === participantIdToSync)
              .map((a) => a.date);
          }
        } catch {
          // Пользователь не авторизован — пропускаем синхронизацию
        }

        const newSlots = meetingDetail.commonAvailableTimeSlots ?? [];
        updateState({
          meeting: meetingDetail.meeting,
          participants: meetingDetail.participants,
          availabilities: meetingDetail.availabilities,
          commonAvailableTimeSlots: newSlots,
          commonDates: deriveCommonDates(newSlots),
          votes: votesToCompare,
          currentParticipantId: newCurrentParticipantId,
          selectedDates: newSelectedDates,
        });
      } else {
        console.log('✅ Данные встречи актуальны');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка автообновления:', error);
      // Не показываем ошибку пользователю для автообновления
    }
  }, [state.participants, state.availabilities, state.commonAvailableTimeSlots, state.commonDates, state.votes, state.currentParticipantId, state.selectedDates, updateState]);

  // Запуск автообновления
  const startAutoRefresh = useCallback((shareToken: string, intervalMs: number = 5000) => {
    stopAutoRefresh(); // Останавливаем предыдущий интервал
    
    console.log(`🚀 Запуск автообновления каждые ${intervalMs}ms`);
    autoRefreshInterval.current = setInterval(() => {
      refreshMeetingData(shareToken);
    }, intervalMs);
  }, [refreshMeetingData]);

  // Остановка автообновления
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      console.log('⏹️ Остановка автообновления');
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  return {
    ...state,
    createMeeting,
    loadMeeting,
    addParticipant,
    updateAvailability,
    setCurrentParticipant,
    toggleDateSelection,
    saveAvailabilityWithTimeSlots,
    removeAvailabilityForDate,
    castFinalVote,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
  };
};
