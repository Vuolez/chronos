package com.chronos.service

import com.chronos.entity.Feedback
import com.chronos.repository.FeedbackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
@Transactional
class FeedbackService(
    private val feedbackRepository: FeedbackRepository
) {
    fun submitFeedback(userId: UUID, phoneNumber: String?, message: String): Feedback {
        val feedback = Feedback(
            userId = userId,
            phoneNumber = phoneNumber?.takeIf { it.isNotBlank() },
            message = message.trim()
        )
        return feedbackRepository.save(feedback)
    }
}
