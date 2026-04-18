package com.tacu.nsfwzerotrust.data.repository

import androidx.lifecycle.LiveData
import androidx.lifecycle.map
import com.tacu.nsfwzerotrust.data.local.dao.FirewallLogDao
import com.tacu.nsfwzerotrust.data.local.entity.FirewallLogEntity
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.FirewallLog
import com.tacu.nsfwzerotrust.domain.repository.FirewallLogRepository
import com.tacu.nsfwzerotrust.domain.repository.FirewallSummary

class FirewallLogRepositoryImpl(
    private val dao: FirewallLogDao
) : FirewallLogRepository {
    override fun observeLogs(): LiveData<List<FirewallLog>> {
        return dao.observeAll().map { list -> list.map { it.toDomain() } }
    }

    override fun observeSummary(): LiveData<FirewallSummary> {
        return dao.observeAll().map { logs ->
            FirewallSummary(
                allowedCount = logs.count { it.action == FirewallAction.ALLOW.name },
                blockedCount = logs.count { it.action == FirewallAction.BLOCK.name },
                totalCount = logs.size
            )
        }
    }

    override suspend fun add(log: FirewallLog) {
        dao.insert(
            FirewallLogEntity(
                timestamp = log.timestamp,
                appName = log.appName,
                packageName = log.packageName,
                host = log.host,
                action = log.action.name,
                source = log.source,
                reason = log.reason
            )
        )
    }

    override suspend fun clear() {
        dao.clear()
    }

    private fun FirewallLogEntity.toDomain(): FirewallLog {
        return FirewallLog(
            id = id,
            timestamp = timestamp,
            appName = appName,
            packageName = packageName,
            host = host,
            action = FirewallAction.valueOf(action),
            source = source,
            reason = reason
        )
    }
}
