package com.chronos.controller

import com.chronos.api.AvailabilityApi
import com.chronos.dto.AvailabilityResponse
import com.chronos.dto.UpdateAvailabilityRequest
import com.chronos.security.SecurityUtils
import com.chronos.service.AvailabilityService
import com.chronos.service.ParticipantService
import com.chronos.util.TimeSlotsUtils
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
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
        
        val timeSlots = updateAvailabilityRequest.timeSlots.orElse(null)
        val availability = availabilityService.addAvailability(
            participantId = participantId,
            meetingId = meetingId,
            date = updateAvailabilityRequest.date,
            timeSlots = timeSlots
        ) ?: return ResponseEntity.notFound().build()

        val response = convertToAvailabilityResponse(availability)
        return ResponseEntity.ok(response)
    }

    override fun getAvailabilityByMeetingId(meetingId: UUID): ResponseEntity<List<AvailabilityResponse>> {
        val availabilities = availabilityService.getAvailabilitiesByMeetingId(meetingId)
        val response = availabilities.map(::convertToAvailabilityResponse)
        return ResponseEntity.ok(response)
    }

    override fun getCommonAvailableDates(meetingId: UUID): ResponseEntity<List<com.chronos.dto.CommonTimeSlots>> {
        val commonTimeSlots = availabilityService.getCommonAvailableDates(meetingId)
        val dtos = commonTimeSlots.map {
            com.chronos.dto.CommonTimeSlots()
                .date(it.date)
                .startTime(it.startTime.toString())
                .endTime(it.endTime.toString())
        }
        return ResponseEntity.ok(dtos)
    }

    /**
     * Удаление доступности участника для конкретной даты
     */
    @DeleteMapping("/meetings/{meetingId}/participants/{participantId}/availability/{date}")
    fun removeAvailability(
        @PathVariable meetingId: UUID,
        @PathVariable participantId: UUID,
        @PathVariable date: String
    ): ResponseEntity<Void> {
        val currentUser = SecurityUtils.getCurrentUser()
        
        if (!participantService.canUserModifyParticipant(participantId, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
        
        val localDate = LocalDate.parse(date)
        val success = availabilityService.removeAvailability(participantId, meetingId, localDate)
        
        return if (success) {
            ResponseEntity.ok().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }
    
    private fun convertToAvailabilityResponse(availability: com.chronos.entity.Availability): AvailabilityResponse {
        return AvailabilityResponse()
            .id(availability.id)
            .participantId(availability.participantId)
            .meetingId(availability.meetingId)
            .date(availability.date)
            .timeSlots(TimeSlotsUtils.bitSetToList(availability.timeSlots))
            .createdAt(availability.createdAt)
    }
}