package com.sentinel.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sentinel.core.rules.RuleEngine
import com.sentinel.ui.rules.AppRule
import kotlinx.coroutines.launch

/**
 * AppControlViewModel: Manages the list of apps and their firewall policies.
 * Implements the 'Nuclear' Bulk Purge functionality.
 */
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import androidx.compose.runtime.mutableStateOf
import com.sentinel.core.rules.*

/**
 * AppControlViewModel: Manages the list of apps and their firewall policies.
 * Implements the 'Nuclear' Bulk Purge and per-app network control.
 */
class AppControlViewModel(private val context: Context) : ViewModel() {

    private val ruleEngine = RuleEngine(context)
    private val packageManager = context.packageManager

    val appList = mutableStateListOf<AppRule>()
    var showSystemApps = mutableStateOf(false)
        private set

    init {
        loadApps()
    }

    fun loadApps() {
        viewModelScope.launch {
            val installed = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            val filtered = installed.filter { app ->
                val isSystem = (app.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                showSystemApps.value || !isSystem
            }.map { app ->
                val policy = ruleEngine.db.ruleDao().getPolicy(app.uid)
                AppRule(
                    name = packageManager.getApplicationLabel(app).toString(),
                    packageName = app.packageName,
                    uid = app.uid,
                    isWifiBlocked = policy?.wifiBlocked ?: false,
                    isDataBlocked = policy?.cellBlocked ?: false
                )
            }.sortedBy { it.name }

            appList.clear()
            appList.addAll(filtered)
        }
    }

    fun toggleSystemApps(show: Boolean) {
        showSystemApps.value = show
        loadApps()
    }

    fun updatePolicy(app: AppRule, wifi: Boolean, data: Boolean) {
        viewModelScope.launch {
            ruleEngine.db.ruleDao().updatePolicy(
                AppPolicy(app.uid, app.packageName, wifi, data)
            )
            // Reload local item
            val index = appList.indexOfFirst { it.uid == app.uid }
            if (index != -1) {
                appList[index] = app.copy(isWifiBlocked = wifi, isDataBlocked = data)
            }
        }
    }

    fun purgeApp(app: AppRule) {
        viewModelScope.launch {
            ruleEngine.purgeAppConnections(app.uid, app.packageName)
        }
    }
}

