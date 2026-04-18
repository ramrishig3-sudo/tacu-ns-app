package com.tacu.nsfwzerotrust.vpn

import java.net.InetAddress

data class PacketMetadata(
    val localAddress: InetAddress,
    val localPort: Int,
    val remoteAddress: InetAddress,
    val remotePort: Int,
    val protocol: Int,
    val host: String?,
    val source: String,
    val reason: String
)
