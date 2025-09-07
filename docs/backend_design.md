# Дизайн Backend архитектуры - Chronos

## Архитектура
**Pattern**: Layered Architecture (Controller → Service → Repository → Entity)

## Технологический стек
- **Framework**: Spring Boot 3.x
- **Language**: Kotlin
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA / Hibernate
- **Build**: Gradle
- **Testing**: JUnit 5, Mockk

## Структура проекта
```
src/main/kotlin/com/chronos/
├── ChronosApplication.kt
├── config/
│   ├── DatabaseConfig.kt
│   └── WebConfig.kt
├── controller/
│   ├── MeetingController.kt
│   └── ParticipantController.kt
├── service/
│   ├── MeetingService.kt
│   └── ParticipantService.kt
├── repository/
│   ├── MeetingRepository.kt
│   ├── ParticipantRepository.kt
│   └── AvailabilityRepository.kt
├── entity/
│   ├── Meeting.kt
│   ├── Participant.kt
│   └── Availability.kt
├── dto/
│   ├── request/
│   └── response/
└── exception/
    └── GlobalExceptionHandler.kt
```

## Схема базы данных

### Таблица meetings
```sql
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PLANNING', -- PLANNING, VOTING, COMPLETED
    final_date DATE,
    final_time TIME,
    share_token VARCHAR(255) UNIQUE NOT NULL
);
```

### Таблица participants
```sql
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'THINKING', -- THINKING, VOTED
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Таблица availabilities
```sql
CREATE TABLE availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_from TIME, -- для будущих итераций
    time_to TIME,   -- для будущих итераций
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Таблица votes (для будущих итераций)
```sql
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    voted_date DATE NOT NULL,
    voted_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Meeting Management
```
POST /api/meetings                    # Создать новую встречу
GET  /api/meetings/{shareToken}       # Получить информацию о встрече
PUT  /api/meetings/{id}/status        # Обновить статус встречи
GET  /api/meetings/{id}/intersections # Получить пересечения свободного времени
```

### Participant Management
```
POST /api/meetings/{shareToken}/participants    # Присоединиться к встрече
GET  /api/meetings/{shareToken}/participants    # Получить список участников
PUT  /api/participants/{id}/status              # Обновить статус участника
```

### Availability Management
```
POST   /api/participants/{id}/availabilities   # Добавить доступное время
DELETE /api/availabilities/{id}                # Удалить доступное время
GET    /api/meetings/{id}/availabilities       # Получить все доступности для встречи
```

## Модели данных (Entity)

### Meeting.kt
```kotlin
@Entity
@Table(name = "meetings")
data class Meeting(
    @Id
    @GeneratedValue
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false)
    val title: String,
    
    val description: String? = null,
    
    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @UpdateTimestamp
    val updatedAt: LocalDateTime = LocalDateTime.now(),
    
    @Enumerated(EnumType.STRING)
    val status: MeetingStatus = MeetingStatus.PLANNING,
    
    val finalDate: LocalDate? = null,
    val finalTime: LocalTime? = null,
    
    @Column(unique = true, nullable = false)
    val shareToken: String = generateShareToken(),
    
    @OneToMany(mappedBy = "meeting", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val participants: List<Participant> = emptyList()
)

enum class MeetingStatus { PLANNING, VOTING, COMPLETED }
```

### Participant.kt
```kotlin
@Entity
@Table(name = "participants")
data class Participant(
    @Id
    @GeneratedValue
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    val meeting: Meeting,
    
    @Column(nullable = false)
    val name: String,
    
    @Enumerated(EnumType.STRING)
    val status: ParticipantStatus = ParticipantStatus.THINKING,
    
    @CreationTimestamp
    val joinedAt: LocalDateTime = LocalDateTime.now(),
    
    @OneToMany(mappedBy = "participant", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val availabilities: List<Availability> = emptyList()
)

enum class ParticipantStatus { THINKING, VOTED }
```

### Availability.kt
```kotlin
@Entity
@Table(name = "availabilities")
data class Availability(
    @Id
    @GeneratedValue
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    val participant: Participant,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    val meeting: Meeting,
    
    @Column(nullable = false)
    val date: LocalDate,
    
    val timeFrom: LocalTime? = null, // для будущих итераций
    val timeTo: LocalTime? = null,   // для будущих итераций
    
    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

## Ключевая бизнес-логика

### MeetingService.kt - метод поиска пересечений
```kotlin
fun findDateIntersections(meetingId: UUID): List<LocalDate> {
    val meeting = meetingRepository.findById(meetingId)
    val participants = meeting.participants.filter { it.status == ParticipantStatus.VOTED }
    
    if (participants.isEmpty()) return emptyList()
    
    // Получить все даты, выбранные каждым участником
    val participantDates = participants.map { participant ->
        participant.availabilities.map { it.date }.toSet()
    }
    
    // Найти пересечение всех множеств дат
    return participantDates.reduce { acc, dates -> acc.intersect(dates) }.toList()
}
```

## Обработка ошибок
- Использование `@ControllerAdvice` для глобальной обработки исключений
- Кастомные исключения: `MeetingNotFoundException`, `ParticipantNotFoundException`
- Стандартизированные HTTP response codes

## Безопасность
- Share token для доступа к встречам вместо UUID
- Валидация входных данных
- Rate limiting (в будущих итерациях)
- CORS настройка для фронтенда