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

function findConcepts(text: string): Array<{ term: string; name: string; def: string }> {
  const hit: Array<{ term: string; name: string; def: string }> = [];
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
  inquiry: /탐구|조사|분석|연구|고찰|규명|비교/,
  experiment: /실험|측정|관찰|변인|가설/,
  make: /제작|설계|코딩|구현|프로그램|앱|만들/,
  present: /발표|설명함|소개함|강연|수업을 (?:기획|진행)/,
  report: /보고서|소논문|논술|에세이|글을 작성|서평|감상문|칼럼|기사/,
  debate: /토론|찬반|반론|입론|반박/,
  read: /읽고|도서|독서|서평/,
  leader: /반장|회장|부회장|부장|팀장|모둠장|조장|대표|리더|총괄/,
  conflict: /갈등|의견\s*차이|의견을\s*조율|조율|중재/,
  coop: /협력|협업|협동|함께|팀원|모둠원|구성원/,
  care: /배려|봉사|나눔|도움|도와|멘토|멘티|도우미|튜터/,
  plan: /기획|운영|캠페인|개선안|행사/,
  expand: /나아가|심화|추가로|확장|더 나아가|후속|이어서|스스로|자발적|자기\s*주도|주도적/,
  reflect: /깨달|느낌|느꼈|인식|계기|성찰|반성/,
  trait: /학생임|성품|태도가|인성|책임감|성실|정직|꾸준|끈기/,
};

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
  univ: string
): CandidateQuestion[] {
  const pool: CandidateQuestion[] = [];
  const M = major || '지원 학과';
  const U = univ || '지원 대학';

  records.forEach((rec, rIdx) => {
    const cleanRaw = rec.text.replace(/<[^>]+>/g, '');
    const sentences = cleanRaw
      .replace(/([가-힣)'’"”])\.\s*(?=[가-힣A-Za-z'‘"“(\[<0-9])/g, '$1.\n')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length >= 15);

    sentences.forEach((sent, sIdx) => {
      const f: Record<string, boolean> = {};
      for (const k in FLAG_RE) {
        f[k] = (FLAG_RE as any)[k].test(sent);
      }
      const concepts = findConcepts(sent);
      const quotes: string[] = [];
      const qre = /[‘'"“「『<《]([^’'"”」』>》]{2,70})[’'"”」』>》]/g;
      let qm;
      while ((qm = qre.exec(sent)) !== null) {
        quotes.push(qm[1].trim());
      }
      const anchor = quotes[0] || (concepts[0] && concepts[0].term) || null;
      const L = makeLead(rec, sent, anchor);
      const key = `rec_${rIdx}_${sIdx}`;

      // 1. 학업 역량 (개념, 실험, 탐구, 보고서, 공학/제작)
      if (concepts.length > 0) {
        concepts.slice(0, 2).forEach((c, ci) => {
          pool.push({
            key: `${key}_c_${ci}`,
            competency: 'academic',
            type: 'deep',
            grade: rec.grade,
            subject: rec.subject,
            highlightText: sent,
            score: 3.8,
            question: `${makeLead(rec, sent, c.term)} '${c.name}'의 핵심 개념과 원리를 설명해 주세요.`,
            intent: `${rec.subject}에서 다룬 '${c.name}'의 학술적 개념 이해도 및 학업 역량 검증`,
            points: [
              `'${c.name}'의 정확한 정의와 과학적/학문적 원리 설명`,
              c.def
                ? `핵심 원리: ${c.def.slice(0, 90)}…`
                : '실제 탐구 활동에서 이 원리가 어떻게 적용되었는지 구체적 언급',
              '전공 학습으로 이어지는 해당 개념의 중요성 피력',
            ],
            followUps: [
              TAIL.verify[0] || '그 개념을 일상 속 다른 사례에 적용해 설명해 보세요.',
            ],
          });
        });
      }

      if (f.experiment) {
        pool.push({
          key: `${key}_exp`,
          competency: 'academic',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.5,
          question: `${L} 실험에서 조작한 독립변인과 통제변인은 무엇이었으며, 예상과 달랐던 결과나 오차 원인이 있었다면 어떻게 분석했나요?`,
          intent: '과학적 탐구 방법론의 이해도 및 데이터 해석, 문제 해결 능력 검증',
          points: [
            '가설 설정 - 변인 통제 - 실험 결과의 인과관계 논리적 정리',
            '실험 과정에서 발생한 오차의 원인과 이를 해결하기 위한 노력',
            '실험을 다시 수행한다면 개선하고 싶은 설계 방향',
          ],
          followUps: [
            TAIL.process[0] || '진행하면서 가장 막혔던 지점은 어디였고 어떻게 해결했나요?',
            TAIL.limit[0] || '다시 한다면 무엇을 보완하겠습니까?',
          ],
        });
      }

      if (f.inquiry || f.report) {
        const topicName = quotes[0] || '해당 탐구';
        pool.push({
          key: `${key}_inq`,
          competency: 'academic',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.2,
          question: `${L} ‘${topicName}’에서 도출한 핵심 결론은 무엇이며, 어떤 근거 자료를 바탕으로 신뢰할 수 있다고 판단했나요?`,
          intent: '주도적 탐구 역량 및 문헌·자료의 비판적 분석력 검증',
          points: [
            '두괄식으로 핵심 결론 명확히 제시',
            '결론을 뒷받침하는 2가지 이상의 객관적 근거 자료',
            '탐구 과정에서 겪은 한계점과 이를 극복한 방법',
          ],
          followUps: [TAIL.process[1] || '어떤 자료(문헌·데이터)를 활용했나요?'],
        });
      }

      if (f.make) {
        pool.push({
          key: `${key}_make`,
          competency: 'academic',
          type: 'deep',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.0,
          question: `${L} 제작한 결과물이 어떤 메커니즘과 원리로 작동하는지, 다른 대안 대신 이 방식을 택한 이유를 설명해 주세요.`,
          intent: '공학적 설계 역량 및 기술적 의사결정의 논리성 검증',
          points: [
            '결과물의 핵심 작동 알고리즘/원리 설명',
            '기존 방식과의 차별점 및 선정 이유',
            '직접 수행한 부분과 라이브러리/기존 자료 활용 부분의 명확한 구분',
          ],
          followUps: ['가져다 쓴 부분과 직접 구현한 부분을 구분해 말해 주세요.'],
        });
      }

      // 2. 진로 역량 (전공 연결, 동기, 심화 확장)
      if (rec.subject.includes('진로') || f.expand || quotes.length > 0) {
        pool.push({
          key: `${key}_car_link`,
          competency: 'career',
          type: 'record',
          grade: rec.grade,
          subject: rec.subject,
          highlightText: sent,
          score: 3.3,
          question: `${L} 이 활동이 ${M} 전공 학습과 어떻게 이어진다고 생각하며, 대학 입학 후 어떤 세부 연구나 과목으로 발전시키고 싶나요?`,
          intent: '전공 적합성 및 고교 활동과 대학 학업 간의 연계성 검증',
          points: [
            '고교 활동에서 느낀 지적 호기심 요약',
            `${M}의 구체적인 전공 커리큘럼이나 연구 분야와 연결`,
            '입학 후 자기주도적 학업 계획 피력',
          ],
          followUps: ['그 관심이 처음 생긴 계기는 무엇이었나요?'],
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
          score: 2.9,
          question: `${L} 수많은 주제 가운데 특별히 ‘${quotes[0]}’${hasBatchim(quotes[0]) ? '을' : '를'} 선택한 결정적인 이유는 무엇인가요?`,
          intent: '진로 탐색의 진정성 및 주제 선정의 독창성 검증',
          points: [
            '단순한 관심이 아닌 구체적인 경험이나 계기 제시',
            '이 주제를 통해 규명하고자 했던 문제의식',
            '탐구 후 진로 목표에 미친 영향',
          ],
          followUps: [TAIL.motive[0] || '여러 주제 가운데 이 주제를 고른 이유는 무엇인가요?'],
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
          score: 3.4,
          question: `${L} 그 역할을 수행하면서 가장 어려웠던 점은 무엇이었고, 팀원들의 자발적 참여를 이끌어내기 위해 어떤 리더십을 발휘했나요?`,
          intent: '공동체 리더십 및 솔선수범 태도, 조직 운영 역량 검증',
          points: [
            '직책 자체보다 실제 직면했던 조직 내 문제 상황 구체화',
            '권위적 지시가 아닌 소통과 배려를 통한 해결 과정',
            '협업의 성공 결과와 팀원들의 변화',
          ],
          followUps: ['구성원 중 협조하지 않는 사람이 있었다면 어떻게 대처했나요?'],
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
          score: 3.6,
          question: `${L} 당시 발생했던 의견 대립의 본질은 무엇이었으며, 양측의 입장을 조율하여 합의를 이끌어낸 본인만의 구체적 행동은 무엇이었나요?`,
          intent: '갈등 관리 능력 및 상호 존중 의사소통 역량 검증',
          points: [
            '누구의 잘잘못이 아닌 관점의 차이를 객관적으로 서술',
            '경청과 중재를 통해 제시한 합리적 절충안',
            '갈등 해결을 통해 공동체에 기여한 가치',
          ],
          followUps: ['지금 다시 그 상황을 마주한다면 다르게 행동할 점이 있습니까?'],
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
          score: 2.7,
          question: `${L} 모둠 활동에서 본인이 맡았던 핵심 역할과, 협업 과정에서 어려움을 겪는 동료를 돕기 위해 실천한 행동을 말씀해 주세요.`,
          intent: '팀워크 및 나눔과 배려, 공동체적 책임 의식 검증',
          points: [
            '‘우리’가 아닌 ‘내가’ 솔선해서 수행한 역할',
            '동료와의 소통 과정에서 배려한 구체적 장면',
            '함께 이룬 성과의 의미',
          ],
          followUps: ['그 경험을 통해 자신에게 가장 크게 달라진 점은 무엇인가요?'],
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
          score: 3.1,
          question: `(${rec.grade} 행동특성 및 종합의견) 담임선생님께서 ‘${sent.slice(0, 50)}…’라고 긍정적으로 평가해 주셨는데, 본인의 어떤 평소 태도와 구체적 행동 때문이라고 생각하나요?`,
          intent: '학교생활 성실성 및 인성, 자아 성찰 역량 검증',
          points: [
            '선생님의 평가와 부합하는 일상적인 학교생활 실천 사례',
            '꾸준히 지키고자 노력했던 자신만의 생활 원칙',
            '대학 입학 후 대학 공동체 생활에 기여할 수 있는 부분',
          ],
          followUps: ['그 태도가 대학 입학 후 공동체 생활에서 어떻게 발휘될 수 있을까요?'],
        });
      }
    });
  });

  // 점수 높은 순으로 정렬
  pool.sort((a, b) => b.score - a.score);
  return pool;
}

/**
 * 오프라인 표준 규칙 엔진 기반 초기 60문항 생성 (학업 20, 진로 20, 공동체 20)
 */
export function generateStandardRuleQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  records: StudentRecordItem[]
): QuestionItem[] {
  const pool = buildRuleCandidatePool(
    records,
    profile.targetMajor || '지원 학과',
    profile.targetUniversity || '지원 대학'
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
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
  records: StudentRecordItem[],
  existingQuestions: QuestionItem[],
  count: number = 10,
  targetCompetency?: CompetencyType | 'all'
): QuestionItem[] {
  const pool = buildRuleCandidatePool(
    records,
    profile.targetMajor || '지원 학과',
    profile.targetUniversity || '지원 대학'
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
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'>,
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
    profile.targetUniversity || '지원 대학'
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
