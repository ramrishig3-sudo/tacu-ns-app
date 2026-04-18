package com.tacu.nsfwzerotrust.domain.repository

import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus

interface FirewallRepository {
    fun observeProtectionStatus(): LiveData<ProtectionStatus>
    fun setProtectionStatus(status: ProtectionStatus)
}
