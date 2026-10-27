import { QuestionItem, StudentProfile, StudentRecordItem, CompetencyType } from '../types';
import { CONCEPTS, FIELDS, COMMON, PRESSURE, TAIL } from './v4Data';
import { sanitizeQuestionItem } from './gemini';

const HANGUL = /[가-힣]/;
function jong(ch: string): number {
  const c = ch.charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : c % 28;
}
function jung(ch: string): number {
  const c = ch.charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : Math.floor((c % 588) / 28);
}
function hasBatchim(w: string): boolean {
  const ch = w.trim().slice(-1);
  if (!HANGUL.test(ch)) return /[013678LMNR]$/i.test(ch);
  return jong(ch) > 0;
}
function stripJong(ch: string): string {
  const c = ch.charCodeAt(0) - 0xAC00;
  return String.fromCharCode(0xAC00 + c - (c % 28));
}
function addJong(ch: string, j: number): string {
  const c = ch.charCodeAt(0) - 0xAC00;
  return String.fromCharCode(0xAC00 + c - (c % 28) + j);
}

function pastOf(stemLast: string): string {
  const v = jung(stemLast);
  return v === 0 || v === 8 || v === 2 || v === 9 ? '았' : '었';
}

function contractPast(st: string): string {
  const map: Record<string, string> = {
    보: '보았', 주: '주었', 두: '두었', 나누: '나누었', 하: '했', 되: '되었', 오: '왔', 가: '갔',
    서: '섰', 내: '냈', 세우: '세웠', 배우: '배웠', 키우: '키웠', 다루: '다루었', 이루: '이루었',
    치: '쳤', 키: '켰', 리: '렸', 기: '겼', 지: '졌', 시: '셨', 피: '폈', 끼: '꼈',
    르: '렀', 우: '웠', 추: '췄', 쓰: '썼', 크: '컸', 뜨: '떴', 트: '텄',
  };
  if (map[st]) return map[st];
  const v = jung(st);
  if (v === 0) return addJong(st, 20);
  if (v === 4) return addJong(st, 20);
  if (v === 20)
    return addJong(
      stripJong(
        String.fromCharCode(
          0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 6 * 28
        )
      ),
      20
    );
  if (v === 13)
    return addJong(
      String.fromCharCode(
        0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 14 * 28
      ),
      20
    );
  if (v === 8)
    return addJong(
      String.fromCharCode(
        0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 9 * 28
      ),
      20
    );
  return st + pastOf(st);
}

/**
 * 한국어 어미를 자연스러운 과거 인용절로 변환 (~했다고)
 */
export function toPastClause(chunk: string): string | null {
  const c = chunk.trim().replace(/[.,;]+$/, '').replace(/\s+/g, ' ');
  const rules: Array<[RegExp, string]> = [
    [/(하였음|했음|하였다|했다|함|하였고|했고|하고|하며|하였으며|했으며|하여|해서|해)$/, '했다고'],
    [/(되었음|됐음|되었다|됨|되었고|되고|되며|되어|돼)$/, '되었다고'],
    [/(결과를 도출함|결과를 얻음|결과를 이끌어냄|결과)$/, '결과를 도출했다고'],
    [/(도출하여|산출하여|도출하고|산출하고)$/, '도출했다고'],
    [/(바탕으로|토대로)$/, '바탕으로 탐구했다고'],
    [/(위하여|위해)$/, '위해 노력했다고'],
    [/(통하여|통해)$/, '통해 배웠다고'],
    [/(보였음|보임|보이며|보이고|보여)$/, '보였다고'],
    [/(도움|도우며|도와)$/, '도왔다고'],
    [/(밝힘|밝히며|밝히고)$/, '밝혔다고'],
    [/(가짐|가지며|가지고|갖고|가져)$/, '가졌다고'],
    [/(느낌|느끼며|느끼고|느껴)$/, '느꼈다고'],
    [/(깨달음|깨닫고|깨달으며|깨달아)$/, '깨달았다고'],
    [/(있음|있으며|있고)$/, '있었다고'],
    [/(없음|없으며|없고)$/, '없었다고'],
    [/(였음|였으며|였고)$/, '였다고'],
    [/냄$|내며$|내고$/, '냈다고'],
    [/씀$|쓰며$|쓰고$/, '썼다고'],
  ];
  for (const [re, rep] of rules) {
    if (re.test(c)) return c.replace(re, rep);
  }
  const last = c.slice(-1);
  const prev = c.slice(0, -1);
  if (!HANGUL.test(last)) return null;

  if (/[고며]$/.test(c) && prev.length) {
    const st = prev.slice(-1);
    if (HANGUL.test(st)) {
      if (jong(st) === 0) return prev.slice(0, -1) + contractPast(st) + '다고';
      return prev + pastOf(st) + '다고';
    }
  }
  if (/[어아]$/.test(c) && prev.length) {
    return prev + (last === '아' ? '았' : '었') + '다고';
  }
  if (last === '음' && prev.length) {
    const st = prev.slice(-1);
    if (HANGUL.test(st)) return prev + pastOf(st) + '다고';
  }
  if (jong(last) === 16) {
    const stem = stripJong(last);
    if (stem === '하') return prev + '했다고';
    if (stem === '이') return prev.length ? prev + '이라고' : null;
    return prev + contractPast(stem) + '다고';
  }
  return null;
}

const LEAD_RE = /^(또한|특히|나아가|더 나아가|이어|이어서|그리고|아울러|더불어|이후|이를 통해|이를 바탕으로|이 과정에서|그 결과|이에|또)\s*,?\s*/;

function clauseFor(text: string, anchor: string | null): string | null {
  const t = text.replace(/\s*\.$/, '').replace(LEAD_RE, '');
  if (t.length <= 95) {
    const c = toPastClause(t);
    if (c) return c;
  }
  const parts = t.split(
    /(?<=(?:하고|하며|하여|하였으며|했으며|하였고|했고|이며|으며|였으며|되며|되어|되고|읽고|보고|통해|바탕으로|위해|위하여|결과|후)),?\s+/
  );
  let idx = 0;
  if (anchor) {
    idx = parts.findIndex((p) => p.includes(anchor));
    if (idx < 0) idx = 0;
  }
  let seg = parts[idx];
  let j = idx;
  while (j < parts.length - 1 && (seg.length < 28 || !toPastClause(seg))) {
    j++;
    seg += ' ' + parts[j];
    if (seg.length > 120) break;
  }
  if (seg.length > 125) {
    const cut = seg.slice(seg.length - 110);
    seg = '…' + cut.slice(cut.indexOf(' ') + 1);
  }
  seg = seg.replace(LEAD_RE, '');
  return toPastClause(seg);
}

function makeLead(r: StudentRecordItem, text: string, anchor: string | null): string {
  const g = r.grade ? `${r.grade} ` : '';
  const label = `(${g}${r.subject})`;
  const c = clauseFor(text, anchor);
  if (c) return `${label} ${c} 되어 있는데,`;
  let t = text.replace(/\.$/, '');
  if (t.length > 70) t = t.slice(0, 68) + '…';
  return `${label} ‘${t}’라는 기록이 있는데,`;
}

// 불용어 목록
const STOPWORDS = new Set([
  '학생', '자신', '활동', '내용', '통해', '관련', '수업', '탐구', '결과', '진행',
  '모둠', '참여', '노력', '역량', '모습', '태도', '생각', '학교', '발표', '과정',
  '이해', '학습', '시간', '주제', '대한', '위해', '바탕', '활용', '능력', '우수',
  '다양한', '여러', '가지', '경우', '이후', '스스로', '직접', '주도적', '적극적',
  '교과', '과목', '학년', '분야', '문제', '방법', '이유', '측면', '경험', '기회'
]);

/**
 * 학생부 텍스트에서 3회 이상 등장하는 고빈도 명사 및 사용자 지정 키워드를 동적 핵심 키워드로 추출
 */
export function extractFrequentKeywords(
  records: StudentRecordItem[],
  customKeywords?: string[]
): Array<{ term: string; name: string; count: number; isCustom?: boolean }> {
  const counts = new Map<string, { count: number; isCustom?: boolean }>();

  // 1. 사용자 지정 키워드 우선 등록 (최우선 순위 가중치)
  if (customKeywords && customKeywords.length > 0) {
    customKeywords.forEach((kw) => {
      const clean = kw.trim();
      if (clean.length >= 2) {
        counts.set(clean, { count: 99, isCustom: true });
      }
    });
  }

  // 2. 학생부 전체 텍스트 빈도 분석 (가벼운 TF-IDF/고빈도 어휘 추출)
  const wordRegex = /[가-힣A-Za-z0-9]{2,12}/g;
  for (const rec of records) {
    const text = rec.text.replace(/<[^>]+>/g, '');
    let m;
    while ((m = wordRegex.exec(text)) !== null) {
      const w = m[0].trim();
      if (w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) {
        let cleanWord = w;
        if (cleanWord.length >= 3 && /(은|는|이|가|을|를|의|에|로|와|과|도)$/.test(cleanWord)) {
          cleanWord = cleanWord.slice(0, -1);
        }
        if (cleanWord.length >= 2 && !STOPWORDS.has(cleanWord)) {
          const prev = counts.get(cleanWord);
          if (prev) {
            if (!prev.isCustom) prev.count += 1;
          } else {
            counts.set(cleanWord, { count: 1, isCustom: false });
          }
        }
      }
    }
  }

  const results: Array<{ term: string; name: string; count: number; isCustom?: boolean }> = [];
  for (const [term, data] of counts.entries()) {
    if (data.isCustom || data.count >= 3) {
      results.push({ term, name: term, count: data.count, isCustom: data.isCustom });
    }
  }

  results.sort((a, b) => b.count - a.count);
  return results.slice(0, 15);
}

// 개념어 색인
const CONCEPT_IDX = (() => {
  const arr: Array<{ term: string; name: string; def: string }> = [];
  CONCEPTS.forEach(([k, al, d]) => {
    [k, ...(al ? al.split('|') : [])].forEach((term) => {
      const cleanTerm = term.trim();
      if (cleanTerm.length >= 2) {
        arr.push({ term: cleanTerm, name: k, def: d });
      }
    });
  });
  arr.sort((a, b) => b.term.length - a.term.length);
  return arr;
})();

function findConcepts(
  text: string,
  dynamicKeywords?: Array<{ term: string; name: string; isCustom?: boolean }>
): Array<{ term: string; name: string; def: string; isCustom?: boolean }> {
  const hit: Array<{ term: string; name: string; def: string; isCustom?: boolean }> = [];

  // 사용자 지정 및 동적 추출 키워드 우선 매칭
  if (dynamicKeywords && dynamicKeywords.length > 0) {
    for (const dk of dynamicKeywords) {
      if (text.includes(dk.term)) {
        hit.push({
          term: dk.term,
          name: dk.name,
          def: dk.isCustom
            ? `선택 지정된 집중 탐구 키워드 '${dk.name}'에 관한 구체적 탐구 배경과 학업적 깊이 검증`
            : `학생부 속 주요 반복 탐구 주제 '${dk.name}'`,
          isCustom: dk.isCustom,
        });
        if (hit.length >= 3) return hit;
      }
    }
  }

  for (const c of CONCEPT_IDX) {
    if (text.includes(c.term)) {
      if (!hit.some((h) => h.name === c.name)) {
        hit.push(c);
      }
      if (hit.length >= 3) break;
    }
  }
  return hit;
}

const FLAG_RE = {
  inquiry: /(?:[가-힣]{0,2})(탐구|조사|분석|연구|고찰|규명|비교|검증|입증|문헌조사|데이터마이닝|통계처리)(?:[가-힣]{0,2})/,
  experiment: /(?:[가-힣]{0,2})(실험|측정|관찰|변인|가설|오차|대조군|실험군)(?:[가-힣]{0,2})/,
  make: /(?:[가-힣]{0,2})(제작|설계|코딩|구현|프로그램|앱|만들|구축|개발|모델링|시뮬레이션|창안|고안)(?:[가-힣]{0,2})/,
  present: /(?:[가-힣]{0,2})(발표|설명함|소개함|강연|수업을 (?:기획|진행)|시연|브리핑|카드뉴스|포스터)(?:[가-힣]{0,2})/,
  report: /(?:[가-힣]{0,2})(보고서|소논문|논술|에세이|글을 작성|서평|감상문|칼럼|기사|학술지)(?:[가-힣]{0,2})/,
  debate: /(?:[가-힣]{0,2})(토론|찬반|반론|입론|반박|패널|디베이트)(?:[가-힣]{0,2})/,
  read: /(?:[가-힣]{0,2})(읽고|도서|독서|서평|원서)(?:[가-힣]{0,2})/,
  leader: /(?:[가-힣]{0,2})(반장|회장|부회장|부장|팀장|모둠장|조장|대표|리더|총괄)(?:[가-힣]{0,2})/,
  conflict: /(?:[가-힣]{0,2})(갈등|의견\s*차이|의견을\s*조율|조율|중재|협의)(?:[가-힣]{0,2})/,
  coop: /(?:[가-힣]{0,2})(협력|협업|협동|함께|팀원|모둠원|구성원|동료)(?:[가-힣]{0,2})/,
  care: /(?:[가-힣]{0,2})(배려|봉사|나눔|도움|도와|멘토|멘티|도우미|튜터)(?:[가-힣]{0,2})/,
  plan: /(?:[가-힣]{0,2})(기획|운영|캠페인|개선안|행사|프로젝트)(?:[가-힣]{0,2})/,
  expand: /(?:[가-힣]{0,2})(나아가|심화|추가로|확장|더 나아가|후속|이어서|스스로|자발적|자기\s*주도|주도적|연계하여)(?:[가-힣]{0,2})/,
  reflect: /(?:[가-힣]{0,2})(깨달|느낌|느꼈|인식|계기|성찰|반성|다짐)(?:[가-힣]{0,2})/,
  trait: /(?:[가-힣]{0,2})(학생임|성품|태도가|인성|책임감|성실|정직|꾸준|끈기|배려심)(?:[가-힣]{0,2})/,
};

const PRED_WEAK_RE = /(이해함|이해하였음|이해하게 됨|이해도를 높임|파악함|알게 됨|알게 되었음|알게 되는 계기가 됨|깨달음|깨달았음|깨닫게 됨|느낌|느꼈음|느끼게 됨|인식함|배움|배웠음|학습함|체감함|실감함|공감함|되새김|다짐함|생각하게 됨|관심을 가짐|흥미를 느낌|계기가 됨|참여함|참석함|경청함|시야를 넓힘|안목을 넓힘|소중함을 앎|중요성을 앎|성찰함|반성함|익힘|습득함)\s*\.?$/;

export interface CandidateQuestion {
  key: string;
  competency: CompetencyType;
  type: 'record' | 'deep' | 'pressure' | 'university';
  grade?: string;
  subject?: string;
  highlightText?: string;
  question: string;
  intent: string;
  points: string[];
  followUps: string[];
  defense?: string;
  score: number;
}

/**
 * 학생부 59개 전 기록에서 비중복 문항 후보 풀(Candidate Pool)을 생성 (보통 150~300개 생성)
 */
export function buildRuleCandidatePool(
  records: StudentRecordItem[],
  major: string,
  univ: string,
  customKeywords?: string[]
): CandidateQuestion[] {
  const pool: CandidateQuestion[] = [];
  const M = major || '지원 학과';
  const U = univ || '지원 대학';

  const dynamicKeywords = extractFrequentKeywords(records, customKeywords);

  records.forEach((rec, rIdx) => {
    const cleanRaw = rec.text.replace(/<[^>]+>/g, '');
    const rawSentences = cleanRaw
      .replace(/([가-힣)'’"”])\.\s*(?=[가-힣A-Za-z'‘"“(\[<0-9])/g, '$1.\n')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length >= 5);

    // 종속 접속사로 시작하는 문장은 직전 문장과 병합(Merge)하여 맥락 단절 방지
    const CONJUNCTION_MERGE_RE = /^(이를 위해|이를 바탕으로|이를 통해|그 결과|이에 따라|이에|따라서|이후|이어|이 과정에서|이를 해결하기 위해|이를 개선하기 위해|더 나아가|나아가)\s*,?\s*/;

    const sentences: string[] = [];
    for (let i = 0; i < rawSentences.length; i++) {
      const cur = rawSentences[i];
      if (CONJUNCTION_MERGE_RE.test(cur) && sentences.length > 0) {
        const prev = sentences[sentences.length - 1];
        sentences[sentences.length - 1] = prev.replace(/\.?$/, ', ') + cur;
      } else {
        sentences.push(cur);
      }
    }

    const validSentences = sentences.filter((s) => s.length >= 15);

    validSentences.forEach((sent, sIdx) => {
      const f: Record<string, boolean> = {};
      for (const k in FLAG_RE) {
        f[k] = (FLAG_RE as any)[k].test(sent);
      }
      const concepts = findConcepts(sent, dynamicKeywords);
      const quotes: string[] = [];
      const qre = /[‘'"“「『<《]([^’'"”」』>》]{2,70})[’'"”」』>》]/g;
      let qm;
      while ((qm = qre.exec(sent)) !== null) {
        quotes.push(qm[1].trim());
      }
      const anchor = quotes[0] || (concepts[0] && concepts[0].term) || null;
      const L = makeLead(rec, sent, anchor);
      const key = `rec_${rIdx}_${sIdx}`;

      // 약한 서술어 감점 완화: 활동의 구체성을 띠는 핵심 명사(따옴표, 개념어, 실험, 탐구)가 있으면 대폭 완화
      const isWeakPred = PRED_WEAK_RE.test(sent);
      const hasSpecificContent = quotes.length > 0 || concepts.length > 0 || f.inquiry || f.experiment || f.make;
      const predPenalty = isWeakPred ? (hasSpecificContent ? -0.8 : -9.0) : 0;

      // 1. 학업 역량 (개념, 실험, 탐구, 보고서, 공학/제작)
      if (concepts.length > 0) {
        concepts.slice(0, 2).forEach((c, ci) => {
          const isCustom = c.isCustom;
          pool.push({
            key: `${key}_c_${ci}`,
            competency: 'academic',
            type: 'deep',
            grade: rec.grade,
            subject: rec.subject,
            highlightText: sent,
            score: (isCustom ? 4.3 : 3.8) + predPenalty,
            question: isCustom
              ? `${makeLead(rec, sent, c.term)} 핵심 키워드인 '${c.name}'에 관해 어떤 배경에서 집중 탐구하게 되었으며, 이를 통해 얻은 핵심적인 학업적 성과는 무엇인가요?`
              : `${makeLead(rec, sent, c.term)} '${c.name}'의 핵심 개념과 원리를 설명해 주세요.`,
            intent: `${rec.subject}에서 다룬 '${c.name}'의 학술적 개념 이해도 및 학업 역량 검증`,
            points: [
              `'${c.name}'의 정확한 정의와 과학적/학문적 원리 설명`,
              c.def
                ? `핵심 원리: ${c.def.slice(0, 90)}…`
                : '실제 탐구 활동에서 이 원리가 어떻게 적용되었는지 구체적 언급',
              '전공 학습으로 이어지는 해당 개념의 중요성 피력',
            ],
            followUps: [
              `'${c.name}' 원리가 실생활이나 ${M} 관련 최신 산업/연구 기술에 어떻게 적용될 수 있는지 구체적 사례를 들어 설명해 보세요.`,
              `'${c.name}' 탐구를 진행하면서 이론과 실제 데이터 간의 차이점이나 가장 이해하기 어려웠던 지점은 무엇이었나요?`,
            ],
          });
        });
      }

      if (f.experiment) {
        const expAnchor = anchor || '해당 실험';
        pool.push({
          key: `${key}_exp`,
          competency: 'academic',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.5 + predPenalty,
          question: `${L} 실험에서 조작한 독립변인과 통제변인은 무엇이었으며, 예상과 달랐던 결과나 오차 원인이 있었다면 어떻게 분석했나요?`,
          intent: '과학적 탐구 방법론의 이해도 및 데이터 해석, 문제 해결 능력 검증',
          points: [
            '가설 설정 - 변인 통제 - 실험 결과의 인과관계 논리적 정리',
            '실험 과정에서 발생한 오차의 원인과 이를 해결하기 위한 노력',
            '실험을 다시 수행한다면 개선하고 싶은 설계 방향',
          ],
          followUps: [
            `'${expAnchor}' 진행 중 통제변인이 엄격히 통제되지 못했을 가능성이나, 발생할 수 있는 계통 오차는 무엇이었나요?`,
            `실험 결과 도출 후, 이를 이론값이나 다른 선행 연구 결과와 비교해 보았나요?`,
          ],
        });
      }

      if (f.inquiry || f.report) {
        const topicName = quotes[0] || (concepts[0] && concepts[0].term) || '해당 탐구';
        pool.push({
          key: `${key}_inq`,
          competency: 'academic',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.2 + predPenalty,
          question: `${L} ‘${topicName}’에서 도출한 핵심 결론은 무엇이며, 어떤 근거 자료를 바탕으로 신뢰할 수 있다고 판단했나요?`,
          intent: '주도적 탐구 역량 및 문헌·자료의 비판적 분석력 검증',
          points: [
            '두괄식으로 핵심 결론 명확히 제시',
            '결론을 뒷받침하는 2가지 이상의 객관적 근거 자료',
            '탐구 과정에서 겪은 한계점과 이를 극복한 방법',
          ],
          followUps: [
            `‘${topicName}’ 탐구에서 가장 신뢰할 만하다고 판단한 핵심 근거 자료(문헌·데이터)는 무엇이었나요?`,
            `다시 동일한 주제로 심화 연구를 수행한다면, 기존 탐구의 어떤 한계점을 보완하고 싶나요?`,
          ],
        });
      }

      if (f.make) {
        const makeAnchor = anchor || '해당 결과물';
        pool.push({
          key: `${key}_make`,
          competency: 'academic',
          type: 'deep',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.0 + predPenalty,
          question: `${L} 제작한 결과물이 어떤 메커니즘과 원리로 작동하는지, 다른 대안 대신 이 방식을 택한 이유를 설명해 주세요.`,
          intent: '공학적 설계 역량 및 기술적 의사결정의 논리성 검증',
          points: [
            '결과물의 핵심 작동 알고리즘/원리 설명',
            '기존 방식과의 차별점 및 선정 이유',
            '직접 수행한 부분과 라이브러리/기존 자료 활용 부분의 명확한 구분',
          ],
          followUps: [
            `'${makeAnchor}' 제작 시 기존 오픈소스/라이브러리를 활용한 부분과 직접 알고리즘을 설계·구현한 부분을 구분해 설명해 주세요.`,
            `성능이나 효율성 측면에서 예상보다 아쉬웠던 점은 무엇이었으며, 어떻게 개선할 수 있을까요?`,
          ],
        });
      }

      // 2. 진로 역량 (전공 연결, 동기, 심화 확장)
      if (rec.subject.includes('진로') || f.expand || quotes.length > 0) {
        const linkTopic = quotes[0] || (concepts[0] && concepts[0].term) || '해당 활동';
        pool.push({
          key: `${key}_car_link`,
          competency: 'career',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.3 + predPenalty,
          question: `${L} 이 활동이 ${M} 전공 학습과 어떻게 이어진다고 생각하며, 대학 입학 후 어떤 세부 연구나 과목으로 발전시키고 싶나요?`,
          intent: '전공 적합성 및 고교 활동과 대학 학업 간의 연계성 검증',
          points: [
            '고교 활동에서 느낀 지적 호기심 요약',
            `${M}의 구체적인 전공 커리큘럼이나 연구 분야와 연결`,
            '입학 후 자기주도적 학업 계획 피력',
          ],
          followUps: [
            `'${linkTopic}'에 대한 관심이 처음 생긴 결정적인 계기는 무엇이었나요?`,
            `대학 입학 후 ${M}에서 이와 관련해 가장 먼저 수강하고 싶은 전공 심화 과목은 무엇인가요?`,
          ],
        });
      }

      if (quotes[0]) {
        pool.push({
          key: `${key}_car_topic`,
          competency: 'career',
          type: 'deep',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 2.9 + predPenalty,
          question: `${L} 수많은 주제 가운데 특별히 ‘${quotes[0]}’${hasBatchim(quotes[0]) ? '을' : '를'} 선택한 결정적인 이유는 무엇인가요?`,
          intent: '진로 탐색의 진정성 및 주제 선정의 독창성 검증',
          points: [
            '단순한 관심이 아닌 구체적인 경험이나 계기 제시',
            '이 주제를 통해 규명하고자 했던 문제의식',
            '탐구 후 진로 목표에 미친 영향',
          ],
          followUps: [
            `‘${quotes[0]}’ 관련 활동을 진행하면서 저자의 생각이나 기존 통념에 비판적으로 의문을 품었던 지점이 있나요?`,
            `이 주제가 본인이 희망하는 ${M} 진로에 어떤 확신을 주었나요?`,
          ],
        });
      }

      // 3. 공동체 역량 (리더십, 갈등 중재, 협업, 배려, 행동특성)
      if (f.leader) {
        pool.push({
          key: `${key}_p_lead`,
          competency: 'community',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.4 + predPenalty,
          question: `${L} 그 역할을 수행하면서 가장 어려웠던 점은 무엇이었고, 팀원들의 자발적 참여를 이끌어내기 위해 어떤 리더십을 발휘했나요?`,
          intent: '공동체 리더십 및 솔선수범 태도, 조직 운영 역량 검증',
          points: [
            '직책 자체보다 실제 직면했던 조직 내 문제 상황 구체화',
            '권위적 지시가 아닌 소통과 배려를 통한 해결 과정',
            '협업의 성공 결과와 팀원들의 변화',
          ],
          followUps: [
            '구성원 중 끝까지 협조하지 않는 사람이 있었다면 어떻게 대처했나요?',
            '그 경험을 통해 리더에게 가장 중요한 자질이 무엇이라고 생각하게 되었나요?',
          ],
        });
      }

      if (f.conflict) {
        pool.push({
          key: `${key}_p_conf`,
          competency: 'community',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.6 + predPenalty,
          question: `${L} 당시 발생했던 의견 대립의 본질은 무엇이었으며, 양측의 입장을 조율하여 합의를 이끌어낸 본인만의 구체적 행동은 무엇이었나요?`,
          intent: '갈등 관리 능력 및 상호 존중 의사소통 역량 검증',
          points: [
            '누구의 잘잘못이 아닌 관점의 차이를 객관적으로 서술',
            '경청과 중재를 통해 제시한 합리적 절충안',
            '갈등 해결을 통해 공동체에 기여한 가치',
          ],
          followUps: [
            '지금 다시 그 상황을 마주한다면 다르게 행동할 점이 있습니까?',
            '갈등을 해결한 후 팀의 분위기나 결과물에 어떤 긍정적 변화가 생겼나요?',
          ],
        });
      }

      if (f.care || f.coop) {
        pool.push({
          key: `${key}_p_coop`,
          competency: 'community',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 2.7 + predPenalty,
          question: `${L} 모둠 활동에서 본인이 맡았던 핵심 역할과, 협업 과정에서 어려움을 겪는 동료를 돕기 위해 실천한 행동을 말씀해 주세요.`,
          intent: '팀워크 및 나눔과 배려, 공동체적 책임 의식 검증',
          points: [
            '‘우리’가 아닌 ‘내가’ 솔선해서 수행한 역할',
            '동료와의 소통 과정에서 배려한 구체적 장면',
            '함께 이룬 성과의 의미',
          ],
          followUps: [
            '그 경험을 통해 자신에게 가장 크게 달라진 점은 무엇인가요?',
            '동료의 입장에서는 본인의 배려를 어떻게 느꼈을 것이라고 생각하나요?',
          ],
        });
      }

      if (rec.type === '행동특성및종합의견') {
        pool.push({
          key: `${key}_p_bh`,
          competency: 'community',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.1 + predPenalty,
          question: `(${rec.grade} 행동특성 및 종합의견) 담임선생님께서 ‘${sent.slice(0, 50)}…’라고 긍정적으로 평가해 주셨는데, 본인의 어떤 평소 태도와 구체적 행동 때문이라고 생각하나요?`,
          intent: '학교생활 성실성 및 인성, 자아 성찰 역량 검증',
          points: [
            '선생님의 평가와 부합하는 일상적인 학교생활 실천 사례',
            '꾸준히 지키고자 노력했던 자신만의 생활 원칙',
            '대학 입학 후 대학 공동체 생활에 기여할 수 있는 부분',
          ],
          followUps: [
            '그 태도가 대학 입학 후 공동체 생활에서 어떻게 발휘될 수 있을까요?',
            '선생님의 이러한 평가가 본인의 자아 인식과 가치관 형성에 어떤 영향을 주었나요?',
          ],
        });
      }

      // 4. 미등록 서술어 범용 처리 (Neutral Fallback 안전망 로직)
      const hasAnyFlagOrConcept =
        concepts.length > 0 ||
        f.experiment ||
        f.inquiry ||
        f.report ||
        f.make ||
        f.leader ||
        f.conflict ||
        f.care ||
        f.coop ||
        f.expand ||
        quotes.length > 0;

      const isActionEnding = /(?:함|했음|하였음|됨|되었음|음|임|보임|나타남)\.?$/.test(sent.trim());

      if (!hasAnyFlagOrConcept && isActionEnding && sent.length >= 25 && predPenalty > -5) {
        pool.push({
          key: `${key}_fallback_action`,
          competency: rec.type === '창의적 체험활동' ? 'career' : 'academic',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 2.6 + predPenalty,
          question: `${L} 이 활동을 기획하고 수행하게 된 계기와, 구체적으로 어떤 과정을 거쳐 완성했는지 설명해 주세요.`,
          intent: `${rec.subject} 활동의 자기주도적 기획 배경 및 구체적 실행 과정(진위성) 검증`,
          points: [
            '활동을 시작하게 된 구체적인 동기와 개인적 문제의식 제시',
            '활동 수행 절차 및 본인이 기여한 핵심 역할 설명',
            '활동을 통해 도출한 성과와 개인적 역량의 성장 포인트 강조',
          ],
          followUps: [
            '그 활동을 진행하면서 가장 큰 보람을 느꼈던 순간이나 기억에 남는 장면은 무엇이었나요?',
            '이 활동을 통해 배운 점이 이후 다른 학교생활이나 학업에 어떤 영향을 주었나요?',
          ],
        });
      }
    });
  });

  // 점수 높은 순으로 정렬
  return pool.filter((q) => q.score > 0).sort((a, b) => b.score - a.score);
}

/**
 * 오프라인 표준 규칙 엔진 기반 초기 60문항 생성 (학업 20, 진로 20, 공동체 20)
 */
export function generateStandardRuleQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[]
): QuestionItem[] {
  const pool = buildRuleCandidatePool(
    records,
    profile.targetMajor || '지원 학과',
    profile.targetUniversity || '지원 대학',
    profile.customKeywords
  );

  const usedKeys = new Set<string>();
  const academicList: QuestionItem[] = [];
  const careerList: QuestionItem[] = [];
  const communityList: QuestionItem[] = [];

  // 학업역량 20문항 추출
  for (const q of pool) {
    if (academicList.length >= 20) break;
    if (q.competency === 'academic' && !usedKeys.has(q.key)) {
      usedKeys.add(q.key);
      academicList.push(sanitizeQuestionItem(q, academicList.length + 1));
    }
  }

  // 진로역량 20문항 추출
  for (const q of pool) {
    if (careerList.length >= 20) break;
    if (q.competency === 'career' && !usedKeys.has(q.key)) {
      usedKeys.add(q.key);
      careerList.push(sanitizeQuestionItem(q, careerList.length + 21));
    }
  }

  // 공동체역량 20문항 추출
  for (const q of pool) {
    if (communityList.length >= 20) break;
    if (q.competency === 'community' && !usedKeys.has(q.key)) {
      usedKeys.add(q.key);
      communityList.push(sanitizeQuestionItem(q, communityList.length + 41));
    }
  }

  // 만약 특정 역량의 기록이 적어 20개에 미달할 경우 잔여 후보 풀에서 순서대로 보충
  const combined = [...academicList, ...careerList, ...communityList];
  if (combined.length < 60) {
    for (const q of pool) {
      if (combined.length >= 60) break;
      if (!usedKeys.has(q.key)) {
        usedKeys.add(q.key);
        combined.push(sanitizeQuestionItem(q, combined.length + 1));
      }
    }
  }

  // 1번에 대학/학과 지원동기 질문 배치
  combined.unshift(
    sanitizeQuestionItem(
      {
        id: 'q-rule-univ-1',
        competency: 'university',
        type: 'university',
        grade: '공통',
        subject: '지원동기 및 인재상',
        question: `수많은 대학 중 특별히 ${profile.targetUniversity || '지원 대학'} ${profile.targetMajor || '지원 학과'}에 지원하게 된 결정적인 계기와, 고교 시절 활동 중 어떤 경험이 본인을 우리 학과에 적합한 인재로 성장시켰다고 생각하나요?`,
        intent: '대학 및 학과에 대한 진정성 있는 지원 동기와 인재상 부합도 검증',
        points: [
          `${profile.targetUniversity || '지원 대학'} ${profile.targetMajor || '지원 학과'}만의 특화된 교육과정 언급`,
          '고교 학생부 속 가장 결정적인 탐구 경험과 전공의 연결점 제시',
          '입학 후 구체적인 학업 및 진로 로드맵 피력',
        ],
        followUps: [
          `만약 대학 입학 후 본인이 기대했던 ${profile.targetMajor || '전공'} 수업의 현실이 생각과 다르다면 어떻게 극복하시겠습니까?`,
        ],
      },
      1
    )
  );

  // 마지막에 압박/약점 방어 질문 배치
  combined.push(
    sanitizeQuestionItem(
      {
        id: 'q-rule-press-1',
        competency: 'academic',
        type: 'pressure',
        grade: '공통',
        subject: '학업/활동 약점 방어',
        question: `학생부를 전반적으로 검토했을 때, 성적이 일시적으로 하락했거나 특정 과목에서 탐구의 깊이가 다소 아쉬운 부분이 관찰됩니다. 본인은 이 결과를 어떻게 받아들이고 있으며, 이를 극복하기 위해 어떤 노력을 기울였습니까?`,
        intent: '위기 극복 역량 및 실패에 대한 객관적 성찰과 성실성 검증',
        points: [
          '결과에 대한 변명 대신 솔직하고 담백한 원인 인정',
          '문제를 발견한 후 바꾼 자신만의 공부법이나 태도의 변화 설명',
          '극복 과정에서 얻은 회복탄력성과 배움의 가치 강조',
        ],
        followUps: ['그 극복 경험이 이후 다른 학기나 활동에서 어떤 긍정적 변화를 만들었나요?'],
        defense: '결과를 탓하기보다 극복하는 과정에서 배우고 성장한 점을 중심으로 답변하세요.',
      },
      combined.length + 1
    )
  );

  return combined.slice(0, 60).map((q, idx) => ({
    ...q,
    id: `q-rule-${idx + 1}`,
    completed: false,
  }));
}

/**
 * [+ 비중복 맞춤 질문 추가하기 (역량별 선택 지원)]
 * 이미 생성된 질문에 사용된 문장(key 또는 질문문구)을 제외하고,
 * 오프라인 표준 규칙 후보 풀에서 상위 점수의 새로운 질문을 즉시 추가 추출
 */
export function generateAdditionalRuleQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  existingQuestions: QuestionItem[],
  count: number = 10,
  targetCompetency?: CompetencyType | 'all'
): QuestionItem[] {
  const pool = buildRuleCandidatePool(
    records,
    profile.targetMajor || '지원 학과',
    profile.targetUniversity || '지원 대학',
    profile.customKeywords
  );

  const existingTexts = new Set(existingQuestions.map((q) => q.question.trim()));
  const additions: QuestionItem[] = [];

  for (const cand of pool) {
    if (additions.length >= count) break;
    if (targetCompetency && targetCompetency !== 'all' && cand.competency !== targetCompetency) {
      continue;
    }
    if (!existingTexts.has(cand.question.trim())) {
      existingTexts.add(cand.question.trim());
      additions.push(
        sanitizeQuestionItem(cand, existingQuestions.length + additions.length + 1)
      );
    }
  }

  return additions.map((q, idx) => ({
    ...q,
    id: `q-rule-more-${existingQuestions.length + idx + 1}-${Date.now()}`,
    completed: false,
  }));
}

/**
 * 특정 과목/영역(subject) 맞춤 3문항 즉시 생성 (진위 확인 1개 + 심화 연계 1개 + 위기/약점 방어 1개)
 */
export function generateSubject3Questions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  existingQuestions: QuestionItem[]
): QuestionItem[] {
  if (records.length === 0) return [];
  const primaryRecord = records[0];
  const subjectName = primaryRecord.subject;
  const gradeName = primaryRecord.grade || '공통';
  const majorName = profile.targetMajor?.trim() || '지원 학과';

  // 1. 해당 과목 레코드들을 대상으로 후보 풀 생성
  const pool = buildRuleCandidatePool(
    records,
    majorName,
    profile.targetUniversity || '지원 대학',
    profile.customKeywords
  );

  const existingTexts = new Set(existingQuestions.map((q) => q.question.trim()));
  const picked: QuestionItem[] = [];

  // 풀에서 record, deep, pressure 우선 매칭
  const recordCandidates = pool.filter((q) => q.type === 'record' && !existingTexts.has(q.question.trim()));
  const deepCandidates = pool.filter((q) => q.type === 'deep' && !existingTexts.has(q.question.trim()));
  const pressureCandidates = pool.filter((q) => q.type === 'pressure' && !existingTexts.has(q.question.trim()));

  // 1) 기록 진위 확인 문항
  if (recordCandidates.length > 0) {
    picked.push(
      sanitizeQuestionItem(
        recordCandidates[0],
        existingQuestions.length + picked.length + 1
      )
    );
    existingTexts.add(recordCandidates[0].question.trim());
  } else {
    let snippet = primaryRecord.text.split(/[.!?]\s+/)[0] || '';
    if (snippet.length > 55) snippet = snippet.slice(0, 52) + '…';
    picked.push({
      id: `q-subj-rec-${Date.now()}-1`,
      competency: primaryRecord.type === '창의적 체험활동' ? 'community' : 'academic',
      type: 'record',
      grade: gradeName,
      subject: subjectName,
      highlightText: snippet,
      question: `(${gradeName} ${subjectName}) 학생부 기록 중 "${snippet}" 관련 활동을 주도적으로 시작하게 된 계기와, 본인이 담당했던 가장 핵심적인 역할은 무엇이었나요?`,
      intent: `${subjectName} 활동에 대한 주도적 참여 동기 및 본인의 실질적 기여도(진위성) 검증`,
      points: [
        '활동을 기획하거나 시작하게 된 구체적인 지적 계기 제시',
        '역할 분담 시 자신이 자발적으로 맡았던 핵심 업무와 기여도 설명',
        '활동을 통해 도출한 결과물과 개인적 성장 포인트 강조',
      ],
      followUps: [
        '그 활동을 진행하는 동안 가장 많은 시간과 노력을 투입했던 구체적인 과정은 무엇이었나요?',
      ],
      completed: false,
      starred: true,
    });
  }

  // 2) 심화 연계 문항
  if (deepCandidates.length > 0) {
    picked.push(
      sanitizeQuestionItem(
        deepCandidates[0],
        existingQuestions.length + picked.length + 1
      )
    );
    existingTexts.add(deepCandidates[0].question.trim());
  } else {
    let secondSnippet = primaryRecord.text.split(/[.!?]\s+/)[1] || primaryRecord.text.slice(0, 50);
    if (secondSnippet.length > 55) secondSnippet = secondSnippet.slice(0, 52) + '…';
    picked.push({
      id: `q-subj-deep-${Date.now()}-2`,
      competency: 'career',
      type: 'deep',
      grade: gradeName,
      subject: subjectName,
      highlightText: secondSnippet,
      question: `(${gradeName} ${subjectName}) 수업 및 탐구 활동에서 다룬 개념이나 지적 호기심을 지원 전공인 ${majorName} 분야와 어떻게 연계하여 심화 탐구하였습니까?`,
      intent: '교과 지식의 확장성 및 지원 전공과의 융합적 탐구 역량 검증',
      points: [
        '해당 교과에서 다룬 핵심 원리나 개념의 정확한 이해 제시',
        `${majorName}의 전공 학문이나 최근 이슈와의 학문적 접점 설명`,
        '대학 입학 후 이어가고 싶은 후속 연구나 학습 계획으로 확장',
      ],
      followUps: [
        `그 탐구 내용을 ${majorName}의 관점에서 발전시킨다면 어떤 새로운 시각이나 시사점을 얻을 수 있을까요?`,
      ],
      completed: false,
      starred: true,
    });
  }

  // 3) 위기/약점 방어 문항
  if (pressureCandidates.length > 0) {
    picked.push(
      sanitizeQuestionItem(
        pressureCandidates[0],
        existingQuestions.length + picked.length + 1
      )
    );
    existingTexts.add(pressureCandidates[0].question.trim());
  } else {
    picked.push({
      id: `q-subj-press-${Date.now()}-3`,
      competency: 'academic',
      type: 'pressure',
      grade: gradeName,
      subject: subjectName,
      question: `(${gradeName} ${subjectName}) 활동을 진행하면서 예상치 못했던 난관이나 한계점은 무엇이었으며, 이를 극복하기 위해 어떤 노력을 기울였습니까?`,
      intent: '위기 극복 능력, 문제 해결의 유연성, 비판적 자기 성찰 태도 평가',
      points: [
        '실패나 난관을 솔직하게 인정하고 원인을 객관적으로 분석',
        '원인 해결을 위해 시도했던 자신만의 대안이나 소통/학습 노력 제시',
        '극복 과정을 통해 배운 교훈과 태도의 긍정적 변화 강조',
      ],
      followUps: [
        '다시 그 활동을 수행할 기회가 주어진다면 어떤 점을 보완하여 더 나은 결과를 만들고 싶나요?',
      ],
      defense: '결과에 대한 변명 대신, 과정에서 배운 회복탄력성과 성장을 중심으로 당당하게 답변하세요.',
      completed: false,
      starred: true,
    });
  }

  return picked.map((q, idx) =>
    sanitizeQuestionItem(
      {
        ...q,
        id: `q-subj-custom-${existingQuestions.length + idx + 1}-${Date.now()}`,
        subject: subjectName,
        grade: gradeName,
        completed: false,
        starred: true,
      },
      existingQuestions.length + idx + 1
    )
  );
}
