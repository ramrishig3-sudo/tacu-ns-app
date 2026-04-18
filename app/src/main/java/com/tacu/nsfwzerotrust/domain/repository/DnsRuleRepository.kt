package com.tacu.nsfwzerotrust.domain.repository

import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.DnsRule

interface DnsRuleRepository {
    fun observeRules(): LiveData<List<DnsRule>>
    suspend fun getEnabledRules(): List<DnsRule>
    suspend fun upsert(rule: DnsRule)
    suspend fun delete(domain: String)
}
