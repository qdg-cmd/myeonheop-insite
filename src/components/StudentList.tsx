import React from 'react';
import { StudentProfile } from '../types';
import { GraduationCap, ArrowRight, Trash2, CheckCircle2, Sparkles, Building2 } from 'lucide-react';

interface StudentListProps {
  students: StudentProfile[];
  onSelectStudent: (id: string) => void;
  onDeleteStudent: (id: string) => void;
  onOpenNewModal: () => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onDeleteStudent,
  onOpenNewModal,
}) => {
  if (students.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-blue-500/10">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
          학생부 올리고 대학 맞춤 면접 질문을 받아보세요
        </h2>
        <p className="text-sm text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
          학교생활기록부 PDF 또는 텍스트 파일을 올리면, 학업·진로·공동체 역량 문장에 형광펜을 칠하고 대학별 맞춤 예상 질문과 꼬리 질문을 100% 로컬 보안 환경에서 생성합니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenNewModal}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles className="w-4 h-4" /> 생기부 파일 올려서 시작하기
          </button>
        </div>

        {/* 3대 특징 배지 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-10">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2">
            <span className="text-sm">🔒</span>
            <span className="text-xs font-bold text-slate-800">100% 로컬보안</span>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-bold text-slate-800">학생부 PDF 정밀 파싱</span>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2">
            <span className="text-sm">📄</span>
            <span className="text-xs font-bold text-slate-800">파일 받기</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">저장된 학생 면접 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">브라우저에 안전하게 보관 중인 학생별 질문과 연습 진도입니다.</p>
        </div>
        <button
          onClick={onOpenNewModal}
          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition whitespace-nowrap shrink-0"
        >
          + 새 학생 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((s) => {
          const completedCount = s.questions.filter((q) => q.completed).length;
          const progressPercent = s.questions.length > 0 ? Math.round((completedCount / s.questions.length) * 100) : 0;

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{s.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.targetUniversity}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">{s.targetMajor}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`'${s.name}' 학생의 모든 데이터를 삭제하시겠습니까?`)) {
                        onDeleteStudent(s.id);
                      }
                    }}
                    className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 inline-block">
                  {s.interviewType}
                </div>

                {/* 진행률 바 */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 연습 진도
                    </span>
                    <span>{completedCount} / {s.questions.length} 문항 ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectStudent(s.id)}
                className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                면접 준비 & 질문 확인 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
