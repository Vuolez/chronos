package com.chronos.service

import com.chronos.entity.Availability
import com.chronos.entity.ParticipantStatus
import com.chronos.repository.AvailabilityRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime
import java.util.*

@Service
@Transactional
class AvailabilityService(
    private val availabilityRepository: AvailabilityRepository,
    private val participantService: ParticipantService
) {
    
    /**
     * Добавление доступности участника для конкретной даты
     */
    fun addAvailability(
        participantId: UUID,
        meetingId: UUID,
        date: LocalDate,
        timeFrom: LocalTime? = null,
        timeTo: LocalTime? = null
    ): Availability? {
        // Проверяем, что участник принадлежит встрече
        if (!participantService.isParticipantInMeeting(participantId, meetingId)) {
            return null
        }
        
        val availability = Availability(
            participantId = participantId,
            meetingId = meetingId,
            date = date,
            timeFrom = timeFrom,
            timeTo = timeTo
        )
        
        val savedAvailability = availabilityRepository.save(availability)
        
        // Обновляем статус участника на "Проголосовал" после добавления доступности
        participantService.updateParticipantStatus(participantId, ParticipantStatus.VOTED)
        
        return savedAvailability
    }
    
    /**
     * Получение всех доступностей для встречи
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByMeetingId(meetingId: UUID): List<Availability> {
        return availabilityRepository.findByMeetingId(meetingId)
    }
    
    /**
     * Получение доступностей участника
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByParticipantId(participantId: UUID): List<Availability> {
        return availabilityRepository.findByParticipantId(participantId)
    }
    
    /**
     * Получение доступностей для конкретной даты встречи
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByMeetingAndDate(meetingId: UUID, date: LocalDate): List<Availability> {
        return availabilityRepository.findByMeetingIdAndDate(meetingId, date)
    }
    
    /**
     * Получение дат, которые подходят всем участникам
     */
    @Transactional(readOnly = true)
    fun getCommonAvailableDates(meetingId: UUID): List<LocalDate> {
        val participants = participantService.getParticipantsByMeetingId(meetingId)
        val participantCount = participants.size.toLong()
        
        if (participantCount == 0L) {
            return emptyList()
        }
        
        return availabilityRepository.findCommonDates(meetingId, participantCount)
    }
    
    /**
     * Удаление доступности участника для конкретной даты
     */
    fun removeAvailability(participantId: UUID, meetingId: UUID, date: LocalDate): Boolean {
        val availabilities = availabilityRepository.findByMeetingIdAndDate(meetingId, date)
        val availabilityToRemove = availabilities.find { it.participantId == participantId }
        
        return if (availabilityToRemove != null) {
            availabilityRepository.delete(availabilityToRemove)
            true
        } else {
            false
        }
    }
}