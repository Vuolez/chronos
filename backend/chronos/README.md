# Chronos Backend

## Quick Start

```bash
./mvnw spring-boot:run
```

## API Documentation

- **Swagger UI**: http://localhost:8080/api/swagger-ui/index.html
- **OpenAPI JSON**: http://localhost:8080/api/v3/api-docs
- **Health Check**: http://localhost:8080/api/actuator/health

## MVP Endpoints

```
POST   /api/meetings                                    # Создать встречу
GET    /api/meetings/{id}                               # Получить встречу  
GET    /api/meetings/by-token/{shareToken}              # Получить по токену
POST   /api/meetings/{id}/participants                  # Добавить участника
GET    /api/meetings/{id}/participants                  # Список участников
PUT    /api/meetings/{id}/participants/{pid}/availability  # Указать доступность
GET    /api/meetings/{id}/availability                  # Вся доступность
GET    /api/meetings/{id}/common-dates                  # Общие даты
```

## Database

```bash
# Миграции
./mvnw flyway:migrate

# Очистка
./mvnw flyway:clean
```