package com.tacu.nsfwzerotrust.domain.repository

import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.FirewallLog

interface FirewallLogRepository {
    fun observeLogs(): LiveData<List<FirewallLog>>
    fun observeSummary(): LiveData<FirewallSummary>
    suspend fun add(log: FirewallLog)
    suspend fun clear()
}

data class FirewallSummary(
    val allowedCount: Int = 0,
    val blockedCount: Int = 0,
    val totalCount: Int = 0
)
