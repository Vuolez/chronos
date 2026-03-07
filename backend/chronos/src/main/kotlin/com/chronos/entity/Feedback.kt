package com.chronos.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "feedback")
data class Feedback(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "phone_number", length = 50)
    var phoneNumber: String? = null,

    @Column(columnDefinition = "TEXT", nullable = false)
    var message: String,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
) {
    constructor() : this(
        userId = UUID.randomUUID(),
        message = ""
    )
}
