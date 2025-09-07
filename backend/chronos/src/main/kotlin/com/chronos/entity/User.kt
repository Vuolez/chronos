// Сущность пользователя для авторизованных через Яндекс
// Хранит данные полученные от Yandex OAuth

package com.chronos.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: UUID = UUID.randomUUID(),
    
    @Column(name = "yandex_id", nullable = false, unique = true)
    val yandexId: String,
    
    @Column(nullable = false, unique = true)
    var email: String,
    
    @Column(nullable = false)
    var name: String,
    
    @Column(name = "avatar_url")
    var avatarUrl: String? = null,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
    
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)