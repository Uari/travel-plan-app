import { useState, useEffect, useCallback, useRef } from 'react'

// Supabase list-fetch 공통 훅: 로딩/에러 상태 관리 + tripId 등 deps가 바뀌면 자동 재조회.
// queryFn은 supabase 쿼리를 실행하고 { data, error }를 반환하는 함수여야 한다.
export function useSupabaseQuery(queryFn, deps) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data: result, error: queryError } = await queryFn()
    if (!isMountedRef.current) return

    if (queryError) {
      console.error(queryError)
      setError(queryError)
      setData([])
    } else {
      setError(null)
      setData(result || [])
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
