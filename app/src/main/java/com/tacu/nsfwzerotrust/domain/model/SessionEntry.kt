package com.tacu.nsfwzerotrust.domain.model

data class SessionEntry(
    val key: String,
    val decision: FirewallAction,
    val firstSeenAt: Long,
    val lastSeenAt: Long,
    val expiresAt: Long
)
