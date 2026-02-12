package com.chronos.repository

import com.chronos.entity.Vote
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface VoteRepository : JpaRepository<Vote, UUID> {
    fun findByMeetingId(meetingId: UUID): List<Vote>
    fun findByParticipantIdAndMeetingId(participantId: UUID, meetingId: UUID): Vote?
    fun deleteByParticipantIdAndMeetingId(participantId: UUID, meetingId: UUID)
}
