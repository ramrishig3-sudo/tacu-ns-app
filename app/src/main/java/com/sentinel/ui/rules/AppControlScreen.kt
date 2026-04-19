package com.sentinel.ui.rules

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sentinel.ui.components.GlassCard
import com.sentinel.ui.theme.CyanPrimary
import com.sentinel.ui.theme.RedThreat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.sentinel.ui.viewmodel.AppControlViewModel
import com.sentinel.ui.viewmodel.AppControlViewModelFactory

data class AppRule(
    val name: String,
    val packageName: String,
    val uid: Int,
    val isWifiBlocked: Boolean = false,
    val isDataBlocked: Boolean = false
)

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AppControlScreen(viewModel: AppControlViewModel = viewModel(factory = AppControlViewModelFactory(LocalContext.current))) {
    var searchQuery by remember { mutableStateOf("") }
    val apps = viewModel.appList
    val showSystem by viewModel.showSystemApps

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Toggle & Search Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (showSystem) "Showing All Apps" else "User Apps Only",
                style = MaterialTheme.typography.bodySmall,
                color = CyanPrimary
            )
            Switch(
                checked = showSystem,
                onCheckedChange = { viewModel.toggleSystemApps(it) },
                thumbContent = { if (showSystem) Icon(Icons.Default.Refresh, null, modifier = Modifier.size(12.dp)) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search Applications...") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            colors = TextFieldDefaults.textFieldColors(
                containerColor = CyanPrimary.copy(alpha = 0.05f),
                unfocusedIndicatorColor = Color.Transparent,
                focusedIndicatorColor = CyanPrimary
            )
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val filtered = if (searchQuery.isEmpty()) apps else apps.filter { it.name.contains(searchQuery, ignoreCase = true) }
            items(filtered) { app ->
                AppRuleItem(
                    app = app, 
                    onPurge = { viewModel.purgeApp(it) },
                    onPolicyChange = { wifi, data -> viewModel.updatePolicy(app, wifi, data) }
                )
            }
        }
    }
}

@Composable
fun AppRuleItem(app: AppRule, onPurge: (AppRule) -> Unit, onPolicyChange: (Boolean, Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Mock Icon (Replaced with real icon in production)
                Box(modifier = Modifier.size(40.dp).padding(4.dp)) {
                    Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = CyanPrimary)
                }
                
                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(text = app.name, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(text = app.packageName, style = MaterialTheme.typography.bodySmall, color = CyanPrimary.copy(alpha = 0.5f))
                }

                IconButton(onClick = { onPurge(app) }) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = "Purge", tint = RedThreat)
                }
            }

            Divider(modifier = Modifier.padding(vertical = 12.dp), color = CyanPrimary.copy(alpha = 0.1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Wi-Fi", style = MaterialTheme.typography.bodySmall)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(checked = app.isWifiBlocked, onCheckedChange = { onPolicyChange(it, app.isDataBlocked) })
                }
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Data", style = MaterialTheme.typography.bodySmall)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(checked = app.isDataBlocked, onCheckedChange = { onPolicyChange(app.isWifiBlocked, it) })
                }
            }
        }
    }
}

