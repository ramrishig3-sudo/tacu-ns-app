package com.sentinel.ui.dashboard

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sentinel.ui.components.GlassCard
import com.sentinel.ui.theme.CyanPrimary
import com.sentinel.ui.theme.AmberAccent
import com.sentinel.ui.theme.BlueDeep
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalContext
import com.sentinel.ui.viewmodel.FirewallViewModel

import com.sentinel.ui.viewmodel.LogViewModel

@Composable
fun DashboardScreen(
    viewModel: FirewallViewModel = viewModel(),
    logViewModel: LogViewModel = viewModel()
) {
    val context = LocalContext.current
    val isProtected by viewModel.isProtectionEnabled
    val blockedCount by viewModel.blockedCount
    val recentLogs = logViewModel.logs
    
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Header
        Text(
            text = "SENTINEL CORE",
            style = MaterialTheme.typography.labelMedium,
            color = CyanPrimary.copy(alpha = 0.7f)
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = if (isProtected) "Active Protection" else "System Vulnerable",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = if (isProtected) CyanPrimary else AmberAccent
        )

        Spacer(modifier = Modifier.height(40.dp))

        // Central Shield Sphere
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(200.dp)
                .clickable { viewModel.toggleProtection(context) }
        ) {
            // Inner Sphere
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = if (isProtected) {
                                listOf(CyanPrimary, BlueDeep)
                            } else {
                                listOf(AmberAccent, BlueDeep)
                            }
                        )
                    )
            )
            
            Text(
                text = if (isProtected) "SECURED" else "OFF",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 24.sp
            )
        }

        Spacer(modifier = Modifier.height(40.dp))

        // Health Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            GlassCard(modifier = Modifier.weight(1f)) {
                Column {
                    Text("Status", style = MaterialTheme.typography.labelMedium)
                    Text(if (isProtected) "SECURE" else "VULN", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                }
            }
            GlassCard(modifier = Modifier.weight(1f)) {
                Column {
                    Text("Blocked", style = MaterialTheme.typography.labelMedium)
                    Text(blockedCount.toString(), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Threat Stream Title
        Text(
            text = "LIVE THREAT STREAM",
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.align(Alignment.Start)
        )
        
        Spacer(modifier = Modifier.height(8.dp))

        // Threat Stream List
        LazyColumn(
            modifier = Modifier.fillMaxWidth().weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(recentLogs.take(10)) { log ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${log.destination} (${log.protocol})",
                            style = MaterialTheme.typography.bodySmall,
                            color = CyanPrimary.copy(alpha = 0.8f)
                        )
                        Text(
                            text = log.status,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (log.status == "ALLOWED") Color.Green else Color.Red
                        )
                    }
                }
            }
        }

    }
}
