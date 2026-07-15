import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { verifyPassword } from '../_shared/password.ts'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const { id, password } = await req.json()

    if (!id || !password) {
      return jsonResponse({ error: 'invalid_input', message: '비밀번호를 입력해주세요.' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('password')
      .eq('id', id)
      .single()

    if (error || !user) {
      return jsonResponse({ error: 'not_found', message: '사용자를 찾을 수 없습니다.' }, 404)
    }

    const { matches } = await verifyPassword(password, user.password)
    if (!matches) {
      return jsonResponse({ error: 'wrong_password', message: '비밀번호가 틀렸습니다.' }, 401)
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_deleted: true })
      .eq('id', id)

    if (updateError) {
      console.error(updateError)
      return jsonResponse({ error: 'server_error', message: '회원 탈퇴 중 오류가 발생했습니다.' }, 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'server_error', message: '서버 오류가 발생했습니다.' }, 500)
  }
})
