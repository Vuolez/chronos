// Репозиторий для работы с пользователями
// Поиск по yandexId и email для авторизации

package com.chronos.repository

import com.chronos.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    
    /**
     * Поиск пользователя по ID от Яндекса
     * Используется при авторизации через Yandex OAuth
     */
    fun findByYandexId(yandexId: String): User?
    
    /**
     * Поиск пользователя по email
     * Может использоваться для дополнительной валидации
     */
    fun findByEmail(email: String): User?
    
    /**
     * Проверка существования пользователя по yandexId
     */
    fun existsByYandexId(yandexId: String): Boolean
    
    /**
     * Проверка существования пользователя по email
     */
    fun existsByEmail(email: String): Boolean
}