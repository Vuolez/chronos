// Конфигурация CORS для разрешения запросов от фронтенда
// Решает проблему 403 FORBIDDEN на OPTIONS запросы

package com.chronos.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class CorsConfig {

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        
        // Разрешенные источники (конкретные для credentials)
        configuration.allowedOrigins = listOf(
            "http://localhost:3000",
            "http://localhost:5173",
            "https://chronos-scheduler.ru",
            "https://vstrechnica.ru"
        )
        
        // Разрешенные HTTP методы
        configuration.allowedMethods = listOf(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"
        )
        
        // Разрешенные заголовки
        configuration.allowedHeaders = listOf("*")
        
        // Разрешить отправку cookies/credentials
        configuration.allowCredentials = true
        
        // Заголовки, которые браузер может читать
        configuration.exposedHeaders = listOf(
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials",
            "Authorization"
        )
        
        // Время кеширования preflight запросов (в секундах)
        configuration.maxAge = 3600L
        
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        
        return source
    }
}