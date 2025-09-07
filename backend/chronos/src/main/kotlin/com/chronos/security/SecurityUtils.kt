// Утилиты для работы с текущим пользователем в Security Context
// Упрощает получение информации об авторизованном пользователе

package com.chronos.security

import com.chronos.entity.User
import org.springframework.security.core.context.SecurityContextHolder
import java.util.*

/**
 * Утилиты для работы с Spring Security Context
 * 
 * ЗАЧЕМ ЭТО НУЖНО:
 * После того как JWT фильтр обработал токен и сохранил пользователя
 * в SecurityContext, контроллерам нужен удобный способ получить
 * информацию о текущем авторизованном пользователе.
 * 
 * ЭТИ ФУНКЦИИ РАБОТАЮТ ТОЛЬКО ПОСЛЕ АВТОРИЗАЦИИ!
 */
object SecurityUtils {
    
    /**
     * Получить текущего авторизованного пользователя
     * 
     * @return User если пользователь авторизован, null если нет
     */
    fun getCurrentUser(): User? {
        val authentication = SecurityContextHolder.getContext().authentication
        
        // Проверяем что пользователь авторизован
        if (authentication == null || !authentication.isAuthenticated) {
            return null
        }
        
        // Проверяем что это наш ChronosUserDetails
        val principal = authentication.principal
        if (principal is ChronosUserDetails) {
            return principal.getUser()
        }
        
        return null
    }
    
    /**
     * Получить ID текущего авторизованного пользователя
     * 
     * @return UUID пользователя или null если не авторизован
     */
    fun getCurrentUserId(): UUID? {
        return getCurrentUser()?.id
    }
    
    /**
     * Получить email текущего авторизованного пользователя
     * 
     * @return email пользователя или null если не авторизован
     */
    fun getCurrentUserEmail(): String? {
        return getCurrentUser()?.email
    }
    
    /**
     * Проверить, авторизован ли пользователь
     * 
     * @return true если пользователь авторизован
     */
    fun isAuthenticated(): Boolean {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication != null && authentication.isAuthenticated && authentication.principal is ChronosUserDetails
    }
    
    /**
     * Получить текущего пользователя или выбросить исключение
     * 
     * ИСПОЛЬЗУЕТСЯ когда мы уверены что пользователь должен быть авторизован
     * (например, в защищенных endpoints)
     * 
     * @return User
     * @throws IllegalStateException если пользователь не авторизован
     */
    fun requireCurrentUser(): User {
        return getCurrentUser() 
            ?: throw IllegalStateException("Пользователь не авторизован")
    }
    
    /**
     * Получить ID текущего пользователя или выбросить исключение
     * 
     * @return UUID пользователя
     * @throws IllegalStateException если пользователь не авторизован
     */
    fun requireCurrentUserId(): UUID {
        return requireCurrentUser().id
    }
}