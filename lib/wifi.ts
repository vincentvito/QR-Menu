export type WifiEncryption = 'WPA' | 'WEP' | 'nopass'

export const WIFI_ENCRYPTIONS: WifiEncryption[] = ['WPA', 'WEP', 'nopass']

export function isWifiEncryption(value: unknown): value is WifiEncryption {
  return typeof value === 'string' && (WIFI_ENCRYPTIONS as string[]).includes(value)
}

// Escapes the five characters with special meaning in the WIFI: URI grammar
// (backslash, semicolon, comma, double quote, colon) by prefixing them with a
// backslash. Without this, SSIDs/passwords containing ; or : break camera apps.
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1')
}

export interface WifiConfig {
  ssid: string
  password?: string | null
  encryption?: WifiEncryption
  hidden?: boolean
}

export function buildWifiUri({
  ssid,
  password,
  encryption = 'WPA',
  hidden = false,
}: WifiConfig): string {
  const t = encryption
  const s = escapeWifiField(ssid)
  const p = encryption === 'nopass' ? '' : escapeWifiField(password ?? '')
  const h = hidden ? 'true' : ''
  return `WIFI:T:${t};S:${s};P:${p};H:${h};;`
}
