package com.tacu.nsfwzerotrust.domain.model

data class TrafficEvent(
    val packageName: String,
    val appName: String,
    val host: String?,
    val protocol: Int,
    val source: String,
    val reason: String = "",
    val sessionKey: String
)
