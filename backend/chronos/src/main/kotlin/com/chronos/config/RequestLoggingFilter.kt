package com.chronos.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Фильтр для логирования входящих HTTP запросов.
 * Помогает отлаживать, почему запросы не видны в логах.
 */
@Component
class RequestLoggingFilter : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val method = request.method
        val uri = request.requestURI
        val queryString = request.queryString
        val path = if (queryString != null) "$uri?$queryString" else uri

        filterChain.doFilter(request, response)

        // Логируем все запросы — помогает отладить, почему 403 или запросы не видны
        val status = response.status
        if (status >= 400) {
            log.warn("📤 {} {} -> {} (ошибка)", method, path, status)
        } else {
            log.info("📥 {} {} -> {}", method, path, status)
        }
    }
}
