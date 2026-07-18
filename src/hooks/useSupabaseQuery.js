import { useState, useEffect, useCallback, useRef } from 'react'

// Supabase list-fetch 공통 훅: 로딩/에러 상태 관리 + tripId 등 deps가 바뀌면 자동 재조회.
// queryFn은 supabase 쿼리를 실행하고 { data, error }를 반환하는 함수여야 한다.
//
// loading(전체 로딩 화면)은 최초 조회에서만 true가 된다. 삭제/추가 후 refetch()로
// 다시 불러올 때는 기존 목록을 그대로 둔 채 백그라운드로 갱신하므로, 리스트가
// 로딩 화면으로 통째로 교체됐다가 돌아오면서 스크롤이 맨 위로 튀는 문제를 막는다.
export function useSupabaseQuery(queryFn, deps) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    // 최초 조회에서만 전체 로딩 화면을 보여준다.
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
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
    hasLoadedRef.current = true
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    // deps(예: tripId)가 바뀌면 다른 방의 데이터를 새로 불러오는 것이므로
    // 다시 최초 로딩 화면을 보여주도록 초기화한다.
    hasLoadedRef.current = false
    refetch()
  }, [refetch])

  // setData: 낙관적 업데이트용. 서버 왕복을 기다리지 않고 로컬 목록을 즉시 바꿔
  // 리스트가 부드럽게(layout 애니메이션) 재배치되도록 한다.
  return { data, loading, error, refetch, setData }
}
