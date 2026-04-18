package com.tacu.nsfwzerotrust.domain.model

data class AppRule(
    val packageName: String,
    val appLabel: String,
    val action: FirewallAction,
    val enabled: Boolean
)
