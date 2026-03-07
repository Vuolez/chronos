package com.chronos.config

import com.fasterxml.jackson.databind.Module
import org.openapitools.jackson.nullable.JsonNullableModule
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Регистрация JsonNullableModule для корректной сериализации OpenAPI DTO.
 * Без этого JsonNullable поля сериализуются как {"present": true} вместо значения,
 * что вызывает ошибку "Objects are not valid as a React child" на фронтенде.
 */
@Configuration
class JacksonConfig {

    @Bean
    fun jsonNullableModule(): Module = JsonNullableModule()
}
