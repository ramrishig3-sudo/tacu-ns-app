package com.tacu.nsfwzerotrust.data.repository

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus
import com.tacu.nsfwzerotrust.domain.repository.FirewallRepository
class FirewallRepositoryImpl : FirewallRepository {
    private val status = MutableLiveData(ProtectionStatus.STOPPED)

    override fun observeProtectionStatus(): LiveData<ProtectionStatus> = status

    override fun setProtectionStatus(status: ProtectionStatus) {
        this.status.postValue(status)
    }
}
