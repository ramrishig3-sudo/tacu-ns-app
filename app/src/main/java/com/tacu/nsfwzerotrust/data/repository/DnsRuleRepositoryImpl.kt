package com.tacu.nsfwzerotrust.data.repository

import androidx.lifecycle.LiveData
import androidx.lifecycle.map
import com.tacu.nsfwzerotrust.data.local.dao.DnsRuleDao
import com.tacu.nsfwzerotrust.data.local.entity.DnsRuleEntity
import com.tacu.nsfwzerotrust.domain.model.DnsRule
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.repository.DnsRuleRepository

class DnsRuleRepositoryImpl(
    private val dao: DnsRuleDao
) : DnsRuleRepository {
    override fun observeRules(): LiveData<List<DnsRule>> {
        return dao.observeAll().map { list ->
            list.map {
                DnsRule(
                    domain = it.domain,
                    action = FirewallAction.valueOf(it.action),
                    enabled = it.enabled
                )
            }
        }
    }

    override suspend fun getEnabledRules(): List<DnsRule> {
        return dao.getEnabledRules().map {
            DnsRule(
                domain = it.domain,
                action = FirewallAction.valueOf(it.action),
                enabled = it.enabled
            )
        }
    }

    override suspend fun upsert(rule: DnsRule) {
        dao.upsert(
            DnsRuleEntity(
                domain = rule.domain,
                action = rule.action.name,
                enabled = rule.enabled
            )
        )
    }

    override suspend fun delete(domain: String) {
        dao.delete(domain)
    }
}
