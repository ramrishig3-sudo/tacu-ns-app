package com.sentinel.core.vpn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log

/**
 * ConnectivityWatcher: Monitors Wi-Fi and Mobile Data status.
 * Ensures Sentinel automatically adapts its firewall rules when changing networks.
 */
class ConnectivityWatcher(private val context: Context, private val onNetworkChange: () -> Unit) {

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent?) {
            Log.d("SentinelConnect", "Network change detected. Updating firewall rules...")
            onNetworkChange()
        }
    }

    fun start() {
        val filter = IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION)
        context.registerReceiver(receiver, filter)
    }

    fun stop() {
        try {
            context.unregisterReceiver(receiver)
        } catch (e: Exception) {
            // Already unregistered
        }
    }

    fun isWifiConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    /**
     * Routing Validation: Ensures the firewall is actually the primary network route.
     * Prevents 'Silent Bypass' or leakage.
     */
    fun isRoutingCorrect(): Boolean {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            // On production Android, VPNs are typically TRANSPORT_VPN
            return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
        }
        return true // Fallback for older versions
    }
}

