import { ApiKeys, QuestionItem, StudentProfile, StudentRecordItem } from '../types';
import { generateStandardRuleQuestions } from './ruleEngine';
import { maskPersonalInfo } from './masking';
import { loadPastExamData } from './pastExamLoader';

/**
 * AI 질문 생성 함수 (10개씩 묶어서 배치 호출)
 */
export async function generateInterviewQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  apiKeys: ApiKeys,
  onProgress?: (stage: string) => void
): Promise<QuestionItem[]> {
  onProgress?.('학생부 기록 분석 및 10개 단위 배치 분할 중…');

  // 1. Google Gemini API 키가 있는 경우
  if (apiKeys.activeProvider === 'gemini' && apiKeys.gemini?.trim()) {
    return await callGeminiBatched(profile, records, apiKeys.gemini.trim(), onProgress);
  }

  // 2. OpenAI API 키가 있는 경우
  if (apiKeys.activeProvider === 'openai' && apiKeys.openai?.trim()) {
    return await callOpenAiApi(profile, records, apiKeys.openai.trim(), onProgress);
  }

  // 3. API 키가 없거나 테스트 모드인 경우: 오프라인 표준 룰베이스 엔진 가동 (60문항: 학업 20, 진로 20, 공동체 20)
  onProgress?.('오프라인 표준 규칙 엔진으로 맞춤 질문 60개 생성 중 (API 키 불필요)…');
  const pastExamData = await loadPastExamData();
  await new Promise((r) => setTimeout(r, 600));
  return generateStandardRuleQuestions(profile, records, pastExamData);
}

/**
 * Google Gemini API: 비용과 속도를 위해 10개씩 묶어서 배치(Batch) 호출 (총 50개 질문 생성)
 * 학생부 항목 수(20개, 35개, 59개 등)에 상관없이 동적으로 최적 분배
 * 요청 모델: 'gemini-flash-lite-latest' (실패 시 'gemini-2.0-flash-lite' -> 'gemini-1.5-flash')
 */
async function callGeminiBatched(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  records: StudentRecordItem[],
  apiKey: string,
  onProgress?: (stage: string) => void
): Promise<QuestionItem[]> {
  // 1. 전체 생기부 기록에서 영역별 동적 분류
  const changcheRecords = records.filter((r) => r.type === '창의적 체험활동');
  const behaviorRecords = records.filter((r) => r.type === '행동특성및종합의견');
  const subjectRecords = records.filter((r) => r.type === '교과학습발달');

  // 교과 세특: 3학년 및 2학년(전공 심층) vs 1학년(기초 학업역량)
  const advancedSubjects = subjectRecords.filter((r) => r.grade === '3학년' || r.grade === '2학년');
  const basicSubjects = subjectRecords.filter((r) => r.grade === '1학년' || !advancedSubjects.includes(r));

  // 각 배치가 빈 배열이 되지 않도록 동적 안전 분배
  const batch1Targets =
    advancedSubjects.length >= 8
      ? advancedSubjects.slice(0, 18)
      : subjectRecords.length > 0
      ? subjectRecords
      : records;

  const batch2Targets =
    advancedSubjects.length > 18
      ? advancedSubjects.slice(18)
      : basicSubjects.length > 0
      ? basicSubjects
      : records;

  const batch3Targets =
    basicSubjects.length > 0
      ? basicSubjects
      : subjectRecords.length > 0
      ? subjectRecords
      : records;

  const batch4Targets = changcheRecords.length > 0 ? changcheRecords : records;

  const batch5Targets =
    behaviorRecords.length > 0
      ? [...behaviorRecords, ...changcheRecords.slice(0, 5), ...subjectRecords.slice(0, 5)]
      : records.slice(0, 15);

  // 1차 배치 (문항 1~10): 전공/진로 심층 교과 세특
  onProgress?.('Gemini Flash-Lite: 1/5 전공 심층 세특 질문 10개 생성 중… (1~10번)');
  const batch1 = await callGeminiBatch(
    profile,
    batch1Targets,
    apiKey,
    1,
    `지원 학과(${profile.targetMajor || '지원 학과'})와 직결된 2~3학년 교과 세특 속 주도적 탐구, 보고서, 실험, 발표 내용의 진위 확인 및 학술적 심화 질문 10개`
  );

  // 2차 배치 (문항 11~20): 융합 및 심화 교과 탐구 세특
  onProgress?.('Gemini Flash-Lite: 2/5 융합·심화 세특 질문 10개 생성 중… (11~20번)');
  const batch2 = await callGeminiBatch(
    profile,
    batch2Targets,
    apiKey,
    11,
    `수학, 과학, 인문, 사회 등 복합 교과에서의 연계 탐구, 개념 이해도, 문제 해결 과정 검증 질문 10개`
  );

  // 3차 배치 (문항 21~30): 기초 학업 역량 및 교과 발전 세특
  onProgress?.('Gemini Flash-Lite: 3/5 기초 학업역량 세특 질문 10개 생성 중… (21~30번)');
  const batch3 = await callGeminiBatch(
    profile,
    batch3Targets,
    apiKey,
    21,
    `국어, 영어, 수학 등 기초 교과 및 전반적인 학업 태도, 지적 호기심과 성실성을 검증하는 질문 10개`
  );

  // 4차 배치 (문항 31~40): 창의적 체험활동 (자율/동아리/진로)
  onProgress?.('Gemini Flash-Lite: 4/5 창의적 체험활동(자율/동아리/진로) 질문 10개 생성 중… (31~40번)');
  const batch4 = await callGeminiBatch(
    profile,
    batch4Targets,
    apiKey,
    31,
    `자율활동, 동아리활동, 진로활동에 기록된 학생의 실제 주도적 역할, 리더십, 협업 태도, 진로 구체화 과정 검증 질문 10개`
  );

  // 5차 배치 (문항 41~50): 행동특성·공동체 인성, 지원 대학 인재상 맞춤, 약점 방어 압박 질문
  onProgress?.('Gemini Flash-Lite: 5/5 인성·대학맞춤·약점방어 질문 10개 생성 중… (41~50번)');
  const batch5 = await callGeminiBatch(
    profile,
    batch5Targets,
    apiKey,
    41,
    `행동특성 및 종합의견 기반 인성/소통 역량, 지원 대학(${profile.targetUniversity || '지원 대학'}) 인재상 부합 여부, 성적 추이나 활동 약점에 대한 압박 및 방어 질문 10개`
  );

  const combined = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5].map((q, idx) =>
    sanitizeQuestionItem(q, idx + 1)
  );

  return combined;
}

/**
 * 단일 배치 (10개 질문) 호출 함수
 */
async function callGeminiBatch(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  batchRecords: StudentRecordItem[],
  apiKey: string,
  startNumber: number,
  batchInstruction: string
): Promise<QuestionItem[]> {
  const models = ['gemini-flash-lite-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  const contextSummary = batchRecords
    .map((r, i) => {
      const cleanText = r.text.replace(/<[^>]+>/g, '');
      // 개인정보 보호: 외부 AI 전송 전 이름, 학교명, 주민번호 자동 마스킹
      const { maskedText } = maskPersonalInfo(cleanText, profile.name);
      return `[${i + 1}] ${r.grade} ${r.subject} (${r.type})\n원문: ${maskedText}\n하이라이트: ${
        r.highlightSpans?.join(' / ') || '없음'
      }\n태그: ${r.tags.join(', ')}`;
    })
    .join('\n\n');

  const systemPrompt = `
당신은 대한민국 대학입학 학생부종합전형 및 심층 구술면접의 전문 면접관입니다.
제시된 학생부 기록을 바탕으로 다음 지침에 따라 정확히 10개의 면접 질문을 생성하십시오.

배치 목표: ${batchInstruction}
수험생 정보:
- 지원 대학: ${profile.targetUniversity || '미지정 (학종 일반 기준)'}
- 지원 학과: ${profile.targetMajor || '미지정'}
- 전형 유형: ${profile.interviewType}

반드시 정확히 10개의 객체를 담은 JSON 배열만 응답하십시오 (번호는 ${startNumber}번부터 시작):
[
  {
    "id": "q-${startNumber}",
    "competency": "academic" | "career" | "community" | "university",
    "type": "record" | "deep" | "pressure" | "university",
    "grade": "학년",
    "subject": "과목/활동명",
    "highlightText": "질문 근거가 된 생기부 원문 문장",
    "question": "구체적이고 날카로운 면접 질문",
    "intent": "면접관의 평가 의도",
    "points": ["답변 필수 키워드 1", "키워드 2", "키워드 3"],
    "followUps": ["예상 꼬리 질문 1", "꼬리 질문 2"],
    "defense": "압박 질문일 경우 약점 극복 답변 팁"
  }
]
`;

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `\n\n### 학생부 기록 데이터\n${contextSummary}` },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[${model}] 호출 오류 (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('응답 본문이 비어 있습니다.');

      const cleanJson = text.replace(/```json\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const items = Array.isArray(parsed) ? parsed : parsed.questions || [];

      if (items.length > 0) {
        return items.map((q: any, i: number) => sanitizeQuestionItem(q, startNumber + i));
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // 다음 모델로 폴백 계속
      continue;
    }
  }

  throw lastError || new Error('Gemini API 호출에 실패했습니다. API 키를 다시 확인해 주세요.');
}

/**
 * OpenAI API 호출
 */
async function callOpenAiApi(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  records: StudentRecordItem[],
  apiKey: string,
  onProgress?: (stage: string) => void
): Promise<QuestionItem[]> {
  onProgress?.('OpenAI GPT-4o에 질문 생성 요청 중…');

  const contextSummary = records
    .map((r, i) => {
      const cleanText = r.text.replace(/<[^>]+>/g, '');
      const { maskedText } = maskPersonalInfo(cleanText, profile.name);
      return `[${i + 1}] ${r.grade} ${r.subject}: ${maskedText}`;
    })
    .join('\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 대입 면접관입니다. 학생부 내용을 바탕으로 지원 대학(${profile.targetUniversity} ${profile.targetMajor})에 맞춘 20개의 면접 질문을 { "questions": [...] } JSON으로 응답하세요.`,
        },
        {
          role: 'user',
          content: contextSummary,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 호출 실패: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  const qList = Array.isArray(parsed) ? parsed : parsed.questions || [];
  return qList.map((q: QuestionItem, idx: number) => ({
    ...q,
    id: q.id || `q-${idx + 1}`,
    completed: false,
  }));
}





/**
 * QuestionItem 필드 안전화 (null, undefined, 비정상 타입 원천 차단)
 */
export function sanitizeQuestionItem(q: any, defaultNum: number): QuestionItem {
  return {
    id: q?.id ? String(q.id) : `q-${defaultNum}`,
    competency: ['academic', 'career', 'community', 'university'].includes(q?.competency)
      ? q.competency
      : 'academic',
    type: ['record', 'deep', 'pressure', 'university'].includes(q?.type)
      ? q.type
      : 'record',
    grade: q?.grade ? String(q.grade) : '',
    subject: q?.subject ? String(q.subject) : '',
    highlightText: q?.highlightText ? String(q.highlightText) : '',
    question: q?.question ? String(q.question) : '면접 질문 내용을 불러오지 못했습니다.',
    intent: q?.intent ? String(q.intent) : '지원자의 역량 검증',
    points: Array.isArray(q?.points)
      ? q.points.filter((p: any) => p != null).map((p: any) => String(p))
      : typeof q?.points === 'string'
      ? [q.points]
      : ['핵심 키워드를 중심으로 두괄식으로 답변하세요.'],
    followUps: Array.isArray(q?.followUps)
      ? q.followUps.filter((f: any) => f != null).map((f: any) => String(f))
      : typeof q?.followUps === 'string'
      ? [q.followUps]
      : [],
    defense: q?.defense ? String(q.defense) : undefined,
    userNotes: q?.userNotes ? String(q.userNotes) : '',
    completed: Boolean(q?.completed),
    starred: Boolean(q?.starred),
    isCommon: Boolean(q?.isCommon),
    srcBadge: q?.srcBadge ? String(q.srcBadge) : undefined,
    catGroup: q?.catGroup,
    tplId: q?.tplId ? String(q.tplId) : undefined,
    ansLabel: q?.ansLabel ? String(q.ansLabel) : undefined,
    tip: q?.tip ? String(q.tip) : undefined,
  };
}
