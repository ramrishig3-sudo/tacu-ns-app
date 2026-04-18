package com.tacu.nsfwzerotrust.domain.usecase

import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.TrafficEvent
import com.tacu.nsfwzerotrust.domain.repository.DnsRuleRepository
import com.tacu.nsfwzerotrust.domain.repository.RuleRepository
import com.tacu.nsfwzerotrust.domain.repository.SessionManager
import com.tacu.nsfwzerotrust.domain.service.ThreatIntelService

class FirewallDecisionEngine(
    private val appRuleRepository: RuleRepository,
    private val dnsRuleRepository: DnsRuleRepository,
    private val sessionManager: SessionManager,
    private val threatIntelService: ThreatIntelService?
) {
    suspend fun evaluate(event: TrafficEvent): FirewallAction {
        sessionManager.clearExpiredSessions()
        val session = sessionManager.findSession(event.sessionKey)
        if (session != null) {
            return session.decision
        }

        val appDecision = appRuleRepository.getRule(event.packageName)
            ?.takeIf { it.enabled }
            ?.action

        val dnsDecision = event.host
            ?.let { host -> dnsRuleRepository.getEnabledRules().firstOrNull { it.domain.equals(host, true) } }
            ?.action

        val remoteDecision = event.host
            ?.takeIf { dnsDecision == null || dnsDecision == FirewallAction.DEFAULT }
            ?.let { host -> threatIntelService?.lookupDomain(host) }
            ?.action

        val decision = when {
            dnsDecision == FirewallAction.BLOCK -> FirewallAction.BLOCK
            remoteDecision == FirewallAction.BLOCK -> FirewallAction.BLOCK
            appDecision == FirewallAction.BLOCK -> FirewallAction.BLOCK
            dnsDecision == FirewallAction.ALLOW -> FirewallAction.ALLOW
            remoteDecision == FirewallAction.ALLOW -> FirewallAction.ALLOW
            appDecision == FirewallAction.ALLOW -> FirewallAction.ALLOW
            else -> FirewallAction.DEFAULT
        }

        sessionManager.storeSession(event.sessionKey, decision, 60_000L)
        return decision
    }
}
