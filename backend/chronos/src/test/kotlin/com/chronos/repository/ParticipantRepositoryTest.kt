package com.chronos.repository

import com.chronos.entity.Meeting
import com.chronos.entity.Participant
import com.chronos.entity.ParticipantStatus
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import java.util.*

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ParticipantRepositoryTest {

    @Autowired
    private lateinit var participantRepository: ParticipantRepository
    
    @Autowired
    private lateinit var meetingRepository: MeetingRepository

    @Test
    fun `should save and retrieve participant`() {
        // Given
        val meeting = meetingRepository.save(Meeting(
            title = "Test Meeting",
            shareToken = "token-${UUID.randomUUID()}"
        ))
        
        val participant = Participant(
            meetingId = meeting.id,
            name = "John Doe",
            status = ParticipantStatus.THINKING
        )

        // When
        val savedParticipant = participantRepository.save(participant)

        // Then
        assert(savedParticipant.id != null)
        
        val foundParticipant = participantRepository.findById(savedParticipant.id)
        assert(foundParticipant.isPresent)
        assert(foundParticipant.get().name == "John Doe")
        assert(foundParticipant.get().meetingId == meeting.id)
        assert(foundParticipant.get().status == ParticipantStatus.THINKING)
    }

    @Test
    fun `should find participants by meeting id`() {
        // Given
        val meeting = meetingRepository.save(Meeting(
            title = "Test Meeting",
            shareToken = "token-${UUID.randomUUID()}"
        ))
        
        participantRepository.save(Participant(meetingId = meeting.id, name = "Alice"))
        participantRepository.save(Participant(meetingId = meeting.id, name = "Bob"))

        // When
        val participants = participantRepository.findByMeetingId(meeting.id)

        // Then
        assert(participants.size == 2)
        assert(participants.any { it.name == "Alice" })
        assert(participants.any { it.name == "Bob" })
    }
}