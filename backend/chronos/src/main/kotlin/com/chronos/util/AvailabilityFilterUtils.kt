package com.chronos.util

import com.chronos.entity.Availability
import java.util.BitSet

/**
 * Утилита для фильтрации availabilities по пересечению time_slots.
 * Возвращает только те availabilities, чьи даты имеют пересечение слотов у всех участников.
 */
object AvailabilityFilterUtils {

    /**
     * Фильтрует availabilities, оставляя только дни с пересекающимися time_slots.
     * null timeSlots трактуется как "весь день" (все 48 слотов).
     */
    fun filterByIntersectingTimeSlots(availabilities: List<Availability>): List<Availability> {
        val fullDay = BitSet(TimeSlotsUtils.SLOT_COUNT).apply { set(0, TimeSlotsUtils.SLOT_COUNT) }

        val datesWithIntersection = availabilities.groupBy { it.date }
            .filter { (_, list) ->
                val effective = list.map { it.timeSlots ?: fullDay }
                val intersection = effective.reduce { acc, next ->
                    (acc.clone() as BitSet).apply { and(next) }
                }
                !intersection.isEmpty
            }
            .keys

        return availabilities.filter { it.date in datesWithIntersection }
    }
}
