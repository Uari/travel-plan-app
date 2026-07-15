import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import confetti from "canvas-confetti";
import { KOREA_REGIONS } from "../data/regions.js";
import KoreaMapSVG from "../components/KoreaMapSVG.jsx";
import { supabase } from "../lib/supabase.js";
import { useTripContext } from "../context/TripContext.jsx";
import BottomSheetModal from "../components/BottomSheetModal.jsx";
import TripCompleteModal from "../components/TripCompleteModal.jsx";
import "./DashboardPage.css";

export default function DashboardPage() {
  const { user, tripId, tripData, setTripData, isAdmin } = useTripContext();
  const [excludedRegions, setExcludedRegions] = useState(() => {
    const saved = localStorage.getItem("travelplan_excluded");
    return saved ? JSON.parse(saved) : [];
  });
  const [showExcludePanel, setShowExcludePanel] = useState(false);
  const [result, setResult] = useState(null);
  const [dartState, setDartState] = useState("idle"); // idle | flying | landed
  const [isDragging, setIsDragging] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Trip Date management
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState("");

  // Trip Name management
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");

  // Trip Complete management
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleCompleteTrip = async (payload) => {
    setCompleting(true);
    const { error } = await supabase
      .from('trips')
      .update({ ...payload, is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', tripId);
    setCompleting(false);
    if (error) {
      console.error(error);
      alert('여행 완료 처리에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setTripData((prev) => (prev ? { ...prev, ...payload, is_completed: true } : prev));
    setShowCompleteModal(false);
  };

  const handleUncompleteTrip = async () => {
    if (!window.confirm('여행 완료를 취소할까요? 여행 로그에서 제외되지만, 올린 사진과 후기는 그대로 유지됩니다.')) return;
    const { error } = await supabase
      .from('trips')
      .update({ is_completed: false, completed_at: null })
      .eq('id', tripId);
    if (error) {
      console.error(error);
      alert('완료 취소에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setTripData((prev) => (prev ? { ...prev, is_completed: false } : prev));
  };

  useEffect(() => {
    // Defer map rendering to prevent stuttering during page transition
    const timer = setTimeout(() => setMapLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateDate = async (e) => {
    e.preventDefault();
    const newDate = tempDate || null;
    const { error } = await supabase.from('trips').update({ start_date: newDate }).eq('id', tripId);
    if (error) {
      console.error(error);
      alert('여행 시작일 변경에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setTripData(prev => ({ ...prev, start_date: newDate }));
    setShowDateModal(false);
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const { error } = await supabase.from('trips').update({ name: tempName.trim() }).eq('id', tripId);
    if (error) {
      console.error(error);
      alert('여행 방 이름 변경에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setTripData(prev => ({ ...prev, name: tempName.trim() }));
    setShowNameModal(false);
  };

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dartRotate = useMotionValue(0);

  const availableRegions = KOREA_REGIONS.filter(
    (r) => !excludedRegions.includes(r.id),
  );

  const toggleExclude = (id) => {
    setExcludedRegions((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem("travelplan_excluded", JSON.stringify(next));
      return next;
    });
  };

  const throwDart = useCallback(
    (flyX = 0, flyY = -500) => {
      if (dartState === "flying" || availableRegions.length === 0) return;
      const picked =
        availableRegions[Math.floor(Math.random() * availableRegions.length)];

      setDartState("flying");
      setResult(null);

      // 날아가는 애니메이션 (당긴 방향의 반대로 날아감 + 회전)
      animate(dragX, flyX, { duration: 0.6, ease: [0.17, 0.67, 0.83, 0.67] });
      animate(dragY, flyY, { duration: 0.6, ease: [0.17, 0.67, 0.83, 0.67] });
      animate(dartRotate, 1080, { duration: 0.6, ease: "linear" });

      setTimeout(() => {
        setDartState("landed");
        setResult(picked);
        // 초기화
        dragX.set(0);
        dragY.set(0);
        dartRotate.set(0);

        // 약간의 지연을 주어 팝업 애니메이션과 캔버스 렌더링 부하를 분산
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { x: 0.5, y: 0.4 },
            colors: ["#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b", "#f43f5e"],
            useWorker: false, // 워커 생성 오버헤드 제거
            disableForReducedMotion: true,
          });
        }, 50);
      }, 600);
    },
    [dartState, availableRegions, dragX, dragY, dartRotate],
  );

  const handleDragStart = () => {
    if (dartState === "flying") return;
    setIsDragging(true);
    setDartState("idle");
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const { x, y } = info.offset;
    const dist = Math.sqrt(x * x + y * y);

    if (dist > 50) {
      // 당긴 방향의 역방향으로 날려보냄 (슬링샷 물리)
      const flyX = x * -8;
      const flyY = y * -8;
      throwDart(flyX, flyY);
    } else {
      // 덜 당겼으면 제자리로 튕김 (스프링)
      animate(dragX, 0, { type: "spring", stiffness: 500, damping: 15 });
      animate(dragY, 0, { type: "spring", stiffness: 500, damping: 15 });
      animate(dartRotate, 0, { type: "spring", stiffness: 500, damping: 15 });
    }
  };

  const resetDart = () => {
    setDartState("idle");
    setResult(null);
    dragX.set(0);
    dragY.set(0);
    dartRotate.set(0);
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="dashboard-greeting" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {tripData ? <strong>{tripData.name}</strong> : '여행 준비 중...'}
              {tripData && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => {
                    setTempName(tripData.name || '');
                    setShowNameModal(true);
                  }}
                  title="방 이름 변경"
                >
                  ✏️
                </button>
              )}
              {tripData?.is_completed && (
                <span
                  style={{
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-emerald, #10b981)',
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: '999px', padding: '0.15rem 0.5rem', whiteSpace: 'nowrap'
                  }}
                >
                  ✅ 여행 완료
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              안녕하세요, <strong>{user.name}</strong> 님! 👋
            </p>
            {isAdmin && tripData && (
              tripData.is_completed ? (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                  onClick={handleUncompleteTrip}
                >
                  완료 취소
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem', fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => setShowCompleteModal(true)}
                >
                  ✅ 여행 완료
                </button>
              )
            )}
          </div>
          <button
            id="exclude-filter-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowExcludePanel(true)}
          >
            🚫 제외 설정
            {excludedRegions.length > 0 && (
              <span className="exclude-badge">{excludedRegions.length}</span>
            )}
          </button>
        </div>

        {/* Date Editor Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span>📅 여행 시작일:</span>
            <strong style={{ color: tripData?.start_date ? 'var(--primary-color)' : 'var(--text-muted)' }}>
              {tripData?.start_date ? tripData.start_date : '미정 (클릭해서 설정)'}
            </strong>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => {
              setTempDate(tripData?.start_date || '');
              setShowDateModal(true);
            }}
          >
            변경
          </button>
        </div>
      </div>

      {/* Map and Dart container combined for overlay */}
      <div className="map-and-dart-container">
        <div className="map-container">
          {mapLoaded ? (
            <KoreaMapSVG result={result} dartState={dartState} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              지도를 불러오는 중...
            </div>
          )}

          {/* Result overlay */}
          <AnimatePresence mode="wait">
            {dartState === "landed" && result && (
              <motion.div
                className="result-popup"
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="result-emoji">{result.emoji}</div>
                <div className="result-name">{result.name}</div>
                <div className="result-keywords">
                  {result.keywords.map((kw, i) => (
                    <span key={i} className="result-keyword">
                      #{kw}
                    </span>
                  ))}
                </div>
                <button
                  id="result-reset-btn"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "0.75rem" }}
                  onClick={resetDart}
                >
                  다시 뽑기 🔄
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dart throw area */}
        <div className="dart-area">
          {dartState !== "landed" && (
            <>
              <div className="dart-wrapper">
                {/* 고무줄(텐션 라인) 시각 효과 (DOM 마운트/언마운트 방지 및 단일 선으로 성능 최적화) */}
                <svg
                  className="tension-line"
                  viewBox="-200 -200 400 400"
                  style={{
                    opacity: isDragging ? 1 : 0,
                    transition: "opacity 0.1s",
                  }}
                >
                  <motion.line
                    x1="0"
                    y1="0"
                    x2={dragX}
                    y2={dragY}
                    stroke="rgba(244, 63, 94, 0.6)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <motion.circle
                    cx="0"
                    cy="0"
                    r="4"
                    fill="rgba(244, 63, 94, 0.8)"
                  />
                </svg>

                <motion.div
                  className={`dart-icon${isDragging ? " dragging" : ""}${dartState === "flying" ? " flying" : ""}`}
                  style={{
                    x: dragX,
                    y: dragY,
                    rotate: dartRotate,
                    scale: 1, // 텍스트(이모지) 스케일링 시 브라우저의 폰트 리렌더링 과부하 방지
                    cursor: dartState === "flying" ? "default" : "grab",
                  }}
                  drag={dartState !== "flying"}
                  dragConstraints={{
                    top: 0,
                    left: -100,
                    right: 100,
                    bottom: 150,
                  }}
                  dragElastic={0.4}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ cursor: "grabbing" }}
                >
                  🎯
                </motion.div>
                {!isDragging && dartState === "idle" && (
                  <motion.div
                    className="dart-pull-hint"
                    animate={{ y: [0, 12, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.4,
                      ease: "easeInOut",
                    }}
                    style={{ pointerEvents: "none" }}
                  >
                    ↓ 다트를 잡아당기세요!
                  </motion.div>
                )}
              </div>

              {/* Quick throw button removed per user request */}
            </>
          )}
        </div>
      </div>

      {/* Trip Complete Modal */}
      <TripCompleteModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onComplete={handleCompleteTrip}
        submitting={completing}
      />

      {/* Date Editor Modal */}
      <BottomSheetModal open={showDateModal} onClose={() => setShowDateModal(false)}>
              <div className="modal-title">📅 여행 시작일 설정</div>
              <form onSubmit={handleUpdateDate}>
                <div className="input-group">
                  <label className="input-label">출발 날짜</label>
                  <input
                    type="date"
                    className="input"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                  />
                  <p className="helper-text" style={{ marginTop: '0.5rem' }}>이 날짜를 기준으로 Day 1, Day 2 일정이 자동 계산됩니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDateModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>적용하기</button>
                </div>
              </form>
      </BottomSheetModal>

      {/* Name Editor Modal */}
      <BottomSheetModal open={showNameModal} onClose={() => setShowNameModal(false)}>
              <div className="modal-title">🏷️ 여행 방 이름 변경</div>
              <form onSubmit={handleUpdateName}>
                <div className="input-group">
                  <label className="input-label">방 이름</label>
                  <input
                    type="text"
                    className="input"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="새로운 방 이름을 입력하세요"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowNameModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>변경하기</button>
                </div>
              </form>
      </BottomSheetModal>

      {/* Exclude Panel Modal */}
      <BottomSheetModal open={showExcludePanel} onClose={() => setShowExcludePanel(false)}>
              <div className="modal-title">🚫 제외할 지역 선택</div>
              <p
                className="text-sm text-muted"
                style={{ marginBottom: "1rem" }}
              >
                최근에 다녀온 곳이나 가기 싫은 곳을 선택하세요.
                <br />
                선택한 지역은 다트 결과에서 제외됩니다.
              </p>
              <div className="exclude-list">
                {KOREA_REGIONS.map((region) => {
                  const isExcluded = excludedRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      id={`exclude-btn-${region.id}`}
                      className={`exclude-item${isExcluded ? " excluded" : ""}`}
                      onClick={() => toggleExclude(region.id)}
                    >
                      <span className="exclude-emoji">{region.emoji}</span>
                      <div className="exclude-text">
                        <span className="exclude-name">{region.name}</span>
                        <span className="exclude-province">
                          {region.province}
                        </span>
                      </div>
                      <span className="exclude-check">
                        {isExcluded ? "✗" : "✓"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                id="exclude-close-btn"
                className="btn btn-primary btn-full"
                style={{ marginTop: "1rem" }}
                onClick={() => setShowExcludePanel(false)}
              >
                완료 ({availableRegions.length}곳 후보)
              </button>
      </BottomSheetModal>
    </div>
  );
}
