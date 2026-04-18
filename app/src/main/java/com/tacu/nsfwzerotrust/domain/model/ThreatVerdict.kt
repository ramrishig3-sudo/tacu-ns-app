package com.tacu.nsfwzerotrust.domain.model

data class ThreatVerdict(
    val action: FirewallAction,
    val confidence: Int,
    val source: String,
    val reason: String
)
