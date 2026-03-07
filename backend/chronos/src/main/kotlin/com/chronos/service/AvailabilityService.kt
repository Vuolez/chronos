package com.chronos.service

import com.chronos.entity.Availability
import com.chronos.repository.AvailabilityRepository
import com.chronos.util.AvailabilityFilterUtils
import com.chronos.util.TimeSlotsUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime
import java.util.*

@Service
@Transactional
class AvailabilityService(
    private val availabilityRepository: AvailabilityRepository,
    private val participantService: ParticipantService,
    private val participantStatusService: ParticipantStatusService
) {
    
    /**
     * Добавление/обновление доступности участника для конкретной даты (upsert)
     */
    fun addAvailability(
        participantId: UUID,
        meetingId: UUID,
        date: LocalDate,
        timeSlots: List<Int>? = emptyList()
    ): Availability? {
        // Проверяем, что участник принадлежит встрече
        if (!participantService.isParticipantInMeeting(participantId, meetingId)) {
            return null
        }
        
        val timeSlotsMask = TimeSlotsUtils.listToBitSet(timeSlots)
        val existing = availabilityRepository.findByParticipantIdAndMeetingIdAndDate(participantId, meetingId, date)
        val availability = if (existing != null) {
            existing.timeSlots = timeSlotsMask
            existing
        } else {
            Availability(
                participantId = participantId,
                meetingId = meetingId,
                date = date,
                timeSlots = timeSlotsMask
            )
        }
        
        val savedAvailability = availabilityRepository.save(availability)
        participantStatusService.recalculateParticipantStatuses(meetingId)
        return savedAvailability
    }
    
    /**
     * Получение всех доступностей для встречи
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByMeetingId(meetingId: UUID): List<Availability> {
        return availabilityRepository.findByMeetingId(meetingId)
    }
    
    /**
     * Получение доступностей участника
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByParticipantId(participantId: UUID): List<Availability> {
        return availabilityRepository.findByParticipantId(participantId)
    }
    
    /**
     * Получение доступностей для конкретной даты встречи
     */
    @Transactional(readOnly = true)
    fun getAvailabilitiesByMeetingAndDate(meetingId: UUID, date: LocalDate): List<Availability> {
        return availabilityRepository.findByMeetingIdAndDate(meetingId, date)
    }
    
    /**
     * Получение дат, которые подходят всем участникам
     */
    @Transactional(readOnly = true)
    fun getCommonAvailableDates(meetingId: UUID): List<CommonTimeSlots> {
        val participants = participantService.getParticipantsByMeetingId(meetingId)
        val participantCount = participants.size.toLong()
        
        if (participantCount == 0L) {
            return emptyList()
        }
        
        val availabilities = availabilityRepository.findAvailabilitiesWithCommonDates(meetingId, participantCount)
        val filtered = AvailabilityFilterUtils.filterByIntersectingTimeSlots(availabilities)
        return findCommonTimeSlots(filtered)
    }
    
    class CommonTimeSlots(
        val date: LocalDate,
        val startTime: LocalTime,
        val endTime: LocalTime
    )

    fun findCommonTimeSlots(availabilities: List<Availability>): List<CommonTimeSlots> {
        val fullDay = BitSet(TimeSlotsUtils.SLOT_COUNT).apply { set(0, TimeSlotsUtils.SLOT_COUNT) }

        return availabilities.groupBy { it.date }
            .mapNotNull { (date, list) ->
                val effective = list.map { it.timeSlots ?: fullDay }
                val intersection = effective.reduce { acc, next ->
                    (acc.clone() as BitSet).apply { and(next) }
                }
                if (intersection.isEmpty) null else date to intersection
            }
            .flatMap { (date, bitSet) ->
                findContinuousRanges(bitSet).map { (startSlot, endSlot) ->
                    CommonTimeSlots(
                        date = date,
                        startTime = TimeSlotsUtils.slotToStartTime(startSlot),
                        endTime = TimeSlotsUtils.slotToStartTime(endSlot) // конец отображения = начало последнего слота (без лишнего слота)
                    )
                }
            }
    }

    /** Находит непрерывные диапазоны слотов в BitSet. Возвращает пары (startSlot, endSlot) включительно. */
    private fun findContinuousRanges(bitSet: BitSet): List<Pair<Int, Int>> {
        val ranges = mutableListOf<Pair<Int, Int>>()
        var i = bitSet.nextSetBit(0)
        while (i >= 0) {
            val start = i
            while (i < TimeSlotsUtils.SLOT_COUNT && bitSet[i]) i++
            ranges.add(start to i - 1)
            i = bitSet.nextSetBit(i)
        }
        return ranges
    }

    /**
     * Удаление доступности участника для конкретной даты
     */
    fun removeAvailability(participantId: UUID, meetingId: UUID, date: LocalDate): Boolean {
        val availabilities = availabilityRepository.findByMeetingIdAndDate(meetingId, date)
        val availabilityToRemove = availabilities.find { it.participantId == participantId }
        
        return if (availabilityToRemove != null) {
            availabilityRepository.delete(availabilityToRemove)
            participantStatusService.recalculateParticipantStatuses(meetingId)
            true
        } else {
            false
        }
    }
}