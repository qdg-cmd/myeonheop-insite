import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Sparkles, Building2, User } from 'lucide-react';
import { StudentProfile, StudentRecordItem } from '../types';
import { parseCustomStudentRecordHtml } from '../lib/htmlParser';
import { parsePdfOrTextFile } from '../lib/pdfParser';
import { maskPersonalInfo } from '../lib/masking';

interface NewInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    profileData: {
      name: string;
      targetUniversity: string;
      targetMajor: string;
      interviewType: string;
      records: StudentRecordItem[];
      includeCommonQuestions?: boolean;
    }
  ) => Promise<void>;
  isGenerating: boolean;
  generationStage: string;
}

export const NewInterviewModal: React.FC<NewInterviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isGenerating,
  generationStage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');

  // 지원 정보 (기본값 빈칸 및 회색 예시 플레이스홀더 제공)
  const [studentName, setStudentName] = useState('');
  const [targetUniversity, setTargetUniversity] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [interviewType, setInterviewType] = useState('학생부종합(면접형 - 서류확인+심층)');
  const [includeCommonQuestions, setIncludeCommonQuestions] = useState(true);

  // 파싱 결과 미리보기 상태
  const [parsedRecords, setParsedRecords] = useState<StudentRecordItem[]>([]);
  const [detectedFileInfo, setDetectedFileInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 파일 파싱 처리
  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    try {
      if (selectedFile.name.endsWith('.html') || selectedFile.type === 'text/html') {
        const htmlText = await selectedFile.text();
        const { studentName: parsedName, records } = parseCustomStudentRecordHtml(htmlText);
        setParsedRecords(records);
        if (parsedName && parsedName !== '학생A') setStudentName(parsedName);
        setDetectedFileInfo(`HTML 파일 파싱 성공: 총 ${records.length}개 세특/창체 항목 감지됨`);
      } else {
        const { records, detectedStudentName } = await parsePdfOrTextFile(selectedFile);
        setParsedRecords(records);
        if (detectedStudentName && !studentName) setStudentName(detectedStudentName);
        setDetectedFileInfo(`나이스 PDF 정밀 파싱 완료: '${detectedStudentName || '학생'}' 학생의 ${records.length}개 창체·세특 항목 추출`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '파일 파싱에 실패했습니다.');
      setParsedRecords([]);
    }
  };

  const handleStartAnalysis = async () => {
    if (parsedRecords.length === 0 && !pastedText.trim()) {
      setErrorMessage('분석할 학생부 파일(PDF/TXT)을 올리거나 텍스트를 입력해 주세요.');
      return;
    }

    let recordsToUse = parsedRecords;
    if (recordsToUse.length === 0 && pastedText.trim()) {
      const { maskedText } = maskPersonalInfo(pastedText, studentName || '학생A');
      recordsToUse = [
        {
          id: 'rec-pasted-1',
          grade: '공통',
          type: '학생부 원문',
          subject: '전체',
          text: maskedText,
          tags: ['자기주도성', '전공적합성'],
          highlightSpans: [],
        },
      ];
    }

    await onSubmit({
      name: studentName.trim() || '학생A',
      targetUniversity: targetUniversity.trim() || '목표 대학교',
      targetMajor: targetMajor.trim() || '일반 전공',
      interviewType,
      records: recordsToUse,
      includeCommonQuestions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">새 학생부 분석 및 면접 준비</h3>
              <p className="text-xs text-slate-500">학생부 PDF 업로드 후 대학별 맞춤 질문 생성</p>
            </div>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 오류 메시지 */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1단계: 지원 정보 입력 (기본값 빈칸, 예시는 연한 회색 플레이스홀더) */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> 1. 목표 대학 및 지원 정보
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> 학생 이름 (식별명)
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder:text-slate-400 placeholder:font-normal transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">지원 전형 유형</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                >
                  <option value="학생부종합(면접형 - 서류확인+심층)">학생부종합 (면접형 - 서류확인+심층)</option>
                </select>
              </div>

              {/* 지원 대학 (선택이 아닌 직접 텍스트 입력) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> 지원 대학
                </label>
                <input
                  type="text"
                  value={targetUniversity}
                  onChange={(e) => setTargetUniversity(e.target.value)}
                  placeholder="예: 서울대학교, 연세대학교, 고려대학교 등"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder:text-slate-400 placeholder:font-normal transition"
                />
              </div>

              {/* 지원 학과 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">지원 학과 / 전공</label>
                <input
                  type="text"
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  placeholder="예: 컴퓨터공학과, 경영학과, 제과제빵학과 등"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder:text-slate-400 placeholder:font-normal transition"
                />
              </div>
            </div>

            {/* 대학 공통 필수 10선 기본 포함 옵션 */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-3">
              <input
                type="checkbox"
                id="includeCommonQuestions"
                checked={includeCommonQuestions}
                onChange={(e) => setIncludeCommonQuestions(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-purple-600 rounded-md border-purple-300 focus:ring-purple-500 shrink-0 cursor-pointer"
              />
              <label htmlFor="includeCommonQuestions" className="cursor-pointer select-none">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  대학 공통 필수 면접 질문 10선 기본 포함 (권장)
                </span>
                <span className="text-[11px] text-purple-700/90 leading-relaxed block mt-0.5">
                  1분 자기소개, 지원동기, 학업계획, 갈등관리, 실패극복 등 대학 면접 핵심 10문항을 질문지 맨 앞에 함께 생성합니다.
                </span>
              </label>
            </div>
          </div>

          {/* 2단계: 파일 업로드 / 텍스트 입력 */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> 2. 학생부 원문 업로드
            </h4>

            {/* 업로드 탭 전환 */}
            <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 max-w-xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition ${
                  activeTab === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                파일 업로드 (PDF / HTML / TXT)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition ${
                  activeTab === 'paste' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                직접 붙여넣기
              </button>
            </div>

            {activeTab === 'upload' ? (
              <div>
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition group">
                  <div className="p-3 bg-white group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 rounded-2xl shadow-xs border border-slate-200 mb-3 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-1">
                    {file ? file.name : '학생부 PDF, HTML 또는 텍스트 파일을 여기에 끌어다 놓으세요'}
                  </p>
                  <p className="text-xs text-slate-400">
                    나이스/에듀파인 PDF (.pdf), HTML (.html) 또는 텍스트 (.txt) 파일 지원
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.html,.htm"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                </label>

                {detectedFileInfo && (
                  <div className="mt-2.5 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{detectedFileInfo}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="생기부 세특 및 창체 내용을 복사하여 여기에 붙여넣으세요..."
                  className="w-full h-40 p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed font-sans placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* 진행 상태 인디케이터 (10개 단위 배치 진행 안내) */}
          {isGenerating && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-spin" /> {generationStage}
                </span>
                <span>AI 면접 질문 생성 중…</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={isGenerating || (parsedRecords.length === 0 && !pastedText.trim())}
            onClick={handleStartAnalysis}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl shadow-xs transition shadow-blue-500/20"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? '질문 생성 진행 중…' : 'AI 예상 면접 질문 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};
