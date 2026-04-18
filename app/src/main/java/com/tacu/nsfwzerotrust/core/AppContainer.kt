package com.tacu.nsfwzerotrust.core

import android.app.Application
import android.net.ConnectivityManager
import com.tacu.nsfwzerotrust.data.local.FirewallDatabase
import com.tacu.nsfwzerotrust.data.preferences.UserPreferencesRepository
import com.tacu.nsfwzerotrust.data.remote.RemoteThreatIntelService
import com.tacu.nsfwzerotrust.data.repository.AppRegistryImpl
import com.tacu.nsfwzerotrust.data.repository.DnsRuleRepositoryImpl
import com.tacu.nsfwzerotrust.data.repository.FirewallLogRepositoryImpl
import com.tacu.nsfwzerotrust.data.repository.FirewallRepositoryImpl
import com.tacu.nsfwzerotrust.data.repository.InMemorySessionManager
import com.tacu.nsfwzerotrust.data.repository.RuleRepositoryImpl
import com.tacu.nsfwzerotrust.domain.usecase.FirewallDecisionEngine
import com.tacu.nsfwzerotrust.vpn.FirewallController
import com.tacu.nsfwzerotrust.vpn.FirewallControllerImpl
import com.tacu.nsfwzerotrust.vpn.PacketProcessor

class AppContainer(private val application: Application) {
    private val database by lazy { FirewallDatabase.create(application) }
    private val connectivityManager by lazy {
        application.getSystemService(ConnectivityManager::class.java)
    }

    val appRegistry by lazy { AppRegistryImpl(application.packageManager) }
    val appRuleRepository by lazy {
        RuleRepositoryImpl(database.appRuleDao(), appRegistry)
    }
    val dnsRuleRepository by lazy { DnsRuleRepositoryImpl(database.dnsRuleDao()) }
    val logRepository by lazy { FirewallLogRepositoryImpl(database.firewallLogDao()) }
    val sessionManager by lazy { InMemorySessionManager() }
    val userPreferencesRepository by lazy { UserPreferencesRepository(application) }
    val threatIntelService by lazy { RemoteThreatIntelService() }
    val decisionEngine by lazy {
        FirewallDecisionEngine(
            appRuleRepository = appRuleRepository,
            dnsRuleRepository = dnsRuleRepository,
            sessionManager = sessionManager,
            threatIntelService = threatIntelService
        )
    }
    val packetProcessor by lazy {
        PacketProcessor(
            appRegistry = appRegistry,
            logRepository = logRepository,
            decisionEngine = decisionEngine,
            connectivityManager = connectivityManager
        )
    }
    val firewallRepository by lazy { FirewallRepositoryImpl() }
    val firewallController: FirewallController by lazy {
        FirewallControllerImpl(application, firewallRepository)
    }
}
