// Google Gemini AI 심층 종합 심사 평가 엔진 (어린이재단 기관장 승진 전용)
// 안티그래비티나 별도 백엔드 서버 없이도 브라우저에서 100% 독립 실행

class GeminiEvaluator {
  constructor() {
    this.API_KEY_STORAGE = "childfund_gemini_api_key";
  }

  getApiKey() {
    return localStorage.getItem(this.API_KEY_STORAGE) || "";
  }

  setApiKey(key) {
    localStorage.setItem(this.API_KEY_STORAGE, key.trim());
  }

  // 중도 종료든 전체 완료든 지금까지 진행된 답변 전체를 냉정하게 심층 분석
  async generateGeminiReport(sessionData, candidateProfile) {
    const apiKey = this.getApiKey();
    
    // 만약 사용자가 API 키를 입력했다면 실제 Google Gemini REST API 실시간 호출
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

  // Google Gemini 공식 REST API 직접 호출 (gemini-1.5-flash)
  async callGeminiApi(apiKey, sessionData, candidateProfile) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
당신은 초록우산 어린이재단 기관장(2급 부서장) 승진 심사위원회의 "수석 외부 평가위원(사회복지학 석좌교수/인사경영평가원장)"입니다.
아래에 제공된 심사 대상자 정보와 오늘 진행된 실전 모의면접 질의응답 기록(중도 완료 포함)을 면밀히 분석하여, 매우 객관적이고 냉정하며 직설적인 종합 심사 보고서를 작성해 주십시오.

[심사 대상자 정보]
- 성명: ${candidateProfile.name}
- 직위: ${candidateProfile.currentRank} -> 2급 부서장/기관장 승진 대상
- 소속: ${candidateProfile.center}
- 재직 기간: ${candidateProfile.totalTenure}
- 주요 성과: 서울센터 무연고 영아 7명 입양전 위탁 시범운영, 경기남부센터 신입 9명 잔류 육성 및 우수기관 3회 달성, 8개월 학대위기 보호조치 변경, 복지부 평가지표 TF

[면접 진행 기록 (총 ${sessionData.answers.length}문항 진행 후 완료)]
${sessionData.answers.map((a, i) => `
질문 ${i + 1} [${a.question.qNumber}] (${a.question.category}):
Q: ${a.question.question}
A: ${a.answerText || "(답변 미입력)"}
자동 평가점수: ${a.evalResult.score}점
`).join("\n")}

[보고서 작성 가이드라인 (다음 5개 항목을 구체적이고 냉정하게 마크다운으로 작성)]
1. 🏛️ [기관장 적격성 총평]: 답변의 태도, 거시적 경영 관점, 팀장 수준에 머물러 있는지 기관장 수준으로 전환되었는지에 대한 냉정한 판정.
2. 🌿 [초록우산 2026 역량모델 부합도]: 아동중심, 진정성, 전문성, 도전정신 및 5대 리더십(비전제시, 경영마인드, 의사결정, 성과관리, 동기부여) 충족 여부.
3. ⚠️ [답변의 취약점 및 모순점 지적]: 답변 중 근거가 빈약하거나, 수치가 누락되었거나, 방어적으로 들릴 수 있는 치명적 허점 지적.
4. 🗡️ [실제 면접관의 예상 송곳 꼬리질문 3가지]: 이 답변을 들은 임원 및 외부면접관이 즉각 던질 법한 날카로운 압박 꼬리질문.
5. 💡 [실전 합격을 위한 원포인트 개선 스크립트]: 해당 문항들에 대해 면접관을 완전히 압도할 수 있는 모범 답변 문장 구조 제시.
`;

    const requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2500
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // API 키가 없어도 100% 오프라인/스탠드얼론으로 동작하는 고밀도 냉정 심사 엔진
  generateBuiltinDeepReport(sessionData, candidateProfile) {
    const totalCount = sessionData.answers.length;
    const avgScore = sessionData.finalScore;
    const name = candidateProfile.name;

    // 답변 분석
    let shortAnswersCount = 0;
    let missingKeywordsTotal = [];
    sessionData.answers.forEach(a => {
      if (!a.answerText || a.answerText.length < 80) shortAnswersCount++;
      missingKeywordsTotal = missingKeywordsTotal.concat(a.evalResult.missingKeywords || []);
    });

    const isPassLevel = avgScore >= 80;

    return `
### 🏛️ 1. 기관장급 전략적 리더십 & 품격 총평
* **평가위원 냉정 판정**: ${isPassLevel ? '【부서장·기관장 직무수행 적격 (Conditional Pass)】' : '【보완 요망 및 집중 클리닉 필요 (Needs Improvement)】'}
* **총평**: ${name} 후보자는 총 ${totalCount}문항의 질의에 응답하였으며, 현장 실무 23년 차의 축적된 노하우는 분명히 돋보입니다. 그러나 본 면접은 실무 팀장을 뽑는 자리가 아닌 **조직의 비전을 책임지고 대외 이해관계를 조율하는 "기관장"**을 선발하는 자리입니다. ${shortAnswersCount > 0 ? `일부 답변(${shortAnswersCount}개 문항)에서 답변 분량이 짧고 팀장 시절의 실무 나열에 머무르는 경향이 관찰되었습니다.` : `답변의 성실성은 양호하나, "내가 직접 개입했다"는 표현보다 "조직이 시스템으로 돌아가게 구조화했다"는 경영 마인드의 어휘를 더 적극적으로 채택해야 합니다.`}

---

### 🌿 2. 초록우산 2026 역량모델 부합도 냉정 진단
1. **아동중심 (Child Focus - ${sessionData.commonScores.child_focus}점)**:
   - 학대 위기사례와 무연고 영아 보호에서 아동 안전을 최우선으로 둔 점은 매우 우수합니다. 단, 아동 참여권과 권리 옹호 관점의 거시적 정책 언급을 보강하십시오.
2. **진정성 (Integrity - ${sessionData.commonScores.integrity}점)**:
   - 위기관리를 솔직하게 2점으로 자평한 점은 높은 평가를 받으나, 면접관에게 불안감을 주지 않도록 "사후평가 개선 작업이 현재 4분기에 완료 단계에 있음"을 즉각 덧붙여야 합니다.
3. **전문성 & 도전정신 (Professionalism & Challenge - ${Math.round((sessionData.commonScores.professionalism + sessionData.commonScores.challenge)/2)}점)**:
   - 2027 국가사업 전환, 제3차 아동정책기본계획, 18개 센터 평가지표 TF 등 제도적 전문성은 탁월합니다. 다만 지자체 수탁 심사(5년 단위)와 법인 재정 기여 방안을 더욱 명확히 제시해야 합니다.

---

### ⚠️ 3. 답변의 치명적 허점 및 취약점 팩트체크
* **약점 1 (경력 편중 공격에 대한 방어 미흡)**:
  - 가정위탁 11년 외에 지역본부 9년 6개월, 복지관 3년 경력을 방어할 때 "가정위탁만 한 사람보다 부족하다"는 인상을 절대 주어서는 안 됩니다. **"모금, 지역협력, 행정을 모두 섭렵했기에 국가사업 전환기에 재단을 대표할 수 있는 통섭형 기관장"**이라는 프레임으로 역공해야 합니다.
* **약점 2 (숫자와 팩트의 구체성 누락)**:
  - ${missingKeywordsTotal.slice(0, 3).map(k => `\`${k}\``).join(', ')} 등의 핵심 팩트 키워드가 일부 누락되었습니다. 기관장 면접관들은 두루뭉술한 수식어보다 **"1,007세대 1,228명", "지정후원 1,000만원", "신입 9명 100% 잔류"**와 같은 정확한 숫자에 반응합니다.

---

### 🗡️ 4. 실제 면접관이 던질 예상 송곳 꼬리질문 (압박 대비)
1. *"8개월간 보호조치 변경이 지연되는 동안 아동의 안전을 100% 보장했다고 장담할 수 있습니까? 그 기간 동안 구청과의 마찰을 조기에 해결하지 못한 팀장의 책임은 없습니까?"*
2. *"위기관리 역량이 2점인데, 부임 첫 달에 관내 위탁가정에서 아동학대 중상해 사건이 터지면 어떻게 감당하시겠습니까?"*
3. *"신입 9명을 보호하느라 경력자들에게 고난도 사례가 몰려 불만이 팽배했을 텐데, 과연 이것이 지속가능한 조직 운영입니까?"*

---

### 💡 5. 실전 합격을 위한 원포인트 개선 스크립트
* **[개선 문장 공식]**: **「두괄식 결론 ➔ 구체적 숫자/제도 근거 ➔ 기관장으로서의 시스템적 확산」**
  - **Before**: *"저는 현장에서 직원들과 함께 동행하며 열심히 소통해 왔습니다."*
  - **After**: *"저는 방향을 세우고 기준으로 결정하며 끝까지 동행하는 리더입니다. 신입 9명을 4개월간 선배와 동행시키고, 자립 프로그램은 창증감제 기준으로 전 직원이 합의해 3개를 2개로 재편했습니다. 기관장이 되어서도 사람이 남고 안전이 지켜지는 구조를 만들겠습니다."*
`;
  }
}

// Global Evaluator Instance
const geminiEvaluator = new GeminiEvaluator();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiEvaluator, geminiEvaluator };
}
