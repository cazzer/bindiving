/**
 * SSRF protection: resolve a URL's hostname and reject private/internal IPs
 * before allowing a server-side fetch.
 */
import dns from 'node:dns/promises'

const PRIVATE_RANGES: RegExp[] = [
  /^127\./,                          // IPv4 loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,     // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local (cloud metadata)
  /^0\./,                            // "This" network
  /^::1$/,                           // IPv6 loopback
  /^f[cd]/i,                         // IPv6 ULA (fc00::/7)
  /^fe80/i,                          // IPv6 link-local
]

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip))
}

/**
 * Resolve the hostname of a URL and throw if it points to a private/internal address.
 */
export async function assertPublicUrl(url: string): Promise<void> {
  const { hostname } = new URL(url)
  const { address } = await dns.lookup(hostname)
  if (isPrivateIp(address)) {
    throw new Error('URL resolves to a private/internal address')
  }
}
