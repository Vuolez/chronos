-- Создание таблицы пользователей для авторизации через Яндекс
-- V5__Create_users_table.sql

CREATE TABLE users (
    id UUID PRIMARY KEY,
    yandex_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX idx_users_yandex_id ON users(yandex_id);
CREATE INDEX idx_users_email ON users(email);