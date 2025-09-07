// Custom hook для управления встречей
// Централизует всю логику работы с API

import { useState, useCallback, useRef } from 'react';
import { meetingApi } from '../services';
import { 
  Meeting, 
  MeetingDetail, 
  Participant, 
  Availability,
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
      
      updateState({
        meeting: meetingDetail.meeting,
        participants: meetingDetail.participants,
        availabilities: meetingDetail.availabilities,
        commonDates: meetingDetail.commonAvailableDates,
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
      
      // Обновляем локальное состояние
      const updatedAvailabilities = [
        ...state.availabilities,
        ...newAvailabilities
      ];
      
      // Обновляем статус участника
      const updatedParticipants = state.participants.map(p => 
        p.id === participantId 
          ? { ...p, status: ParticipantStatus.VOTED }
          : p
      );

      updateState({
        availabilities: updatedAvailabilities,
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
  }, [state.meeting, state.participants, state.availabilities, updateState]);

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

  // Переключение выбора даты
  const toggleDateSelection = useCallback((date: string) => {
    console.log('📅 toggleDateSelection: дата =', date, 'текущий участник =', state.currentParticipantId);
    
    const newSelectedDates = state.selectedDates.includes(date)
      ? state.selectedDates.filter(d => d !== date)
      : [...state.selectedDates, date];
    
    console.log('📅 Новые выбранные даты:', newSelectedDates);
    updateState({ selectedDates: newSelectedDates });
    
    // updateAvailability теперь сама фильтрует только новые даты
    if (state.currentParticipantId) {
      console.log('📅 Отправляем запрос на сервер для участника:', state.currentParticipantId);
      updateAvailability(state.currentParticipantId, newSelectedDates);
    } else {
      console.warn('⚠️ Нет текущего участника для сохранения доступности');
    }
  }, [state.selectedDates, state.currentParticipantId, updateAvailability]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Автообновление данных встречи
  const refreshMeetingData = useCallback(async (shareToken: string) => {
    try {
      const meetingDetail = await meetingApi.getMeetingByToken(shareToken);
      
      // Сравниваем хэш данных чтобы обновлять только при изменениях
      const newDataHash = JSON.stringify({
        participants: meetingDetail.participants.map(p => ({ id: p.id, name: p.name, isAuthenticated: p.isAuthenticated })),
        availabilities: meetingDetail.availabilities.map(a => ({ participantId: a.participantId, date: a.date })),
        commonDates: meetingDetail.commonAvailableDates
      });
      
      const currentDataHash = JSON.stringify({
        participants: state.participants.map(p => ({ id: p.id, name: p.name, isAuthenticated: p.isAuthenticated })),
        availabilities: state.availabilities.map(a => ({ participantId: a.participantId, date: a.date })),
        commonDates: state.commonDates
      });
      
      // Обновляем только если данные изменились
      if (newDataHash !== currentDataHash) {
        console.log('🔄 Обновление данных встречи (изменения обнаружены)');
        
        // Сохраняем текущие selectedDates и currentParticipantId
        updateState({
          meeting: meetingDetail.meeting,
          participants: meetingDetail.participants,
          availabilities: meetingDetail.availabilities,
          commonDates: meetingDetail.commonAvailableDates,
        });
      } else {
        console.log('✅ Данные встречи актуальны');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка автообновления:', error);
      // Не показываем ошибку пользователю для автообновления
    }
  }, [state.participants, state.availabilities, state.commonDates, updateState]);

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
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
  };
};