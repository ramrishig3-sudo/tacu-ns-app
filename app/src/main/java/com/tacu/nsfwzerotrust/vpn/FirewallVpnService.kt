package com.tacu.nsfwzerotrust.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.tacu.nsfwzerotrust.R
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus
import com.tacu.nsfwzerotrust.ui.MainActivity
import java.io.FileInputStream
import java.util.concurrent.atomic.AtomicBoolean

class FirewallVpnService : VpnService() {
    private var interfaceDescriptor: ParcelFileDescriptor? = null
    private val running = AtomicBoolean(false)
    private var worker: Thread? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startVpn()
            ACTION_STOP -> stopVpn()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    private fun startVpn() {
        if (running.get()) return
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        ServiceLocator.from(this).firewallRepository.setProtectionStatus(ProtectionStatus.STARTING)

        val builder = Builder()
            .setSession(getString(R.string.vpn_session_name))
            .addAddress("10.0.0.2", 32)
            .addDnsServer("1.1.1.1")
            .addRoute("0.0.0.0", 0)

        interfaceDescriptor = builder.establish()
        running.set(true)
        worker = Thread {
            ServiceLocator.from(this).firewallRepository.setProtectionStatus(ProtectionStatus.RUNNING)
            val input = FileInputStream(interfaceDescriptor?.fileDescriptor)
            val buffer = ByteArray(32767)
            while (running.get()) {
                val length = runCatching { input.read(buffer) }.getOrDefault(-1)
                if (length <= 0) continue
                PacketParser.parse(buffer, length)?.let { metadata ->
                    ServiceLocator.from(this).packetProcessor.process(metadata)
                }
            }
        }.apply { start() }
    }

    private fun stopVpn() {
        if (!running.get()) return
        ServiceLocator.from(this).firewallRepository.setProtectionStatus(ProtectionStatus.STOPPING)
        running.set(false)
        worker?.interrupt()
        worker = null
        interfaceDescriptor?.close()
        interfaceDescriptor = null
        ServiceLocator.from(this).firewallRepository.setProtectionStatus(ProtectionStatus.STOPPED)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildNotification(): Notification {
        val intent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_message))
            .setOngoing(true)
            .setContentIntent(intent)
            .build()
    }

    private fun createChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            )
        )
    }

    companion object {
        const val VPN_REQUEST_CODE = 4001
        private const val ACTION_START = "com.tacu.nsfwzerotrust.START"
        private const val ACTION_STOP = "com.tacu.nsfwzerotrust.STOP"
        private const val CHANNEL_ID = "firewall_status"
        private const val NOTIFICATION_ID = 1100

        fun start(context: Context) {
            val intent = Intent(context, FirewallVpnService::class.java).apply { action = ACTION_START }
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, FirewallVpnService::class.java).apply { action = ACTION_STOP }
            context.startService(intent)
        }
    }
}
