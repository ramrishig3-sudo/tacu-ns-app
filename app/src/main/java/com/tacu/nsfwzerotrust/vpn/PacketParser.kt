package com.tacu.nsfwzerotrust.vpn

import java.net.InetAddress
import java.nio.ByteBuffer

object PacketParser {
    fun parse(buffer: ByteArray, length: Int): PacketMetadata? {
        if (length < 20) return null
        val packet = ByteBuffer.wrap(buffer, 0, length)
        val versionAndHeader = packet.get(0).toInt()
        val version = versionAndHeader shr 4
        if (version != 4) return null

        val headerLength = (versionAndHeader and 0x0F) * 4
        val protocol = packet.get(9).toInt() and 0xFF
        val sourceIp = InetAddress.getByAddress(buffer.copyOfRange(12, 16))
        val destIp = InetAddress.getByAddress(buffer.copyOfRange(16, 20))

        return when (protocol) {
            17 -> parseUdp(buffer, length, headerLength, sourceIp, destIp)
            6 -> parseTcp(buffer, length, headerLength, sourceIp, destIp)
            else -> null
        }
    }

    private fun parseUdp(
        buffer: ByteArray,
        length: Int,
        headerLength: Int,
        sourceIp: InetAddress,
        destIp: InetAddress
    ): PacketMetadata? {
        if (length < headerLength + 8) return null
        val sourcePort = readUnsignedShort(buffer, headerLength)
        val destPort = readUnsignedShort(buffer, headerLength + 2)
        val dnsHost = if (destPort == 53 || sourcePort == 53) parseDnsQuery(buffer, headerLength + 8, length) else null
        return PacketMetadata(
            localAddress = sourceIp,
            localPort = sourcePort,
            remoteAddress = destIp,
            remotePort = destPort,
            protocol = 17,
            host = dnsHost,
            source = "VPN",
            reason = if (dnsHost != null) "DNS inspection" else "UDP traffic observed"
        )
    }

    private fun parseTcp(
        buffer: ByteArray,
        length: Int,
        headerLength: Int,
        sourceIp: InetAddress,
        destIp: InetAddress
    ): PacketMetadata? {
        if (length < headerLength + 20) return null
        val sourcePort = readUnsignedShort(buffer, headerLength)
        val destPort = readUnsignedShort(buffer, headerLength + 2)
        return PacketMetadata(
            localAddress = sourceIp,
            localPort = sourcePort,
            remoteAddress = destIp,
            remotePort = destPort,
            protocol = 6,
            host = null,
            source = "VPN",
            reason = "TCP flow observed"
        )
    }

    private fun parseDnsQuery(buffer: ByteArray, offset: Int, length: Int): String? {
        if (length < offset + 12) return null
        var cursor = offset + 12
        val builder = StringBuilder()
        while (cursor < length) {
            val labelLength = buffer[cursor].toInt() and 0xFF
            if (labelLength == 0) {
                break
            }
            cursor++
            if (cursor + labelLength > length) return null
            if (builder.isNotEmpty()) builder.append('.')
            builder.append(String(buffer, cursor, labelLength))
            cursor += labelLength
        }
        return builder.takeIf { it.isNotEmpty() }?.toString()
    }

    private fun readUnsignedShort(data: ByteArray, offset: Int): Int {
        return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
    }
}
