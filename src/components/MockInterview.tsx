import React, { useState, useEffect } from 'react';
import { QuestionItem } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  Timer,
  Star,
  Lightbulb,
} from 'lucide-react';

interface MockInterviewProps {
  questions: QuestionItem[];
  onUpdateQuestion: (updated: QuestionItem) => void;
  onExit: () => void;
}

export const MockInterview: React.FC<MockInterviewProps> = ({
  questions,
  onUpdateQuestion,
  onExit,
}) => {
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const activeQuestions = starredOnly
    ? questions.filter((q) => q && q.starred)
    : questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState<number>(60); // 기본 1분 (60초)
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // 터치 스와이프 상태
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const currentQ = activeQuestions[currentIndex] || activeQuestions[0];

  useEffect(() => {
    if (currentQ) {
      setNotes(currentQ.userNotes || '');
      resetTimer(timeLimit);
    }
  }, [currentIndex, currentQ?.id]);

  // 타이머 인터벌
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // 브라우저 경고음 (Web Audio API 빕 사운드)
      playBeep();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // 키보드 단축키 지원 (←: 이전 질문, →: 다음 질문, Space: 시작/일시정지)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, activeQuestions.length]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const resetTimer = (newLimit?: number) => {
    setIsRunning(false);
    setTimeLeft(newLimit !== undefined ? newLimit : timeLimit);
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRandom = () => {
    if (activeQuestions.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * activeQuestions.length);
    if (nextIdx === currentIndex) {
      nextIdx = (currentIndex + 1) % activeQuestions.length;
    }
    setCurrentIndex(nextIdx);
  };

  // 모바일/태블릿 좌우 스와이프 제스처 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      // 왼쪽으로 스와이프 -> 다음 질문
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // 오른쪽으로 스와이프 -> 이전 질문
      handlePrev();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (starredOnly && activeQuestions.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
          <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
        </div>
        <h3 className="text-base font-bold text-slate-800">별표(★)된 핵심 질문이 없습니다</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          예상 질문지 목록에서 집중 훈련할 주요 문항에 별표(★)를 등록해보세요.
        </p>
        <button
          onClick={() => {
            setStarredOnly(false);
            setCurrentIndex(0);
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          전체 질문으로 훈련하기
        </button>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
        <p className="text-slate-500 mb-4 text-sm">연습할 면접 질문이 없습니다.</p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden select-none"
    >
      {/* 상단 네비게이션 헤더 (위치 100% 고정) */}
      <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[11px] sm:text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2 sm:px-2.5 py-1 rounded-lg">
            모의면접 훈련실
          </span>

          {/* 전체 / 핵심만 필터 토글 */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setStarredOnly(false);
                setCurrentIndex(0);
              }}
              className={`px-2 sm:px-3 py-1 rounded-lg transition text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${
                !starredOnly ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 ({questions.length})
            </button>
            <button
              onClick={() => {
                setStarredOnly(true);
                setCurrentIndex(0);
              }}
              className={`px-2 sm:px-3 py-1 rounded-lg transition flex items-center gap-1 text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${
                starredOnly ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>★ 핵심 ({questions.filter((q) => q && q.starred).length})</span>
            </button>
          </div>
        </div>

        {/* 상단 고정 이전/다음 버튼: 질문 길이가 달라져도 위치가 흔들리지 않음! */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-600 rounded-lg transition"
              title="이전 질문 (단축키: ←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-1.5 sm:px-2 font-mono min-w-[48px] sm:min-w-[54px] text-center whitespace-nowrap">
              {activeQuestions.length > 0 ? `${currentIndex + 1} / ${activeQuestions.length}` : '0 / 0'}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === activeQuestions.length - 1}
              className="p-1.5 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-600 rounded-lg transition"
              title="다음 질문 (단축키: →)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onExit}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 transition whitespace-nowrap"
          >
            나가기
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-7 space-y-4 sm:space-y-5">
        {/* 타이머 컨트롤러 */}
        <div className="flex flex-col items-center justify-center p-3.5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 sm:space-y-3.5">
          {/* 타이머 시간 프리셋 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            {[
              { label: '30초', value: 30 },
              { label: '1분', value: 60 },
              { label: '1분 30초', value: 90 },
              { label: '2분', value: 120 },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setTimeLimit(p.value);
                  resetTimer(p.value);
                }}
                className={`text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-lg transition ${
                  timeLimit === p.value
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 거대 타이머 표시 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Timer className={`w-6 h-6 sm:w-8 sm:h-8 ${isRunning ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
            <span
              className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
                timeLeft <= 10 && isRunning ? 'text-rose-600 animate-bounce' : 'text-slate-800'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* 타이머 조작 버튼 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="단축키: 스페이스바"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? '일시정지' : '답변 시작'}</span>
            </button>

            <button
              onClick={() => resetTimer()}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="타이머 초기화"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 질문 메인 디스플레이 (min-h 확보로 질문 길이에 따른 급격한 높이 변화 방지) */}
        <div className="space-y-3 min-h-[150px] sm:min-h-[170px] flex flex-col justify-center bg-white p-2 rounded-2xl">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {currentQ.starred && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                  ★ 핵심
                </span>
              )}
              <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] sm:text-xs">
                {currentQ.subject || '공통'}
              </span>
              <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">{currentQ.type}</span>
            </div>

            <button
              onClick={() => onUpdateQuestion({ ...currentQ, starred: !currentQ.starred })}
              className={`p-1.5 rounded-lg transition ${
                currentQ.starred
                  ? 'text-amber-500 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300/80 shadow-2xs'
                  : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50/60'
              }`}
              title={currentQ.starred ? '핵심 질문(즐겨찾기) 해제' : '핵심 질문(즐겨찾기)으로 등록'}
            >
              <Star className={`w-4 h-4 transition ${currentQ.starred ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
          </div>

          <h3 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-900 leading-snug break-keep">
            "{currentQ.question}"
          </h3>

          {/* 질문 힌트 및 모범 답변 포인트 */}
          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> 필수 포함 답변 포인트:
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">좌우 스와이프 및 방향키(←, →) 지원</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed text-[11px] sm:text-xs">
              {currentQ.points.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* 답변 자가평가 메모 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">답변 피드백 & 키포인트 자가 메모</label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              onUpdateQuestion({ ...currentQ, userNotes: e.target.value });
            }}
            placeholder="답변하면서 버벅거렸던 부분, 추가해야 할 전공 키워드를 메모하세요..."
            className="w-full h-20 sm:h-24 p-2.5 sm:p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed font-sans"
          />
        </div>

        {/* 하단 질문 컨트롤러 (이전, 마스터 완료, 랜덤, 다음) - 초협소 화면에서도 한 줄 유지 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-nowrap gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-xl transition whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="whitespace-nowrap">이전</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => onUpdateQuestion({ ...currentQ, completed: !currentQ.completed })}
              className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border transition whitespace-nowrap ${
                currentQ.completed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="whitespace-nowrap">{currentQ.completed ? '마스터!' : '완료'}</span>
            </button>

            <button
              onClick={handleRandom}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
              title="무작위 질문 추첨"
            >
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap">랜덤</span>
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === activeQuestions.length - 1}
            className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white rounded-xl transition whitespace-nowrap shrink-0"
          >
            <span className="whitespace-nowrap">다음</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};