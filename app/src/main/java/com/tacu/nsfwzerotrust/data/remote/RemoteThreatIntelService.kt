package com.tacu.nsfwzerotrust.data.remote

import com.tacu.nsfwzerotrust.BuildConfig
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.ThreatVerdict
import com.tacu.nsfwzerotrust.domain.service.ThreatIntelService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class RemoteThreatIntelService : ThreatIntelService {
    override suspend fun lookupDomain(domain: String): ThreatVerdict? = withContext(Dispatchers.IO) {
        val endpoint = "${BuildConfig.BACKEND_BASE_URL.trimEnd('/')}/api/v1/threat/lookup"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5_000
            readTimeout = 5_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }

        return@withContext runCatching {
            val body = JSONObject()
                .put("domain", domain)
                .put("platform", "android")
                .toString()
            connection.outputStream.use { it.write(body.toByteArray()) }
            if (connection.responseCode !in 200..299) {
                null
            } else {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val verdict = JSONObject(response).optJSONObject("verdict") ?: return@runCatching null
                ThreatVerdict(
                    action = FirewallAction.valueOf(
                        verdict.optString("action", FirewallAction.DEFAULT.name)
                    ),
                    confidence = verdict.optInt("confidence", 0),
                    source = verdict.optString("source", "remote"),
                    reason = verdict.optString("reason", "Remote reputation lookup")
                )
            }
        }.getOrNull()
    }
}
