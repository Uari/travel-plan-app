import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const { id, password } = await req.json()
    const trimmedId = typeof id === 'string' ? id.trim() : ''
    const trimmedPw = typeof password === 'string' ? password.trim() : ''

    if (!trimmedId || !trimmedPw) {
      // 처리된 실패는 200으로 응답(본문 error로 구분) → 브라우저 콘솔 네트워크 에러 방지
      return jsonResponse({ error: 'invalid_input', message: '아이디와 비밀번호를 모두 입력해주세요.' })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, password, is_deleted')
      .eq('id', trimmedId)
      .single()

    if (error || !user) {
      return jsonResponse({ error: 'not_found', message: '아이디가 존재하지 않습니다.' })
    }

    if (user.is_deleted) {
      return jsonResponse({ error: 'deleted', message: '탈퇴 처리된 계정입니다.' })
    }

    const { matches, needsRehash } = await verifyPassword(trimmedPw, user.password)

    if (!matches) {
      return jsonResponse({ error: 'wrong_password', message: '비밀번호가 일치하지 않습니다.' })
    }

    if (needsRehash) {
      // 예전 무솔트 SHA-256 해시로 로그인에 성공한 경우, 이번 기회에 bcrypt로 재해시한다.
      const newHash = await hashPassword(trimmedPw)
      await supabaseAdmin.from('users').update({ password: newHash }).eq('id', trimmedId)
    }

    return jsonResponse({ user: { id: user.id, name: user.name } })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'server_error', message: '서버 오류가 발생했습니다.' }, 500)
  }
})
