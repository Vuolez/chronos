package com.chronos.converter

import com.chronos.util.TimeSlotsUtils
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter
import java.util.BitSet

/**
 * Конвертер BitSet? <-> String (48 символов '0'/'1') для PostgreSQL bit(48).
 * JdbcType PostgreSQLBit96JdbcType привязывает String к bit через PGobject.
 * null = время не выбрано
 * все 48 бит = 1 = весь день (слоты по 30 мин)
 * конкретные биты = выбранные слоты
 */
@Converter
class TimeSlotsBitConverter : AttributeConverter<BitSet?, String?> {

    override fun convertToDatabaseColumn(attribute: BitSet?): String? {
        if (attribute == null) return null
        return CharArray(TimeSlotsUtils.SLOT_COUNT) { i -> if (attribute[i]) '1' else '0' }.concatToString()
    }

    override fun convertToEntityAttribute(dbData: String?): BitSet? {
        if (dbData == null || dbData.length != TimeSlotsUtils.SLOT_COUNT) return null
        return BitSet(TimeSlotsUtils.SLOT_COUNT).apply {
            dbData.forEachIndexed { i, c -> if (c == '1') set(i) }
        }
    }
}
