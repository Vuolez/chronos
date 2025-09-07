// Сервис для работы с JWT токенами
// JWT = JSON Web Token - способ безопасно передавать информацию между клиентом и сервером

package com.chronos.service

import com.chronos.entity.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.security.Key
import java.util.*
import javax.crypto.SecretKey

/**
 * Сервис для создания и проверки JWT токенов
 * 
 * JWT - ЧТО ЭТО:
 * 1. JSON Web Token = строка из 3 частей: header.payload.signature
 * 2. Header: информация о типе токена и алгоритме
 * 3. Payload: данные (в нашем случае - ID пользователя, email)
 * 4. Signature: подпись для проверки подлинности
 * 
 * ЗАЧЕМ:
 * - Клиент получает токен один раз при авторизации
 * - При каждом запросе отправляет токен в заголовке Authorization
 * - Сервер проверяет подпись и извлекает данные пользователя
 */
@Service
class JwtService {
    
    // Секретный ключ для подписи токенов (из application.yml)
    @Value("\${jwt.secret:default-secret-key-change-in-production}")
    private lateinit var secretKey: String
    
    // Время жизни токена в миллисекундах (24 часа)
    @Value("\${jwt.expiration:86400000}")
    private var jwtExpiration: Long = 86400000
    
    /**
     * Создать JWT токен для пользователя
     * 
     * ЧТО КЛАДЕМ В ТОКЕН:
     * - subject (sub): ID пользователя
     * - email: email пользователя
     * - name: имя пользователя
     * - issued at: когда создан
     * - expiration: когда истекает
     */
    fun generateToken(user: User): String {
        val claims = mapOf(
            "email" to user.email,
            "name" to user.name,
            "userId" to user.id.toString()
        )
        
        return createToken(claims, user.id.toString())
    }
    
    /**
     * Создать токен с указанными claims (данными)
     */
    private fun createToken(claims: Map<String, Any>, subject: String): String {
        return Jwts.builder()
            .setClaims(claims)                           // Добавляем данные пользователя
            .setSubject(subject)                         // Основной идентификатор (user ID)
            .setIssuedAt(Date(System.currentTimeMillis()))  // Когда создан
            .setExpiration(Date(System.currentTimeMillis() + jwtExpiration))  // Когда истекает
            .signWith(getSignInKey(), SignatureAlgorithm.HS256)  // Подписываем секретным ключом
            .compact()                                   // Превращаем в строку
    }
    
    /**
     * Извлечь ID пользователя из токена
     */
    fun extractUserId(token: String): UUID? {
        return try {
            val claims = extractAllClaims(token)
            UUID.fromString(claims.subject)
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Извлечь email из токена
     */
    fun extractEmail(token: String): String? {
        return try {
            val claims = extractAllClaims(token)
            claims["email"] as String?
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Проверить, валидный ли токен
     * 
     * ПРОВЕРКИ:
     * 1. Подпись корректная (не подделан)
     * 2. Токен не истек
     * 3. Формат корректный
     */
    fun isTokenValid(token: String): Boolean {
        return try {
            extractAllClaims(token)
            !isTokenExpired(token)
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Проверить, истек ли токен
     */
    private fun isTokenExpired(token: String): Boolean {
        return extractExpiration(token).before(Date())
    }
    
    /**
     * Извлечь дату истечения из токена
     */
    private fun extractExpiration(token: String): Date {
        return extractAllClaims(token).expiration
    }
    
    /**
     * Извлечь все данные (claims) из токена
     * 
     * ЧТО ПРОИСХОДИТ:
     * 1. Парсим токен используя секретный ключ
     * 2. Если подпись неверная - будет исключение
     * 3. Если все ОК - получаем данные
     */
    private fun extractAllClaims(token: String): Claims {
        return Jwts.parserBuilder()
            .setSigningKey(getSignInKey())
            .build()
            .parseClaimsJws(token)
            .body
    }
    
    /**
     * Получить ключ для подписи токенов
     */
    private fun getSignInKey(): Key {
        val keyBytes = secretKey.toByteArray()
        return Keys.hmacShaKeyFor(keyBytes)
    }
}