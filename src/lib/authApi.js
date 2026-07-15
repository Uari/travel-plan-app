import { supabase } from './supabase.js'

// Supabase Edge Function 호출 공통 래퍼.
// 함수가 4xx/5xx로 응답하면 supabase-js는 본문을 자동으로 파싱해주지 않으므로 직접 읽는다.
async function invokeAuthFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      try {
        const parsed = await error.context.json()
        return { data: null, error: parsed }
      } catch {
        // fall through to generic error below
      }
    }
    return { data: null, error: { error: 'server_error', message: error.message } }
  }

  return { data, error: null }
}

export function login(id, password) {
  return invokeAuthFunction('login', { id, password })
}

export function signup(id, password, name) {
  return invokeAuthFunction('signup', { id, password, name })
}

export function changePassword(id, currentPassword, newPassword) {
  return invokeAuthFunction('change-password', { id, currentPassword, newPassword })
}

export function deleteAccount(id, password) {
  return invokeAuthFunction('delete-account', { id, password })
}
