package com.tacu.ns;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ConnectException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NoRouteToHostException;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "LanScan")
public class LanScanPlugin extends Plugin {

    private static final String TAG = "LanScan";

    // CRITICAL: Only use ports that home ISP modems do NOT actively block with TCP RST.
    // Ports like 445 (SMB), 23 (Telnet), 53 (DNS), 3389 (RDP) are commonly RST'd by
    // ISP equipment FOR ANY destination IP — causing ghost IPs to appear "alive".
    private static final int[] TCP_FALLBACK_PORTS = {80, 443, 22, 8080, 21};
    private static final int THREAD_COUNT = 50;

    @PluginMethod
    public void scan(final PluginCall call) {
        final String subnet  = call.getString("subnet", "192.168.1");
        final int timeoutMs  = call.getInt("timeout", 400);

        new Thread(() -> {
            Log.d(TAG, "=== LAN Scan start: " + subnet + ".0/24 ===");

            // ── PRIMARY: ARP-based discovery ─────────────────────────────────────
            // This is the only method immune to ISP modem proxy ARP / port blocking.
            // Algorithm:
            //   1. Send UDP datagrams to all 254 IPs → forces kernel ARP resolution
            //   2. Read ARP neighbor table
            //   3. Detect "proxy ARP MACs" (a MAC appearing for many IPs = gateway doing proxy ARP)
            //   4. Filter out ghost IPs (those with a proxy ARP MAC)
            //   5. Real devices have unique MACs that don't match any gateway

            List<String> liveIPs = arpBasedScan(subnet);
            Log.d(TAG, "ARP scan result: " + liveIPs.size() + " devices");

            // ── FALLBACK: TCP scan (only if ARP gave no results) ──────────────────
            // Falls back to original conservative TCP probe logic.
            // Uses only ports ISPs don't RST: {80, 443, 22, 8080, 21}
            if (liveIPs.size() < 2) {
                Log.d(TAG, "ARP insufficient — TCP fallback");
                liveIPs = tcpBasedScan(subnet, timeoutMs);
                Log.d(TAG, "TCP fallback result: " + liveIPs.size() + " devices");
            }

            // Deduplicate
            List<String> unique = new ArrayList<>(new HashSet<>(liveIPs));

            // Read ARP table for MAC addresses (best-effort)
            Map<String, String> arpTable = readArpTable();

            Log.d(TAG, "=== Returning " + unique.size() + " devices ===");

            JSArray devices = new JSArray();
            for (String ip : unique) {
                JSObject dev = new JSObject();
                dev.put("ip", ip);
                String mac = arpTable.containsKey(ip) ? arpTable.get(ip) : "";
                dev.put("mac", mac);
                devices.put(dev);
            }

            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);

        }).start();
    }

    // ─── ARP-based scan ──────────────────────────────────────────────────────────

    private List<String> arpBasedScan(String subnet) {
        // Step 1: Trigger ARP resolution for all subnet IPs via UDP
        // Each UDP send forces the kernel to broadcast an ARP request for that IP.
        // Real devices reply with their MAC; ghost IPs either get no reply or proxy ARP.
        triggerArpResolution(subnet);

        // Wait for ARP replies to be processed by the kernel
        try { Thread.sleep(800); } catch (InterruptedException ignored) {}

        // Step 2: Read ARP/neighbor table
        Map<String, String> arpTable = readArpTable();
        Log.d(TAG, "ARP table entries after UDP trigger: " + arpTable.size());
        if (arpTable.isEmpty()) {
            Log.w(TAG, "ARP table empty — will use TCP fallback");
            return new ArrayList<>();
        }

        // Step 3: Detect proxy ARP MACs.
        // Proxy ARP: the gateway responds to ARP on behalf of ALL IPs in the subnet.
        // This causes ghost IPs to appear in the ARP table with the GATEWAY's MAC.
        // Detection: any MAC that appears for more than PROXY_THRESHOLD different IPs
        // is doing proxy ARP. Real device MACs appear exactly once.
        final int PROXY_THRESHOLD = 5;
        Map<String, Integer> macFrequency = new HashMap<>();
        for (Map.Entry<String, String> entry : arpTable.entrySet()) {
            String ip  = entry.getKey();
            String mac = entry.getValue();
            if (!ip.startsWith(subnet + ".")) continue;
            if (mac == null || mac.isEmpty() || mac.equals("00:00:00:00:00:00")) continue;
            int count = macFrequency.containsKey(mac) ? macFrequency.get(mac) : 0;
            macFrequency.put(mac, count + 1);
        }

        Set<String> proxyMacs = new HashSet<>();
        for (Map.Entry<String, Integer> entry : macFrequency.entrySet()) {
            if (entry.getValue() > PROXY_THRESHOLD) {
                proxyMacs.add(entry.getKey());
                Log.d(TAG, "Proxy ARP MAC: " + entry.getKey() + " → " + entry.getValue() + " IPs");
            }
        }

        // Also mark explicit gateway MACs (.1 and .254) as proxy candidates
        String gw1Mac   = arpTable.get(subnet + ".1");
        String gw254Mac = arpTable.get(subnet + ".254");
        if (gw1Mac   != null) proxyMacs.add(gw1Mac);
        if (gw254Mac != null) proxyMacs.add(gw254Mac);

        Log.d(TAG, "Proxy MACs identified: " + proxyMacs.size());

        // Step 4: Filter — keep only real devices
        List<String> realDevices = new ArrayList<>();
        for (Map.Entry<String, String> entry : arpTable.entrySet()) {
            String ip  = entry.getKey();
            String mac = entry.getValue();

            if (!ip.startsWith(subnet + ".")) continue;

            // Always include gateway IPs themselves (.1, .254)
            boolean isGateway = ip.equals(subnet + ".1") || ip.equals(subnet + ".254");
            if (isGateway) {
                if (mac != null && !mac.isEmpty() && !mac.equals("00:00:00:00:00:00")) {
                    realDevices.add(ip);
                    Log.d(TAG, "Gateway kept: " + ip + " [" + mac + "]");
                }
                continue;
            }

            // Skip incomplete entries
            if (mac == null || mac.isEmpty() || mac.equals("00:00:00:00:00:00")) continue;

            // Ghost IP check: if MAC belongs to a proxy ARP gateway, skip
            if (proxyMacs.contains(mac)) {
                Log.d(TAG, "Ghost IP filtered: " + ip + " [" + mac + "]");
                continue;
            }

            Log.d(TAG, "Real device: " + ip + " [" + mac + "]");
            realDevices.add(ip);
        }

        return realDevices;
    }

    /**
     * Sends one UDP datagram to each IP in the /24 subnet.
     * Purpose: forces the Android kernel to perform ARP (layer 2) for each destination.
     * The UDP packet itself doesn't need a response — we only need the ARP side effect.
     * Each thread creates its own DatagramSocket (thread-safety: DatagramSocket is not thread-safe).
     */
    private void triggerArpResolution(String subnet) {
        Log.d(TAG, "Triggering ARP resolution for " + subnet + ".1-254");
        ExecutorService ex = Executors.newFixedThreadPool(THREAD_COUNT);

        for (int i = 1; i <= 254; i++) {
            final String ip = subnet + "." + i;
            ex.submit(() -> {
                DatagramSocket sock = null;
                try {
                    sock = new DatagramSocket();
                    sock.setSoTimeout(50);
                    InetAddress addr = InetAddress.getByName(ip);
                    // Port 9 = discard service. Empty payload, just need the ARP lookup.
                    byte[] buf = new byte[1];
                    DatagramPacket pkt = new DatagramPacket(buf, 1, addr, 9);
                    sock.send(pkt);
                } catch (Exception ignored) {
                    // Expected: ICMP unreachable, network unreachable, timeout — all fine
                } finally {
                    if (sock != null && !sock.isClosed()) sock.close();
                }
            });
        }

        ex.shutdown();
        try { ex.awaitTermination(7, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
        Log.d(TAG, "ARP trigger complete");
    }

    // ─── TCP-based fallback scan ──────────────────────────────────────────────────

    /**
     * Conservative TCP probe — used only when ARP scan returns no results.
     *
     * Uses ONLY {80, 443, 22, 8080, 21}: ports that ISP equipment does NOT actively RST.
     * Port filtering logic (proven reliable):
     *   ConnectException (TCP RST)     = real device exists, port just closed
     *   NoRouteToHostException         = ICMP host-unreachable from router = no device
     *   SocketTimeoutException         = no response at all = try next port
     *
     * Do NOT add ports 445, 23, 53, 3389, 554 here — ISP modems RST those for ANY IP,
     * causing ghost devices even for non-existent IPs.
     */
    private List<String> tcpBasedScan(String subnet, int timeoutMs) {
        ExecutorService ex = Executors.newFixedThreadPool(THREAD_COUNT);
        List<Future<String>> futures = new ArrayList<>();

        for (int i = 1; i <= 254; i++) {
            final String ip = subnet + "." + i;
            futures.add(ex.submit(new Callable<String>() {
                @Override
                public String call() {
                    return tcpProbe(ip, timeoutMs) ? ip : null;
                }
            }));
        }

        ex.shutdown();
        try { ex.awaitTermination(60, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
        try { Thread.sleep(300); } catch (InterruptedException ignored) {}

        List<String> result = new ArrayList<>();
        for (Future<String> f : futures) {
            try {
                String ip = f.get();
                if (ip != null) result.add(ip);
            } catch (Exception ignored) {}
        }
        return result;
    }

    private boolean tcpProbe(String ip, int timeout) {
        for (int port : TCP_FALLBACK_PORTS) {
            Socket socket = new Socket();
            try {
                socket.connect(new InetSocketAddress(ip, port), timeout);
                return true;
            } catch (ConnectException e) {
                return true;  // TCP RST = device present
            } catch (NoRouteToHostException e) {
                return false; // ICMP unreachable = no device at this IP
            } catch (SocketTimeoutException e) {
                // No response on this port — try next
            } catch (IOException e) {
                String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                if (msg.contains("refused"))     return true;
                if (msg.contains("unreachable")) return false;
            } finally {
                try { socket.close(); } catch (IOException ignored) {}
            }
        }
        return false;
    }

    // ─── ARP/neighbor table reader ────────────────────────────────────────────────

    /**
     * Reads the kernel ARP/neighbor cache. Tries three sources in priority order.
     *
     * Source 1: /proc/net/arp — fastest, works on Android 8/9
     * Source 2: /system/bin/ip neigh show — works on Android 10+ (full path required;
     *           direct /proc access is restricted for apps targeting API 29+)
     * Source 3: arp -a — last resort
     */
    private Map<String, String> readArpTable() {
        Map<String, String> table = new HashMap<>();

        // Source 1
        try (BufferedReader r = new BufferedReader(new FileReader("/proc/net/arp"))) {
            String line;
            r.readLine(); // skip header row
            while ((line = r.readLine()) != null) {
                String[] p = line.trim().split("\\s+");
                // Format: IP  HW-type  Flags  MAC  Mask  Device
                if (p.length >= 4 && p[3].contains(":") && !p[3].equals("00:00:00:00:00:00")) {
                    table.put(p[0], p[3].toUpperCase());
                }
            }
            if (!table.isEmpty()) {
                Log.d(TAG, "ARP via /proc/net/arp: " + table.size());
                return table;
            }
        } catch (Exception e) {
            Log.d(TAG, "/proc/net/arp: " + e.getMessage());
        }

        // Source 2
        try {
            Process proc = Runtime.getRuntime().exec(
                new String[]{"/system/bin/ip", "neigh", "show"});
            BufferedReader r = new BufferedReader(new InputStreamReader(proc.getInputStream()));
            String line;
            while ((line = r.readLine()) != null) {
                // Format: 192.168.0.1 dev wlan0 lladdr aa:bb:cc:dd:ee:ff REACHABLE|STALE|...
                int ll = line.indexOf("lladdr");
                if (ll < 0) continue;
                String[] words = line.split("\\s+");
                if (words.length < 1) continue;
                String ipPart = words[0];
                String[] after = line.substring(ll).split("\\s+");
                if (after.length >= 2 && after[1].contains(":") &&
                    !after[1].equals("00:00:00:00:00:00")) {
                    table.put(ipPart, after[1].toUpperCase());
                }
            }
            proc.waitFor(2, TimeUnit.SECONDS);
            proc.destroyForcibly();
            if (!table.isEmpty()) {
                Log.d(TAG, "ARP via ip neigh: " + table.size());
                return table;
            }
        } catch (Exception e) {
            Log.d(TAG, "ip neigh show: " + e.getMessage());
        }

        // Source 3
        try {
            Process proc = Runtime.getRuntime().exec("arp -a");
            BufferedReader r = new BufferedReader(new InputStreamReader(proc.getInputStream()));
            String line;
            while ((line = r.readLine()) != null) {
                // Format: hostname (192.168.0.1) at aa:bb:cc:dd:ee:ff [ether] on wlan0
                int s = line.indexOf('('), e2 = line.indexOf(')'), a = line.indexOf(" at ");
                if (s < 0 || e2 < 0 || a < 0) continue;
                String ip  = line.substring(s + 1, e2);
                String mac = line.substring(a + 4).trim().split("\\s+")[0];
                if (mac.contains(":") && !mac.equals("00:00:00:00:00:00")) {
                    table.put(ip, mac.toUpperCase());
                }
            }
            proc.waitFor(2, TimeUnit.SECONDS);
            proc.destroyForcibly();
            Log.d(TAG, "ARP via arp -a: " + table.size());
        } catch (Exception e) {
            Log.d(TAG, "arp -a: " + e.getMessage());
        }

        return table;
    }
}
