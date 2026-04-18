package com.tacu.nsfwzerotrust.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_rules")
data class AppRuleEntity(
    @PrimaryKey val packageName: String,
    val appLabel: String,
    val action: String,
    val enabled: Boolean
)
