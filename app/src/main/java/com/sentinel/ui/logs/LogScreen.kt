package com.sentinel.ui.logs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sentinel.ui.components.GlassCard
import com.sentinel.ui.theme.CyanPrimary
import com.sentinel.ui.theme.RedThreat
import com.sentinel.ui.theme.GreenSafe
import com.sentinel.ui.viewmodel.LogViewModel

data class PacketLog(
    val timestamp: String,
    val appName: String,
    val destination: String,
    val protocol: String,
    val status: String, // "ALLOWED" or "BLOCKED"
    val size: String
)

@Composable
fun LogScreen(viewModel: LogViewModel = viewModel()) {
    val logs = viewModel.logs

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "REAL-TIME TRAFFIC SPECTROMETER",
            style = MaterialTheme.typography.labelMedium,
            color = CyanPrimary.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(logs) { log ->
                LogItem(log)
            }
        }
    }
}

@Composable
fun LogItem(log: PacketLog) {
    val isBlocked = log.status == "BLOCKED"
    
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = log.status,
                        color = if (isBlocked) RedThreat else GreenSafe,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = log.timestamp,
                        style = MaterialTheme.typography.bodySmall,
                        color = CyanPrimary.copy(alpha = 0.5f)
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "${log.appName} → ${log.destination}",
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                
                Text(
                    text = "${log.protocol} | ${log.size}",
                    style = MaterialTheme.typography.bodySmall,
                    color = CyanPrimary.copy(alpha = 0.7f)
                )
            }
            
            if (isBlocked) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Threat",
                    tint = RedThreat,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
