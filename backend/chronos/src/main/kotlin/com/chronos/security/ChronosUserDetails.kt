// Обертка для нашего User в Spring Security UserDetails
// Это мост между нашей моделью пользователя и Spring Security

package com.chronos.security

import com.chronos.entity.User
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

/**
 * Реализация UserDetails для нашего пользователя
 * 
 * ЗАЧЕМ ЭТО НУЖНО:
 * Spring Security не знает о нашей Entity User.
 * Он работает только с интерфейсом UserDetails.
 * Эта класс - адаптер между нашей моделью и Spring Security.
 * 
 * ВАЖНЫЕ МЕТОДЫ:
 * - getUsername() - уникальный идентификатор (у нас email)
 * - getAuthorities() - права пользователя (роли)
 * - isAccountNonExpired() - аккаунт действителен?
 * - isEnabled() - аккаунт активен?
 */
class ChronosUserDetails(
    private val user: User
) : UserDetails {
    
    /**
     * Возвращает уникальный идентификатор пользователя
     * В нашем случае - email
     */
    override fun getUsername(): String = user.email
    
    /**
     * Возвращает пароль
     * У нас нет паролей (авторизация через Яндекс), поэтому возвращаем пустую строку
     */
    override fun getPassword(): String = ""
    
    /**
     * Возвращает роли/права пользователя
     * 
     * ПОКА ЧТО УПРОЩЕННО:
     * У всех пользователей роль "USER"
     * В будущем можно добавить ADMIN, MODERATOR и т.д.
     */
    override fun getAuthorities(): Collection<GrantedAuthority> {
        return listOf(SimpleGrantedAuthority("ROLE_USER"))
    }
    
    /**
     * Аккаунт не заблокирован?
     * У нас пока нет механизма блокировки, всегда true
     */
    override fun isAccountNonLocked(): Boolean = true
    
    /**
     * Аккаунт не истек?
     * У нас пока нет механизма истечения аккаунтов, всегда true
     */
    override fun isAccountNonExpired(): Boolean = true
    
    /**
     * Учетные данные не истекли?
     * Мы проверяем это в JWT токене, здесь всегда true
     */
    override fun isCredentialsNonExpired(): Boolean = true
    
    /**
     * Аккаунт активен?
     * У нас пока нет механизма деактивации, всегда true
     */
    override fun isEnabled(): Boolean = true
    
    /**
     * Удобный метод для получения нашего объекта User
     * Позволяет контроллерам получить доступ к полной информации о пользователе
     */
    fun getUser(): User = user
}