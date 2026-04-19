package com.sentinel.core.rules

import android.content.Context
import androidx.room.Room
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * RuleEngine: The 'Brain' of Sentinel. 
 * Manages the local blocklist and community 'Swarm Immunity' rules.
 */
class RuleEngine(context: Context) {

    val db = Room.databaseBuilder(
        context.applicationContext,
        RuleDatabase::class.java, "sentinel-rules.db"
    ).build()


    private val dao = db.ruleDao()
    
    // Heuristic Monitor: Track packet frequency per UID
    private val packetCounter = mutableMapOf<Int, Int>()
    private val lastCountReset = mutableMapOf<Int, Long>()
    
    // Cache for high-performance lookup in the VPN loop
    private val blockedCache = mutableSetOf<String>()
    
    suspend fun reloadCache() {
        val blocked = dao.getBlockedDomains()
        blockedCache.clear()
        blockedCache.addAll(blocked.map { it.domain })
    }

    /**
     * The unique 'Bulk Purge' feature.
     * Marks every domain ever contacted by this app as BLOCKED.
     */
    suspend fun purgeAppConnections(uid: Int, packageName: String) {
        dao.blockAllForApp(uid)
        reloadCache()
    }

    fun isDomainBlocked(domain: String): Boolean {
        // Fast lookup for the VPN packet loop
        return blockedCache.contains(domain)
    }

    suspend fun addBlockRule(domain: String, uid: Int, packageName: String, source: String = "USER") {
        dao.insertRule(FirewallRule(domain, uid, packageName, true, source))
        blockedCache.add(domain)
    }

    /**
     * Heuristic Analysis: Detects if an app is making excessive background calls.
     * Triggers a 'Deep Detective' alert if an app exceeds 50 packets per minute.
     */
    fun checkHeuristics(uid: Int): Boolean {
        val now = System.currentTimeMillis()
        val lastReset = lastCountReset[uid] ?: 0L
        
        if (now - lastReset > 60000) {
            packetCounter[uid] = 1
            lastCountReset[uid] = now
            return false
        }
        
        val count = (packetCounter[uid] ?: 0) + 1
        packetCounter[uid] = count
        
        return count > 50 // Threshold for demonstration
    }
}
