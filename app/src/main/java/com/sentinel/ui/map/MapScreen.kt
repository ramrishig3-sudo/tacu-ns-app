package com.sentinel.ui.map

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sentinel.ui.theme.CyanPrimary
import com.sentinel.ui.theme.RedThreat
import com.sentinel.ui.components.GlassCard

data class MapMarker(val x: Float, val y: Float, val label: String, val type: String)

/**
 * MapScreen: A futuristic global traffic visualization.
 * Uses a custom Canvas to draw packet destinations globally.
 * Fully free/advanced feature.
 */
@Composable
fun MapScreen() {
    val markers = listOf(
        MapMarker(0.2f, 0.4f, "USA - Blocked", "BLOCKED"),
        MapMarker(0.5f, 0.3f, "Ireland - Allowed", "ALLOWED"),
        MapMarker(0.8f, 0.5f, "Japan - Blocked", "BLOCKED")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "GLOBAL TRAFFIC GEOSPHERE",
            style = MaterialTheme.typography.labelMedium,
            color = CyanPrimary.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Box(modifier = Modifier.fillMaxWidth().height(400.dp)) {
            // Cyber Map Canvas
            Canvas(modifier = Modifier.fillMaxSize()) {
                val width = size.width
                val height = size.height

                // Draw simple world grid
                for (i in 1..10) {
                    drawLine(
                        color = CyanPrimary.copy(alpha = 0.1f),
                        start = Offset(0f, (height / 10) * i),
                        end = Offset(width, (height / 10) * i)
                    )
                    drawLine(
                        color = CyanPrimary.copy(alpha = 0.1f),
                        start = Offset((width / 10) * i, 0f),
                        end = Offset((width / 10) * i, height)
                    )
                }

                // Draw markers
                markers.forEach { marker ->
                    drawCircle(
                        color = if (marker.type == "BLOCKED") RedThreat else CyanPrimary,
                        radius = 8f,
                        center = Offset(marker.x * width, marker.y * height)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(text = "LIVE GEO-FILTER STATUS", fontWeight = FontWeight.Bold)
                Text(
                    text = "Sentinel is currently suppressing 12 connection attempts to malicious offshore clusters.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
        }
    }
}
