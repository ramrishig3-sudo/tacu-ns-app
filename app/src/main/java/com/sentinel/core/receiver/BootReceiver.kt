package com.sentinel.core.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.sentinel.core.vpn.SentinelVpnService
import android.util.Log

/**
 * Sentinel Boot Receiver: Ensures that protection survives device restarts. 
 * This is a critical stability feature for a professional firewall.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("SentinelBoot", "System boot detected. Restoring firewall protection...")
            
            // In a real app, check user preferences here
            val vpnIntent = Intent(context, SentinelVpnService::class.java)
            context.startService(vpnIntent)
        }
    }
}
