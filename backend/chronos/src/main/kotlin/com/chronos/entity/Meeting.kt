package com.chronos.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.*

@Entity
@Table(name = "meetings")
data class Meeting(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false)
    var title: String,
    
    @Column(columnDefinition = "TEXT")
    var description: String? = null,
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: MeetingStatus = MeetingStatus.PLANNING,
    
    @Column(name = "final_date")
    var finalDate: LocalDate? = null,
    
    @Column(name = "final_time")
    var finalTime: LocalTime? = null,
    
    @Column(name = "share_token", unique = true, nullable = false)
    val shareToken: String,
    
    @Column(name = "created_by_user_id")
    val createdByUserId: UUID?
) {
    constructor() : this(
        title = "",
        shareToken = "",
        createdByUserId = null
    )
}

enum class MeetingStatus {
    PLANNING, VOTING, COMPLETED
}