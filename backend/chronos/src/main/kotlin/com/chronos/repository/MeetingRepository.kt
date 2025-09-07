package com.chronos.repository

import com.chronos.entity.Meeting
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface MeetingRepository : JpaRepository<Meeting, UUID> {
    fun findByShareToken(shareToken: String): Meeting?
}