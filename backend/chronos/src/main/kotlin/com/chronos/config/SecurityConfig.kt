// Главная конфигурация безопасности приложения
// Здесь мы настраиваем какие endpoints защищать и как

package com.chronos.config

import com.chronos.security.JwtAuthenticationFilter
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfigurationSource

/**
 * Конфигурация Spring Security
 * 
 * ЧТО МЫ ЗДЕСЬ НАСТРАИВАЕМ:
 * 1. Какие URL защищать, а какие оставить публичными
 * 2. Отключение ненужных функций (CSRF, сессии)
 * 3. Подключение нашего JWT фильтра
 * 4. Обработка ошибок авторизации
 * 
 * @EnableWebSecurity - включает Spring Security
 * @Configuration - помечает класс как конфигурацию Spring
 */
@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
    @Qualifier("corsConfigurationSource") private val corsConfigurationSource: CorsConfigurationSource
) {

    /**
     * Главная конфигурация цепочки фильтров безопасности
     * 
     * ЧТО ЗДЕСЬ ПРОИСХОДИТ:
     * 1. Настраиваем какие URL требуют авторизации
     * 2. Отключаем ненужные функции (CSRF, сессии)
     * 3. Подключаем наш JWT фильтр
     */
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        return http
            // Отключаем CSRF защиту
            // ЗАЧЕМ: CSRF нужен для form-based аутентификации
            // У нас JWT токены - CSRF не требуется
            .csrf { it.disable() }
            
            // Включаем CORS поддержку (используем существующий CorsConfig)
            .cors { it.configurationSource(corsConfigurationSource) }
            
            // Настройка авторизации запросов
            .authorizeHttpRequests { auth ->
                auth
                    // ПУБЛИЧНЫЕ ENDPOINTS (без авторизации):
                    // Пути с префиксом /api т.к. server.servlet.context-path: /api
                    
                    // Авторизация - login и logout публичные, /me требует токен
                    .requestMatchers("/api/auth/login", "/api/auth/logout").permitAll()
                    .requestMatchers("/api/auth/me").authenticated()
                    
                    // Swagger UI - для разработки
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    
                    // Actuator endpoints (health check и т.д.)
                    .requestMatchers("/actuator/**").permitAll()
                    
                    // ВРЕМЕННО: Meetings пока публичные (потом изменим)
                    .requestMatchers("/meetings/**").permitAll()
                    .requestMatchers("/participants/**").permitAll()
                    .requestMatchers("/availability/**").permitAll()
                    
                    // ВСЕ ОСТАЛЬНЫЕ ENDPOINTS требуют авторизации
                    .anyRequest().authenticated()
            }
            
            // Отключаем сессии
            // ЗАЧЕМ: JWT токены stateless, сессии не нужны
            // Это экономит память и упрощает масштабирование
            .sessionManagement { session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            
            // Подключаем наш JWT фильтр
            // ВАЖНО: добавляем ЕГО ДО стандартного фильтра авторизации
            // Так наш фильтр успеет обработать JWT токен
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
            
            // Строим конфигурацию
            .build()
    }
}