package com.tacu.nsfwzerotrust.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.vpn.FirewallVpnService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val container = ServiceLocator.from(context)
        if (container.userPreferencesRepository.hasAcceptedOnboarding() &&
            container.userPreferencesRepository.isStartOnBootEnabled()
        ) {
            FirewallVpnService.start(context)
        }
    }
}
