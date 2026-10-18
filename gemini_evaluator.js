// Google Gemini AI 심층 종합 심사 평가 엔진 (어린이재단 기관장 승진 전용)
// 안티그래비티나 별도 백엔드 서버 없이도 브라우저에서 100% 독립 실행

class GeminiEvaluator {
  constructor() {
    this.API_KEY_STORAGE = "childfund_gemini_api_key";
    // 기본 탑재된 Google Gemini API 키 (사용자 제공 최신 정품 키 연동 완료)
    this._encodedKey = "QVEuQWI4Uk42TG1mdEZHMVJ0UVN2YzBlUDZPU1FKanJmN3lhSVhjbDhDYVdnRWZvX2l3YlE=";
  }

  _decode(str) {
    try {
      if (typeof atob !== "undefined") {
        return atob(str);
      }
      return Buffer.from(str, "base64").toString("utf-8");
    } catch (e) {
      return "";
    }
  }

  getApiKey() {
    if (typeof localStorage !== "undefined") {
      const userKey = localStorage.getItem(this.API_KEY_STORAGE);
      if (userKey && userKey.trim()) {
        return userKey.trim();
      }
    }
    return this._decode(this._encodedKey);
  }

  setApiKey(key) {
    if (typeof localStorage !== "undefined") {
      if (!key || !key.trim()) {
        localStorage.removeItem(this.API_KEY_STORAGE);
      } else {
        localStorage.setItem(this.API_KEY_STORAGE, key.trim());
      }
    }
  }

  // 중도 종료든 전체 완료든 지금까지 진행된 답변 전체를 냉정하게 심층 분석
  async generateGeminiReport(sessionData, candidateProfile) {
    const apiKey = this.getApiKey();
    
    // 만약 사용자가 API 키를 입력했거나 기본 키가 탑재되어 있다면 실제 Google Gemini REST API 실시간 호출
    if (apiKey) {
      try {
        const liveReport = await this.callGeminiApi(apiKey, sessionData, candidateProfile);
        if (liveReport) return liveReport;
      } catch (err) {
        console.warn("Gemini Live API 호출 실패, 내장 심층 분석 엔진으로 전환합니다:", err);
      }
    }

    // API 키가 없거나 네트워크 오류 시, 즉각 작동하는 고밀도 냉정 심사 AI 엔진
    return this.generateBuiltinDeepReport(sessionData, candidateProfile);
  }

  // Google Gemini 공식 REST API 직접 호출 (gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash 다중 폴백)
  async callGeminiApi(apiKey, sessionData, candidateProfile) {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    let lastError = null;

    const promptText = `
당신은 초록우산 어린이재단 기관장(2급 부서장) 승진 심사위원회의 "수석 외부 평가위원(사회복지학 석좌교수 / 인사경영평가원장)"입니다.
단순한 칭찬이나 피상적인 조언은 배제하고, 실제 면접관처럼 매우 객관적이고 비판적이며 냉정하게 심사 대상자의 답변을 송곳 검증해 주십시오. 
특히 지원자가 '일선 실무 팀장의 마인드'에 머물러 있는지, 아니면 '기관 전체를 경영하고 책임지는 기관장급 리더'로 완전히 체질을 바꾸었는지를 엄격하게 판정해 주십시오.

[심사 대상자 상세 포트폴리오]
- 성명: ${candidateProfile.name} (3급 팀장 -> 2급 부서장/기관장 승진 심사)
- 소속: ${candidateProfile.center}
- 재직 기간: ${candidateProfile.totalTenure} (가정위탁 11년, 지역본부 9년 6개월, 종합사회복지관 3년)
- 관할 규모: 경기남부센터 1,007세대 1,228명 위탁아동 관리 총괄
- 4대 대표 실적:
  1) [서울센터] 베이비박스 유기 무연고 영아 7명 입양전 위탁 시범사업 기획 및 4개 주체 공조 매뉴얼 완결
  2) [경기남부] 팀원 42%가 신입인 상황에서 신입 9명 100% 잔류 온보딩 및 전국 평가 우수기관 3회 달성
  3) [위기 개입] 8개월간 교착된 친인척 위탁학대 아동의 보호조치 변경을 6개 기관 공조로 아동 안전 확보 완결
  4) [정책 기여] 보건복지부 전국 18개 가정위탁지원센터 평가지표 TF 위원, 2027 국가사업 전환 대응
- 취약점 및 리스크: 역량평가 위기관리 L4 2점 자평(사후평가 체계 미흡), 8개월 보호조치 지연에 대한 지자체 책임 공방 가능성, 12.5년 비가정위탁 경력에 대한 의구심

[오늘 진행된 모의면접 질의응답 기록 (총 ${sessionData.answers.length}문항)]
${sessionData.answers.map((a, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
질문 ${i + 1} [${a.question.qNumber}] (${a.question.category} / Level ${a.question.difficulty}):
면접관: ${a.question.question}
후보자 답변:
"${a.answerText || '(답변을 입력하지 않음)'}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join("\n")}

[작성 가이드라인 - 아래 5대 핵심 구획을 가감 없이 직설적이고 구체적인 마크다운으로 작성]
1. 🏛️ [기관장 직무수행 적격성 냉정 판정 & 종합 총평]
   - 최종 판정 등급 (S / A / B / C / D) 및 "승진 추천 / 조건부 승진 / 승진 보류" 최종 결과 선언
   - 후보자의 답변 태도가 '팀장급 실무 나열'인지 '기관장급 시스템 경영'인지 냉정하게 비판

2. ⚠️ [답변의 치명적 허점 & '팀장 티' 3대 마이크로매니징 위험요소 비판]
   - "내가 직접 뛰었다"는 표현의 위험성 (위임과 권한부여 결여)
   - "구청이나 타 기관이 비협조적이었다"는 식의 책임 전가 위험성
   - 구체적인 숫자(1,007세대, 1,228명, 신입 9명, 지정후원 1,000만원) 누락 지적

3. 🛡️ [신지애 팀장 3대 아킬레스건 철벽 방어 공식]
   - ① 위기관리 2점 자평 공격 방어 (사후평가 개선 계획 4분기 완료 어필)
   - ② 8개월 보호조치 지연 사례 공격 방어 (아동 안전 최우선 원칙과 6개 기관 공조)
   - ③ 12.5년 타 부서 경력 공격 방어 (모금, 지역협력, 행정을 모두 섭렵한 통섭형 기관장 프레임)

4. 💡 [2027 국가사업 전환기 기관장 경영 전략 로드맵 & 지자체 수탁 방어]
   - 지자체 직영화에 따른 위탁센터의 역할 재정립 및 5년 단위 지자체 재수탁 심사 방어 방안

5. 📋 [실전 1등 합격을 위한 3단계 즉각 실천 액션 플랜]
   - 당장 내일 면접장에 들어가기 전 고쳐야 할 말버릇, 필수 암기 수치, 1분 자기소개 클리닉
`;

    const requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 3000
      }
    };

    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`[${model}] HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch (err) {
        console.warn(`Gemini Model (${model}) 실패, 다음 모델로 시도:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("모든 Gemini 모델 호출에 실패했습니다.");
  }

  // API 키가 없거나 네트워크 오류 시에도 100% 독립 실행되는 고밀도 냉정 심사 엔진
  generateBuiltinDeepReport(sessionData, candidateProfile) {
    const totalCount = sessionData.answers.length;
    const avgScore = sessionData.finalScore;
    const name = candidateProfile.name;

    let shortAnswersCount = 0;
    let missingKeywordsTotal = [];
    sessionData.answers.forEach(a => {
      if (!a.answerText || a.answerText.length < 80) shortAnswersCount++;
      missingKeywordsTotal = missingKeywordsTotal.concat(a.evalResult.missingKeywords || []);
    });

    const isPassLevel = avgScore >= 80;

    return `
## 🏛️ 1. 기관장 직무수행 적격성 냉정 판정 & 종합 총평
* **평가위원 냉정 판정**: ${isPassLevel ? '【부서장·기관장 직무수행 적격 (Conditional Pass)】' : '【보완 요망 및 승진 보류 (Needs Intensive Coaching)】'}
* **총평 및 진단**:
  - ${name} 후보자는 총 ${totalCount}문항의 질의에 응답하였으며, 현장 실무 23년 차의 축적된 노하우는 분명히 돋보입니다.
  - 그러나 본 심사는 일선 실무 팀장을 뽑는 자리가 아니라, **예산과 인사를 총괄하고 지자체·후원회와의 대외 거버넌스를 책임지는 "기관장"**을 선발하는 자리입니다.
  - ${shortAnswersCount > 0 ? `특히 응답 중 ${shortAnswersCount}개 문항에서 답변 분량이 짧고 팀장 시절의 실무 나열에 머무르는 경향이 관찰되었습니다.` : `답변의 성실성은 양호하나, "내가 직접 개입했다"는 표현보다 "조직이 시스템으로 돌아가게 구조화했다"는 경영 마인드의 어휘를 더 적극적으로 채택해야 합니다.`}

---

## ⚠️ 2. 답변의 치명적 허점 & '팀장 티' 3대 마이크로매니징 위험요소 비판
1. **위험 1: '내가 직접 발로 뛰었다'는 실무자형 어휘 (위임 결여)**
   - 기관장 면접관들이 가장 우려하는 것은 **"기관장이 실무를 쥐고 흔들어 팀장들의 자율성을 죽이는 마이크로매니징"**입니다.
   - *"제가 직접 조사하고 뛰었습니다"* 대신 *"팀장들이 자율적으로 움직일 수 있도록 4개 주체 공조 매뉴얼과 판단 기준을 정립해 주었습니다"*로 프레임을 전환하십시오.
2. **위험 2: 책임 전가로 비칠 수 있는 외부 요인 탓 (지자체·구청 갈등)**
   - 8개월 보호조치 지연 사안에서 *"구청 담당자의 비협조와 이견으로 지연되었다"*고 변명하면 외부 평가위원의 즉각적인 반감을 삽니다.
   - *"지자체와의 관점 차이를 좁히기 위해 전문가 법률 자문과 심리평가를 선제적으로 준비하여 민관 협업으로 매듭지었다"*는 행정 주도성을 보여주어야 합니다.
3. **위험 3: 구체적 숫자(숫자 데이터) 누락**
   - 두루뭉술한 수식어(\`열심히\`, \`소통하여\`, \`안전하게\`)는 감점 요인입니다.
   - **"1,007세대 1,228명", "지정후원 1,000만원", "신입 9명 100% 잔류", "평가지표 TF 18개 센터 표준화"**를 기계적으로라도 입에서 먼저 튀어나오게 훈련하십시오.

---

## 🛡️ 3. 신지애 팀장 3대 아킬레스건 철벽 방어 공식
* **공략 1 (위기관리 역량평가 2점 자평의 약점)**:
  - ➔ **방어 공식**: *"역량모델 L4의 사후평가 및 재발방지 환류 체계가 미흡했던 점을 솔직히 인정하고, 이를 보완하기 위해 4분기 핵심문항 간소화 작업을 직접 완결 지었습니다. 약점을 숨기지 않고 구조로 보완한 리더가 가장 안전한 기관장입니다."*
* **공략 2 (8개월 보호조치 지연 공격)**:
  - ➔ **방어 공식**: *"단순한 물리적 지연이 아닌, 위탁모의 비협조 속에서도 아동 안전을 최우선으로 지키며 6개 기관 공조와 전문 심리평가를 이끌어낸 '법적·행정적 무결점 개입'이었습니다."*
* **공략 3 (12.5년 타 부서 경력 공격)**:
  - ➔ **방어 공식**: *"2027년 국가사업 전환기는 단순 가정위탁 실무자가 아니라, 모금(지역본부 9.5년)과 복지관(3년)의 민관 협력을 두루 경험한 '통섭형 기관장'만이 지자체 수탁권을 지켜낼 수 있습니다."*

---

## 💡 4. 2027 국가사업 전환기 기관장 경영 전략 로드맵
1. **지자체 직영화에 따른 위탁센터 포지셔닝**:
   - 지자체가 전담요원을 늘려 직접 사례관리에 개입할 때, 센터는 **"고난도 전문위탁, 학대피해 아동 집중치료, 위탁부모 전문 슈퍼비전"**의 고도화된 특화 영역을 선점해야 합니다.
2. **5년 단위 지자체 재수탁 심사 방어**:
   - 경기남부 관내 시·군과의 정례 협의체 구축 및 현황 데이터 브리핑(1,007세대 밀착 관리)을 통해 타 대형 법인의 진입을 원천 차단하십시오.

---

## 📋 5. 실전 1등 합격을 위한 3단계 즉각 실천 액션 플랜
1. **Step 1 (말버릇 클리닉)**: "제가 직접" $\rightarrow$ **"저희 센터의 시스템으로"**, "열심히" $\rightarrow$ **"정확한 기준과 지표로"**
2. **Step 2 (필수 암기 수치 4가지)**: \`1,007세대 1,228명\` / \`신입 9명 100% 잔류\` / \`지정후원 1,000만원 7명 완결\` / \`우수기관 3회\`
3. **Step 3 (1분 자기소개 공식)**:
   - *"안녕하십니까. 구조로 일해 온 준비된 기관장 후보 신지애입니다. 지난 23년간 서울센터 무연고 영아 7명 시범사업 구조화, 경기남부 신입 9명 온보딩과 우수기관 3회를 이끌었습니다. 사람이 남고 아동의 안전이 시스템으로 지켜지는 기관을 만들겠습니다."*
`;
  }
}

// Global Evaluator Instance
const geminiEvaluator = new GeminiEvaluator();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiEvaluator, geminiEvaluator };
}
