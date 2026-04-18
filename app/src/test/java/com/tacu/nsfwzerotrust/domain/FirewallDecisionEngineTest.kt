package com.tacu.nsfwzerotrust.domain

import androidx.lifecycle.MutableLiveData
import com.tacu.nsfwzerotrust.domain.model.AppRule
import com.tacu.nsfwzerotrust.domain.model.DnsRule
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.InstalledApp
import com.tacu.nsfwzerotrust.domain.model.TrafficEvent
import com.tacu.nsfwzerotrust.domain.repository.DnsRuleRepository
import com.tacu.nsfwzerotrust.domain.repository.RuleRepository
import com.tacu.nsfwzerotrust.domain.repository.SessionManager
import com.tacu.nsfwzerotrust.domain.service.ThreatIntelService
import com.tacu.nsfwzerotrust.domain.usecase.FirewallDecisionEngine
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class FirewallDecisionEngineTest {
    @Test
    fun `app allow rule returns allow`() = runBlocking {
        val engine = FirewallDecisionEngine(
            appRuleRepository = FakeRuleRepository(
                AppRule("pkg", "App", FirewallAction.ALLOW, true)
            ),
            dnsRuleRepository = FakeDnsRuleRepository(),
            sessionManager = FakeSessionManager(),
            threatIntelService = null
        )

        val result = engine.evaluate(sampleEvent())

        assertEquals(FirewallAction.ALLOW, result)
    }

    @Test
    fun `app block rule returns block`() = runBlocking {
        val engine = FirewallDecisionEngine(
            appRuleRepository = FakeRuleRepository(
                AppRule("pkg", "App", FirewallAction.BLOCK, true)
            ),
            dnsRuleRepository = FakeDnsRuleRepository(),
            sessionManager = FakeSessionManager(),
            threatIntelService = null
        )

        val result = engine.evaluate(sampleEvent())

        assertEquals(FirewallAction.BLOCK, result)
    }

    @Test
    fun `default path returns default when no rule exists`() = runBlocking {
        val engine = FirewallDecisionEngine(
            appRuleRepository = FakeRuleRepository(),
            dnsRuleRepository = FakeDnsRuleRepository(),
            sessionManager = FakeSessionManager(),
            threatIntelService = null
        )

        val result = engine.evaluate(sampleEvent())

        assertEquals(FirewallAction.DEFAULT, result)
    }

    @Test
    fun `dns block overrides app allow`() = runBlocking {
        val engine = FirewallDecisionEngine(
            appRuleRepository = FakeRuleRepository(
                AppRule("pkg", "App", FirewallAction.ALLOW, true)
            ),
            dnsRuleRepository = FakeDnsRuleRepository(
                DnsRule("blocked.example", FirewallAction.BLOCK, true)
            ),
            sessionManager = FakeSessionManager(),
            threatIntelService = null
        )

        val result = engine.evaluate(sampleEvent(host = "blocked.example"))

        assertEquals(FirewallAction.BLOCK, result)
    }

    private fun sampleEvent(host: String? = "safe.example"): TrafficEvent {
        return TrafficEvent(
            packageName = "pkg",
            appName = "App",
            host = host,
            protocol = 6,
            source = "VPN",
            sessionKey = "pkg|$host|6"
        )
    }
}

private class FakeRuleRepository(
    private val rule: AppRule? = null
) : RuleRepository {
    override fun observeRules() = MutableLiveData<List<AppRule>>(emptyList())
    override suspend fun getRule(packageName: String): AppRule? = rule
    override suspend fun getInstalledAppsWithRules(): List<Pair<InstalledApp, AppRule?>> = emptyList()
    override suspend fun upsert(rule: AppRule) = Unit
}

private class FakeDnsRuleRepository(
    private vararg val rules: DnsRule
) : DnsRuleRepository {
    override fun observeRules() = MutableLiveData<List<DnsRule>>(rules.toList())
    override suspend fun getEnabledRules(): List<DnsRule> = rules.toList()
    override suspend fun upsert(rule: DnsRule) = Unit
    override suspend fun delete(domain: String) = Unit
}

private class FakeSessionManager : SessionManager {
    private val map = mutableMapOf<String, com.tacu.nsfwzerotrust.domain.model.SessionEntry>()
    override fun findSession(key: String) = map[key]
    override fun storeSession(key: String, decisionValue: FirewallAction, expiryMillis: Long) {
        val now = System.currentTimeMillis()
        map[key] = com.tacu.nsfwzerotrust.domain.model.SessionEntry(key, decisionValue, now, now, now + expiryMillis)
    }
    override fun clearExpiredSessions(now: Long) = Unit
}
