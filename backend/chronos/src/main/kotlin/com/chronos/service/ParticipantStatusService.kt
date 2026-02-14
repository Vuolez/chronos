package com.chronos.service

import com.chronos.entity.ParticipantStatus
import com.chronos.repository.AvailabilityRepository
import com.chronos.repository.ParticipantRepository
import com.chronos.repository.VoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

/**
 * Единая точка перерасчёта статусов участников.
 * Вызывается после любого изменения, влияющего на статус (добавление/удаление доступности, голосование).
 */
@Service
@Transactional
class ParticipantStatusService(
    private val participantRepository: ParticipantRepository,
    private val availabilityRepository: AvailabilityRepository,
    private val voteRepository: VoteRepository
) {

    /**
     * Пересчитывает статусы всех участников встречи на основе текущих данных:
     * - THINKING: нет выбранных дат
     * - CHOOSEN_DATE: выбрал хотя бы одну дату, но не проголосовал за финальную (или голос за невалидную дату)
     * - VOTED: выбрал даты и проголосовал за дату из commonDates
     */
    fun recalculateParticipantStatuses(meetingId: UUID) {
        val participants = participantRepository.findByMeetingId(meetingId)
        if (participants.isEmpty()) return

        val participantCount = participants.size.toLong()
        val commonDates = availabilityRepository.findCommonDates(meetingId, participantCount).toSet()

        for (participant in participants) {
            val availabilities = availabilityRepository.findByParticipantId(participant.id)
            val vote = voteRepository.findByParticipantIdAndMeetingId(participant.id, meetingId)

            val newStatus = when {
                availabilities.isEmpty() -> ParticipantStatus.THINKING
                vote != null && vote.votedDate in commonDates -> ParticipantStatus.VOTED
                else -> ParticipantStatus.CHOOSEN_DATE
            }

            if (participant.status != newStatus) {
                participant.status = newStatus
                participantRepository.save(participant)
            }
        }
    }
}
