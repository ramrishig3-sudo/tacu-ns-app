package com.tacu.nsfwzerotrust.vpn

import android.app.Activity
import android.net.VpnService
import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus
import com.tacu.nsfwzerotrust.domain.repository.FirewallRepository

class FirewallControllerImpl(
    private val application: android.app.Application,
    private val firewallRepository: FirewallRepository
) : FirewallController {
    override fun startProtection(activity: Activity) {
        val prepareIntent = VpnService.prepare(activity)
        if (prepareIntent != null) {
            activity.startActivityForResult(prepareIntent, FirewallVpnService.VPN_REQUEST_CODE)
        } else {
            FirewallVpnService.start(application)
            firewallRepository.setProtectionStatus(ProtectionStatus.STARTING)
        }
    }

    override fun stopProtection(activity: Activity) {
        FirewallVpnService.stop(application)
        firewallRepository.setProtectionStatus(ProtectionStatus.STOPPING)
    }

    override fun getProtectionStatus(): LiveData<ProtectionStatus> {
        return firewallRepository.observeProtectionStatus()
    }
}
