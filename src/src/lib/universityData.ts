export interface UniversityInfo {
  name: string;
  category: 'general' | 'military_police' | 'medical';
  interviewTypes: string[];
  focusPoints: string[];
}

export const UNIVERSITY_LIST: UniversityInfo[] = [
  {
    name: '일반 학생부종합 전형 (공통 기준)',
    category: 'general',
    interviewTypes: ['학생부종합(면접형)', '학생부종합(서류확인)', '학생부교과(면접형)'],
    focusPoints: ['학업역량(탐구력)', '진로역량(전공적합성)', '공동체역량(소통/협업)'],
  },
  {
    name: '서울대학교',
    category: 'general',
    interviewTypes: ['일반전형(제시문면접)', '지역균형전형(서류확인)'],
    focusPoints: ['깊이 있는 지적 호기심과 탐구 과정', '전공 분야 학업 소양', '자기주도적 발전가능성'],
  },
  {
    name: '연세대학교',
    category: 'general',
    interviewTypes: ['활동우수형(제시문+서류)', '국제형', '기회균형'],
    focusPoints: ['비판적 사고력과 논리적 표현력', '수학/과학/인문 융합 역량', '글로벌 리더십'],
  },
  {
    name: '고려대학교',
    category: 'general',
    interviewTypes: ['학업우수형(제시문면접)', '계열적합형(제시문면접)', '고른기회'],
    focusPoints: ['선행학습영향평가 기출 논리', '종합적 문제해결력', '창의적 인재상'],
  },
  {
    name: '경찰대학 / 경찰행정학과',
    category: 'military_police',
    interviewTypes: ['개별면접(인성/적성)', '집단토론면접'],
    focusPoints: ['국가관 및 공직윤리', '준법정신과 도덕성', '위기대응 및 신체/정신적 강인함'],
  },
  {
    name: '공군사관학교 / 육·해군사관학교',
    category: 'military_police',
    interviewTypes: ['분과별 면접(학교생활/품성/가치관)', '구술면접'],
    focusPoints: ['군인정신과 희생정신', '리더십과 팔로워십', '안보관 및 역사인식'],
  },
  {
    name: '의예과 / 치의예과 / 한의예과 / 약학과 / 수의예과',
    category: 'medical',
    interviewTypes: ['MMI (다중미니면접)', '서류기반 확인면접'],
    focusPoints: ['생명존중과 윤리의식', '딜레마 상황 대처 능력', '환자 공감 및 의사소통'],
  },
  {
    name: '성균관대학교',
    category: 'general',
    interviewTypes: ['학과모집(면접형)', '탐구형'],
    focusPoints: ['전공에 대한 진정성 있는 관심', '학업 충실도 및 성취 과정'],
  },
  {
    name: '한양대학교',
    category: 'general',
    interviewTypes: ['학생부종합(서류형/면접형)'],
    focusPoints: ['창의적 융합역량', '실천적 문제해결능력'],
  },
  {
    name: '중앙대학교 / 경희대학교',
    category: 'general',
    interviewTypes: ['CAU융합인재 / 네오르네상스'],
    focusPoints: ['문화예술/인문학적 소양', '전공 학업준비도', '나눔과 배려의 공동체 의식'],
  },
];
