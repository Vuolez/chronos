package com.chronos.service

import com.chronos.entity.Availability
import com.chronos.entity.Meeting
import com.chronos.entity.Participant
import com.chronos.entity.ParticipantStatus
import com.chronos.entity.Vote
import com.chronos.repository.AvailabilityRepository
import com.chronos.repository.MeetingRepository
import com.chronos.repository.ParticipantRepository
import com.chronos.repository.VoteRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.*

@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Transactional
class ParticipantStatusServiceTest {

    @Autowired
    private lateinit var participantStatusService: ParticipantStatusService

    @Autowired
    private lateinit var meetingRepository: MeetingRepository

    @Autowired
    private lateinit var participantRepository: ParticipantRepository

    @Autowired
    private lateinit var availabilityRepository: AvailabilityRepository

    @Autowired
    private lateinit var voteRepository: VoteRepository

    private lateinit var meeting: Meeting
    private lateinit var participant1: Participant
    private lateinit var participant2: Participant

    @BeforeEach
    fun setUp() {
        meeting = meetingRepository.save(Meeting(
            title = "Test Meeting",
            shareToken = "token-${UUID.randomUUID()}"
        ))
        participant1 = participantRepository.save(Participant(
            meetingId = meeting.id,
            name = "Alice",
            status = ParticipantStatus.THINKING
        ))
        participant2 = participantRepository.save(Participant(
            meetingId = meeting.id,
            name = "Bob",
            status = ParticipantStatus.THINKING
        ))
    }

    @Test
    fun `recalculate should set THINKING when no availabilities`() {
        participantStatusService.recalculateParticipantStatuses(meeting.id)

        val p1 = participantRepository.findById(participant1.id).get()
        val p2 = participantRepository.findById(participant2.id).get()
        assertEquals(ParticipantStatus.THINKING, p1.status)
        assertEquals(ParticipantStatus.THINKING, p2.status)
    }

    @Test
    fun `recalculate should set CHOOSEN_DATE when participant has availabilities but no vote`() {
        availabilityRepository.save(Availability(
            participantId = participant1.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 15)
        ))

        participantStatusService.recalculateParticipantStatuses(meeting.id)

        val p1 = participantRepository.findById(participant1.id).get()
        assertEquals(ParticipantStatus.CHOOSEN_DATE, p1.status)
    }

    @Test
    fun `recalculate should set VOTED when participant has availabilities and valid vote for common date`() {
        val commonDate = LocalDate.of(2024, 3, 15)
        availabilityRepository.save(Availability(
            participantId = participant1.id,
            meetingId = meeting.id,
            date = commonDate
        ))
        availabilityRepository.save(Availability(
            participantId = participant2.id,
            meetingId = meeting.id,
            date = commonDate
        ))
        voteRepository.save(Vote(
            participantId = participant1.id,
            meetingId = meeting.id,
            votedDate = commonDate
        ))

        participantStatusService.recalculateParticipantStatuses(meeting.id)

        val p1 = participantRepository.findById(participant1.id).get()
        assertEquals(ParticipantStatus.VOTED, p1.status)
    }

    @Test
    fun `recalculate should set CHOOSEN_DATE when vote is for date not in common dates`() {
        availabilityRepository.save(Availability(
            participantId = participant1.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 15)
        ))
        voteRepository.save(Vote(
            participantId = participant1.id,
            meetingId = meeting.id,
            votedDate = LocalDate.of(2024, 3, 20) // not common - only p1 has it
        ))

        participantStatusService.recalculateParticipantStatuses(meeting.id)

        val p1 = participantRepository.findById(participant1.id).get()
        assertEquals(ParticipantStatus.CHOOSEN_DATE, p1.status)
    }

    @Test
    fun `recalculate should set THINKING when participant removes all availabilities`() {
        val avail = availabilityRepository.save(Availability(
            participantId = participant1.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 15)
        ))
        participantStatusService.recalculateParticipantStatuses(meeting.id)
        assertEquals(ParticipantStatus.CHOOSEN_DATE, participantRepository.findById(participant1.id).get().status)

        availabilityRepository.delete(avail)
        participantStatusService.recalculateParticipantStatuses(meeting.id)

        val p1 = participantRepository.findById(participant1.id).get()
        assertEquals(ParticipantStatus.THINKING, p1.status)
    }
}
