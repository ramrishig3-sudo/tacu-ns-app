package com.sentinel.core.vpn

import android.content.Context
import android.util.Log
import android.util.LruCache
import com.sentinel.core.rules.*
import kotlinx.coroutines.*
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * ReputationManager: Sentinel's Intelligence Hub.
 * Upgraded to use real backend lookups with 3s safety timeouts.
 */
class ReputationManager(private val context: Context, private val ruleEngine: com.sentinel.core.rules.RuleEngine) {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val l1Cache = LruCache<String, String>(500) // Domain -> Verdict
    private val dao = ruleEngine.db.ruleDao()

    companion object {
        const val VERDICT_SAFE = "SAFE"
        const val VERDICT_SUSPICIOUS = "SUSPICIOUS"
        const val VERDICT_MALICIOUS = "MALICIOUS"
        const val VERDICT_UNKNOWN = "UNKNOWN"
    }

    /**
     * Smart Mode: Retrieves or predicts the verdict for a domain.
     * Never blocks the critical packet loop.
     */
    fun getVerdict(domain: String): String {
        if (domain.isEmpty()) return VERDICT_SAFE

        // 1. Check L1 Memory Cache
        l1Cache.get(domain)?.let { return it }

        // 2. Immediate Behavioral Check
        val behavioralVerdict = analyzeBehavior(domain)
        if (behavioralVerdict != VERDICT_UNKNOWN) {
            l1Cache.put(domain, behavioralVerdict)
            return behavioralVerdict
        }

        // 3. Async Backend Lookup (3s Timeout)
        scope.launch {
            val cloudVerdict = fetchFromBackend(domain)
            if (cloudVerdict != null) {
                l1Cache.put(domain, cloudVerdict)
                dao.updateReputation(DomainReputation(
                    domain = domain,
                    threatScore = if (cloudVerdict == VERDICT_MALICIOUS) 90 else 50,
                    verdict = cloudVerdict
                ))
            }
        }

        return VERDICT_UNKNOWN
    }

    private fun analyzeBehavior(domain: String): String {
        // Random looking domains (DGA)
        if (domain.length > 25 && domain.count { it.isDigit() } > 5) {
            return VERDICT_SUSPICIOUS
        }
        
        // Block known DoH bypasses
        if (domain.contains("dns-query") || domain.contains("cloudflare-dns")) {
            return VERDICT_MALICIOUS
        }
        
        return VERDICT_UNKNOWN
    }

    private suspend fun fetchFromBackend(domain: String): String? = withTimeoutOrNull(SentinelConfig.REPUTATION_TIMEOUT_MS) {
        try {
            val url = URL("${SentinelConfig.BACKEND_URL}/v1/reputation?domain=$domain")
            val conn = url.openConnection() as HttpURLConnection
            conn.setRequestProperty("Authorization", "Bearer ${SentinelConfig.API_TOKEN}")
            conn.connectTimeout = 2000
            conn.readTimeout = 2000
            
            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                json.optString("verdict", VERDICT_UNKNOWN)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e("SentinelRep", "Backend lookup failed for $domain")
            null
        }
    }
}

