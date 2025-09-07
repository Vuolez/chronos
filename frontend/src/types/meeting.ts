// Основные типы для встреч
// Соответствует вашему бэкенд API

import { UserInfo } from './api';

export enum MeetingStatus {
  PLANNING = 'PLANNING',
  VOTING = 'VOTING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum ParticipantStatus {
  THINKING = 'THINKING',
  VOTED = 'VOTED'
}

// Основная сущность встречи
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  shareToken: string;
  status: MeetingStatus;
  finalDate?: string; // ISO date string
  finalTime?: string; // HH:mm:ss format
  createdBy?: UserInfo; // Создатель встречи
  createdAt: string;  // ISO datetime string
  updatedAt: string;  // ISO datetime string
}

// UserInfo импортируется из api.ts

// Участник встречи
export interface Participant {
  id: string;
  meetingId: string;
  name: string;
  email?: string;
  status: ParticipantStatus;
  user?: UserInfo; // Информация о пользователе (если авторизован)
  isAuthenticated: boolean; // Является ли участник авторизованным
  joinedAt: string; // ISO datetime string
}

// Доступность участника
export interface Availability {
  id: string;
  participantId: string;
  meetingId: string;
  date: string;      // ISO date string (YYYY-MM-DD)
  timeFrom?: string; // HH:mm:ss format
  timeTo?: string;   // HH:mm:ss format
  createdAt: string; // ISO datetime string
}

// Детальная информация о встрече (включает участников и доступности)
export interface MeetingDetail {
  meeting: Meeting;
  participants: Participant[];
  availabilities: Availability[];
  commonAvailableDates: string[]; // массив дат ISO format
}