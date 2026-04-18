package com.tacu.nsfwzerotrust.vpn

import android.net.ConnectivityManager
import android.system.OsConstants
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import com.tacu.nsfwzerotrust.domain.model.FirewallLog
import com.tacu.nsfwzerotrust.domain.model.TrafficEvent
import com.tacu.nsfwzerotrust.domain.repository.AppRegistry
import com.tacu.nsfwzerotrust.domain.repository.FirewallLogRepository
import com.tacu.nsfwzerotrust.domain.usecase.FirewallDecisionEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.InetSocketAddress

class PacketProcessor(
    private val appRegistry: AppRegistry,
    private val logRepository: FirewallLogRepository,
    private val decisionEngine: FirewallDecisionEngine,
    private val connectivityManager: ConnectivityManager?
) {
    private val scope = CoroutineScope(Dispatchers.IO)

    fun process(metadata: PacketMetadata) {
        scope.launch {
            val packageName = resolvePackageName(metadata)
            val appName = appRegistry.getLabel(packageName)
            val event = TrafficEvent(
                packageName = packageName,
                appName = appName,
                host = metadata.host,
                protocol = metadata.protocol,
                source = metadata.source,
                reason = metadata.reason,
                sessionKey = "${packageName}|${metadata.host ?: metadata.remoteAddress.hostAddress}|${metadata.protocol}"
            )
            val decision = decisionEngine.evaluate(event)
            logRepository.add(
                FirewallLog(
                    timestamp = System.currentTimeMillis(),
                    appName = appName,
                    packageName = packageName,
                    host = metadata.host ?: metadata.remoteAddress.hostAddress,
                    action = if (decision == FirewallAction.DEFAULT) FirewallAction.ALLOW else decision,
                    source = metadata.source,
                    reason = if (decision == FirewallAction.DEFAULT) "Default allow" else metadata.reason
                )
            )
        }
    }

    private fun resolvePackageName(metadata: PacketMetadata): String {
        val protocol = if (metadata.protocol == 6) OsConstants.IPPROTO_TCP else OsConstants.IPPROTO_UDP
        val uid = runCatching {
            connectivityManager?.getConnectionOwnerUid(
                protocol,
                InetSocketAddress(metadata.localAddress, metadata.localPort),
                InetSocketAddress(metadata.remoteAddress, metadata.remotePort)
            )
        }.getOrNull() ?: -1

        if (uid < 0) {
            return "unknown.app"
        }

        return appRegistry.getPackageForUid(uid) ?: "uid.$uid"
    }
}
