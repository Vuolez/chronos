// API Request/Response типы
// Соответствует вашим DTO классам в бэкенде

// Запросы к API
export interface CreateMeetingRequest {
  title: string;
  description?: string;
}

export interface AddParticipantRequest {
  name: string;
  email?: string;
}

export interface UpdateAvailabilityRequest {
  date: string;      // ISO date string (YYYY-MM-DD)
  timeFrom?: string; // HH:mm:ss format
  timeTo?: string;   // HH:mm:ss format
}

// Ответы от API (используем те же типы что и в meeting.ts)
export type { Meeting, Participant, Availability, MeetingDetail } from './meeting';

// Ошибки API
export interface ApiErrorResponse {
  message: string;
  details?: string;
  timestamp: string;
  path?: string;
}

// Общий тип для API ответов
export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorResponse;
}

// ============================================
// АВТОРИЗАЦИЯ - API ТИПЫ
// ============================================

export interface LoginRequest {
  yandexToken: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ParticipationInfo {
  isParticipant: boolean;
  participant?: import('./meeting').Participant | null;
}