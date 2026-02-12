package com.chronos.controller

import com.chronos.api.MeetingsApi
import com.chronos.dto.*
import com.chronos.security.SecurityUtils
import com.chronos.service.AvailabilityService
import com.chronos.service.MeetingService
import com.chronos.service.ParticipantService
import com.chronos.service.UserService
import org.openapitools.jackson.nullable.JsonNullable
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.*

@RestController
class MeetingController(
    private val meetingService: MeetingService,
    private val participantService: ParticipantService,
    private val availabilityService: AvailabilityService,
    private val userService: UserService
) : MeetingsApi {

    override fun createMeeting(createMeetingRequest: CreateMeetingRequest): ResponseEntity<MeetingResponse> {
        // Получаем текущего авторизованного пользователя
        val currentUser = SecurityUtils.getCurrentUser()
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        
        val meeting = meetingService.createMeeting(
            title = createMeetingRequest.title,
            description = createMeetingRequest.description,
            createdByUserId = currentUser.id
        )
        
        val response = convertToMeetingResponse(meeting)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    override fun getMeetingById(meetingId: UUID): ResponseEntity<MeetingDetailResponse> {
        val meeting = meetingService.getMeetingById(meetingId)
            ?: return ResponseEntity.notFound().build()

        val participants = participantService.getParticipantsByMeetingId(meetingId)
        val availabilities = availabilityService.getAvailabilitiesByMeetingId(meetingId)
        val commonDates = availabilityService.getCommonAvailableDates(meetingId)

        val response = MeetingDetailResponse().apply {
            this.meeting = convertToMeetingResponse(meeting)
            this.participants = participants.map(::convertToParticipantResponse)
            this.availabilities = availabilities.map(::convertToAvailabilityResponse)
            this.commonAvailableDates = commonDates
        }

        return ResponseEntity.ok(response)
    }

    override fun getMeetingByShareToken(shareToken: String): ResponseEntity<MeetingDetailResponse> {
        val meeting = meetingService.getMeetingByShareToken(shareToken)
            ?: return ResponseEntity.notFound().build()

        val participants = participantService.getParticipantsByMeetingId(meeting.id)
        val availabilities = availabilityService.getAvailabilitiesByMeetingId(meeting.id)
        val commonDates = availabilityService.getCommonAvailableDates(meeting.id)

        val response = MeetingDetailResponse().apply {
            this.meeting = convertToMeetingResponse(meeting)
            this.participants = participants.map(::convertToParticipantResponse)
            this.availabilities = availabilities.map(::convertToAvailabilityResponse)
            this.commonAvailableDates = commonDates
        }

        return ResponseEntity.ok(response)
    }

    private fun convertToMeetingResponse(meeting: com.chronos.entity.Meeting): MeetingResponse {
        val creator = meeting.createdByUserId?.let { meetingService.getMeetingCreator(meeting.id) }
        
        return MeetingResponse()
            .id(meeting.id)
            .title(meeting.title)
            .description(meeting.description)
            .shareToken(meeting.shareToken)
            .status(com.chronos.dto.MeetingStatus.valueOf(meeting.status.name))
            .finalDate(meeting.finalDate)
            .finalTime(meeting.finalTime?.toString())
            .createdBy(creator?.let { convertToUserInfo(it) })
            .createdAt(meeting.createdAt)
            .updatedAt(meeting.updatedAt)
    }

    private fun convertToParticipantResponse(participant: com.chronos.entity.Participant): ParticipantResponse {
        val user = participantService.getParticipantUser(participant.id)
        
        return ParticipantResponse()
            .id(participant.id)
            .meetingId(participant.meetingId)
            .name(participant.name)
            .email(participant.email)
            .status(com.chronos.dto.ParticipantStatus.valueOf(participant.status.name))
            .user(user?.let { convertToUserInfo(it) })
            .isAuthenticated(user != null)
            .joinedAt(participant.joinedAt)
    }

    private fun convertToAvailabilityResponse(availability: com.chronos.entity.Availability): AvailabilityResponse {
        return AvailabilityResponse()
            .id(availability.id)
            .participantId(availability.participantId)
            .meetingId(availability.meetingId)
            .date(availability.date)
            .timeFrom(availability.timeFrom?.toString())
            .timeTo(availability.timeTo?.toString())
            .createdAt(availability.createdAt)
    }
    
    private fun convertToUserInfo(user: com.chronos.entity.User): com.chronos.dto.UserInfo {
        return com.chronos.dto.UserInfo()
            .id(user.id)
            .email(user.email)
            .name(user.name)
            .avatarUrl(user.avatarUrl?.let { java.net.URI.create(it) })
    }
    
    /**
     * Получение списка встреч текущего пользователя
     */
    @GetMapping("/meetings/my")
    fun getMyMeetings(): ResponseEntity<List<MeetingResponse>> {
        val currentUser = SecurityUtils.getCurrentUser()
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        
        val meetings = meetingService.getMeetingsForUser(currentUser.id)
        val response = meetings.map { convertToMeetingResponse(it) }
        return ResponseEntity.ok(response)
    }
    
    /**
     * Выход текущего пользователя из встречи
     */
    @PostMapping("/meetings/{meetingId}/leave")
    fun leaveMeeting(@PathVariable meetingId: UUID): ResponseEntity<Void> {
        val currentUser = SecurityUtils.getCurrentUser()
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        
        val success = participantService.leaveMeeting(meetingId, currentUser.id)
        return if (success) {
            ResponseEntity.ok().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }
    
    override fun checkUserParticipation(meetingId: UUID): ResponseEntity<ParticipationInfo> {
        val currentUser = SecurityUtils.getCurrentUser()
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val isParticipant = meetingService.isUserParticipant(meetingId, currentUser.id)
        
        val participant = if (isParticipant) {
            meetingService.getUserParticipant(meetingId, currentUser.id)?.let { 
                convertToParticipantResponse(it) 
            }
        } else null

        val response = ParticipationInfo()
            .isParticipant(isParticipant)
            .participant(participant)

        return ResponseEntity.ok(response)
    }
}