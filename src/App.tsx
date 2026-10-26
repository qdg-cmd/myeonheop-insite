import React, { useState, useEffect } from 'react';
import { StudentProfile, ApiKeys, QuestionItem, StudentRecordItem, CompetencyType } from './types';
import {
  getAllStudents,
  saveStudent,
  deleteStudent as deleteStudentDb,
  clearAllData as clearAllDataDb,
  getStoredApiKeys,
  saveStoredApiKeys,
} from './lib/db';
import { generateInterviewQuestions, sanitizeQuestionItem } from './lib/gemini';
import { generateAdditionalRuleQuestions, generateSubject3Questions } from './lib/ruleEngine';
import { generateCommon10Questions } from './lib/commonQuestions';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { NewInterviewModal } from './components/NewInterviewModal';
import { StudentList } from './components/StudentList';
import { RecordTable } from './components/RecordTable';
import { QuestionList } from './components/QuestionList';
import { MockInterview } from './components/MockInterview';
import { WorksheetPrint } from './components/WorksheetPrint';
import { ExportBar } from './components/ExportBar';
import { HelpCircle, BookOpen, MessageSquare, Play, Sparkles } from 'lucide-react';

export function App() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'records' | 'mock'>('questions');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [questionFilterTab, setQuestionFilterTab] = useState<'all' | 'starred' | CompetencyType | 'pressure' | 'completed'>('all');

  // 모달 상태
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // AI 생성 진행 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');

  // API 키 상태
  const [apiKeys, setApiKeys] = useState<ApiKeys>(getStoredApiKeys());

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        const loaded = await getAllStudents();
        const sanitized = loaded.map((std) => ({
          ...std,
          questions: (std.questions || []).map((q, i) => {
            const sq = sanitizeQuestionItem(q, i + 1);
            // 대학 공통 필수 질문 10선은 기본으로 '★ 핵심 질문' 별표 활성화
            if (sq.isCommon || sq.id.startsWith('q-common-')) {
              return { ...sq, starred: true, isCommon: true };
            }
            return sq;
          }),
        }));
        setStudents(sanitized);
        if (sanitized.length > 0 && !currentStudentId) {
          setCurrentStudentId(sanitized[0].id);
        }
      } catch (e) {
        console.error('Failed to load students from DB', e);
      }
    }
    loadData();
  }, []);

  const currentStudent = students.find((s) => s.id === currentStudentId) || null;

  // 새 학생 생성 및 AI 분석 (단일 또는 다수 일괄 처리 지원)
  const handleCreateStudent = async (
    inputData:
      | {
          name: string;
          targetUniversity: string;
          targetMajor: string;
          interviewType: string;
          records: StudentRecordItem[];
          includeCommonQuestions?: boolean;
        }
      | Array<{
          name: string;
          targetUniversity: string;
          targetMajor: string;
          interviewType: string;
          records: StudentRecordItem[];
          includeCommonQuestions?: boolean;
        }>
  ) => {
    const list = Array.isArray(inputData) ? inputData : [inputData];
    if (list.length === 0) return;

    setIsGenerating(true);
    const createdProfiles: StudentProfile[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const studentPrefix =
          list.length > 1 ? `[${i + 1}/${list.length}] '${item.name}' 학생: ` : '';
        setGenerationStage(`${studentPrefix}AI 질문 생성 파이프라인 가동 중…`);

        const generatedQuestions = await generateInterviewQuestions(
          {
            name: item.name,
            targetUniversity: item.targetUniversity,
            targetMajor: item.targetMajor,
            interviewType: item.interviewType,
          },
          item.records,
          apiKeys,
          (stage) => setGenerationStage(`${studentPrefix}${stage}`)
        );

        // 대학 공통 필수 10선 질문지 맨 앞(#1~#10)에 배치
        const commonQuestions =
          item.includeCommonQuestions !== false
            ? generateCommon10Questions({
                name: item.name,
                targetUniversity: item.targetUniversity,
                targetMajor: item.targetMajor,
                interviewType: item.interviewType,
              })
            : [];

        const newProfile: StudentProfile = {
          id: `std-${Date.now()}-${i}`,
          name: item.name,
          targetUniversity: item.targetUniversity,
          targetMajor: item.targetMajor,
          interviewType: item.interviewType,
          createdAt: new Date().toISOString(),
          records: item.records,
          questions: [...commonQuestions, ...generatedQuestions],
        };

        await saveStudent(newProfile);
        createdProfiles.push(newProfile);
      }

      setStudents((prev) => [...createdProfiles, ...prev]);
      if (createdProfiles.length > 0) {
        setCurrentStudentId(createdProfiles[0].id);
      }
      setIsNewModalOpen(false);
      setActiveTab('questions');
    } catch (err) {
      alert(err instanceof Error ? err.message : '질문 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 공통 필수 10선 질문지 맨 앞(#1~#10)에 추가하기
  const handleAddCommonQuestions = async () => {
    if (!currentStudent) return;
    const commonQuestions = generateCommon10Questions(currentStudent);
    const updatedProfile: StudentProfile = {
      ...currentStudent,
      questions: [...commonQuestions, ...currentStudent.questions],
    };
    setStudents((prev) => prev.map((s) => (s.id === updatedProfile.id ? updatedProfile : s)));
    await saveStudent(updatedProfile);
  };

  // 특정 과목 맞춤 3문항 즉시 생성 (진위 확인 1 + 심화 연계 1 + 약점 방어 1)
  const handleGenerateSubjectQuestions = async (subject: string) => {
    if (!currentStudent) return;
    const matchingRecords = currentStudent.records.filter((r) => r.subject === subject);
    if (matchingRecords.length === 0) {
      alert(`'${subject}' 과목에 해당하는 생기부 원문 기록을 찾을 수 없습니다.`);
      return;
    }

    const new3Questions = generateSubject3Questions(
      currentStudent,
      matchingRecords,
      currentStudent.questions
    );

    const updatedProfile: StudentProfile = {
      ...currentStudent,
      questions: [...currentStudent.questions, ...new3Questions],
    };

    setStudents((prev) => prev.map((s) => (s.id === updatedProfile.id ? updatedProfile : s)));
    await saveStudent(updatedProfile);
  };

  // 질문 업데이트 (답변 메모, 완료 토글 등)
  const handleUpdateQuestion = async (updated: QuestionItem) => {
    if (!currentStudent) return;
    const updatedQuestions = currentStudent.questions.map((q) => (q.id === updated.id ? updated : q));
    const updatedProfile: StudentProfile = {
      ...currentStudent,
      questions: updatedQuestions,
    };

    setStudents((prev) => prev.map((s) => (s.id === updatedProfile.id ? updatedProfile : s)));
    await saveStudent(updatedProfile);
  };

  // 개별 질문 삭제
  const handleDeleteQuestion = async (questionId: string) => {
    if (!currentStudent) return;
    const updatedQuestions = currentStudent.questions.filter((q) => q.id !== questionId);
    const updatedProfile: StudentProfile = {
      ...currentStudent,
      questions: updatedQuestions,
    };
    setStudents((prev) => prev.map((s) => (s.id === updatedProfile.id ? updatedProfile : s)));
    await saveStudent(updatedProfile);
  };

  // 오프라인 표준 규칙 엔진 기반: 원하는 역량별 비중복 맞춤 질문 추가 생성
  const handleAddMoreQuestions = async (competency?: CompetencyType | 'all', count: number = 10) => {
    if (!currentStudent) return;
    const additional = generateAdditionalRuleQuestions(
      currentStudent,
      currentStudent.records,
      currentStudent.questions,
      count,
      competency
    );
    if (additional.length === 0) {
      const label =
        competency === 'academic'
          ? '학업역량'
          : competency === 'career'
          ? '진로역량'
          : competency === 'community'
          ? '공동체역량'
          : '';
      alert(`생기부 기록에서 추가로 생성 가능한 새로운 ${label ? label + ' ' : ''}맞춤 질문이 없습니다.`);
      return;
    }
    const updatedProfile: StudentProfile = {
      ...currentStudent,
      questions: [...currentStudent.questions, ...additional],
    };
    setStudents((prev) => prev.map((s) => (s.id === updatedProfile.id ? updatedProfile : s)));
    await saveStudent(updatedProfile);
  };

  // 학생 삭제
  const handleDeleteStudent = async (id: string) => {
    await deleteStudentDb(id);
    const remaining = students.filter((s) => s.id !== id);
    setStudents(remaining);
    if (currentStudentId === id) {
      setCurrentStudentId(remaining[0]?.id || null);
    }
  };

  // 전체 데이터 초기화
  const handleClearAll = async () => {
    await clearAllDataDb();
    setStudents([]);
    setCurrentStudentId(null);
  };

  // 백업 복원
  const handleImportBackup = async (imported: StudentProfile) => {
    const profileWithNewId: StudentProfile = {
      ...imported,
      id: `std-${Date.now()}`,
    };
    await saveStudent(profileWithNewId);
    setStudents((prev) => [profileWithNewId, ...prev]);
    setCurrentStudentId(profileWithNewId.id);
    setActiveTab('questions');
  };

  // API 키 저장
  const handleSaveApiKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    saveStoredApiKeys(keys);
  };

  return (
    <>
      {/* 화면 전용 인터페이스 (인쇄 시 완전히 숨김) */}
      <div className="no-print min-h-screen flex flex-col bg-slate-50 text-slate-800">
        {/* 글로벌 상단 헤더 */}
        <Header
          students={students}
          currentStudentId={currentStudentId}
          onSelectStudent={(id) => {
            setCurrentStudentId(id);
            setSelectedSubjectFilter(null);
          }}
          onOpenNewModal={() => setIsNewModalOpen(true)}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
          onClearAllData={handleClearAll}
          onImportBackup={handleImportBackup}
          apiKeys={apiKeys}
        />

        {/* 메인 뷰 */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {currentStudent ? (
            <div className="space-y-6">
              {/* 학생 요약 배너 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {currentStudent.name}
                    </h1>
                    <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {currentStudent.interviewType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{currentStudent.targetUniversity}</span>
                    <span>·</span>
                    <span className="font-semibold text-blue-700">{currentStudent.targetMajor}</span>
                    <span>·</span>
                    <span>총 {currentStudent.records.length}개 기록 / {currentStudent.questions.length}개 문항</span>
                  </p>
                </div>

                {/* 메인 뷰 탭 전환 버튼 (초협소 화면에서도 절대 줄바꿈 없는 컴팩트 레이아웃) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-full md:w-auto overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap shrink-0 ${
                      activeTab === 'questions'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap text-[11px] sm:text-xs">
                      <span className="sm:hidden">질문지</span>
                      <span className="hidden sm:inline">예상 질문지</span> ({currentStudent.questions.length})
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('records')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap shrink-0 ${
                      activeTab === 'records'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap text-[11px] sm:text-xs">
                      <span className="sm:hidden">원문</span>
                      <span className="hidden sm:inline">생기부 원문</span> ({currentStudent.records.length})
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('mock')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap shrink-0 ${
                      activeTab === 'mock'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap text-[11px] sm:text-xs">
                      <span className="sm:hidden">모의면접</span>
                      <span className="hidden sm:inline">모의면접 훈련</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* 내보내기 툴바 (인쇄, Word/HTML, JSON) */}
              <ExportBar
                profile={currentStudent}
                activeTab={activeTab}
                isStarredTab={questionFilterTab === 'starred'}
              />

              {/* 탭 1: 예상 질문 목록 */}
              {activeTab === 'questions' && (
                <QuestionList
                  questions={currentStudent.questions}
                  onUpdateQuestion={handleUpdateQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onAddMoreQuestions={handleAddMoreQuestions}
                  onAddCommonQuestions={handleAddCommonQuestions}
                  onGenerateSubjectQuestions={handleGenerateSubjectQuestions}
                  selectedSubjectFilter={selectedSubjectFilter}
                  onClearSubjectFilter={() => setSelectedSubjectFilter(null)}
                  activeQuestionTab={questionFilterTab}
                  onTabChange={setQuestionFilterTab}
                />
              )}

              {/* 탭 2: 생기부 원문 및 형광펜 뷰 */}
              {activeTab === 'records' && (
                <RecordTable
                  records={currentStudent.records}
                  studentName={currentStudent.name}
                  onSelectSubjectForQuestions={(subj) => {
                    setSelectedSubjectFilter(subj);
                    setActiveTab('questions');
                  }}
                />
              )}

              {/* 탭 3: 모의면접 타이머 훈련실 */}
              {activeTab === 'mock' && (
                <MockInterview
                  questions={currentStudent.questions}
                  onUpdateQuestion={handleUpdateQuestion}
                  onExit={() => setActiveTab('questions')}
                />
              )}
            </div>
          ) : (
            <StudentList
              students={students}
              onSelectStudent={(id) => setCurrentStudentId(id)}
              onDeleteStudent={handleDeleteStudent}
              onOpenNewModal={() => setIsNewModalOpen(true)}
            />
          )}
        </main>

        {/* 모달군 */}
        <ApiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          apiKeys={apiKeys}
          onSave={handleSaveApiKeys}
        />

        <NewInterviewModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={handleCreateStudent}
          isGenerating={isGenerating}
          generationStage={generationStage}
        />
      </div>

      {/* A4 인쇄 워크시트 (인쇄 시에만 렌더링, 화면에는 보이지 않음) */}
      {currentStudent && (
        <WorksheetPrint
          profile={currentStudent}
          starredOnly={questionFilterTab === 'starred'}
        />
      )}
    </>
  );
}

export default App;
