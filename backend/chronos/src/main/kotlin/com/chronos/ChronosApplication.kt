package com.chronos

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ChronosApplication

fun main(args: Array<String>) {
    runApplication<ChronosApplication>(*args)
}