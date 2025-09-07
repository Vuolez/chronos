// Сервис для работы с пользователями
// Бизнес-логика: создание, поиск, валидация токенов Яндекса

package com.chronos.service

import com.chronos.entity.User
import com.chronos.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.time.Instant
import java.util.*

/**
 * Сервис для управления пользователями
 * 
 * ОСНОВНЫЕ ФУНКЦИИ:
 * 1. Проверка токенов Яндекса через их API
 * 2. Создание/обновление пользователей
 * 3. Поиск пользователей по разным критериям
 */
@Service
class UserService(
    private val userRepository: UserRepository,
    private val webClient: WebClient.Builder
) {
    
    /**
     * Проверить токен Яндекса и получить информацию о пользователе
     * 
     * ЧТО ДЕЛАЕТ:
     * 1. Отправляет токен на API Яндекса
     * 2. Получает данные пользователя (id, email, имя)
     * 3. Создает или обновляет пользователя в нашей БД
     * 
     * @param yandexToken токен от Яндекс OAuth
     * @return User или null если токен невалидный
     */
    fun authenticateWithYandex(yandexToken: String): User? {
        return try {
            // Проверяем тестовый токен для разработки
            if (yandexToken == "test-token") {
                return createTestUser()
            }
            
            // Получаем информацию о пользователе от Яндекса
            val yandexUserInfo = fetchYandexUserInfo(yandexToken)
                ?: return null
            
            // Ищем существующего пользователя или создаем нового
            val existingUser = userRepository.findByYandexId(yandexUserInfo.id)
            
            // Определяем email пользователя из разных источников
            val userEmail = yandexUserInfo.default_email 
                ?: yandexUserInfo.emails?.firstOrNull()
                ?: "${yandexUserInfo.login}@yandex.ru"  // Fallback email
            
            println("📧 Email пользователя: $userEmail")
            
            return if (existingUser != null) {
                // Обновляем информацию существующего пользователя
                println("🔄 Обновляем существующего пользователя: ${existingUser.email}")
                existingUser.apply {
                    name = yandexUserInfo.display_name ?: yandexUserInfo.real_name ?: yandexUserInfo.login
                    email = userEmail
                    avatarUrl = buildAvatarUrl(yandexUserInfo.default_avatar_id)
                }
                userRepository.save(existingUser)
            } else {
                // Создаем нового пользователя
                println("➕ Создаем нового пользователя: $userEmail")
                try {
                    val newUser = User(
                        yandexId = yandexUserInfo.id,
                        email = userEmail,
                        name = yandexUserInfo.display_name ?: yandexUserInfo.real_name ?: yandexUserInfo.login,
                        avatarUrl = buildAvatarUrl(yandexUserInfo.default_avatar_id)
                    )
                    
                    userRepository.save(newUser)
                } catch (e: Exception) {
                    // Возможно пользователь уже был создан другим потоком
                    println("⚠️ Ошибка создания, пробуем найти существующего: ${e.message}")
                    val existingUserRetry = userRepository.findByYandexId(yandexUserInfo.id)
                    if (existingUserRetry != null) {
                        println("✅ Найден существующий пользователь при повторной попытке")
                        existingUserRetry
                    } else {
                        throw e
                    }
                }
            }
        } catch (e: Exception) {
            println("❌ Ошибка авторизации с Яндексом: ${e.message}")
            null
        }
    }
    
    /**
     * Получить информацию о пользователе от Яндекс API
     */
    private fun fetchYandexUserInfo(token: String): YandexUserInfo? {
        return try {
            println("🌐 Начинаем запрос к Яндекс API...")
            println("🔑 Токен: ${token.take(20)}...")
            
            val client = webClient.build()
            
            val response = client
                .get()
                .uri("https://login.yandex.ru/info")
                .header("Authorization", "OAuth $token")
                .header("User-Agent", "Chronos/1.0")
                .header("Host", "login.yandex.ru")
                .retrieve()
                .onStatus({ it.is4xxClientError }) { clientResponse ->
                    println("❌ 4xx ошибка: ${clientResponse.statusCode()}")
                    clientResponse.bodyToMono<String>().map { body ->
                        println("❌ Тело ответа: $body")
                        RuntimeException("Client error: ${clientResponse.statusCode()}")
                    }
                }
                .onStatus({ it.is5xxServerError }) { clientResponse ->
                    println("❌ 5xx ошибка: ${clientResponse.statusCode()}")
                    clientResponse.bodyToMono<String>().map { body ->
                        println("❌ Тело ответа: $body")
                        RuntimeException("Server error: ${clientResponse.statusCode()}")
                    }
                }
                .bodyToMono<YandexUserInfo>()
                .block(java.time.Duration.ofSeconds(10))
            
            println("✅ Получена информация от Яндекса:")
            println("   - ID: ${response?.id}")
            println("   - Login: ${response?.login}")
            println("   - Default Email: ${response?.default_email}")
            println("   - Display Name: ${response?.display_name}")
            println("   - Real Name: ${response?.real_name}")
            println("   - Avatar ID: ${response?.default_avatar_id}")
            println("   - Emails: ${response?.emails}")
            response
        } catch (e: Exception) {
            println("❌ Ошибка запроса к Яндекс API:")
            println("   - Тип: ${e.javaClass.simpleName}")
            println("   - Сообщение: ${e.message}")
            println("   - Причина: ${e.cause?.message}")
            e.printStackTrace()
            
            // Пробуем fallback через IP адрес
            println("🔄 Пробуем fallback через IP адрес...")
            try {
                val client = webClient.build()
                val responseByIp = client
                    .get()
                    .uri("https://87.250.254.120/info")
                    .header("Authorization", "OAuth $token")
                    .header("User-Agent", "Chronos/1.0")
                    .header("Host", "login.yandex.ru")
                    .retrieve()
                    .bodyToMono<YandexUserInfo>()
                    .block(java.time.Duration.ofSeconds(10))
                
                println("✅ Fallback успешен! Получена информация от Яндекса через IP:")
                println("   - ID: ${responseByIp?.id}")
                println("   - Login: ${responseByIp?.login}")
                responseByIp
            } catch (fallbackException: Exception) {
                println("❌ Fallback тоже не сработал: ${fallbackException.message}")
                null
            }
        }
    }
    
    /**
     * Создать тестового пользователя для разработки
     */
    private fun createTestUser(): User {
        val testYandexId = "12345"
        val testEmail = "test@yandex.ru"
        
        val existingUser = userRepository.findByYandexId(testYandexId)
        
        return if (existingUser != null) {
            existingUser
        } else {
            val newUser = User(
                yandexId = testYandexId,
                email = testEmail,
                name = "Тестовый Пользователь",
                avatarUrl = null
            )
            
            userRepository.save(newUser)
        }
    }
    
    /**
     * Построить URL аватара из ID
     */
    private fun buildAvatarUrl(avatarId: String?): String? {
        return if (avatarId != null) {
            "https://avatars.yandex.net/get-yapic/$avatarId/islands-200"
        } else {
            null
        }
    }
    
    /**
     * Найти пользователя по ID
     */
    fun findById(userId: UUID): User? {
        return userRepository.findById(userId).orElse(null)
    }
    
    /**
     * Найти пользователя по Yandex ID
     */
    fun findByYandexId(yandexId: String): User? {
        return userRepository.findByYandexId(yandexId)
    }
}

/**
 * DTO для ответа от Yandex API
 * 
 * ОБЪЯСНЕНИЕ: Яндекс возвращает JSON с информацией о пользователе.
 * Мы создаем data class чтобы автоматически мапить JSON в Kotlin объект.
 * 
 * ВАЖНО: Поля могут быть null, если пользователь не предоставил данные
 */
data class YandexUserInfo(
    val id: String,                    // Уникальный ID пользователя в Яндексе
    val login: String,                 // Логин пользователя
    val default_email: String?,        // Email по умолчанию (может быть null!)
    val display_name: String?,         // Отображаемое имя
    val real_name: String?,            // Настоящее имя
    val default_avatar_id: String?,    // ID аватара для построения URL
    val emails: List<String>?          // Список всех email (альтернативный источник)
)