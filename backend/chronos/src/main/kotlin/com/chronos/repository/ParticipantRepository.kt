package com.chronos.repository

import com.chronos.entity.Participant
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ParticipantRepository : JpaRepository<Participant, UUID> {
    
    /**
     * Найти всех участников встречи
     */
    fun findByMeetingId(meetingId: UUID): List<Participant>
    
    /**
     * Найти участника по встрече и имени (для гостей)
     */
    fun findByMeetingIdAndName(meetingId: UUID, name: String): Participant?
    
    /**
     * Найти участника по встрече и пользователю (для авторизованных)
     */
    fun findByMeetingIdAndUserId(meetingId: UUID, userId: UUID): Participant?
    
    /**
     * Найти все встречи где участвует пользователь
     */
    fun findByUserId(userId: UUID): List<Participant>
    
    /**
     * Проверить, участвует ли пользователь в встрече
     */
    fun existsByMeetingIdAndUserId(meetingId: UUID, userId: UUID): Boolean
}