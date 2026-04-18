package com.tacu.nsfwzerotrust.ui.rules

import androidx.lifecycle.*
import com.tacu.nsfwzerotrust.domain.model.AppRule
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.InstalledApp
import com.tacu.nsfwzerotrust.domain.repository.RuleRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class AppRuleItem(
    val installedApp: InstalledApp,
    val rule: AppRule?
)

class RulesViewModel(
    private val ruleRepository: RuleRepository
) : ViewModel() {
    private val _items = MutableLiveData<List<AppRuleItem>>()
    val items: LiveData<List<AppRuleItem>> = _items

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            val items = withContext(Dispatchers.IO) {
                ruleRepository.getInstalledAppsWithRules().map { (app, rule) ->
                    AppRuleItem(app, rule)
                }
            }
            _items.postValue(items)
        }
    }

    fun setAction(app: InstalledApp, action: FirewallAction) {
        viewModelScope.launch(Dispatchers.IO) {
            ruleRepository.upsert(
                AppRule(
                    packageName = app.packageName,
                    appLabel = app.appLabel,
                    action = action,
                    enabled = true
                )
            )
            refresh()
        }
    }
}
