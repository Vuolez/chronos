package com.chronos.controller

import com.chronos.api.AvailabilityApi
import com.chronos.dto.AvailabilityResponse
import com.chronos.dto.UpdateAvailabilityRequest
import com.chronos.security.SecurityUtils
import com.chronos.service.AvailabilityService
import com.chronos.service.ParticipantService
import org.openapitools.jackson.nullable.JsonNullable
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity

import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.LocalTime
import java.util.*

@RestController
class AvailabilityController(
    private val availabilityService: AvailabilityService,
    private val participantService: ParticipantService
) : AvailabilityApi {

    override fun updateParticipantAvailability(
        meetingId: UUID,
        participantId: UUID,
        updateAvailabilityRequest: UpdateAvailabilityRequest
    ): ResponseEntity<AvailabilityResponse> {
        // Получаем текущего пользователя
        val currentUser = SecurityUtils.getCurrentUser()
        
        // Проверяем права доступа - пользователь может изменять только свою доступность
        if (!participantService.canUserModifyParticipant(participantId, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
        
        val availability = availabilityService.addAvailability(
            participantId = participantId,
            meetingId = meetingId,
            date = updateAvailabilityRequest.date,
            timeFrom = updateAvailabilityRequest.timeFrom?.let { LocalTime.parse(it) },
            timeTo = updateAvailabilityRequest.timeTo?.let { LocalTime.parse(it) }
        ) ?: return ResponseEntity.notFound().build()

        val response = convertToAvailabilityResponse(availability)
        return ResponseEntity.ok(response)
    }

    override fun getAvailabilityByMeetingId(meetingId: UUID): ResponseEntity<List<AvailabilityResponse>> {
        val availabilities = availabilityService.getAvailabilitiesByMeetingId(meetingId)
        val response = availabilities.map(::convertToAvailabilityResponse)
        return ResponseEntity.ok(response)
    }

    override fun getCommonAvailableDates(meetingId: UUID): ResponseEntity<List<LocalDate>> {
        val commonDates = availabilityService.getCommonAvailableDates(meetingId)
        return ResponseEntity.ok(commonDates)
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
}