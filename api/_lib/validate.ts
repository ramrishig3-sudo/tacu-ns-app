/**
 * CyberShield Pro — Input Validation Utilities
 * Shared between Vercel serverless functions and Express local server.
 */

export function isValidIPv4(ip: string): boolean {
  const regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return regex.test(ip);
}

export function isValidIPv6(ip: string): boolean {
  // Simplified IPv6 validation covering common formats
  const regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return regex.test(ip);
}

export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

export function isValidDomain(domain: string): boolean {
  const regex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>"'&;(){}]/g, "").substring(0, 500);
}

export function validateScanRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const { ip } = body;

  if (!ip || typeof ip !== "string") {
    return { valid: false, error: "IP address is required" };
  }

  const sanitized = sanitizeInput(ip);

  if (!isValidIP(sanitized)) {
    return { valid: false, error: `Invalid IP address format: ${sanitized}` };
  }

  return { valid: true };
}
