import { SignJWT } from 'npm:jose@5'

// 발급 토큰 수명. 필요 시 여기만 조정한다.
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export async function signAppToken(userId: string): Promise<string> {
  const secret = Deno.env.get('APP_JWT_SECRET')
  if (!secret) {
    throw new Error('APP_JWT_SECRET 환경변수가 설정되지 않았습니다.')
  }

  const key = new TextEncoder().encode(secret)
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    role: 'authenticated',
    aud: 'authenticated',
    sub: userId,
    app_user_id: userId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(key)
}
