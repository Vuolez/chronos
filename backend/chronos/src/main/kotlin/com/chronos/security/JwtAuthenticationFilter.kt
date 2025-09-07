// JWT фильтр для автоматической проверки токенов
// Это "охранник" который проверяет каждый HTTP запрос

package com.chronos.security

import com.chronos.service.JwtService
import com.chronos.service.UserService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * JWT фильтр авторизации
 * 
 * ЧТО ЭТО ДЕЛАЕТ:
 * 1. Каждый HTTP запрос проходит через этот фильтр
 * 2. Извлекаем JWT токен из заголовка Authorization
 * 3. Проверяем токен и находим пользователя
 * 4. Если все OK - сохраняем пользователя в Security Context
 * 5. Дальше контроллер может получить текущего пользователя
 * 
 * OncePerRequestFilter = Spring гарантирует что фильтр выполнится 
 * только один раз на каждый запрос
 */
@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val userService: UserService
) : OncePerRequestFilter() {

    /**
     * Основной метод фильтра - выполняется для каждого HTTP запроса
     * 
     * @param request HTTP запрос
     * @param response HTTP ответ  
     * @param filterChain цепочка следующих фильтров
     */
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Извлекаем заголовок Authorization
        val authHeader = request.getHeader("Authorization")
        
        // Проверяем формат заголовка: "Bearer TOKEN"
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Нет токена - пропускаем дальше (может быть публичный endpoint)
            filterChain.doFilter(request, response)
            return
        }
        
        // Извлекаем JWT токен (убираем "Bearer " в начале)
        val jwt = authHeader.substring(7)
        
        try {
            // Извлекаем ID пользователя из токена
            val userId = jwtService.extractUserId(jwt)
            
            // Проверяем что токен валидный и пользователь еще не авторизован
            if (userId != null && SecurityContextHolder.getContext().authentication == null) {
                
                // Ищем пользователя в БД
                val user = userService.findById(userId)
                
                if (user != null && jwtService.isTokenValid(jwt)) {
                    // Создаем UserDetails для Spring Security
                    val userDetails = ChronosUserDetails(user)
                    
                    // Создаем токен авторизации для Spring Security
                    val authToken = UsernamePasswordAuthenticationToken(
                        userDetails,        // Principal - основная информация о пользователе
                        null,              // Credentials - пароли (у нас их нет, токен уже проверен)
                        userDetails.authorities  // Authorities - права пользователя
                    )
                    
                    // Добавляем детали о запросе (IP, session и т.д.)
                    authToken.details = WebAuthenticationDetailsSource().buildDetails(request)
                    
                    // ВАЖНО: Сохраняем авторизацию в Security Context
                    // Теперь Spring Security знает что пользователь авторизован
                    SecurityContextHolder.getContext().authentication = authToken
                }
            }
        } catch (e: Exception) {
            // Если что-то пошло не так с токеном - просто игнорируем
            // Пользователь останется неавторизованным
            logger.debug("JWT token processing failed", e)
        }
        
        // Передаем управление следующему фильтру в цепочке
        filterChain.doFilter(request, response)
    }
}