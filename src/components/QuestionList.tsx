import React, { useState } from 'react';
import { QuestionItem, CompetencyType } from '../types';
import {
  HelpCircle,
  Target,
  Lightbulb,
  CornerDownRight,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Bookmark,
  Sparkles,
  Trash2,
  Star,
} from 'lucide-react';

interface QuestionListProps {
  questions: QuestionItem[];
  onUpdateQuestion: (updated: QuestionItem) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onAddMoreQuestions?: (competency?: CompetencyType | 'all', count?: number) => void;
  onAddCommonQuestions?: () => void;
  onGenerateSubjectQuestions?: (subject: string) => void;
  selectedSubjectFilter?: string | null;
  onClearSubjectFilter?: () => void;
  activeQuestionTab?: 'all' | 'starred' | CompetencyType | 'pressure' | 'completed';
  onTabChange?: (tab: 'all' | 'starred' | CompetencyType | 'pressure' | 'completed') => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddMoreQuestions,
  onAddCommonQuestions,
  onGenerateSubjectQuestions,
  selectedSubjectFilter,
  onClearSubjectFilter,
  activeQuestionTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<'all' | 'starred' | CompetencyType | 'pressure' | 'completed'>('all');
  const activeTab = activeQuestionTab !== undefined ? activeQuestionTab : internalTab;
  const setActiveTab = (tab: 'all' | 'starred' | CompetencyType | 'pressure' | 'completed') => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
  };

  const hasCommonQuestions = questions.some(
    (q) => q && (q.isCommon || q.subject === '1분 자기소개' || q.id.startsWith('q-common-'))
  );

  const [expandedId, setExpandedId] = useState<string | null>(questions[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');

  // 탭 필터링 (검색어 및 모든 프로퍼티 null/undefined 안전 처리)
  const filteredQuestions = questions.filter((q) => {
    if (!q) return false;

    if (selectedSubjectFilter && q.subject !== selectedSubjectFilter) {
      return false;
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchQuestion = typeof q.question === 'string' && q.question.toLowerCase().includes(term);
      const matchIntent = typeof q.intent === 'string' && q.intent.toLowerCase().includes(term);
      const matchSubject = typeof q.subject === 'string' && q.subject.toLowerCase().includes(term);
      const matchGrade = typeof q.grade === 'string' && q.grade.toLowerCase().includes(term);
      const matchHighlight = typeof q.highlightText === 'string' && q.highlightText.toLowerCase().includes(term);
      const matchDefense = typeof q.defense === 'string' && q.defense.toLowerCase().includes(term);
      const matchPoints =
        Array.isArray(q.points) &&
        q.points.some((p) => typeof p === 'string' && p.toLowerCase().includes(term));
      const matchFollowUps =
        Array.isArray(q.followUps) &&
        q.followUps.some((f) => typeof f === 'string' && f.toLowerCase().includes(term));

      if (
        !matchQuestion &&
        !matchIntent &&
        !matchSubject &&
        !matchGrade &&
        !matchHighlight &&
        !matchDefense &&
        !matchPoints &&
        !matchFollowUps
      ) {
        return false;
      }
    }

    if (activeTab === 'all') return true;
    if (activeTab === 'starred') return Boolean(q.starred);
    if (activeTab === 'pressure') return q.type === 'pressure';
    if (activeTab === 'completed') return Boolean(q.completed);
    return q.competency === activeTab;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getCompetencyBadge = (competency: CompetencyType) => {
    switch (competency) {
      case 'academic':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">학업 역량</span>;
      case 'career':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">진로 역량</span>;
      case 'community':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">공동체 역량</span>;
      case 'university':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">대학/전형 맞춤</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deep':
        return <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-md border border-indigo-200 whitespace-nowrap shrink-0">심화 연계</span>;
      case 'pressure':
        return <span className="text-[10px] text-rose-700 bg-rose-50 font-bold px-2 py-0.5 rounded-md border border-rose-200 whitespace-nowrap shrink-0">약점 방어·압박</span>;
      default:
        return <span className="text-[10px] text-slate-700 bg-slate-100 font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">기록 진위 확인</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 탭 네비게이션 및 검색 */}
      {/* 탭 네비게이션 (가로 스크롤 없이 한눈에 볼 수 있도록 줄바꿈 래핑 적용) 및 검색 */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `전체 (${questions.length})` },
            { id: 'starred', label: `★ 핵심 (${questions.filter((q) => q && q.starred).length})` },
            { id: 'academic', label: `학업 (${questions.filter((q) => q && q.competency === 'academic').length})` },
            { id: 'career', label: `진로 (${questions.filter((q) => q && q.competency === 'career').length})` },
            { id: 'community', label: `공동체 (${questions.filter((q) => q && q.competency === 'community').length})` },
            { id: 'university', label: `대학 (${questions.filter((q) => q && q.competency === 'university').length})` },
            { id: 'pressure', label: `압박 (${questions.filter((q) => q && q.type === 'pressure').length})` },
            { id: 'completed', label: `완료 (${questions.filter((q) => q && q.completed).length})` },
          ].map((tab) => {
            const isStarredTab = tab.id === 'starred';
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as unknown as typeof activeTab)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  isActive
                    ? isStarredTab
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-blue-600 text-white shadow-xs'
                    : isStarredTab
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {selectedSubjectFilter && (
            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-semibold shrink-0">
              <span>과목: {selectedSubjectFilter}</span>
              <button onClick={onClearSubjectFilter} className="hover:text-blue-900 ml-1 font-bold">×</button>
            </div>
          )}

          <input
            type="text"
            placeholder="질문, 키워드 검색…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 w-full md:w-48"
          />
        </div>
      </div>

      {/* 역량별 문항 추가 바 */}
      {onAddMoreQuestions && (
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>원하는 역량별 맞춤 질문 추가:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onAddCommonQuestions && !hasCommonQuestions && (
              <button
                type="button"
                onClick={onAddCommonQuestions}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
                title="대학 공통 필수 10문항(자기소개, 지원동기, 포부 등)을 질문지 맨 앞에 추가합니다"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="whitespace-nowrap">+ 공통 10선</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAddMoreQuestions('academic', 10)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span className="whitespace-nowrap">+ 학업 10</span>
            </button>

            <button
              type="button"
              onClick={() => onAddMoreQuestions('career', 10)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
              <span className="whitespace-nowrap">+ 진로 10</span>
            </button>

            <button
              type="button"
              onClick={() => onAddMoreQuestions('community', 10)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="whitespace-nowrap">+ 공동체 10</span>
            </button>

            <button
              type="button"
              onClick={() => onAddMoreQuestions('all', 20)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
              <span className="whitespace-nowrap">+ 전체 20</span>
            </button>
          </div>
        </div>
      )}

      {/* 질문 리스트 */}
      <div className="space-y-3">
        {filteredQuestions.map((q, idx) => {
          const isExpanded = expandedId === q.id;

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border transition duration-150 overflow-hidden ${
                q.completed
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : isExpanded
                  ? 'border-blue-400 shadow-md ring-1 ring-blue-500/10'
                  : q.starred
                  ? 'border-amber-300 shadow-xs ring-1 ring-amber-400/20 bg-amber-50/10'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* 카드 상단 바 (상단 메타·액션 바 + 하단 질문 본문 전폭 2층 구조) */}
              <div
                onClick={() => toggleExpand(q.id)}
                className="p-3.5 sm:p-5 cursor-pointer select-none space-y-2.5 sm:space-y-3"
              >
                {/* 1층: 메타 정보(좌) & 액션 버튼군(우) */}
                <div className="flex items-center justify-between gap-2">
                  {/* 좌측 배지군 */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                    <span className="font-mono text-slate-400 font-bold text-[11px] whitespace-nowrap shrink-0">#{idx + 1}</span>
                    {q.starred && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs whitespace-nowrap shrink-0">
                        ★ 핵심
                      </span>
                    )}
                    {getCompetencyBadge(q.competency)}
                    {getTypeBadge(q.type)}
                    {q.subject && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                        {q.grade ? `${q.grade} ` : ''}{q.subject}
                      </span>
                    )}
                  </div>

                  {/* 우측 액션 버튼군 */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* 핵심 질문 별표 (즐겨찾기) 토글 버튼 */}
                    <button
                      type="button"
                      title={q.starred ? '핵심 질문(즐겨찾기) 해제' : '핵심 질문(즐겨찾기)으로 등록'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateQuestion({ ...q, starred: !q.starred });
                      }}
                      className={`p-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                        q.starred
                          ? 'text-amber-500 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300/80 shadow-2xs'
                          : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50/60'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 transition ${
                          q.starred ? 'fill-amber-400 text-amber-500' : ''
                        }`}
                      />
                    </button>

                    {onDeleteQuestion && (
                      <button
                        type="button"
                        title="이 면접 질문 삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('이 면접 질문을 목록에서 삭제하시겠습니까?')) {
                            onDeleteQuestion(q.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                  </div>
                </div>

                {/* 2층: 완료 체크박스 + 질문 본문 (전체 폭 100% 온전히 활용) */}
                <div className="flex items-start gap-2.5 sm:gap-3 pt-0.5">
                  {/* 완료 토글 체크박스 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuestion({ ...q, completed: !q.completed });
                    }}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                      q.completed
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 text-transparent hover:border-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  {/* 질문 텍스트 및 근거 문장 미리보기 */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className={`text-sm sm:text-base font-bold leading-snug break-keep ${
                      q.completed ? 'text-slate-500 line-through' : 'text-slate-900'
                    }`}>
                      {q.question}
                    </h4>

                    {/* 근거 문장 미리보기 */}
                    {q.highlightText && !isExpanded && (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 pt-0.5">
                        <Bookmark className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-600">근거:</span> "{q.highlightText}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 확장된 아코디언 세부 내용 */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40 text-xs sm:text-sm">
                  {/* 근거 원문 박스 */}
                  {q.highlightText && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed">
                      <span className="font-bold block mb-0.5 flex items-center gap-1 text-amber-800">
                        <Bookmark className="w-3.5 h-3.5" /> 생기부 근거 문장
                      </span>
                      "{q.highlightText}"
                    </div>
                  )}

                  {/* 평가 의도 */}
                  <div className="space-y-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs text-blue-700">
                      <Target className="w-4 h-4" /> 면접관의 평가 의도
                    </span>
                    <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 text-xs leading-relaxed">
                      {q.intent}
                    </p>
                  </div>

                  {/* 답변 포인트 */}
                  {q.points && q.points.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs text-emerald-700">
                        <Lightbulb className="w-4 h-4 text-amber-500" /> 모범 답변 핵심 키워드 & 포인트
                      </span>
                      <ul className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                        {q.points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 꼬리 질문 (Follow-up) */}
                  {q.followUps && q.followUps.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs text-purple-700">
                        <CornerDownRight className="w-4 h-4" /> 이어질 수 있는 추가 꼬리 질문
                      </span>
                      <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                        {q.followUps.map((fu, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 text-xs font-medium text-slate-800">
                            <span className="text-purple-600 font-bold shrink-0">꼬리 #{fIdx + 1}</span>
                            <span>{fu}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 압박 질문 방어 팁 */}
                  {q.defense && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed space-y-1">
                      <span className="font-bold flex items-center gap-1 text-rose-800">
                        <ShieldAlert className="w-4 h-4 text-rose-600" /> 압박 방어 가이드
                      </span>
                      <p>{q.defense}</p>
                    </div>
                  )}

                  {/* 자가 답변 메모 작성란 */}
                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" /> 나의 답변 구상 및 키포인트 메모
                    </label>
                    <textarea
                      placeholder="면접 연습 시 말할 핵심 경험, 결론, 두괄식 답변 키워드를 여기에 메모하세요 (자동 저장됨)"
                      value={q.userNotes || ''}
                      onChange={(e) => {
                        onUpdateQuestion({ ...q, userNotes: e.target.value });
                      }}
                      className="w-full h-20 p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed font-sans"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
            {selectedSubjectFilter ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm sm:text-base">
                    '{selectedSubjectFilter}' 관련 예상 질문이 아직 없습니다.
                  </p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    이 과목의 학생부 원문 기록을 바탕으로 실전 맞춤 질문 3문항(진위 확인, 심화 연계, 약점 방어)을 즉시 생성하시겠습니까?
                  </p>
                </div>
                {onGenerateSubjectQuestions && (
                  <button
                    type="button"
                    onClick={() => onGenerateSubjectQuestions(selectedSubjectFilter)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition shadow-blue-500/20 text-xs sm:text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>'{selectedSubjectFilter}' 맞춤 질문 3문항 생성하기</span>
                  </button>
                )}
              </div>
            ) : activeTab === 'starred' ? (
              <>
                <Star className="w-8 h-8 text-amber-400 mx-auto stroke-1 fill-amber-100" />
                <p className="font-bold text-slate-700 text-sm">아직 등록된 핵심 질문이 없습니다.</p>
                <p className="text-slate-400">각 질문 카드의 우측 상단 별표(★)를 누르면 핵심 질문으로 등록됩니다.</p>
              </>
            ) : (
              <p className="text-slate-400">해당 조건의 면접 질문이 없습니다.</p>
            )}
          </div>
        )}

        {onAddMoreQuestions && filteredQuestions.length > 0 && (
          <div className="pt-6 pb-2 flex flex-col items-center justify-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>원하는 역량별 맞춤 질문 추가 생성</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {onAddCommonQuestions && !hasCommonQuestions && (
                <button
                  type="button"
                  onClick={onAddCommonQuestions}
                  className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
                  title="대학 공통 필수 10문항(자기소개, 지원동기, 포부 등)을 질문지 맨 앞에 추가합니다"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="whitespace-nowrap">+ 공통 10선</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onAddMoreQuestions('academic', 10)}
                className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="whitespace-nowrap">+ 학업 10</span>
              </button>

              <button
                type="button"
                onClick={() => onAddMoreQuestions('career', 10)}
                className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                <span className="whitespace-nowrap">+ 진로 10</span>
              </button>

              <button
                type="button"
                onClick={() => onAddMoreQuestions('community', 10)}
                className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="whitespace-nowrap">+ 공동체 10</span>
              </button>

              <button
                type="button"
                onClick={() => onAddMoreQuestions('all', 20)}
                className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <span className="whitespace-nowrap">+ 전체 20</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              오프라인 표준 규칙 엔진으로 생기부 원문에서 겹치지 않는 새로운 문항을 추가로 발굴합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
