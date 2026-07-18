import { supabase } from './supabase.js'

// Supabase Edge Function 호출 공통 래퍼.
// 함수가 4xx/5xx로 응답하면 supabase-js는 본문을 자동으로 파싱해주지 않으므로 직접 읽는다.
async function invokeAuthFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    // 예기치 못한 오류(함수 크래시 등, 5xx). 본문이 있으면 그 메시지를 사용한다.
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

  // 로그인 실패·탈퇴 계정 등 "처리된 실패"는 HTTP 200 + 본문 error로 내려온다.
  // (브라우저 콘솔에 4xx 네트워크 에러가 찍히지 않도록 하기 위함)
  if (data && data.error) {
    return { data: null, error: data }
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
