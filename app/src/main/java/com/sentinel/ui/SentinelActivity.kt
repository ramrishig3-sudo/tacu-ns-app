package com.sentinel.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.sentinel.ui.dashboard.DashboardScreen
import com.sentinel.ui.logs.LogScreen
import com.sentinel.ui.rules.AppControlScreen
import com.sentinel.ui.theme.SentinelTheme
import androidx.compose.material.icons.filled.Place
import com.sentinel.ui.map.MapScreen
import androidx.compose.ui.unit.dp

import androidx.work.*
import com.sentinel.core.config.SentinelConfig
import com.sentinel.core.rules.RuleSyncWorker
import java.util.concurrent.TimeUnit

class SentinelActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        scheduleRuleSync()

        setContent {
            SentinelTheme {
                SentinelMainScreen()
            }
        }
    }

    private fun scheduleRuleSync() {
        val workRequest = PeriodicWorkRequestBuilder<RuleSyncWorker>(
            SentinelConfig.WORK_INTERVAL_HOURS, TimeUnit.HOURS
        )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()

        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            "sentinel_rule_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }
}

@Composable
fun SentinelMainScreen() {
    val navController = rememberNavController()
    var selectedItem by remember { mutableIntStateOf(0) }
    val items = listOf("Dashboard", "Apps", "Map", "Logs")
    val icons = listOf(Icons.Default.Home, Icons.Default.Search, Icons.Default.Place, Icons.Default.List)

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.background,
                tonalElevation = 8.dp
            ) {
                items.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(icons[index], contentDescription = item) },
                        label = { Text(item) },
                        selected = selectedItem == index,
                        onClick = {
                            selectedItem = index
                            navController.navigate(item.lowercase())
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "dashboard",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("dashboard") { DashboardScreen() }
            composable("apps") { AppControlScreen() }
            composable("map") { MapScreen() }
            composable("logs") { LogScreen() }
        }
    }
}
