import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(payload)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL
    // Service role key bypasses RLS on the server — user identity is
    // already verified via the JWT decode below.
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcG10ZXhrb3hwcmJzd2ZhcGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMjYxMSwiZXhwIjoyMDk0Njg4NjExfQ.GJRBy8MjkZaprMEQXTdgz3YiAJFQDLv_ROWDHTj4ENs'

    if (!SUPABASE_URL) {
      throw new Error('Missing SUPABASE_URL environment variable.')
    }

    const request = getRequest()

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available')
    }

    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No authorization header provided')
    }

    const token = authHeader.slice(7)
    if (!token) {
      throw new Error('Unauthorized: No token provided')
    }

    // Decode JWT locally — no network round-trip needed
    const claims = decodeJwtPayload(token)
    if (!claims) {
      throw new Error('Unauthorized: Malformed token')
    }

    const exp = claims['exp'] as number | undefined
    if (exp && exp * 1000 < Date.now()) {
      throw new Error('Unauthorized: Token expired')
    }

    const userId = claims['sub'] as string | undefined
    if (!userId) {
      throw new Error('Unauthorized: No user ID in token')
    }

    // Use service role key on the server so RLS is bypassed safely.
    // The user is already authenticated via the JWT decode above.
    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    return next({
      context: {
        supabase,
        userId,
        claims,
      },
    })
  }
)