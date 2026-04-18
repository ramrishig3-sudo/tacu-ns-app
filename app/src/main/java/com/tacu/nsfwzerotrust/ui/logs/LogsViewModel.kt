package com.tacu.nsfwzerotrust.ui.logs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tacu.nsfwzerotrust.domain.repository.FirewallLogRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class LogsViewModel(
    private val logRepository: FirewallLogRepository
) : ViewModel() {
    val logs = logRepository.observeLogs()

    fun clearLogs() {
        viewModelScope.launch(Dispatchers.IO) {
            logRepository.clear()
        }
    }
}
