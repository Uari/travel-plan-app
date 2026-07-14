// 브라우저 내장 Web Crypto API를 사용한 간단한 SHA-256 해시 함수
export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password); // 비밀번호를 배열로 인코딩
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // 해시 계산
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // 버퍼를 바이트 배열로 변환
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // 16진수 문자열로 변환
  return hashHex;
}
