package com.sentinel.core.config

/**
 * SentinelConfig: Central Intelligence Configuration.
 * Move all backend parameters here for production security.
 */
object SentinelConfig {
    // Railway Deployment URL fetched from local.properties via BuildConfig
    val BACKEND_URL = com.tacu.nsfwzerotrust.BuildConfig.SENTINEL_BACKEND_URL
    
    // Secure API Token fetched from local.properties via BuildConfig
    val API_TOKEN = com.tacu.nsfwzerotrust.BuildConfig.SENTINEL_API_TOKEN
    
    // Swarm Vaccine update interval (in hours)
    const val WORK_INTERVAL_HOURS = 24L
    
    // Timeout for reputation lookups (milliseconds)
    const val REPUTATION_TIMEOUT_MS = 3000L
}

