# Дизайн Frontend архитектуры - Chronos

## Архитектура
**Pattern**: Component-based архитектура с использованием React Hooks и Context API

## Технологический стек
- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: React Context API + useReducer
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS Modules / Styled Components
- **Build Tool**: Vite
- **Testing**: Vitest, React Testing Library

## Структура проекта
```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Calendar/
│   │   └── Layout/
│   ├── meeting/
│   │   ├── MeetingCreator/
│   │   ├── ParticipantList/
│   │   └── AvailabilitySelector/
│   └── ui/
├── pages/
│   ├── HomePage/
│   ├── MeetingPage/
│   └── NotFoundPage/
├── hooks/
│   ├── useApi.ts
│   ├── useMeeting.ts
│   └── useParticipant.ts
├── context/
│   ├── MeetingContext.tsx
│   └── ParticipantContext.tsx
├── services/
│   ├── api.ts
│   ├── meetingService.ts
│   └── participantService.ts
├── types/
│   ├── meeting.ts
│   ├── participant.ts
│   └── api.ts
├── utils/
│   ├── dateUtils.ts
│   └── validation.ts
└── styles/
    ├── globals.css
    └── variables.css
```

## Типы данных (TypeScript)

### types/meeting.ts
```typescript
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: MeetingStatus;
  shareToken: string;
  createdAt: string;
  finalDate?: string;
  finalTime?: string;
  participants: Participant[];
}

export enum MeetingStatus {
  PLANNING = 'PLANNING',
  VOTING = 'VOTING',
  COMPLETED = 'COMPLETED'
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
}
```

### types/participant.ts
```typescript
export interface Participant {
  id: string;
  name: string;
  status: ParticipantStatus;
  joinedAt: string;
  availabilities: Availability[];
}

export enum ParticipantStatus {
  THINKING = 'THINKING',
  VOTED = 'VOTED'
}

export interface Availability {
  id: string;
  date: string;
  timeFrom?: string;
  timeTo?: string;
}

export interface JoinMeetingRequest {
  name: string;
}
```

## Компоненты

### Calendar Component
```typescript
interface CalendarProps {
  selectedDates: Set<string>;
  onDateSelect: (date: string) => void;
  onDateDeselect: (date: string) => void;
  participantAvailabilities: Record<string, string[]>; // participantName -> dates
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDates,
  onDateSelect,
  onDateDeselect,
  participantAvailabilities,
  currentMonth,
  onMonthChange
}) => {
  // Компонент календаря с возможностью выбора дат
  // Показывает кто из участников выбрал каждую дату
};
```

### ParticipantList Component
```typescript
interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId?: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentParticipantId
}) => {
  // Список участников с их статусами
  // Подсвечивает текущего участника
};
```

### MeetingCreator Component
```typescript
interface MeetingCreatorProps {
  onMeetingCreate: (meeting: Meeting) => void;
}

export const MeetingCreator: React.FC<MeetingCreatorProps> = ({
  onMeetingCreate
}) => {
  // Форма создания новой встречи
  // Перенаправляет на страницу планирования после создания
};
```

## State Management

### MeetingContext
```typescript
interface MeetingContextType {
  meeting: Meeting | null;
  participants: Participant[];
  currentParticipant: Participant | null;
  selectedDates: Set<string>;
  intersections: string[];
  loading: boolean;
  error: string | null;
  
  actions: {
    loadMeeting: (shareToken: string) => Promise<void>;
    joinMeeting: (shareToken: string, name: string) => Promise<void>;
    selectDate: (date: string) => Promise<void>;
    deselectDate: (date: string) => Promise<void>;
    finishSelection: () => Promise<void>;
    loadIntersections: () => Promise<void>;
  };
}
```

### useMeeting Hook
```typescript
export const useMeeting = (shareToken?: string) => {
  const [state, dispatch] = useReducer(meetingReducer, initialState);
  
  const loadMeeting = useCallback(async (token: string) => {
    dispatch({ type: 'LOAD_MEETING_START' });
    try {
      const meeting = await meetingService.getMeeting(token);
      dispatch({ type: 'LOAD_MEETING_SUCCESS', payload: meeting });
    } catch (error) {
      dispatch({ type: 'LOAD_MEETING_ERROR', payload: error.message });
    }
  }, []);
  
  // Другие действия...
  
  return { ...state, actions: { loadMeeting, ... } };
};
```

## Маршрутизация

### App.tsx
```typescript
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/meeting/:shareToken" element={<MeetingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Страницы

### HomePage
- Кнопка "Запланировать новую встречу"
- Форма создания встречи
- Перенаправление на страницу планирования

### MeetingPage
- Левая панель: список участников и их статусы
- Центральная часть: календарь с выбором дат
- Навигация по месяцам
- Отображение пересечений (когда все проголосовали)

## Взаимодействие с API

### meetingService.ts
```typescript
export const meetingService = {
  async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
    const response = await api.post<Meeting>('/meetings', data);
    return response.data;
  },
  
  async getMeeting(shareToken: string): Promise<Meeting> {
    const response = await api.get<Meeting>(`/meetings/${shareToken}`);
    return response.data;
  },
  
  async getIntersections(meetingId: string): Promise<string[]> {
    const response = await api.get<string[]>(`/meetings/${meetingId}/intersections`);
    return response.data;
  }
};
```

### participantService.ts
```typescript
export const participantService = {
  async joinMeeting(shareToken: string, data: JoinMeetingRequest): Promise<Participant> {
    const response = await api.post<Participant>(
      `/meetings/${shareToken}/participants`, 
      data
    );
    return response.data;
  },
  
  async addAvailability(participantId: string, date: string): Promise<void> {
    await api.post(`/participants/${participantId}/availabilities`, { date });
  },
  
  async removeAvailability(availabilityId: string): Promise<void> {
    await api.delete(`/availabilities/${availabilityId}`);
  },
  
  async finishSelection(participantId: string): Promise<void> {
    await api.put(`/participants/${participantId}/status`, { status: 'VOTED' });
  }
};
```

## Стилизация

### CSS Variables
```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  
  --calendar-cell-size: 40px;
  --border-radius: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}
```

### Responsive Design
- Mobile-first подход
- Адаптивная сетка календаря
- Responsive sidebar для участников

## Обработка ошибок
- Error boundaries для отлова ошибок React
- Toast уведомления для пользователя
- Retry механизм для API запросов
- Fallback UI для loading состояний

## Оптимизация производительности
- React.memo для тяжелых компонентов
- useMemo для вычислений
- useCallback для стабилизации функций
- Code splitting по маршрутам
- Lazy loading компонентов