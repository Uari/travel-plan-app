import bcrypt from 'npm:bcryptjs@2.4.3'

const BCRYPT_ROUNDS = 10
const LEGACY_SHA256_REGEX = /^[a-f0-9]{64}$/i
const BCRYPT_REGEX = /^\$2[aby]\$/

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS)
}

// 저장된 해시가 bcrypt인지, 예전 방식(무솔트 SHA-256)인지 판별해 비교한다.
// 레거시 해시와 일치하면 이번 요청을 계기로 bcrypt로 재해시할 수 있도록 needsRehash를 true로 반환한다.
export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<{ matches: boolean; needsRehash: boolean }> {
  if (BCRYPT_REGEX.test(storedHash)) {
    const matches = await bcrypt.compare(plainPassword, storedHash)
    return { matches, needsRehash: false }
  }

  if (LEGACY_SHA256_REGEX.test(storedHash)) {
    const legacyHash = await sha256Hex(plainPassword)
    const matches = legacyHash === storedHash
    return { matches, needsRehash: matches }
  }

  return { matches: false, needsRehash: false }
}
