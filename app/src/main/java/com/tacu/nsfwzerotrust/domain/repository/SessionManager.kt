package com.tacu.nsfwzerotrust.domain.repository

import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.SessionEntry

interface SessionManager {
    fun findSession(key: String): SessionEntry?
    fun storeSession(key: String, decisionValue: FirewallAction, expiryMillis: Long)
    fun clearExpiredSessions(now: Long = System.currentTimeMillis())
}
