package com.chronos.service

import com.chronos.entity.Meeting
import com.chronos.entity.MeetingStatus
import com.chronos.entity.User
import com.chronos.entity.Participant
import com.chronos.entity.ParticipantStatus
import com.chronos.repository.MeetingRepository
import com.chronos.repository.UserRepository
import com.chronos.repository.ParticipantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
@Transactional
class MeetingService(
    private val meetingRepository: MeetingRepository,
    private val userRepository: UserRepository,
    private val participantRepository: ParticipantRepository
) {
    
    /**
     * Создание новой встречи авторизованным пользователем
     * Автоматически добавляет создателя как участника
     */
    fun createMeeting(title: String, description: String? = null, createdByUserId: UUID): Meeting {
        val shareToken = generateShareToken()
        
        // Создаем встречу
        val meeting = Meeting(
            title = title,
            description = description,
            shareToken = shareToken,
            status = MeetingStatus.PLANNING,
            createdByUserId = createdByUserId
        )
        
        val savedMeeting = meetingRepository.save(meeting)
        
        // Автоматически добавляем создателя как участника
        val creator = userRepository.findById(createdByUserId).orElse(null)
        if (creator != null) {
            val creatorParticipant = Participant(
                meetingId = savedMeeting.id,
                userId = creator.id,
                name = creator.name,
                email = creator.email,
                status = ParticipantStatus.THINKING
            )
            
            participantRepository.save(creatorParticipant)
            println("✅ Создатель встречи автоматически добавлен как участник: ${creator.name}")
        }
        
        return savedMeeting
    }
    
    /**
     * Получение встречи по ID
     */
    @Transactional(readOnly = true)
    fun getMeetingById(id: UUID): Meeting? {
        return meetingRepository.findById(id).orElse(null)
    }
    
    /**
     * Получение встречи по share token
     */
    @Transactional(readOnly = true)
    fun getMeetingByShareToken(shareToken: String): Meeting? {
        return meetingRepository.findByShareToken(shareToken)
    }
    
    /**
     * Обновление статуса встречи
     */
    fun updateMeetingStatus(meetingId: UUID, status: MeetingStatus): Meeting? {
        val meeting = getMeetingById(meetingId) ?: return null
        
        meeting.status = status
        return meetingRepository.save(meeting)
    }
    
    /**
     * Получение создателя встречи
     */
    @Transactional(readOnly = true)
    fun getMeetingCreator(meetingId: UUID): User? {
        val meeting = getMeetingById(meetingId) ?: return null
        return meeting.createdByUserId?.let { userId ->
            userRepository.findById(userId).orElse(null)
        }
    }
    
    /**
     * Проверка является ли пользователь участником встречи
     */
    @Transactional(readOnly = true)
    fun isUserParticipant(meetingId: UUID, userId: UUID): Boolean {
        return participantRepository.existsByMeetingIdAndUserId(meetingId, userId)
    }
    
    /**
     * Получение участника пользователя во встрече (если есть)
     */
    @Transactional(readOnly = true)
    fun getUserParticipant(meetingId: UUID, userId: UUID): Participant? {
        return participantRepository.findByMeetingIdAndUserId(meetingId, userId)
    }
    
    /**
     * Генерация уникального share token для встречи
     */
    private fun generateShareToken(): String {
        var token: String
        do {
            token = UUID.randomUUID().toString().replace("-", "").take(12)
        } while (meetingRepository.findByShareToken(token) != null)
        
        return token
    }
}