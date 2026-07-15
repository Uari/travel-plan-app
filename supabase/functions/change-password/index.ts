import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const { id, currentPassword, newPassword } = await req.json()

    if (!id || !currentPassword || !newPassword) {
      return jsonResponse({ error: 'invalid_input', message: '모든 필드를 입력해주세요.' }, 400)
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

    const { matches } = await verifyPassword(currentPassword, user.password)
    if (!matches) {
      return jsonResponse({ error: 'wrong_password', message: '현재 비밀번호가 틀렸습니다.' }, 401)
    }

    const newHash = await hashPassword(newPassword)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: newHash })
      .eq('id', id)

    if (updateError) {
      console.error(updateError)
      return jsonResponse({ error: 'server_error', message: '비밀번호 변경 중 오류가 발생했습니다.' }, 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'server_error', message: '서버 오류가 발생했습니다.' }, 500)
  }
})
