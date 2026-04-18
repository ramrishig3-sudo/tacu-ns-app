package com.tacu.nsfwzerotrust.domain.model

data class FirewallLog(
    val id: Long = 0,
    val timestamp: Long,
    val appName: String,
    val packageName: String,
    val host: String?,
    val action: FirewallAction,
    val source: String,
    val reason: String
)
