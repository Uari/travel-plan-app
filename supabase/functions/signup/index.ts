import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { hashPassword } from '../_shared/password.ts'
import { signAppToken } from '../_shared/token.ts'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const { id, password, name } = await req.json()
    const trimmedId = typeof id === 'string' ? id.trim() : ''
    const trimmedPw = typeof password === 'string' ? password.trim() : ''
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedId || !trimmedPw || !trimmedName) {
      // 처리된 실패는 200으로 응답(본문 error로 구분) → 브라우저 콘솔 네트워크 에러 방지
      return jsonResponse({ error: 'invalid_input', message: '아이디, 비밀번호, 닉네임을 모두 입력해주세요.' })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', trimmedId)
      .single()

    if (existingUser) {
      return jsonResponse({ error: 'id_taken', message: '이미 존재하는 아이디입니다.' })
    }

    const hashedPassword = await hashPassword(trimmedPw)

    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: trimmedId,
      password: hashedPassword,
      name: trimmedName,
    })

    if (insertError) {
      console.error(insertError)
      return jsonResponse({ error: 'server_error', message: '회원가입 중 오류가 발생했습니다.' }, 500)
    }

    const token = await signAppToken(trimmedId)

    return jsonResponse({ user: { id: trimmedId, name: trimmedName }, token })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'server_error', message: '서버 오류가 발생했습니다.' }, 500)
  }
})
