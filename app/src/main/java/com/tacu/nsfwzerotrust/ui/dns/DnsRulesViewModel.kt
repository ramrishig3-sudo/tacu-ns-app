package com.tacu.nsfwzerotrust.ui.dns

import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tacu.nsfwzerotrust.domain.model.DnsRule
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.repository.DnsRuleRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class DnsRulesViewModel(
    private val repository: DnsRuleRepository
) : ViewModel() {
    val rules: LiveData<List<DnsRule>> = repository.observeRules()

    fun addDomain(domain: String, action: FirewallAction) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.upsert(DnsRule(domain.trim(), action, true))
        }
    }

    fun deleteDomain(domain: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.delete(domain)
        }
    }
}
