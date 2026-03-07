package com.chronos.converter

import org.hibernate.type.SqlTypes
import org.hibernate.type.descriptor.WrapperOptions
import org.hibernate.type.descriptor.jdbc.BasicBinder
import org.hibernate.type.descriptor.jdbc.BasicExtractor
import org.hibernate.type.descriptor.jdbc.JdbcType
import org.postgresql.util.PGobject
import java.sql.CallableStatement
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

/**
 * JdbcType для PostgreSQL bit(96).
 * Использует PGobject с type="bit" и setObject(..., Types.OTHER),
 * чтобы драйвер не конвертировал в bytea.
 */
class PostgreSQLBit96JdbcType : JdbcType {

    override fun getJdbcTypeCode(): Int = SqlTypes.OTHER

    override fun <X> getBinder(javaType: org.hibernate.type.descriptor.java.JavaType<X>): org.hibernate.type.descriptor.ValueBinder<X> {
        return object : BasicBinder<X>(javaType, this) {
            override fun doBind(st: PreparedStatement, value: X, index: Int, options: WrapperOptions) {
                val str = javaType.unwrap(value, String::class.java, options)
                if (str == null) {
                    st.setNull(index, Types.OTHER)
                } else {
                    val pg = PGobject().apply {
                        type = "bit"
                        this.value = str
                    }
                    st.setObject(index, pg, Types.OTHER)
                }
            }

            override fun doBind(st: CallableStatement, value: X, name: String, options: WrapperOptions) {
                val str = javaType.unwrap(value, String::class.java, options)
                if (str == null) {
                    st.setNull(name, Types.OTHER)
                } else {
                    val pg = PGobject().apply {
                        type = "bit"
                        this.value = str
                    }
                    st.setObject(name, pg, Types.OTHER)
                }
            }
        }
    }

    override fun <X> getExtractor(javaType: org.hibernate.type.descriptor.java.JavaType<X>): org.hibernate.type.descriptor.ValueExtractor<X> {
        return object : BasicExtractor<X>(javaType, this) {
            override fun doExtract(rs: ResultSet, index: Int, options: WrapperOptions): X {
                val value = rs.getString(index)
                return javaType.wrap(value, options)
            }

            override fun doExtract(cs: CallableStatement, index: Int, options: WrapperOptions): X {
                val value = cs.getString(index)
                return javaType.wrap(value, options)
            }

            override fun doExtract(cs: CallableStatement, name: String, options: WrapperOptions): X {
                val value = cs.getString(name)
                return javaType.wrap(value, options)
            }
        }
    }
}
