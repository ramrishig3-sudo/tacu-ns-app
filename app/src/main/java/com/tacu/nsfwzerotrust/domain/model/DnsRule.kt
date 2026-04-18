package com.tacu.nsfwzerotrust.domain.model

data class DnsRule(
    val domain: String,
    val action: FirewallAction,
    val enabled: Boolean
)
