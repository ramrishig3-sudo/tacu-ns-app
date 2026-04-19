package com.sentinel.core.rules

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sentinel.core.config.SentinelConfig
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * RuleSyncWorker: Fetches the 'Swarm Vaccine' intelligence from the cloud.
 * Upgraded with duplicate prevention and production hardening.
 */
class RuleSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val ruleEngine = RuleEngine(applicationContext)
            val dao = ruleEngine.db.ruleDao()
            
            // 1. Fetch live rules from Sentinel Cloud v2 (Railway)
            val url = URL("${SentinelConfig.BACKEND_URL}/api/v2/swarm/vaccine")
            val connection = url.openConnection() as HttpURLConnection
            connection.setRequestProperty("Authorization", "Bearer ${SentinelConfig.API_TOKEN}")
            connection.connectTimeout = 10000
            
            if (connection.responseCode != 200) return Result.retry()

            val response = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(response)
            val rulesArray = json.getJSONArray("rules")

            var newAdded = 0
            for (i in 0 until rulesArray.length()) {
                val ruleObj = rulesArray.getJSONObject(i)
                val domain = ruleObj.getString("domain")
                
                // 2. Duplicate Prevention
                val existing = dao.getRuleForDomain(domain)
                if (existing == null) {
                    ruleEngine.addBlockRule(
                        domain = domain,
                        uid = -1,
                        packageName = "System",
                        source = "VACCINE"
                    )
                    newAdded++
                }
            }

            Log.i("SentinelSync", "Swarm Vaccine Synced: $newAdded new threats blocked.")
            Result.success()
        } catch (e: Exception) {
            Log.e("SentinelSync", "Rule sync failed: ${e.message}")
            Result.retry()
        }
    }
}

