package com.sentinel.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = CyanPrimary,
    secondary = BlueDeep,
    tertiary = AmberAccent,
    background = BlueDarker,
    surface = BlueDeep,
    onPrimary = BlueDarker,
    onSecondary = CyanPrimary,
    onTertiary = BlueDarker,
    onBackground = CyanPrimary,
    onSurface = CyanPrimary
)

@Composable
fun SentinelTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = SentinelTypography,
        content = content
    )
}
