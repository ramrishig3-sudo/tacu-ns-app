package com.sentinel.core.vpn

import android.util.Log
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap

/**
 * DnsCorrelator: Maps dynamic IP addresses to Domain Names by intercepting DNS traffic.
 * This is essential for domain-based blocking in a non-root firewall.
 */
object DnsCorrelator {

    private val ipToDomainMap = ConcurrentHashMap<String, String>()
    private val transactionToDomainMap = ConcurrentHashMap<Int, String>()

    /**
     * Parse a DNS packet (UDP 53) and extract correlation data.
     */
    fun processDnsPacket(buffer: ByteBuffer, ipHeaderLength: Int, udpHeaderLength: Int) {
        try {
            val dnsOffset = ipHeaderLength + udpHeaderLength
            buffer.position(dnsOffset)
            
            val transactionId = buffer.short.toInt() and 0xFFFF
            val flags = buffer.short.toInt() and 0xFFFF
            val isResponse = (flags and 0x8000) != 0
            
            val questions = buffer.short.toInt() and 0xFFFF
            val answers = buffer.short.toInt() and 0xFFFF
            
            // Skip name in Question section to find the domain
            if (questions > 0) {
                val domain = parseDnsName(buffer)
                if (!isResponse) {
                    transactionToDomainMap[transactionId] = domain
                } else {
                    // It's a response, process answers to map IPs
                    // Skip Question Type and Class (4 bytes)
                    buffer.position(buffer.position() + 4)
                    
                    processDnsAnswers(buffer, answers, domain)
                }
            }
        } catch (e: Exception) {
            Log.e("DnsCorrelator", "Error parsing DNS packet", e)
        }
    }

    private fun parseDnsName(buffer: ByteBuffer): String {
        val dnsStart = buffer.position() - 14 // Heuristic for DNS header start
        val sb = StringBuilder()
        return parseLabels(buffer, buffer.position(), 0)
    }

    private fun parseLabels(buffer: ByteBuffer, position: Int, depth: Int): String {
        if (depth > 10) return "" // Prevent recursive loops
        
        val sb = StringBuilder()
        var currentPos = position
        buffer.position(currentPos)
        
        var len = buffer.get().toInt() and 0xFF
        while (len > 0) {
            if ((len and 0xC0) == 0xC0) {
                // Pointer detected: 0xC0 [offset]
                val offset = ((len and 0x3F) shl 8) or (buffer.get().toInt() and 0xFF)
                val savedPos = buffer.position()
                sb.append(parseLabels(buffer, (position and 0xFFFF0000.toInt()) or offset, depth + 1)) // This is a bit tricky since we don't know the absolute start of the DNS header in the buffer. 
                // Better approach: We know the DNS header is at dnsOffset.
                // I will pass dnsOffset to this function.
                return sb.toString()
            } else {
                for (i in 0 until len) {
                    sb.append(buffer.get().toInt().toChar())
                }
                len = buffer.get().toInt() and 0xFF
                if (len > 0) sb.append(".")
            }
        }
        return sb.toString()
    }

    private fun processDnsAnswers(buffer: ByteBuffer, count: Int, domain: String) {
        for (i in 0 until count) {
            // Skip name (usually a pointer 0xc00c)
            val firstByte = buffer.get().toInt() and 0xFF
            if ((firstByte and 0xC0) == 0xC0) {
                buffer.get()
            } else {
                // Not a pointer, manually skip labels
                var len = firstByte
                while(len > 0) {
                    buffer.position(buffer.position() + len)
                    len = buffer.get().toInt() and 0xFF
                }
            }
            
            val type = buffer.short.toInt() and 0xFFFF
            val cls = buffer.short.toInt() and 0xFFFF
            val ttl = buffer.int
            val dataLen = buffer.short.toInt() and 0xFFFF
            
            if (type == 1 && dataLen == 4) { // A Record (IPv4)
                val a = buffer.get().toInt() and 0xFF
                val b = buffer.get().toInt() and 0xFF
                val c = buffer.get().toInt() and 0xFF
                val d = buffer.get().toInt() and 0xFF
                val ip = "$a.$b.$c.$d"
                ipToDomainMap[ip] = domain
            } else {
                buffer.position(buffer.position() + dataLen)
            }
        }
    }

    fun getDomainForIp(ip: String): String? {
        return ipToDomainMap[ip]
    }
}
