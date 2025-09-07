// Контроллер для авторизации пользователей
// Обрабатывает токены от Яндекса и выдает наши JWT токены

package com.chronos.controller

import com.chronos.security.SecurityUtils
import com.chronos.service.JwtService
import com.chronos.service.UserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * Контроллер авторизации
 * 
 * ENDPOINTS:
 * 1. POST /auth/login - обмен Yandex токена на наш JWT
 * 2. GET /auth/me - получение информации о текущем пользователе
 * 3. POST /auth/logout - выход (пока просто заглушка)
 * 
 * FLOW АВТОРИЗАЦИИ:
 * 1. Фронтенд получает токен от Яндекса
 * 2. Отправляет POST /auth/login с yandexToken
 * 3. Мы проверяем токен у Яндекса
 * 4. Создаем/обновляем пользователя в БД
 * 5. Генерируем наш JWT токен
 * 6. Возвращаем JWT фронтенду
 * 7. Фронтенд использует JWT для всех запросов
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = ["http://localhost:3000", "http://localhost:5173"], allowCredentials = "true")
class AuthController(
    private val userService: UserService,
    private val jwtService: JwtService
) {
    
    /**
     * Авторизация через Яндекс токен
     * 
     * ЧТО ПРОИСХОДИТ:
     * 1. Получаем токен от фронтенда
     * 2. Проверяем его у Яндекса
     * 3. Создаем/обновляем пользователя
     * 4. Генерируем наш JWT
     * 5. Возвращаем JWT + данные пользователя
     */
    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        println("🔑 Получен запрос на авторизацию с токеном: ${request.yandexToken.take(10)}...")
        
        // Проверяем токен у Яндекса и создаем/обновляем пользователя
        val user = userService.authenticateWithYandex(request.yandexToken)
        
        if (user == null) {
            // Токен невалидный или пользователь не найден
            println("❌ Авторизация неудачна - пользователь не найден или токен невалидный")
            return ResponseEntity.badRequest().build()
        }
        
        println("✅ Пользователь найден/создан: ${user.name} (${user.email})")
        
        // Генерируем наш JWT токен
        val jwtToken = jwtService.generateToken(user)
        println("🎫 JWT токен сгенерирован для пользователя: ${user.email}")
        
        // Возвращаем токен + информацию о пользователе
        val response = LoginResponse(
            token = jwtToken,
            user = UserInfo(
                id = user.id,
                email = user.email,
                name = user.name,
                avatarUrl = user.avatarUrl
            )
        )
        
        println("📤 Отправляем ответ с JWT токеном")
        return ResponseEntity.ok(response)
    }
    
    /**
     * Получение информации о текущем пользователе
     * 
     * ТЕПЕРЬ РАБОТАЕТ ЧЕРЕЗ SPRING SECURITY!
     * JWT токен автоматически проверяется фильтром.
     * Если токен невалидный - запрос даже не дойдет до этого метода.
     * 
     * SecurityUtils.requireCurrentUser() получает пользователя из Security Context
     */
    @GetMapping("/me")
    @CrossOrigin(origins = ["http://localhost:3000", "http://localhost:5173"], allowCredentials = "true")
    fun getCurrentUser(): ResponseEntity<UserInfo> {
        // Получаем текущего пользователя из Security Context
        // Если пользователь не авторизован - метод выбросит исключение
        val user = SecurityUtils.requireCurrentUser()
        
        // Возвращаем информацию о пользователе
        val userInfo = UserInfo(
            id = user.id,
            email = user.email,
            name = user.name,
            avatarUrl = user.avatarUrl
        )
        
        return ResponseEntity.ok(userInfo)
    }
    
    /**
     * Выход из системы
     * 
     * JWT токены stateless (без состояния), поэтому "выйти" 
     * можно только удалив токен на фронтенде.
     * 
     * В продакшене можно добавить "черный список" токенов.
     */
    @PostMapping("/logout")
    fun logout(): ResponseEntity<Void> {
        // Пока просто возвращаем успех
        // Фронтенд должен удалить токен из localStorage
        return ResponseEntity.ok().build()
    }
}

/**
 * DTO для запроса авторизации
 */
data class LoginRequest(
    val yandexToken: String  // Токен полученный от Яндекс OAuth
)

/**
 * DTO для ответа при авторизации
 */
data class LoginResponse(
    val token: String,    // Наш JWT токен
    val user: UserInfo    // Информация о пользователе
)

/**
 * DTO с информацией о пользователе
 */
data class UserInfo(
    val id: UUID,
    val email: String,
    val name: String,
    val avatarUrl: String?
)