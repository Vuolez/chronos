package com.chronos.controller

import com.chronos.entity.Vote
import com.chronos.security.SecurityUtils
import com.chronos.service.ParticipantService
import com.chronos.service.VoteService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.*

/**
 * Контроллер голосования за финальную дату встречи
 */
@RestController
class VoteController(
    private val voteService: VoteService,
    private val participantService: ParticipantService
) {

    /**
     * Проголосовать за финальную дату (или изменить голос)
     * PUT /api/meetings/{meetingId}/participants/{participantId}/vote
     */
    @PutMapping("/meetings/{meetingId}/participants/{participantId}/vote")
    fun castVote(
        @PathVariable meetingId: UUID,
        @PathVariable participantId: UUID,
        @RequestBody request: CastVoteRequest
    ): ResponseEntity<VoteResponse> {
        val currentUser = SecurityUtils.getCurrentUser()

        // Проверяем права доступа
        if (!participantService.canUserModifyParticipant(participantId, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        val date = LocalDate.parse(request.date)
        val vote = voteService.castVote(participantId, meetingId, date)

        return ResponseEntity.ok(vote.toResponse())
    }

    /**
     * Удалить голос (отменить выбор)
     * DELETE /api/meetings/{meetingId}/participants/{participantId}/vote
     */
    @DeleteMapping("/meetings/{meetingId}/participants/{participantId}/vote")
    fun removeVote(
        @PathVariable meetingId: UUID,
        @PathVariable participantId: UUID
    ): ResponseEntity<Void> {
        val currentUser = SecurityUtils.getCurrentUser()

        if (!participantService.canUserModifyParticipant(participantId, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        val success = voteService.removeVote(participantId, meetingId)
        return if (success) {
            ResponseEntity.ok().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * Получить все голоса для встречи
     * GET /api/meetings/{meetingId}/votes
     */
    @GetMapping("/meetings/{meetingId}/votes")
    fun getVotes(@PathVariable meetingId: UUID): ResponseEntity<List<VoteResponse>> {
        val votes = voteService.getVotesByMeetingId(meetingId)
        return ResponseEntity.ok(votes.map { it.toResponse() })
    }

    private fun Vote.toResponse(): VoteResponse = VoteResponse(
        id = this.id,
        participantId = this.participantId,
        meetingId = this.meetingId,
        votedDate = this.votedDate.toString(),
        createdAt = this.createdAt.toString()
    )
}

/**
 * Request DTO для голосования
 */
data class CastVoteRequest(
    val date: String // ISO date string YYYY-MM-DD
)

/**
 * Response DTO для голоса
 */
data class VoteResponse(
    val id: UUID,
    val participantId: UUID,
    val meetingId: UUID,
    val votedDate: String,
    val createdAt: String
)
