package com.chronos.repository

import com.chronos.entity.Meeting
import com.chronos.entity.MeetingStatus
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import java.util.*

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class MeetingRepositoryTest {

    @Autowired
    private lateinit var meetingRepository: MeetingRepository

    @Test
    fun `should save and retrieve meeting`() {
        // Given
        val meeting = Meeting(
            title = "Team Meeting",
            description = "Weekly team sync",
            shareToken = "test-token-${UUID.randomUUID()}",
            status = MeetingStatus.PLANNING
        )

        // When
        val savedMeeting = meetingRepository.save(meeting)

        // Then
        assert(savedMeeting.id != null)
        
        val foundMeeting = meetingRepository.findById(savedMeeting.id)
        assert(foundMeeting.isPresent)
        assert(foundMeeting.get().title == "Team Meeting")
        assert(foundMeeting.get().description == "Weekly team sync")
        assert(foundMeeting.get().status == MeetingStatus.PLANNING)
    }

    @Test
    fun `should find meeting by share token`() {
        // Given
        val shareToken = "unique-token-${UUID.randomUUID()}"
        val meeting = Meeting(
            title = "Test Meeting",
            shareToken = shareToken
        )
        meetingRepository.save(meeting)

        // When
        val foundMeeting = meetingRepository.findByShareToken(shareToken)

        // Then
        assert(foundMeeting != null)
        assert(foundMeeting!!.title == "Test Meeting")
        assert(foundMeeting.shareToken == shareToken)
    }
}