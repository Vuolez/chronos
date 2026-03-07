package com.chronos.util

import java.time.LocalTime
import java.util.BitSet

object TimeSlotsUtils {
    const val SLOT_COUNT = 48
    const val SLOT_MINUTES = 30

    fun listToBitSet(list: List<Int>?): BitSet? {
        if (list == null) return null
        return when {
            list.isEmpty() -> BitSet(SLOT_COUNT).apply { set(0, SLOT_COUNT) } // весь день
            else -> BitSet(SLOT_COUNT).apply { list.filter { it in 0 until SLOT_COUNT }.forEach { set(it) } }
        }
    }

    fun bitSetToList(bitSet: BitSet?): List<Int>? {
        if (bitSet == null) return null
        if (bitSet.cardinality() == SLOT_COUNT) return emptyList() // весь день
        return (0 until SLOT_COUNT).filter { bitSet[it] }
    }

    /** Слот index -> LocalTime начала интервала (slot 0 = 00:00) */
    fun slotToStartTime(slotIndex: Int): LocalTime {
        val minutes = slotIndex * SLOT_MINUTES
        return LocalTime.of(minutes / 60, minutes % 60)
    }

    /** Слот index -> LocalTime конца интервала (slot 0 = 00:30). Слот 47 (23:30-24:00) -> 23:59, т.к. LocalTime не поддерживает 24:00. */
    fun slotToEndTime(slotIndex: Int): LocalTime {
        if (slotIndex >= SLOT_COUNT - 1) return LocalTime.of(23, 59)
        return slotToStartTime(slotIndex + 1)
    }
}
