# 🎓 면접인사이트 (Interview Insight Web)

> **학생부(생기부) 기반 대학별 AI 면접 준비 & 워크시트 생성 솔루션**  
> 100% 브라우저 로컬 구동 · Zero-Server Storage · 외부 유출 없는 완전한 보안

---

## 🌟 주요 기능

1. **🔒 100% 로컬 보안 아키텍처**
   - 학생 생활기록부는 개인정보 및 교육 데이터 규정상 매우 민감합니다.
   - 외부 클라우드 DB나 자체 서버를 전혀 거치지 않고, **사용자 브라우저 내부 IndexedDB에만 저장**됩니다.
   - 원클릭으로 로컬 데이터를 즉시 완전 삭제할 수 있습니다.

2. **🎯 듀얼 파서 탑재 (일반 PDF + 커스텀 원문 HTML)**
   - **일반 생기부 지원**: 나이스(NEIS)에서 내려받은 일반 생기부 PDF 및 TXT 자동 파싱
   - **커스텀 HTML 파서**: `3604 김나현 원문.html`과 같은 구조화된 세특/창체/행특 HTML 파일을 드래그앤드롭 한 번으로 파싱하여 39개 항목, 학년별 분류, 기존 형광펜 하이라이트 문장을 100% 복원합니다.

3. **🤖 멀티 BYOK (Bring-Your-Own-Key) AI 엔진**
   - **Google Gemini (기본·권장)**: Google AI Studio의 무료 API 키를 입력하여 최대 100만 토큰의 긴 생기부 원문을 초고속 분석.
   - **OpenAI (GPT-4o)**: OpenAI API 키 선택 지원.
   - **로컬 룰베이스 모드**: API 키 없이도 즉시 내장 룰 엔진으로 테스트 가능.

4. **📑 다층 면접 질문 & 평가 가이드 생성**
   - **개별 질문 (20~25개)**: 학업역량, 진로역량, 공동체역량, 지원 대학별 맞춤 질문.
   - **면접관 평가 의도 (Intent)**: 질문을 던지는 평가 목적.
   - **필수 답변 포인트 (Points)**: 면접자가 반드시 언급해야 할 핵심 키워드 및 결론.
   - **예상 꼬리 질문 (Follow-ups)**: 진위 확인 및 심화 질문 1~2개.
   - **약점/압박 방어 가이드 (Defense)**: 성적 추이, 탐구 부족 부분에 대한 방어 전략.

5. **⏱️ 실전 모의면접 훈련실**
   - 질문별 1분 / 2분 / 무제한 카운트다운 타이머
   - 자가 답변 피드백 메모 및 완료 체크

6. **💾 3종 파일 내보내기 & 백업**
   - **A4 워크시트 인쇄 (PDF 저장)**: 종이 시험지 양식의 깔끔한 워크시트 즉시 인쇄.
   - **Excel / CSV 내보내기**: 교사 상담용 엑셀 파일 (UTF-8 BOM 지원으로 한글 깨짐 방지).
   - **JSON 백업 & 복원**: 언제든 다른 PC에서 데이터를 다시 불러올 수 있는 전체 데이터 백업.

---

## 🚀 로컬 실행 방법

```bash
# 1. myeonjeop-on-web 폴더로 이동
cd myeonjeop-on-web

# 2. 의존성 설치
npm install

# 3. 로컬 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하면 즉시 실행됩니다.

---

## 🌐 GitHub Pages 배포 가이드

본 프로젝트는 정적 웹(SPA)으로 빌드되므로, GitHub Pages에 100% 무료로 호스팅할 수 있습니다.

### 1단계: 새 깃허브 리포지토리 생성

GitHub 웹사이트에서 `myeonjeop-on` 등의 이름으로 새 공개(Public) 또는 비공개(Private) 저장소를 만듭니다.

### 2단계: 프로젝트 푸시

`myeonjeop-on-web` 폴더 안에서 다음 명령어를 실행합니다:

```bash
cd myeonjeop-on-web
git init
git add .
git commit -m "feat: initial commit of myeonjeop-on-web"
git branch -M main
git remote add origin https://github.com/<내_아이디>/<저장소_이름>.git
git push -u origin main
```

### 3단계: GitHub Pages 활성화

1. 깃허브 저장소 페이지의 **Settings** 탭 클릭
2. 좌측 메뉴의 **Pages** 클릭
3. **Build and deployment** > **Source** 항목에서 **`GitHub Actions`**를 선택
4. 잠시 후 상단에 표시되는 `https://<내_아이디>.github.io/<저장소_이름>/` 주소로 전 세계 어디서나 접속할 수 있습니다!
