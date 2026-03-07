package com.chronos.entity

import com.chronos.converter.PostgreSQLBit96JdbcType
import com.chronos.converter.TimeSlotsBitConverter
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.*
import java.util.BitSet

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
    
    @Convert(converter = TimeSlotsBitConverter::class)
    @JdbcType(PostgreSQLBit96JdbcType::class)
    @Column(name = "time_slots", columnDefinition = "bit(48)")
    var timeSlots: BitSet? = null,
    
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