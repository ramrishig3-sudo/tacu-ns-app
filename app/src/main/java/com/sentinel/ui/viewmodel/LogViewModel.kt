package com.sentinel.ui.viewmodel

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sentinel.core.logs.LogManager
import com.sentinel.ui.logs.PacketLog
import kotlinx.coroutines.launch

/**
 * LogViewModel: Observes the real-time 'Traffic Pipe' and updates the UI.
 * This connects the low-level VPN interceptions to the 'Traffic Spectrometer' screen.
 */
class LogViewModel : ViewModel() {
    val logs = mutableStateListOf<PacketLog>()

    init {
        viewModelScope.launch {
            LogManager.batchedLogs.collect { batch ->
                // Add all to start of list
                logs.addAll(0, batch)
                // Limit to last 100
                while (logs.size > 100) {
                    logs.removeAt(logs.size - 1)
                }
            }
        }
    }
}
