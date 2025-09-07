package com.chronos.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.*

@Entity
@Table(name = "availabilities")
data class Availability(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: UUID = UUID.randomUUID(),
    
    @Column(name = "participant_id", nullable = false)
    val participantId: UUID,
    
    @Column(name = "meeting_id", nullable = false)
    val meetingId: UUID,
    
    @Column(nullable = false)
    val date: LocalDate,
    
    @Column(name = "time_from")
    val timeFrom: LocalTime? = null,
    
    @Column(name = "time_to")
    val timeTo: LocalTime? = null,
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
) {
    constructor() : this(
        participantId = UUID.randomUUID(),
        meetingId = UUID.randomUUID(),
        date = LocalDate.now()
    )
}