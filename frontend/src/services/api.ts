// API клиент для работы с бэкендом
// Аналог вашего RestTemplate/Feign клиента

import axios from 'axios';
import { 
  CreateMeetingRequest, 
  AddParticipantRequest, 
  UpdateAvailabilityRequest,
  LoginRequest,
  LoginResponse,
  UserInfo,
  ParticipationInfo,
  Meeting,
  MeetingDetail,
  Participant,
  Availability,
  ApiErrorResponse 
} from '../types';

// Настройка базового URL (ваш бэкенд)
const API_BASE_URL = 'http://localhost:8080/api';

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд
});

// ============================================
// JWT ТОКЕН - АВТОМАТИЧЕСКОЕ ДОБАВЛЕНИЕ
// ============================================

// Interceptor для добавления JWT токена в заголовки
apiClient.interceptors.request.use(
  (config) => {
    // Получаем JWT токен из localStorage
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      // Добавляем токен в заголовок Authorization
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработчик ошибок (как @ExceptionHandler в Spring)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Если 401/403 - проблемы с авторизацией
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Удаляем недействительный токен
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('ya_token');
      
      // Перенаправляем на страницу авторизации
      window.location.href = '/auth';
      return Promise.reject(new Error('Необходима авторизация'));
    }
    
    // Если есть ответ от сервера
    if (error.response?.data) {
      const apiError = error.response.data as ApiErrorResponse;
      throw new Error(apiError.message || 'Ошибка API');
    }
    
    // Если сеть недоступна
    throw new Error('Ошибка сети. Проверьте подключение к серверу.');
  }
);

// ============================================
// АВТОРИЗАЦИЯ API
// ============================================
export const authApi = {
  // Авторизация через Яндекс токен
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    
    // Сохраняем JWT токен для будущих запросов
    localStorage.setItem('jwt_token', response.data.token);
    
    return response.data;
  },

  // Получить информацию о текущем пользователе
  async getCurrentUser(): Promise<UserInfo> {
    const response = await apiClient.get<UserInfo>('/auth/me');
    return response.data;
  },

  // Выйти из системы
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Удаляем токены независимо от ответа сервера
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('ya_token');
    }
  },

  // Проверить авторизован ли пользователь
  isAuthenticated(): boolean {
    return !!localStorage.getItem('jwt_token');
  }
};

// ============================================
// ВСТРЕЧИ API
// ============================================
export const meetingApi = {
  // Создать встречу
  async createMeeting(request: CreateMeetingRequest): Promise<Meeting> {
    const response = await apiClient.post<Meeting>('/meetings', request);
    return response.data;
  },

  // Получить встречу по ID
  async getMeetingById(id: string): Promise<MeetingDetail> {
    const response = await apiClient.get<MeetingDetail>(`/meetings/${id}`);
    return response.data;
  },

  // Получить встречу по токену (публичный доступ)
  async getMeetingByToken(shareToken: string): Promise<MeetingDetail> {
    const response = await apiClient.get<MeetingDetail>(`/meetings/by-token/${shareToken}`);
    return response.data;
  },

  // Получить встречу по shareToken для страницы приглашения
  async getMeetingByShareToken(shareToken: string): Promise<MeetingDetail> {
    const response = await apiClient.get<MeetingDetail>(`/meetings/by-token/${shareToken}`);
    return response.data;
  },

  // Проверить участие пользователя во встрече
  async checkParticipation(meetingId: string): Promise<ParticipationInfo> {
    const response = await apiClient.get<ParticipationInfo>(`/meetings/${meetingId}/participation`);
    return response.data;
  },

  // Добавить участника
  async addParticipant(meetingId: string, request: AddParticipantRequest): Promise<Participant> {
    const response = await apiClient.post<Participant>(
      `/meetings/${meetingId}/participants`, 
      request
    );
    return response.data;
  },

  // Получить участников встречи
  async getParticipants(meetingId: string): Promise<Participant[]> {
    const response = await apiClient.get<Participant[]>(`/meetings/${meetingId}/participants`);
    return response.data;
  },

  // Обновить доступность участника
  async updateAvailability(
    meetingId: string, 
    participantId: string, 
    request: UpdateAvailabilityRequest
  ): Promise<Availability> {
    const response = await apiClient.put<Availability>(
      `/meetings/${meetingId}/participants/${participantId}/availability`,
      request
    );
    return response.data;
  },

  // Получить всю доступность для встречи
  async getAvailability(meetingId: string): Promise<Availability[]> {
    const response = await apiClient.get<Availability[]>(`/meetings/${meetingId}/availability`);
    return response.data;
  },

  // Получить общие доступные даты
  async getCommonDates(meetingId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/meetings/${meetingId}/common-dates`);
    return response.data;
  }
};

// Экспорт для использования в компонентах
export default apiClient;