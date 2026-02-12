package com.chronos.service

import com.chronos.entity.Participant
import com.chronos.entity.ParticipantStatus
import com.chronos.entity.User
import com.chronos.repository.AvailabilityRepository
import com.chronos.repository.MeetingRepository
import com.chronos.repository.ParticipantRepository
import com.chronos.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
@Transactional
class ParticipantService(
    private val participantRepository: ParticipantRepository,
    private val meetingService: MeetingService,
    private val userRepository: UserRepository,
    private val availabilityRepository: AvailabilityRepository,
    private val meetingRepository: MeetingRepository
) {
    
    /**
     * Добавление участника к встрече с поддержкой авторизации
     */
    fun addParticipant(meetingId: UUID, name: String, email: String? = null, currentUser: User? = null): Participant? {
        // Проверяем, что встреча существует
        meetingService.getMeetingById(meetingId) ?: return null
        
        // Определяем userId для участника
        val userId = when {
            // Если пользователь авторизован и email совпадает с его email
            currentUser != null && email != null && currentUser.email == email -> currentUser.id
            // Если пользователь авторизован, но не указал email - добавляем себя
            currentUser != null && email == null -> currentUser.id
            // Во всех остальных случаях - гость (userId = null)
            else -> null
        }
        
        // Проверки на дублирование
        if (userId != null) {
            // Для авторизованных пользователей - проверяем по userId
            val existingByUser = participantRepository.findByMeetingIdAndUserId(meetingId, userId)
            if (existingByUser != null) {
                println("ℹ️ Пользователь уже участвует в встрече, возвращаем существующего участника: ${existingByUser.name}")
                return existingByUser // Возвращаем существующего участника вместо ошибки
            }
        } else {
            // Для гостей - проверяем по имени
            val existingByName = participantRepository.findByMeetingIdAndName(meetingId, name)
            if (existingByName != null) {
                throw IllegalArgumentException("Участник с именем '$name' уже добавлен к встрече")
            }
        }
        
        val participant = Participant(
            meetingId = meetingId,
            userId = userId,
            name = name,
            email = email,
            status = ParticipantStatus.THINKING
        )
        
        return participantRepository.save(participant)
    }
    
    /**
     * Получение участника по ID
     */
    @Transactional(readOnly = true)
    fun getParticipantById(id: UUID): Participant? {
        return participantRepository.findById(id).orElse(null)
    }
    
    /**
     * Получение всех участников встречи
     */
    @Transactional(readOnly = true)
    fun getParticipantsByMeetingId(meetingId: UUID): List<Participant> {
        return participantRepository.findByMeetingId(meetingId)
    }
    
    /**
     * Обновление статуса участника
     */
    fun updateParticipantStatus(participantId: UUID, status: ParticipantStatus): Participant? {
        val participant = getParticipantById(participantId) ?: return null
        
        participant.status = status
        return participantRepository.save(participant)
    }
    
    /**
     * Проверка, что участник принадлежит к указанной встрече
     */
    @Transactional(readOnly = true)
    fun isParticipantInMeeting(participantId: UUID, meetingId: UUID): Boolean {
        val participant = getParticipantById(participantId) ?: return false
        return participant.meetingId == meetingId
    }
    
    /**
     * Получение пользователя участника (если авторизован)
     */
    @Transactional(readOnly = true)
    fun getParticipantUser(participantId: UUID): User? {
        val participant = getParticipantById(participantId) ?: return null
        return participant.userId?.let { userId ->
            userRepository.findById(userId).orElse(null)
        }
    }
    
    /**
     * Проверка, может ли пользователь изменять доступность участника
     */
    fun canUserModifyParticipant(participantId: UUID, currentUser: User?): Boolean {
        val participant = getParticipantById(participantId) ?: return false
        
        // Если пользователь не авторизован - может изменять только гостевых участников
        if (currentUser == null) {
            return participant.userId == null
        }
        
        // Авторизованный пользователь может изменять только своих участников
        return participant.userId == currentUser.id
    }
    
    /**
     * Выход пользователя из встречи
     * Удаляет участника и его доступности.
     * Если это был последний участник — удаляет встречу целиком.
     */
    fun leaveMeeting(meetingId: UUID, userId: UUID): Boolean {
        val participant = participantRepository.findByMeetingIdAndUserId(meetingId, userId)
            ?: return false
        
        // Удаляем доступности участника
        availabilityRepository.deleteByParticipantId(participant.id)
        
        // Удаляем самого участника
        participantRepository.delete(participant)
        
        // Если участников не осталось — удаляем встречу
        val remaining = participantRepository.findByMeetingId(meetingId)
        if (remaining.isEmpty()) {
            // Удаляем оставшиеся доступности встречи (на всякий случай)
            availabilityRepository.deleteByMeetingId(meetingId)
            meetingRepository.deleteById(meetingId)
            println("🗑️ Встреча $meetingId удалена — не осталось участников")
        }
        
        return true
    }
}