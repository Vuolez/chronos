# Chronos Backend Setup

## Описание
Backend сервис для приложения Chronos - веб-приложения для планирования встреч.

## Технологический стек
- **Java**: 17
- **Framework**: Spring Boot 3.2.0
- **Language**: Kotlin
- **Database**: PostgreSQL 15
- **Migrations**: Flyway
- **Build Tool**: Maven

## Быстрый старт

### 1. Запуск PostgreSQL через Docker
```bash
# Из корня проекта chronos/
docker-compose up -d postgres
```

### 2. Проверка подключения к БД
```bash
docker exec -it chronos-postgres psql -U chronos_user -d chronos -c "\dt"
```

### 3. Запуск приложения локально
```bash
cd backend/chronos
./mvnw spring-boot:run
```

### 4. Проверка работы
- Health check: http://localhost:8080/api/health
- Actuator health: http://localhost:8080/api/actuator/health

## Запуск через Docker

### Сборка и запуск всех сервисов
```bash
# Из корня проекта chronos/
docker-compose up --build
```

### Только база данных
```bash
docker-compose up postgres
```

## Работа с базой данных

### Выполнение миграций вручную
```bash
cd backend/chronos
./mvnw flyway:migrate
```

### Просмотр информации о миграциях
```bash
./mvnw flyway:info
```

### Очистка базы данных (осторожно!)
```bash
./mvnw flyway:clean
```

### Валидация миграций
```bash
./mvnw flyway:validate
```

### Просмотр истории миграций
```bash
./mvnw flyway:history
```

## Структура проекта

```
backend/chronos/
├── src/main/
│   ├── kotlin/com/chronos/
│   │   ├── ChronosApplication.kt          # Main application class
│   │   └── controller/
│   │       └── HealthController.kt        # Health check endpoint
│   └── resources/
│       ├── application.yml                # Spring configuration
│       └── db/migration/                  # Flyway migrations
│           ├── V1__Create_meetings_table.sql
│           ├── V2__Create_participants_table.sql
│           ├── V3__Create_availabilities_table.sql
│           └── V4__Create_votes_table.sql
├── pom.xml                                # Maven configuration
├── Dockerfile                             # Docker configuration
└── mvnw                                   # Maven wrapper
```

## Схема базы данных

### Таблица meetings
- Основная информация о встречах
- Статус встречи (PLANNING, VOTING, COMPLETED)
- Share token для приглашений

### Таблица participants
- Участники встреч
- Статус участника (THINKING, VOTED)
- Связь с meetings через foreign key

### Таблица availabilities
- Доступные даты/время участников
- Связь с participants и meetings

### Таблица votes
- Голосование при множественных пересечениях
- Будет использоваться в будущих итерациях

## Переменные окружения

### Локальная разработка
```bash
# Настройки в application.yml (profile: local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chronos
DB_USER=chronos_user
DB_PASSWORD=chronos_password
```

### Docker окружение
```bash
# Автоматически прокидываются через docker-compose.yml
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chronos
DB_USER=chronos_user
DB_PASSWORD=chronos_password
SPRING_PROFILES_ACTIVE=docker
```

## Полезные команды

### Maven
```bash
# Компиляция
./mvnw compile

# Запуск тестов
./mvnw test

# Сборка JAR
./mvnw package

# Очистка
./mvnw clean
```

### Docker
```bash
# Логи приложения
docker-compose logs -f chronos-backend

# Логи базы данных
docker-compose logs -f postgres

# Остановка всех сервисов
docker-compose down

# Полная очистка (включая volumes)
docker-compose down -v
```

## Troubleshooting

### Проблема с подключением к БД
1. Проверьте что PostgreSQL запущен: `docker-compose ps`
2. Проверьте логи БД: `docker-compose logs postgres`
3. Убедитесь что порт 5432 не занят

### Ошибки миграций Flyway
1. Проверьте конфигурацию Flyway в application.yml
2. Убедитесь что БД доступна
3. Проверьте логи при запуске приложения
4. Убедитесь что файлы миграций имеют правильное имя (V{version}__{description}.sql)

### Проблемы сборки Maven
1. Убедитесь что установлена Java 17
2. Проверьте Maven wrapper: `./mvnw --version`
3. Очистите кэш: `./mvnw dependency:purge-local-repository`

## Следующие шаги
1. Реализация Entity классов
2. Создание Repository слоя
3. Реализация Service слоя
4. Создание REST API endpoints
5. Добавление валидации и обработки ошибок