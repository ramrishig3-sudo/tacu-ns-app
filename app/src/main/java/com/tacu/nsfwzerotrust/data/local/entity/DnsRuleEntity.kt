package com.tacu.nsfwzerotrust.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "dns_rules")
data class DnsRuleEntity(
    @PrimaryKey val domain: String,
    val action: String,
    val enabled: Boolean
)
