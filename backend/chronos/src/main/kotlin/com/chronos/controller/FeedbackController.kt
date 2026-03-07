package com.chronos.controller

import com.chronos.security.SecurityUtils
import com.chronos.service.FeedbackService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/feedback")
class FeedbackController(
    private val feedbackService: FeedbackService
) {

    @PostMapping
    fun submitFeedback(@RequestBody request: FeedbackRequest): ResponseEntity<Unit> {
        val user = SecurityUtils.requireCurrentUser()
        val message = request.message.trim()
        if (message.isBlank()) {
            return ResponseEntity.badRequest().build()
        }
        feedbackService.submitFeedback(
            userId = user.id,
            phoneNumber = request.phoneNumber,
            message = message
        )
        return ResponseEntity.status(HttpStatus.CREATED).build()
    }
}

data class FeedbackRequest(
    val phoneNumber: String? = null,
    val message: String
)
