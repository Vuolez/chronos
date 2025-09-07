package com.chronos.repository

import com.chronos.entity.Availability
import com.chronos.entity.Meeting
import com.chronos.entity.Participant
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import java.util.*

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class AvailabilityRepositoryTest {

    @Autowired
    private lateinit var availabilityRepository: AvailabilityRepository
    
    @Autowired
    private lateinit var meetingRepository: MeetingRepository
    
    @Autowired
    private lateinit var participantRepository: ParticipantRepository

    @Test
    fun `should save and retrieve availability`() {
        // Given
        val meeting = meetingRepository.save(Meeting(
            title = "Test Meeting",
            shareToken = "token-${UUID.randomUUID()}"
        ))
        
        val participant = participantRepository.save(Participant(
            meetingId = meeting.id,
            name = "John Doe"
        ))
        
        val availability = Availability(
            participantId = participant.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 15)
        )

        // When
        val savedAvailability = availabilityRepository.save(availability)

        // Then
        assert(savedAvailability.id != null)
        
        val foundAvailability = availabilityRepository.findById(savedAvailability.id)
        assert(foundAvailability.isPresent)
        assert(foundAvailability.get().participantId == participant.id)
        assert(foundAvailability.get().meetingId == meeting.id)
        assert(foundAvailability.get().date == LocalDate.of(2024, 3, 15))
    }

    @Test
    fun `should find availabilities by meeting id`() {
        // Given
        val meeting = meetingRepository.save(Meeting(
            title = "Test Meeting",
            shareToken = "token-${UUID.randomUUID()}"
        ))
        
        val participant1 = participantRepository.save(Participant(meetingId = meeting.id, name = "Alice"))
        val participant2 = participantRepository.save(Participant(meetingId = meeting.id, name = "Bob"))
        
        availabilityRepository.save(Availability(
            participantId = participant1.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 15)
        ))
        availabilityRepository.save(Availability(
            participantId = participant2.id,
            meetingId = meeting.id,
            date = LocalDate.of(2024, 3, 16)
        ))

        // When
        val availabilities = availabilityRepository.findByMeetingId(meeting.id)

        // Then
        assert(availabilities.size == 2)
        assert(availabilities.any { it.participantId == participant1.id })
        assert(availabilities.any { it.participantId == participant2.id })
    }
}