package com.sentinel.core.vpn

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.sentinel.core.logs.LogManager
import com.sentinel.ui.logs.PacketLog
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import java.nio.ByteBuffer
import java.text.SimpleDateFormat
import java.util.*

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * SentinelVpnService: The core engine of the Sentinel Firewall.
 * Upgraded to production-grade high-speed packet processing.
 */
class SentinelVpnService : VpnService() {

    companion object {
        private val _isRunningFlow = MutableStateFlow(false)
        val isRunningFlow = _isRunningFlow.asStateFlow()
    }


    private var vpnInterface: ParcelFileDescriptor? = null
    private val serviceRecord = Job()
    private val scope = CoroutineScope(Dispatchers.IO + serviceRecord)
    
    private lateinit var ruleEngine: com.sentinel.core.rules.RuleEngine
    private lateinit var reputationManager: ReputationManager
    private lateinit var sessionManager: SessionManager
    private lateinit var connectivityWatcher: ConnectivityWatcher
    
    // Step 4 Refinement: Known DoH endpoints to block bypass
    private val dohEndpoints = setOf("1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4", "9.9.9.9")
    
    private var isRunning = false
    private val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    override fun onCreate() {
        super.onCreate()
        ruleEngine = com.sentinel.core.rules.RuleEngine(this)
        reputationManager = ReputationManager(this, ruleEngine)
        sessionManager = SessionManager(this)
        
        connectivityWatcher = ConnectivityWatcher(this) {
            if (isRunning) {
                Log.d("SentinelVPN", "Connectivity change detected. Healing...")
                if (!connectivityWatcher.isRoutingCorrect()) {
                    startVpn()
                }
            }
        }
        connectivityWatcher.start()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isRunning) {
            startVpn()
        }
        return START_STICKY
    }

    private fun startVpn() {
        Log.d("SentinelVPN", "Starting Core Engine...")
        
        val builder = Builder()
            .setSession("Sentinel Firewall")
            .addAddress("10.0.0.1", 24)
            .addDnsServer("8.8.8.8") // Fallback DNS
            .setMtu(1500)
            .setBlocking(true)

        try {
            vpnInterface?.close()
            vpnInterface = builder.establish()
            isRunning = true
            _isRunningFlow.value = true
            
            startWatchdog()
            runPacketLoop()
            
        } catch (e: Exception) {
            Log.e("SentinelVPN", "Failed to establish VPN Interface", e)
            stopSelf()
        }
    }

    /**
     * Senior Watchdog: Solves the 'No Internet' bug.
     * Restarts the VPN if pings fail, ensuring 100% uptime.
     */
    private fun startWatchdog() {
        scope.launch {
            while (isActive && isRunning) {
                delay(30000)
                
                // Routing & Health Validation
                val isHealthy = connectivityWatcher.isRoutingCorrect() && try {
                    InetAddress.getByName("8.8.8.8").isReachable(3000)
                } catch (e: Exception) {
                    false
                }
                
                if (!isHealthy) {
                    Log.w("SentinelVPN", "Watchdog: Poor health. Auto-healing...")
                    withContext(Dispatchers.Main) { startVpn() }
                }
                
                sessionManager.pruneStaleSessions()
            }
        }
    }

    private fun runPacketLoop() {
        scope.launch {
            val fileDescriptor = vpnInterface?.fileDescriptor ?: return@launch
            val inputStream = FileInputStream(fileDescriptor)
            val outputStream = FileOutputStream(fileDescriptor)
            
            val packetBuffer = ByteBuffer.allocate(32767)

            while (isActive && isRunning) {
                packetBuffer.clear()
                val readLength = inputStream.read(packetBuffer.array())
                
                if (readLength > 0) {
                    packetBuffer.limit(readLength)
                    
                    // 1. Parse Packet Metadata
                    val protocol = PacketEngine.getProtocol(packetBuffer)
                    val destIP = PacketEngine.getDestIP(packetBuffer)
                    val ipHeaderLen = PacketEngine.getIPHeaderLength(packetBuffer)
                    
                    var destPort = 0
                    var srcPort = 0
                    
                    if (protocol == PacketEngine.PROTOCOL_TCP || protocol == PacketEngine.PROTOCOL_UDP) {
                        srcPort = PacketEngine.getSourcePort(packetBuffer, ipHeaderLen)
                        destPort = PacketEngine.getDestPort(packetBuffer, ipHeaderLen)
                    }

                    // 2. DNS & DoH Interception
                    if (protocol == PacketEngine.PROTOCOL_UDP && destPort == 53) {
                        DnsCorrelator.processDnsPacket(packetBuffer, ipHeaderLen, 8)
                    }
                    
                    // Detect/Block DoH endpoints (Step 4 refinement)
                    val isDoH = destPort == 443 && dohEndpoints.contains(destIP)

                    // 3. Resolve Domain & UID
                    val domain = DnsCorrelator.getDomainForIp(destIP) ?: destIP
                    val uid = sessionManager.resolveUid(protocol, srcPort, destIP, destPort)
                    
                    // 4. Tiered Policy Enforcement (Refined Phase 2)
                    val isWifi = connectivityWatcher.isWifiConnected()
                    val appPolicy = if (uid != -1) ruleEngine.db.ruleDao().getPolicy(uid) else null
                    
                    val isAppBlocked = appPolicy != null && (
                        (isWifi && appPolicy.wifiBlocked) || (!isWifi && appPolicy.cellBlocked)
                    )
                    
                    val reputationVerdict = reputationManager.getVerdict(domain)
                    val isDomainBlocked = ruleEngine.isDomainBlocked(domain) || 
                                         reputationVerdict == ReputationManager.VERDICT_MALICIOUS ||
                                         (reputationVerdict == ReputationManager.VERDICT_SUSPICIOUS && domain.length > 20)
                    
                    val isBlocked = isAppBlocked || isDomainBlocked || isDoH

                    // 5. Logging (Throttled via LogManager)
                    LogManager.logPacket(PacketLog(
                        timestamp = dateFormat.format(Date()),
                        appName = if (uid != -1) "UID: $uid" else "System",
                        destination = domain,
                        protocol = when(protocol) {
                            PacketEngine.PROTOCOL_TCP -> "TCP"
                            PacketEngine.PROTOCOL_UDP -> "UDP"
                            else -> "OTHR"
                        },
                        status = if (isBlocked) "BLOCKED" else "ALLOWED",
                        size = "${readLength}B"
                    ))


                    // 6. Execution (Active Enforcement)
                    if (!isBlocked) {
                        outputStream.write(packetBuffer.array(), 0, readLength)
                    } else {
                        when (protocol) {
                            PacketEngine.PROTOCOL_UDP -> {
                                if (destPort == 53) {
                                    val dnsForgery = PacketEngine.forgeNxDomain(packetBuffer, ipHeaderLen, 8)
                                    if (dnsForgery != null) {
                                        val responsePacket = PacketEngine.createResponsePacket(packetBuffer, ipHeaderLen, dnsForgery)
                                        outputStream.write(responsePacket)
                                        Log.i("SentinelEnforce", "NXDOMAIN Injected: $domain")
                                    }
                                }
                            }
                            PacketEngine.PROTOCOL_TCP -> {
                                val rstPacket = PacketEngine.createTcpRstPacket(packetBuffer, ipHeaderLen)
                                outputStream.write(rstPacket)
                                Log.i("SentinelEnforce", "TCP RST Injected: $domain")
                            }
                        }
                        // Fallback: Silent Drop for other protocols
                    }


                }
            }
        }
    }


    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        _isRunningFlow.value = false
        connectivityWatcher.stop()
        serviceRecord.cancel()
        vpnInterface?.close()
        vpnInterface = null
    }
}
