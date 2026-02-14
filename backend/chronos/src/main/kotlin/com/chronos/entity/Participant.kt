package com.chronos.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "participants")
data class Participant(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: UUID = UUID.randomUUID(),
    
    @Column(name = "meeting_id", nullable = false)
    val meetingId: UUID,
    
    @Column(name = "user_id", nullable = true)
    val userId: UUID? = null,  // Связь с авторизованным пользователем (nullable для гостей)
    
    @Column(nullable = false)
    var name: String,
    
    @Column(nullable = true)
    var email: String? = null,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ParticipantStatus = ParticipantStatus.THINKING,
    
    @CreationTimestamp
    @Column(name = "joined_at", nullable = false)
    val joinedAt: LocalDateTime = LocalDateTime.now()
) {
    constructor() : this(
        meetingId = UUID.randomUUID(),
        userId = null,
        name = "",
        email = null
    )
}

enum class ParticipantStatus {
    THINKING,      // нет выбранных дат
    CHOOSEN_DATE,  // выбрал хотя бы одну дату
    VOTED          // проголосовал за финальную дату
}