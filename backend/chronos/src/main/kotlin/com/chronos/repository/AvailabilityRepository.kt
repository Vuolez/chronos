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
    fun findByParticipantIdAndMeetingIdAndDate(participantId: UUID, meetingId: UUID, date: LocalDate): Availability?

    @Query(value = """
        SELECT a.*
        FROM availabilities a
        WHERE a.meeting_id = :meetingId
          AND a.date IN (
            SELECT date
            FROM availabilities
            WHERE meeting_id = :meetingId
            GROUP BY date
            HAVING COUNT(DISTINCT participant_id) = :participantCount
          )
        ORDER BY a.date, a.participant_id
        """, nativeQuery = true)
    fun findAvailabilitiesWithCommonDates(meetingId: UUID, participantCount: Long): List<Availability>

    fun deleteByParticipantId(participantId: UUID)
    
    fun deleteByMeetingId(meetingId: UUID)
}