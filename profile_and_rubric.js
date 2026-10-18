// 신지애 팀장 포트폴리오 및 2026 개정 초록우산 역량모델 데이터셋

const CANDIDATE_PROFILE = {
  name: "신지애",
  currentRank: "3급",
  appliedRank: "2급 (부서장/기관장)",
  center: "경기남부가정위탁지원센터",
  team: "복지사업1팀 (팀장)",
  entryDate: "2003. 02. 01",
  totalTenure: "23년 8개월 (면접 기준)",
  careerBreakdown: {
    fosterCare: "약 11년 (서울가정위탁 실무 5년 + 경기남부가정위탁 팀장 6년)",
    regionalOffice: "9년 6개월 (지역본부)",
    welfareCenter: "3년 (종합사회복지관)"
  },
  keyAccomplishments: [
    {
      id: "acc_1",
      period: "2021.02~2023.12 (서울가정위탁지원센터)",
      title: "무연고 영아 가정보호 시범 모델 현장 선제 설계·운영",
      details: "베이비박스 유기 영아 96.6% 시설 입소 현실 개선 위해 4개 기관 R&R 정립, 7명 위탁가정 보호, 지정후원 1,000만원 유치, 공적입양체계 지자체장 후견 기여",
      score: 5
    },
    {
      id: "acc_2",
      period: "2024.01~현재 (경기남부가정위탁지원센터)",
      title: "베테랑 직원 공백 속 업무·육성체계 재설계로 우수기관 3회 연속 달성",
      details: "과장 3명 전보 위기 극복, 업무 매뉴얼 스터디, 4개월 선배 동행제, 신입 9명 전원 재직 및 재단 2연속·보건복지부 우수기관 달성",
      score: 5
    },
    {
      id: "syn_1",
      period: "2021~2022",
      title: "학대 위기사례 8개월 교착 타개 및 아동 안전한 보호조치 변경",
      details: "위탁모 비협조와 구청 이견 속 6개 유관기관 협업, 심리전문가·법률 자문 근거 제시, 아동 안전 최우선 달성",
      score: 4
    },
    {
      id: "syn_2",
      period: "2023~2025",
      title: "보건복지부 평가지표 TF 위원 및 전국 센터 현장평가위원 활동",
      details: "전국 18개 센터 의견 40개 지표별 수렴, 전국 기준 수립 및 재단 산하 6개 센터 우수 운영 노하우 전파",
      score: 5
    }
  ],
  competencySelfAssessment: {
    customerFocus: {
      name: "고객지향",
      type: "직무역량 (중요+탁월)",
      score: 3,
      evidence: "한국보건복지인재원 신규상담원 강사(만족도 4.31점/재위촉), 업무 매뉴얼 개정 TF, 조부모 60% 이상 고려한 부모교육 개편 자문"
    },
    crisisManagement: {
      name: "위기관리",
      type: "직무역량 (중요+보완필요)",
      score: 2,
      evidence: "위기대응 체크리스트 3대 분야 25명 전 직원 개발, SNS 성학대 피해 즉각 대응 성공. 단 역량모델 L4 수준인 사후분석 및 재발방지 체계 완결 미흡으로 엄격히 2점 부여, 4분기 간소화 작업 중"
    },
    decisionMaking: {
      name: "의사결정",
      type: "리더십역량 (승진 후 역할)",
      score: 3,
      evidence: "보호아동 자립프로그램 창증감제 기반 재편(3개→2개 통합), 희망이음 외부인력 미투입 결정 및 자원봉사 대안 마련"
    },
    businessMindset: {
      name: "경영마인드",
      type: "리더십역량 (승진 후 역할)",
      score: 3,
      evidence: "총괄·운영지원팀장으로 예산 조정(면접교섭비 등) 및 기안 간소화, 가정위탁사업 직무기술서 체계화(2026 재단 역량모델 반영)"
    }
  }
};

const CHILDFUND_COMPETENCY_MODEL = {
  common: [
    {
      id: "child_focus",
      name: "아동중심",
      def: "사업의 전 과정에서 아동을 중심으로 사고하며, 아동의 권리가 보호, 존중, 실현될 수 있도록 한다.",
      rubric: [
        "이해관계 충돌 시 아동의 안전과 최선의 이익을 최우선 기준으로 내세우는가",
        "아동 권리 옹호 및 아동보호정책을 철저히 준수하는가",
        "위기 상황에서 아동 보호를 위해 신속하고 단호하게 행동하는가"
      ]
    },
    {
      id: "integrity",
      name: "진정성",
      def: "업무를 수행함에 있어 조직과 자신의 가치관을 일치시키며, 스스로 높은 수준의 도덕적 원칙과 기준을 정하고 지킨다.",
      rubric: [
        "사사로운 이익이나 편의보다 법령, 규정, 윤리적 기준을 일관되게 고수하는가",
        "자신의 부족한 점(위기관리 2점 등)을 정직하게 인정하고 개선 방안을 제시하는가",
        "조직과 고객에게 투명하고 정확한 정보를 제공하는가"
      ]
    },
    {
      id: "professionalism",
      name: "전문성",
      def: "업무의 효과적·효율적 수행에 필요한 전문적·일반적 지식을 보유하고 이를 적극적으로 활용하며 업무 성과를 높인다.",
      rubric: [
        "가정위탁 정책(제3차 아동정책기본계획, 2027 국가사업 전환 등)을 깊이 이해하고 있는가",
        "현장 지표, 매뉴얼, 관련 법률 등 전문 지식을 실무에 논리적으로 적용하는가",
        "사례관리 경험과 데이터를 정확한 수치로 제시하는가"
      ]
    },
    {
      id: "challenge",
      name: "도전정신",
      def: "새로운 생각과 도전정신으로 변화와 혁신을 통해 미래를 준비한다.",
      rubric: [
        "선행 지침이 없는 상황에서도 과감하게 시범 모델을 개척하고 완수했는가",
        "조직의 관행을 깨고 더 나은 방식을 적극적으로 제안·실행하는가",
        "실패나 난관 앞에서 끈기를 가지고 끝까지 완수하는가"
      ]
    }
  ],
  leadership: [
    {
      id: "vision_setting",
      name: "비전제시",
      def: "조직의 중장기적 비전과 방향을 명확히 제시하고, 구성원의 이해와 공감을 바탕으로 실행을 이끌어낸다.",
      rubric: [
        "재단 경영전략 및 3대 중점사업과 기관 목표를 명확히 연계하는가",
        "직원들이 공감하고 자발적으로 동참할 수 있는 현실적 미래상을 그리는가"
      ]
    },
    {
      id: "business_mindset",
      name: "경영마인드",
      def: "경영적 관점에서 개선과 혁신을 주도하며 성과 창출과 조직 경쟁력 강화를 위한 책임 있는 경영을 실천한다.",
      rubric: [
        "단위 팀의 이해를 넘어 기관 및 재단 전체의 지속가능성을 고려하는가",
        "제도화, 시스템화, 표준화를 통해 조직 차원의 자산을 창출하는가"
      ]
    },
    {
      id: "decision_making",
      name: "의사결정",
      def: "객관적 정보와 다양한 관점을 종합적으로 검토하고, 조직 전체의 이익과 중장기적 관점을 고려하여 합리적이고 시의적인 결정을 내린다.",
      rubric: [
        "판단 기준과 근거를 명확히 정립하고 결정의 결과를 책임지는가",
        "단기 편의보다 장기적 파급효과와 조직 원칙을 우선하는가"
      ]
    },
    {
      id: "performance_mgmt",
      name: "성과관리",
      def: "재단의 경영목표 달성을 위해 조직의 성과목표를 설정하고 수행과제와 실행전략을 구체화하여 체계적으로 관리한다.",
      rubric: [
        "주기적 모니터링 체계와 자원 재배분 조율 능력을 갖추었는가",
        "목표 대비 부진 과제에 대한 명확한 진단과 피드백 대책이 있는가"
      ]
    },
    {
      id: "motivation",
      name: "동기부여",
      def: "구성원에게 관심을 기울이고 신뢰와 존중을 바탕으로 긍정적인 분위기를 조성하여 자발적인 몰입과 실행을 이끌어낸다.",
      rubric: [
        "구성원의 노고를 구체적으로 칭찬하고 실무자를 혼자 두지 않는가",
        "직원들의 의견을 실제 의사결정에 반영하여 심리적 효능감을 제공하는가"
      ]
    }
  ]
};

// 텍스트 답변 분석 평가 알고리즘
function evaluateAnswer(userAnswerText, questionObj) {
  if (!userAnswerText || userAnswerText.trim().length < 5) {
    return {
      score: 20,
      grade: "D",
      feedback: "답변이 너무 짧거나 기록되지 않았습니다. 실전 면접에서는 최소 1분~1분 30초 내외로 구체적인 경험과 근거를 제시해야 합니다.",
      matchedKeywords: [],
      missingKeywords: questionObj.keywords,
      analysis: {
        clarity: 20,
        competency: 20,
        evidence: 20,
        alignment: 20
      }
    };
  }

  const cleanText = userAnswerText.replace(/[\s\n\r\t.,!?'"~]/g, "").toLowerCase();
  
  // 키워드 매칭 계산
  let matchedKeywords = [];
  let missingKeywords = [];

  questionObj.keywords.forEach(kw => {
    const cleanKw = kw.replace(/[\s\n\r\t.,!?'"~]/g, "").toLowerCase();
    if (cleanText.includes(cleanKw) || cleanText.includes(cleanKw.substring(0, Math.min(4, cleanKw.length)))) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const matchRatio = matchedKeywords.length / (questionObj.keywords.length || 1);
  const lengthScore = Math.min(100, Math.max(40, (userAnswerText.length / 180) * 100)); // 약 180자 이상 만점 기준
  
  let totalScore = Math.round((matchRatio * 55) + (lengthScore * 0.35) + 10);
  totalScore = Math.min(100, Math.max(35, totalScore));

  let grade = "B";
  if (totalScore >= 90) grade = "S (탁월)";
  else if (totalScore >= 80) grade = "A (우수)";
  else if (totalScore >= 70) grade = "B (보통)";
  else if (totalScore >= 60) grade = "C (다소 미흡)";
  else grade = "D (보완 요망)";

  // 세부 4대 역량 지표 환산
  const clarity = Math.min(100, Math.round(lengthScore * 0.9 + Math.random() * 10));
  const competency = Math.min(100, Math.round(matchRatio * 85 + 15));
  const evidence = Math.min(100, Math.round((matchedKeywords.length >= 2 ? 85 : 55) + Math.random() * 10));
  const alignment = Math.min(100, Math.round(matchRatio * 80 + 20));

  let feedback = "";
  if (totalScore >= 85) {
    feedback = `훌륭한 답변입니다. '${matchedKeywords.slice(0, 3).join(", ")}' 등 핵심 포인트를 명확한 근거와 함께 제시하였습니다. 면접관의 의도에 매우 잘 부합합니다.`;
  } else if (totalScore >= 70) {
    feedback = `양호한 답변입니다. 다만 더 완벽한 면접관 설득을 위해 [${missingKeywords.slice(0, 2).join(", ")}] 등의 구체적 수치와 제도적 근거를 보강하시면 더욱 강력해집니다.`;
  } else {
    feedback = `다소 핵심이 분산되었습니다. [${missingKeywords.slice(0, 3).join(", ")}] 관련 구체적인 현장 사례와 수치를 직접 인용하여 주도성을 부각할 필요가 있습니다.`;
  }

  return {
    score: totalScore,
    grade: grade,
    feedback: feedback,
    matchedKeywords: matchedKeywords,
    missingKeywords: missingKeywords,
    analysis: {
      clarity: clarity,
      competency: competency,
      evidence: evidence,
      alignment: alignment
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CANDIDATE_PROFILE, CHILDFUND_COMPETENCY_MODEL, evaluateAnswer };
}
