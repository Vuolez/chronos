package com.chronos.repository

import com.chronos.entity.Availability
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.*

@Repository
interface AvailabilityRepository : JpaRepository<Availability, UUID> {
    fun findByMeetingId(meetingId: UUID): List<Availability>
    fun findByParticipantId(participantId: UUID): List<Availability>
    fun findByMeetingIdAndDate(meetingId: UUID, date: LocalDate): List<Availability>
    
    @Query("SELECT a.date FROM Availability a WHERE a.meetingId = :meetingId GROUP BY a.date HAVING COUNT(DISTINCT a.participantId) = :participantCount")
    fun findCommonDates(meetingId: UUID, participantCount: Long): List<LocalDate>
}