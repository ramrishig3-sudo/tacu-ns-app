package com.tacu.nsfwzerotrust.domain.service

import com.tacu.nsfwzerotrust.domain.model.ThreatVerdict

interface ThreatIntelService {
    suspend fun lookupDomain(domain: String): ThreatVerdict?
}
