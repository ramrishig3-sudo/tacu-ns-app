package com.tacu.nsfwzerotrust.data.repository

import androidx.lifecycle.LiveData
import androidx.lifecycle.map
import com.tacu.nsfwzerotrust.data.local.dao.AppRuleDao
import com.tacu.nsfwzerotrust.data.local.entity.AppRuleEntity
import com.tacu.nsfwzerotrust.domain.model.AppRule
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.InstalledApp
import com.tacu.nsfwzerotrust.domain.repository.AppRegistry
import com.tacu.nsfwzerotrust.domain.repository.RuleRepository

class RuleRepositoryImpl(
    private val dao: AppRuleDao,
    private val appRegistry: AppRegistry
) : RuleRepository {
    override fun observeRules(): LiveData<List<AppRule>> {
        return dao.observeAll().map { list -> list.map { it.toDomain() } }
    }

    override suspend fun getRule(packageName: String): AppRule? {
        return dao.getByPackageName(packageName)?.toDomain()
    }

    override suspend fun getInstalledAppsWithRules(): List<Pair<InstalledApp, AppRule?>> {
        return appRegistry.getInstalledApps().map { app ->
            app to dao.getByPackageName(app.packageName)?.toDomain()
        }
    }

    override suspend fun upsert(rule: AppRule) {
        dao.upsert(rule.toEntity())
    }

    private fun AppRuleEntity.toDomain(): AppRule {
        return AppRule(
            packageName = packageName,
            appLabel = appLabel,
            action = FirewallAction.valueOf(action),
            enabled = enabled
        )
    }

    private fun AppRule.toEntity(): AppRuleEntity {
        return AppRuleEntity(
            packageName = packageName,
            appLabel = appLabel,
            action = action.name,
            enabled = enabled
        )
    }
}
