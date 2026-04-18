package com.tacu.nsfwzerotrust.ui.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus
import com.tacu.nsfwzerotrust.domain.repository.FirewallLogRepository
import com.tacu.nsfwzerotrust.domain.repository.FirewallRepository
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val firewallRepository: FirewallRepository,
    private val logRepository: FirewallLogRepository
) : ViewModel() {
    val protectionStatus: LiveData<ProtectionStatus> = firewallRepository.observeProtectionStatus()
    val summary = logRepository.observeSummary()

    fun seedDemoLog() {
        viewModelScope.launch { }
    }
}
