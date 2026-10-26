import React, { useState } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  Sparkles,
  Building2,
  User,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { StudentRecordItem } from '../types';
import { parseCustomStudentRecordHtml } from '../lib/htmlParser';
import { parsePdfOrTextFile } from '../lib/pdfParser';
import { maskPersonalInfo } from '../lib/masking';

export interface StudentInputProfile {
  name: string;
  targetUniversity: string;
  targetMajor: string;
  interviewType: string;
  records: StudentRecordItem[];
  includeCommonQuestions?: boolean;
}

interface UploadedStudentItem {
  id: string;
  file?: File;
  name: string;
  targetUniversity: string;
  targetMajor: string;
  records: StudentRecordItem[];
  info?: string;
  error?: string;
}

interface NewInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (profilesData: StudentInputProfile[]) => Promise<void>;
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
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // 공통 전형 설정
  const [interviewType, setInterviewType] = useState('학생부종합(면접형 - 서류확인+심층)');
  const [includeCommonQuestions, setIncludeCommonQuestions] = useState(true);

  // 업로드된 학생 목록 (1명 또는 다수 학생)
  const [uploadedList, setUploadedList] = useState<UploadedStudentItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 직접 붙여넣기 탭 상태
  const [pastedName, setPastedName] = useState('');
  const [pastedUniversity, setPastedUniversity] = useState('');
  const [pastedMajor, setPastedMajor] = useState('');
  const [pastedText, setPastedText] = useState('');

  if (!isOpen) return null;

  // 파일 파싱 처리 (다중 파일 지원)
  const handleFilesAdded = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setIsParsing(true);
    setErrorMessage(null);

    const newItems: UploadedStudentItem[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const f = filesArray[i];
      const itemId = `up-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        if (f.name.endsWith('.html') || f.type === 'text/html') {
          const htmlText = await f.text();
          const { studentName: parsedName, records } = parseCustomStudentRecordHtml(htmlText);
          newItems.push({
            id: itemId,
            file: f,
            name: parsedName && parsedName !== '학생A' ? parsedName : f.name.replace(/\.[^.]+$/, ''),
            targetUniversity: '',
            targetMajor: '',
            records,
            info: `HTML 파일: ${records.length}개 세특/창체 항목 감지`,
          });
        } else {
          const { records, detectedStudentName } = await parsePdfOrTextFile(f);
          newItems.push({
            id: itemId,
            file: f,
            name: detectedStudentName || f.name.replace(/\.[^.]+$/, '').replace(/_masked$/, ''),
            targetUniversity: '',
            targetMajor: '',
            records,
            info: `나이스 파싱 완료: ${records.length}개 창체·세특 항목 추출`,
          });
        }
      } catch (err) {
        newItems.push({
          id: itemId,
          file: f,
          name: f.name.replace(/\.[^.]+$/, ''),
          targetUniversity: '',
          targetMajor: '',
          records: [],
          error: err instanceof Error ? err.message : '파일 파싱에 실패했습니다.',
        });
      }
    }

    setUploadedList((prev) => [...prev, ...newItems]);
    setIsParsing(false);
  };

  const handleRemoveItem = (id: string) => {
    setUploadedList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<UploadedStudentItem>) => {
    setUploadedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const validItems = uploadedList.filter((item) => !item.error && item.records.length > 0);
  const errorItems = uploadedList.filter((item) => Boolean(item.error));

  const handleStartAnalysis = async () => {
    if (activeTab === 'upload') {
      if (validItems.length === 0) {
        setErrorMessage('분석할 학생부 파일(PDF/HTML/TXT)을 올려주세요.');
        return;
      }

      const profilesToSubmit: StudentInputProfile[] = validItems.map((item) => ({
        name: item.name.trim() || '학생',
        targetUniversity: item.targetUniversity.trim() || '목표 대학교',
        targetMajor: item.targetMajor.trim() || '일반 전공',
        interviewType,
        records: item.records,
        includeCommonQuestions,
      }));

      await onSubmit(profilesToSubmit);
    } else {
      if (!pastedText.trim()) {
        setErrorMessage('생기부 원문 텍스트를 입력해 주세요.');
        return;
      }

      const { maskedText } = maskPersonalInfo(pastedText, pastedName || '학생A');
      const pastedRecord: StudentRecordItem = {
        id: `rec-pasted-${Date.now()}`,
        grade: '공통',
        type: '학생부 원문',
        subject: '전체',
        text: maskedText,
        tags: ['자기주도성', '전공적합성'],
        highlightSpans: [],
      };

      await onSubmit([
        {
          name: pastedName.trim() || '학생A',
          targetUniversity: pastedUniversity.trim() || '목표 대학교',
          targetMajor: pastedMajor.trim() || '일반 전공',
          interviewType,
          records: [pastedRecord],
          includeCommonQuestions,
        },
      ]);
    }
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
              <p className="text-xs text-slate-500">학생부 파일 업로드 후 대학별 맞춤 질문 생성</p>
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

          {/* 1단계: 지원 전형 및 옵션 설정 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> 1. 공통 전형 설정
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

              {/* 대학 공통 필수 10선 기본 포함 옵션 */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="includeCommonQuestions"
                  checked={includeCommonQuestions}
                  onChange={(e) => setIncludeCommonQuestions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-purple-600 rounded-md border-purple-300 focus:ring-purple-500 shrink-0 cursor-pointer"
                />
                <label htmlFor="includeCommonQuestions" className="cursor-pointer select-none">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    대학 공통 필수 질문 10선 포함
                  </span>
                  <span className="text-[11px] text-purple-700/90 leading-relaxed block mt-0.5">
                    자기소개, 지원동기, 학업계획 등 10문항을 질문지 맨 앞에 함께 생성합니다.
                  </span>
                </label>
              </div>
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
                파일 업로드 (드래그 앤 드롭)
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
              <div className="space-y-4">
                {/* 개인정보 보호 마스킹 안내 배너 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        개인정보 보호를 위해 마스킹이 필요하신가요?
                      </p>
                      <p className="text-[11px] text-emerald-700/90 leading-tight">
                        학생부의 이름·주민번호·학교명을 안전하게 가릴 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open('https://qdg-cmd.github.io/pdf-masking/', '_blank', 'noopener,noreferrer')}
                    className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>학생부 PDF 마스킹 도구 열기</span>
                  </button>
                </div>

                {/* HTML5 드래그 앤 드롭 업로드 영역 */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) {
                      handleFilesAdded(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center text-center transition cursor-pointer group ${
                    isDragging
                      ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                  }`}
                >
                  <label className="cursor-pointer flex flex-col items-center w-full">
                    <div className="p-3 bg-white group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 rounded-2xl shadow-xs border border-slate-200 mb-3 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">
                      {isDragging
                        ? '여기에 파일을 놓으시면 바로 분석됩니다!'
                        : '학생부 PDF, HTML 또는 텍스트 파일을 여기에 끌어다 놓으세요'}
                    </p>
                    <p className="text-xs text-slate-400 mb-3">
                      나이스 PDF (.pdf), HTML (.html) 또는 텍스트 (.txt) 파일 지원 (여러 파일 동시 드래그 가능)
                    </p>
                    <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition">
                      내 컴퓨터에서 파일 선택 (다중 선택 가능)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.html,.htm"
                      onChange={(e) => {
                        if (e.target.files?.length) handleFilesAdded(e.target.files);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {isParsing && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                    <span>파일을 정밀 분석하고 학생 성명 및 세특을 추출 중입니다…</span>
                  </div>
                )}

                {/* 업로드된 학생 목록 및 개별 대학/학과 입력란 */}
                {uploadedList.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        업로드된 학생 목록 ({validItems.length}명 정상
                        {errorItems.length > 0 && (
                          <span className="text-rose-600 font-semibold">, {errorItems.length}개 파일 오류</span>
                        )}
                        )
                      </span>
                      <label className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> 파일 더 추가
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.txt,.html,.htm"
                          onChange={(e) => {
                            if (e.target.files?.length) handleFilesAdded(e.target.files);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      {uploadedList.map((item) => {
                        if (item.error) {
                          return (
                            <div
                              key={item.id}
                              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800"
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <div>
                                  <span className="font-bold">{item.file?.name || item.name}</span>: {item.error}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-rose-400 hover:text-rose-700 transition"
                                title="목록에서 제거"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className="p-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl space-y-3 hover:border-blue-300 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800 truncate max-w-[220px] sm:max-w-[340px]">
                                  {item.file?.name}
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                  {item.records.length}개 세특/창체
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 transition"
                                title="이 학생부 제거"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 학생별 정보 입력란 (학생 이름, 지원 대학, 지원 학과) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" /> 학생 이름
                                </label>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                  placeholder="학생 성명"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-slate-400" /> 지원 대학
                                </label>
                                <input
                                  type="text"
                                  value={item.targetUniversity}
                                  onChange={(e) => handleUpdateItem(item.id, { targetUniversity: e.target.value })}
                                  placeholder="예: 서울대학교"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">지원 학과 / 전공</label>
                                <input
                                  type="text"
                                  value={item.targetMajor}
                                  onChange={(e) => handleUpdateItem(item.id, { targetMajor: e.target.value })}
                                  placeholder="예: 약학과, 컴퓨터공학과 등"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400 font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> 학생 이름
                    </label>
                    <input
                      type="text"
                      value={pastedName}
                      onChange={(e) => setPastedName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> 지원 대학
                    </label>
                    <input
                      type="text"
                      value={pastedUniversity}
                      onChange={(e) => setPastedUniversity(e.target.value)}
                      placeholder="예: 연세대학교"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">지원 학과 / 전공</label>
                    <input
                      type="text"
                      value={pastedMajor}
                      onChange={(e) => setPastedMajor(e.target.value)}
                      placeholder="예: 경영학과"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="생기부 세특 및 창체 내용을 복사하여 여기에 붙여넣으세요..."
                    className="w-full h-40 p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed font-sans placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 진행 상태 인디케이터 */}
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
            disabled={
              isGenerating ||
              isParsing ||
              (activeTab === 'upload' && validItems.length === 0) ||
              (activeTab === 'paste' && !pastedText.trim())
            }
            onClick={handleStartAnalysis}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl shadow-xs transition shadow-blue-500/20"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating
              ? '질문 생성 진행 중…'
              : activeTab === 'upload' && validItems.length > 1
              ? `총 ${validItems.length}명 학생 AI 예상 면접 질문 일괄 생성`
              : 'AI 예상 면접 질문 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};
