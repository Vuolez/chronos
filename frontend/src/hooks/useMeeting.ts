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
  CreateMeetingRequest,
  AddParticipantRequest,
  UpdateAvailabilityRequest,
  ParticipantStatus
} from '../types';

interface UseMeetingState {
  // Данные
  meeting: Meeting | null;
  participants: Participant[];
  availabilities: Availability[];
  commonDates: string[];
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
  castFinalVote: (date: string) => void;
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
    commonDates: [],
    votes: [],
    isLoading: false,
    error: null,
    selectedDates: [],
    currentParticipantId: null,
  });

  // Ref для автообновления
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Обновление состояния
  const updateState = useCallback((updates: Partial<UseMeetingState>) => {
    setState(prev => ({ ...prev, ...updates }));
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
      
      updateState({
        meeting: meetingDetail.meeting,
        participants: meetingDetail.participants,
        availabilities: meetingDetail.availabilities,
        commonDates: meetingDetail.commonAvailableDates,
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
      
      const updatedAvailabilities = [
        ...state.availabilities,
        ...newAvailabilities
      ];
      const newCommonDates = computeCommonDates(updatedAvailabilities, state.participants);
      const updatedParticipants = state.participants.map(p => {
        if (p.id !== participantId) return p;
        const newStatus = computeParticipantStatus(
          p.id,
          updatedAvailabilities,
          state.votes,
          newCommonDates
        );
        return { ...p, status: newStatus };
      });

      updateState({
        availabilities: updatedAvailabilities,
        commonDates: newCommonDates,
        participants: updatedParticipants,
        isLoading: false
      });
      
      console.log('💾 Состояние обновлено, availabilities:', updatedAvailabilities.length);
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
      const newCommonDates = computeCommonDates(updatedAvailabilities, state.participants);
      const updatedParticipants = state.participants.map(p => {
        if (p.id !== participantId) return p;
        const newStatus = computeParticipantStatus(
          p.id,
          updatedAvailabilities,
          state.votes,
          newCommonDates
        );
        return { ...p, status: newStatus };
      });

      updateState({
        availabilities: updatedAvailabilities,
        commonDates: newCommonDates,
        participants: updatedParticipants
      });
    } catch (error) {
      console.error('❌ Ошибка удаления доступности:', error);
    }
  }, [state.meeting, state.availabilities, state.participants, state.votes, updateState, computeCommonDates, computeParticipantStatus]);

  // Переключение выбора даты
  const toggleDateSelection = useCallback((date: string) => {
    console.log('📅 toggleDateSelection: дата =', date, 'текущий участник =', state.currentParticipantId);
    
    const isRemoving = state.selectedDates.includes(date);
    const newSelectedDates = isRemoving
      ? state.selectedDates.filter(d => d !== date)
      : [...state.selectedDates, date];
    
    console.log('📅 Новые выбранные даты:', newSelectedDates, isRemoving ? '(удаление)' : '(добавление)');

    // Оптимистичное вычисление commonDates
    let optimisticAvailabilities: { participantId: string; date: string }[];
    if (isRemoving) {
      optimisticAvailabilities = state.availabilities.filter(
        a => !(a.participantId === state.currentParticipantId && a.date === date)
      );
    } else {
      const alreadyExists = state.availabilities.some(
        a => a.participantId === state.currentParticipantId && a.date === date
      );
      optimisticAvailabilities = alreadyExists
        ? [...state.availabilities]
        : [...state.availabilities, { participantId: state.currentParticipantId!, date }];
    }

    const newCommonDates = computeCommonDates(optimisticAvailabilities, state.participants);

    // Оптимистичное обновление статуса текущего участника
    const updatedParticipants = state.currentParticipantId ? state.participants.map(p => {
      if (p.id !== state.currentParticipantId) return p;
      const newStatus = computeParticipantStatus(
        p.id,
        optimisticAvailabilities,
        state.votes,
        newCommonDates
      );
      return { ...p, status: newStatus };
    }) : state.participants;

    updateState({
      selectedDates: newSelectedDates,
      commonDates: newCommonDates,
      participants: updatedParticipants
    });
    
    if (state.currentParticipantId) {
      if (isRemoving) {
        // Удаляем дату с сервера
        removeAvailabilityForDate(state.currentParticipantId, date);
      } else {
        // Добавляем дату на сервер
        updateAvailability(state.currentParticipantId, newSelectedDates);
      }
    } else {
      console.warn('⚠️ Нет текущего участника для сохранения доступности');
    }
  }, [state.selectedDates, state.currentParticipantId, state.availabilities, state.participants, state.votes, updateAvailability, removeAvailabilityForDate, updateState, computeCommonDates, computeParticipantStatus]);

  // Голосование за финальную дату
  const castFinalVote = useCallback((date: string) => {
    if (!state.meeting || !state.currentParticipantId) {
      console.warn('⚠️ Нет встречи или текущего участника для голосования');
      return;
    }

    const currentVote = state.votes.find(v => v.participantId === state.currentParticipantId);
    const isUnvoting = currentVote?.votedDate === date;

    if (isUnvoting) {
      const updatedVotes = state.votes.filter(v => v.participantId !== state.currentParticipantId);
      const updatedParticipants = state.participants.map(p =>
        p.id === state.currentParticipantId ? { ...p, status: ParticipantStatus.CHOOSEN_DATE } : p
      );
      updateState({ votes: updatedVotes, participants: updatedParticipants });

      meetingApi.removeVote(state.meeting.id, state.currentParticipantId).catch(err => {
        console.error('❌ Ошибка удаления голоса:', err);
      });
    } else {
      const optimisticVote: Vote = {
        id: `optimistic-${Date.now()}`,
        participantId: state.currentParticipantId,
        meetingId: state.meeting.id,
        votedDate: date,
        createdAt: new Date().toISOString()
      };
      const updatedVotes = [
        ...state.votes.filter(v => v.participantId !== state.currentParticipantId),
        optimisticVote
      ];
      const updatedParticipants = state.participants.map(p =>
        p.id === state.currentParticipantId ? { ...p, status: ParticipantStatus.VOTED } : p
      );
      updateState({ votes: updatedVotes, participants: updatedParticipants });

      meetingApi.castVote(state.meeting.id, state.currentParticipantId, date).then(realVote => {
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

      // Сравниваем хэш данных чтобы обновлять только при изменениях
      const newDataHash = JSON.stringify({
        participants: meetingDetail.participants.map(p => ({ id: p.id, name: p.name, isAuthenticated: p.isAuthenticated })),
        availabilities: meetingDetail.availabilities.map(a => ({ participantId: a.participantId, date: a.date })),
        commonDates: meetingDetail.commonAvailableDates,
        votes: votesToCompare.map(v => ({ participantId: v.participantId, votedDate: v.votedDate }))
      });
      
      const currentDataHash = JSON.stringify({
        participants: state.participants.map(p => ({ id: p.id, name: p.name, isAuthenticated: p.isAuthenticated })),
        availabilities: state.availabilities.map(a => ({ participantId: a.participantId, date: a.date })),
        commonDates: state.commonDates,
        votes: state.votes.map(v => ({ participantId: v.participantId, votedDate: v.votedDate }))
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

        updateState({
          meeting: meetingDetail.meeting,
          participants: meetingDetail.participants,
          availabilities: meetingDetail.availabilities,
          commonDates: meetingDetail.commonAvailableDates,
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
  }, [state.participants, state.availabilities, state.commonDates, state.votes, state.currentParticipantId, state.selectedDates, updateState]);

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
    castFinalVote,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
  };
};
