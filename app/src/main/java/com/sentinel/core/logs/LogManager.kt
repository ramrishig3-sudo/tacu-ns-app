package com.sentinel.core.logs

import com.sentinel.ui.logs.PacketLog
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * LogManager: Production-grade traffic logger.
 * Implements batching (200ms window) to avoid UI thread saturation during heavy traffic.
 */
object LogManager {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _logPipe = MutableSharedFlow<PacketLog>(extraBufferCapacity = 500)
    
    // Throttle Cache: Key = UID|Domain|Status, Value = LastLoggedTimestamp
    private val throttleCache = mutableMapOf<String, Long>()

    // Batching Flow: Emits lists of logs every 200ms
    val batchedLogs: Flow<List<PacketLog>> = _logPipe
        .chunked(200L)

    fun logPacket(log: PacketLog) {
        val key = "${log.appName}|${log.destination}|${log.status}"
        val now = System.currentTimeMillis()
        val lastLogged = throttleCache[key] ?: 0L
        
        // Only log if it's been > 60s or it's a new unique event
        if (now - lastLogged > 60000) {
            throttleCache[key] = now
            _logPipe.tryEmit(log)
            
            // Prevent map bloating
            if (throttleCache.size > 1000) throttleCache.clear()
        }
    }
}


/**
 * Extension to batch items from a Flow over a time window.
 */
fun <T> Flow<T>.chunked(timeoutMillis: Long): Flow<List<T>> = flow {
    val chunk = mutableListOf<T>()
    var lastEmitTime = System.currentTimeMillis()
    
    collect { value ->
        chunk.add(value)
        val now = System.currentTimeMillis()
        if (now - lastEmitTime >= timeoutMillis || chunk.size >= 50) {
            emit(chunk.toList())
            chunk.clear()
            lastEmitTime = now
        }
    }
}

