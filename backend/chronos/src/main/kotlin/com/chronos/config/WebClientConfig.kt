// Конфигурация HTTP клиента для внешних API
// WebClient = современная альтернатива RestTemplate в Spring

package com.chronos.config

import io.netty.channel.ChannelOption
import io.netty.handler.timeout.ReadTimeoutHandler
import io.netty.handler.timeout.WriteTimeoutHandler
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.concurrent.TimeUnit

/**
 * Конфигурация WebClient для HTTP запросов
 * 
 * ЗАЧЕМ:
 * WebClient используется для отправки HTTP запросов к внешним API
 * В нашем случае - к Yandex API для проверки токенов
 * 
 * @Bean означает что Spring создаст этот объект и будет
 * автоматически подставлять его везде где он нужен (Dependency Injection)
 */
@Configuration
class WebClientConfig {
    
    /**
     * Создаем WebClient.Builder как Bean
     * 
     * Builder Pattern позволяет настраивать HTTP клиент
     * перед использованием (таймауты, заголовки и т.д.)
     */
    @Bean
    fun webClientBuilder(): WebClient.Builder {
        // Настраиваем HTTP клиент с таймаутами и DNS настройками
        val httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000) // 10 секунд на подключение
            .responseTimeout(Duration.ofSeconds(15)) // 15 секунд на ответ
            .doOnConnected { conn ->
                conn.addHandlerLast(ReadTimeoutHandler(15, TimeUnit.SECONDS))
                conn.addHandlerLast(WriteTimeoutHandler(10, TimeUnit.SECONDS))
            }
            // Дополнительные настройки для лучшей совместимости
            .keepAlive(true)
            .compress(true)
        
        return WebClient.builder()
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .codecs { configurer ->
                // Увеличиваем лимит размера ответа (по умолчанию 256KB)
                configurer.defaultCodecs().maxInMemorySize(1024 * 1024) // 1MB
            }
    }
}