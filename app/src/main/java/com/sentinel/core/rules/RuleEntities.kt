package com.sentinel.core.rules

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "firewall_rules")
data class FirewallRule(
    @PrimaryKey val domain: String,
    val uid: Int, // The Android UID of the app
    val packageName: String,
    val isBlocked: Boolean = true,
    val source: String = "USER", // USER, VACCINE, HEURISTIC
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "app_policies")
data class AppPolicy(
    @PrimaryKey val uid: Int,
    val packageName: String,
    val wifiBlocked: Boolean = false,
    val cellBlocked: Boolean = false
)

@Entity(tableName = "domain_reputations")
data class DomainReputation(
    @PrimaryKey val domain: String,
    val threatScore: Int, // 0-100 (0=Safe, 100=Malicious)
    val lastUpdated: Long = System.currentTimeMillis(),
    val verdict: String = "UNKNOWN" // SAFE, SUSPICIOUS, MALICIOUS
)

