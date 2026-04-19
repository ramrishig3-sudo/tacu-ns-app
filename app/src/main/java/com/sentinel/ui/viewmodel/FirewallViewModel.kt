package com.sentinel.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.viewModelScope
import com.sentinel.core.logs.LogManager
import com.sentinel.core.vpn.SentinelVpnService
import kotlinx.coroutines.launch

/**
 * FirewallViewModel: Manages the 'Protection State' of the app.
 * Connects the 'Shield Sphere' button to the actual VPN engine.
 */
class FirewallViewModel : ViewModel() {

    var isProtectionEnabled = mutableStateOf(false)
        private set

    var blockedCount = mutableStateOf(0)
        private set

    init {
        // Sync with real Service State
        viewModelScope.launch {
            SentinelVpnService.isRunningFlow.collect { running ->
                isProtectionEnabled.value = running
            }
        }

        // Sync real blocked count
        viewModelScope.launch {
            LogManager.batchedLogs.collect { batch ->
                val newBlocks = batch.count { it.status == "BLOCKED" }
                blockedCount.value += newBlocks
            }
        }
    }

    fun toggleProtection(context: Context) {
        val currentState = isProtectionEnabled.value
        
        if (!currentState) {
            context.startService(Intent(context, SentinelVpnService::class.java))
        } else {
            context.stopService(Intent(context, SentinelVpnService::class.java))
        }
    }
}

