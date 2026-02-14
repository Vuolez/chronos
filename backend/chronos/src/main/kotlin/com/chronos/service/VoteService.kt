package com.chronos.service

import com.chronos.entity.Vote
import com.chronos.repository.VoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.*

@Service
@Transactional
class VoteService(
    private val voteRepository: VoteRepository,
    private val participantStatusService: ParticipantStatusService
) {

    /**
     * Голосование участника за финальную дату.
     * Если у участника уже есть голос — удаляет старый и создает новый (upsert).
     * У одного участника может быть только один голос на встречу.
     */
    fun castVote(participantId: UUID, meetingId: UUID, date: LocalDate): Vote {
        // Удаляем предыдущий голос (если был)
        voteRepository.deleteByParticipantIdAndMeetingId(participantId, meetingId)

        val vote = Vote(
            participantId = participantId,
            meetingId = meetingId,
            votedDate = date
        )
        val saved = voteRepository.save(vote)
        participantStatusService.recalculateParticipantStatuses(meetingId)
        return saved
    }

    /**
     * Удаление голоса участника (отмена выбора)
     */
    fun removeVote(participantId: UUID, meetingId: UUID): Boolean {
        val existing = voteRepository.findByParticipantIdAndMeetingId(participantId, meetingId)
        return if (existing != null) {
            voteRepository.delete(existing)
            participantStatusService.recalculateParticipantStatuses(meetingId)
            true
        } else {
            false
        }
    }

    /**
     * Получение всех голосов для встречи
     */
    @Transactional(readOnly = true)
    fun getVotesByMeetingId(meetingId: UUID): List<Vote> {
        return voteRepository.findByMeetingId(meetingId)
    }

    /**
     * Получение голоса конкретного участника
     */
    @Transactional(readOnly = true)
    fun getVoteByParticipant(participantId: UUID, meetingId: UUID): Vote? {
        return voteRepository.findByParticipantIdAndMeetingId(participantId, meetingId)
    }
}
