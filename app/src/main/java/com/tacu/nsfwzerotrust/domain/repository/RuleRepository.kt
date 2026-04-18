package com.tacu.nsfwzerotrust.domain.repository

import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.AppRule
import com.tacu.nsfwzerotrust.domain.model.InstalledApp

interface RuleRepository {
    fun observeRules(): LiveData<List<AppRule>>
    suspend fun getRule(packageName: String): AppRule?
    suspend fun getInstalledAppsWithRules(): List<Pair<InstalledApp, AppRule?>>
    suspend fun upsert(rule: AppRule)
}
