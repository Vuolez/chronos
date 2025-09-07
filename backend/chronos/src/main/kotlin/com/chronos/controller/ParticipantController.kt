package com.chronos.controller

import com.chronos.api.ParticipantsApi
import com.chronos.dto.AddParticipantRequest
import com.chronos.dto.ParticipantResponse
import com.chronos.dto.ParticipantStatus
import com.chronos.dto.UserInfo
import com.chronos.security.SecurityUtils
import com.chronos.service.ParticipantService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@CrossOrigin(origins = ["http://localhost:3000", "http://localhost:5173"], allowCredentials = "true")
class ParticipantController(
    private val participantService: ParticipantService
) : ParticipantsApi {

    override fun addParticipant(meetingId: UUID, addParticipantRequest: AddParticipantRequest): ResponseEntity<ParticipantResponse> {
        // Получаем текущего пользователя (может быть null для гостей)
        val currentUser = SecurityUtils.getCurrentUser()
        
        try {
            
            // Если пользователь авторизован и указал email, проверяем соответствие
            if (currentUser != null && addParticipantRequest.email != null) {
                println("🔍 ParticipantController: Сравниваем email:")
                println("   currentUser.email = '${currentUser.email}'")
                println("   request.email = '${addParticipantRequest.email}'")
                println("   Совпадают: ${currentUser.email == addParticipantRequest.email}")
                
                if (currentUser.email != addParticipantRequest.email) {
                    println("❌ ParticipantController: Email не совпадают - возвращаем 403")
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
                }
            }
            
            val participant = participantService.addParticipant(
                meetingId = meetingId,
                name = addParticipantRequest.name,
                email = addParticipantRequest.email,
                currentUser = currentUser
            ) ?: return ResponseEntity.notFound().build()

            val response = convertToParticipantResponse(participant)
            return ResponseEntity.status(HttpStatus.CREATED).body(response)
        } catch (e: IllegalArgumentException) {
            println("❌ ParticipantController: Ошибка добавления участника: ${e.message}")
            println("📋 Данные запроса: meetingId=$meetingId, name=${addParticipantRequest.name}, email=${addParticipantRequest.email}")
            println("👤 Текущий пользователь: ${currentUser?.name} (id=${currentUser?.id})")
            return ResponseEntity.badRequest().build()
        }
    }

    override fun getParticipantsByMeetingId(meetingId: UUID): ResponseEntity<List<ParticipantResponse>> {
        val participants = participantService.getParticipantsByMeetingId(meetingId)
        val response = participants.map(::convertToParticipantResponse)
        return ResponseEntity.ok(response)
    }

    private fun convertToParticipantResponse(participant: com.chronos.entity.Participant): ParticipantResponse {
        val user = participantService.getParticipantUser(participant.id)
        
        return ParticipantResponse()
            .id(participant.id)
            .meetingId(participant.meetingId)
            .name(participant.name)
            .email(participant.email)
            .status(ParticipantStatus.valueOf(participant.status.name))
            .user(user?.let { convertToUserInfo(it) })
            .isAuthenticated(user != null)
            .joinedAt(participant.joinedAt)
    }
    
    private fun convertToUserInfo(user: com.chronos.entity.User): UserInfo {
        return UserInfo()
            .id(user.id)
            .email(user.email)
            .name(user.name)
            .avatarUrl(user.avatarUrl?.let { java.net.URI.create(it) })
    }
}