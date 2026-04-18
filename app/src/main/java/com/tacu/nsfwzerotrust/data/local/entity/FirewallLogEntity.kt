package com.tacu.nsfwzerotrust.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "firewall_logs")
data class FirewallLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long,
    val appName: String,
    val packageName: String,
    val host: String?,
    val action: String,
    val source: String,
    val reason: String
)
