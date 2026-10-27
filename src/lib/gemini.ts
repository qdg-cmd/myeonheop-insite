import { ApiKeys, QuestionItem, StudentProfile, StudentRecordItem } from '../types';
import { generateStandardRuleQuestions } from './ruleEngine';

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
  await new Promise((r) => setTimeout(r, 600));
  return generateStandardRuleQuestions(profile, records);
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
    .map(
      (r, i) =>
        `[${i + 1}] ${r.grade} ${r.subject} (${r.type})\n원문: ${r.text.replace(/<[^>]+>/g, '')}\n하이라이트: ${
          r.highlightSpans?.join(' / ') || '없음'
        }\n태그: ${r.tags.join(', ')}`
    )
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    .map((r, i) => `[${i + 1}] ${r.grade} ${r.subject}: ${r.text.replace(/<[^>]+>/g, '')}`)
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
 * 형광펜이 없는 일반 텍스트에서 면접 질문으로 출제하기 좋은 핵심 활동 문장을 자동 추출
 */
function extractKeySentencesFromRawText(rawText: string): string[] {
  const sentences = rawText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 150);

  const keywords = [
    '탐구', '보고서', '실험', '발표', '분석', '설계', '주장', '제언',
    '토론', '조사', '프로젝트', '극복', '해결', '가설', '원인', '비판', '도출',
  ];

  const scored = sentences.map((sentence) => {
    let score = 0;
    for (const kw of keywords) {
      if (sentence.includes(kw)) score += 2;
    }
    if (/(?:함|음|였음|돋보임|보여줌|이끔)\.?$/.test(sentence)) score += 1;
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 2).map((s) => s.sentence);

  return top.length > 0 ? top : [sentences[0] || rawText.slice(0, 80)];
}

/**
 * 로컬 룰베이스 질문 생성기 (API 키 미설정 시)
 */
function generateRuleBasedQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  records: StudentRecordItem[]
): QuestionItem[] {
  const questions: QuestionItem[] = [];

  records.forEach((rec, idx) => {
    const rawText = rec.text.replace(/<[^>]+>/g, '');
    const highlightsToUse =
      rec.highlightSpans && rec.highlightSpans.length > 0
        ? rec.highlightSpans
        : extractKeySentencesFromRawText(rawText);

    highlightsToUse.forEach((hl, hIdx) => {
      const competency =
        rec.subject.includes('진로') || rec.tags.some((t) => t.includes('진로'))
          ? 'career'
          : rec.subject.includes('자율') || rec.subject.includes('봉사')
          ? 'community'
          : 'academic';

      questions.push({
        id: `q-rule-${idx}-${hIdx}`,
        competency,
        type: 'record',
        grade: rec.grade,
        subject: rec.subject,
        highlightText: hl,
        question: `${rec.grade} ${rec.subject} 활동 중 "${hl.slice(0, 45)}…"라고 기록되어 있습니다. 이 탐구를 진행하게 된 직접적인 동기와, 이 과정에서 겪은 가장 인상 깊은 경험 및 배운 점을 설명해 주세요.`,
        intent: `${rec.subject} 교과 내 주도적 탐구 역량 및 실제 활동 진위 여부 검증`,
        points: [
          '교과 수업 내용에서 출발한 호기심 및 탐구 동기 구체화',
          '탐구/실험 과정 중 마주친 기술적·이론적 어려움과 해결책',
          '활동 후 심화 학습으로 이어진 발전 과정 및 전공 연계성',
        ],
        followUps: [
          '그 활동을 진행하면서 본인이 기존에 알던 상식과 달랐던 점이 있었나요?',
          '당시 활동을 다시 진행한다면 어떤 점을 보완하여 더 완성도 높게 발전시키고 싶습니까?',
        ],
        completed: false,
      });
    });
  });

  // 지원 학과 및 대학 맞춤 질문 추가
  questions.unshift({
    id: 'q-univ-1',
    competency: 'university',
    type: 'university',
    subject: '지원동기 및 인재상',
    question: `수많은 대학 중 특별히 ${profile.targetUniversity || '지원 대학'} ${profile.targetMajor || '지원 학과'}에 지원하게 된 결정적인 이유와, 학생부 속 어떤 경험이 본인을 우리 학과에 적합한 인재로 만들었다고 생각하나요?`,
    intent: '대학 인재상 부합 여부 및 진정성 있는 지원 동기 검증',
    points: [
      `${profile.targetUniversity || '지원 대학'}만의 커리큘럼이나 교수진, 비전 언급`,
      '학생부의 핵심 탐구 활동과 학과의 연계성 제시',
      '입학 후 구체적인 학업 및 진로 계획 피력',
    ],
    followUps: [
      `만약 대학 입학 후 본인이 기대했던 ${profile.targetMajor || '전공'}의 수업과 현실이 다르다면 어떻게 대처하시겠습니까?`,
    ],
    completed: false,
  });

  // 약점/압박 질문 추가
  questions.push({
    id: 'q-pressure-1',
    competency: 'academic',
    type: 'pressure',
    subject: '학업/성적 약점 방어',
    question: `학생부를 전반적으로 검토했을 때, 다른 영역에 비해 상대적으로 성적이 하락했거나 활동의 깊이가 아쉬운 부분이 보입니다. 본인은 이에 대해 어떻게 생각하며 어떻게 보완했습니까?`,
    intent: '위기 대처 능력 및 실패에 대한 솔직한 성찰과 극복 의지 확인',
    points: [
      '변명 대신 원인을 솔직하고 담백하게 인정',
      '문제를 인식한 후 바꾼 구체적인 공부법이나 노력 강조',
      '그 경험을 통해 배운 회복탄력성과 성숙한 태도',
    ],
    followUps: ['그 보완 노력이 실제 이후 학기나 다른 활동에서 어떤 긍정적 변화를 이끌어냈나요?'],
    defense: '성적 변명보다는 극복 과정에서 얻은 교훈에 초점을 맞추어 답변을 전개하세요.',
    completed: false,
  });

  // 학생부 항목 수에 관계없이 총 50개 문항이 될 때까지 동적으로 보충
  if (questions.length < 50 && records.length > 0) {
    let loopIdx = 0;
    while (questions.length < 50 && loopIdx < records.length * 4) {
      const rec = records[loopIdx % records.length];
      const deepId = `q-deep-${questions.length + 1}`;

      questions.push({
        id: deepId,
        competency: rec.subject.includes('진로') ? 'career' : 'academic',
        type: 'deep',
        grade: rec.grade,
        subject: rec.subject,
        question: `${rec.grade} ${rec.subject} 활동에서 탐구한 내용을 ${profile.targetMajor || '지원 전공'} 분야의 실제 사회적 이슈나 학문적 쟁점과 연결 지어 본인의 견해를 말씀해 보세요.`,
        intent: '학문 간 융합 사고력 및 전공 분야로의 확장 적용 능력 검증',
        points: [
          `${rec.subject}의 핵심 개념 요약`,
          `${profile.targetMajor || '지원 학과'}의 실제 사례나 연구 분야와 연결`,
          '자신만의 비판적 시각 및 해결 방안 제시',
        ],
        followUps: [
          '그 적용 과정에서 발생할 수 있는 현실적 한계나 예상되는 반론은 무엇인가요?',
        ],
        completed: false,
      });
      loopIdx++;
    }
  }

  return questions.slice(0, 50).map((q, idx) => sanitizeQuestionItem(q, idx + 1));
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
  };
}
