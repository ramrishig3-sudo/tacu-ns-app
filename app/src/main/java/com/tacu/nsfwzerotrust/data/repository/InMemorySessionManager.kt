package com.tacu.nsfwzerotrust.data.repository

import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.SessionEntry
import com.tacu.nsfwzerotrust.domain.repository.SessionManager
import java.util.concurrent.ConcurrentHashMap

class InMemorySessionManager : SessionManager {
    private val cache = ConcurrentHashMap<String, SessionEntry>()

    override fun findSession(key: String): SessionEntry? {
        val entry = cache[key] ?: return null
        return if (entry.expiresAt > System.currentTimeMillis()) {
            cache[key] = entry.copy(lastSeenAt = System.currentTimeMillis())
            cache[key]
        } else {
            cache.remove(key)
            null
        }
    }

    override fun storeSession(key: String, decisionValue: FirewallAction, expiryMillis: Long) {
        val now = System.currentTimeMillis()
        cache[key] = SessionEntry(
            key = key,
            decision = decisionValue,
            firstSeenAt = now,
            lastSeenAt = now,
            expiresAt = now + expiryMillis
        )
    }

    override fun clearExpiredSessions(now: Long) {
        cache.entries.removeIf { it.value.expiresAt <= now }
    }
}
