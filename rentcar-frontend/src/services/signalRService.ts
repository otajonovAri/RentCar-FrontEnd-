import * as signalR from '@microsoft/signalr'
import { BASE_URL } from '@/api/axiosInstance'

// ── Event type'lari ────────────────────────────────────────────────────────────
export interface SignalRNotification {
  id:        number
  title:     string
  body:      string
  type:      string
  isRead:    boolean
  createdAt: string
}

export interface SignalRMessage {
  id:             number
  conversationId: number
  senderId:       number
  senderName:     string
  senderAvatarUrl: string | null
  senderRole:     string
  body:           string
  status:         string
  sentAt:         string
  isEdited:       boolean
  isDeleted:      boolean
}

// ── Singleton SignalR service ──────────────────────────────────────────────────
class SignalRService {
  private connection: signalR.HubConnection | null = null

  // ── Ulanish ──────────────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    if (
      this.connection?.state === signalR.HubConnectionState.Connected ||
      this.connection?.state === signalR.HubConnectionState.Connecting ||
      this.connection?.state === signalR.HubConnectionState.Reconnecting
    ) return

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/app`, {
        // Token factory: har reconnect'da yangi token oladi
        accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
        // WebSocket → SSE → Long Polling fallback
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Reconnect bo'lganda log
    this.connection.onreconnecting(() =>
      console.info('[SignalR] Qayta ulanmoqda...')
    )
    this.connection.onreconnected(() =>
      console.info('[SignalR] Qayta ulandi ✅')
    )
    this.connection.onclose((err) => {
      if (err) console.warn('[SignalR] Ulanish uzildi:', err)
    })

    try {
      await this.connection.start()
      console.info('[SignalR] Ulandi ✅')
    } catch (err) {
      console.warn('[SignalR] Ulanishda xatolik:', err)
    }
  }

  // ── Uzish ─────────────────────────────────────────────────────────────────────
  async disconnect(): Promise<void> {
    if (!this.connection) return
    try {
      await this.connection.stop()
    } catch {
      // ignore
    }
    this.connection = null
    console.info('[SignalR] Uzildi')
  }

  // ── Event tinglash ────────────────────────────────────────────────────────────
  on<T extends unknown[]>(event: string, callback: (...args: T) => void): void {
    this.connection?.on(event, callback as (...args: unknown[]) => void)
  }

  off<T extends unknown[]>(event: string, callback: (...args: T) => void): void {
    this.connection?.off(event, callback as (...args: unknown[]) => void)
  }

  // ── Server methodlarini chaqirish ─────────────────────────────────────────────
  async invoke(method: string, ...args: unknown[]): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return
    try {
      await this.connection.invoke(method, ...args)
    } catch (err) {
      console.warn(`[SignalR] invoke(${method}) xatolik:`, err)
    }
  }

  // ── Holat ─────────────────────────────────────────────────────────────────────
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected
  }

  get state(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null
  }
}

// Butun app bo'yicha bitta instance
export const signalRService = new SignalRService()
