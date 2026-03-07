package com.chronos.repository

import com.chronos.entity.Feedback
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface FeedbackRepository : JpaRepository<Feedback, UUID> {
    fun findByUserId(userId: UUID): List<Feedback>
}
