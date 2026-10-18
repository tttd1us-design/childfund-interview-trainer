// 초록우산 어린이재단 기관장 승진 실전 AI 면접 시뮬레이터 (신지애 팀장 전용) - 메인 애플리케이션

class InterviewSimulator {
  constructor() {
    this.sessionState = {
      isActive: false,
      isPaused: false,
      difficulty: 3,
      totalQuestions: 12,
      currentIndex: 0,
      questions: [],
      answers: [], // { question, answerText, evalResult, timestamp }
      timerSeconds: 30 * 60, // 30분
      timerInterval: null,
      ttsEnabled: true,
      sttEnabled: true,
      hintEnabled: false,
      sessionNumber: 1
    };

    // Voice & Speech Synthesis / Recognition
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isRecognizing = false;
    this.selectedVoice = null;

    // Charts references
    this.charts = {
      common: null,
      leadership: null,
      history: null
    };

    // Storage Key
    this.STORAGE_KEY = "childfund_interview_sessions_shin";

    this.init();
  }

  init() {
    this.loadHistory();
    this.setupSpeechRecognition();
    this.setupVoices();
    this.bindEvents();
    this.renderHistoryTable();
  }

  // Load Saved Sessions
  loadHistory() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      this.historySessions = data ? JSON.parse(data) : [];
      this.sessionState.sessionNumber = this.historySessions.length + 1;
    } catch (e) {
      this.historySessions = [];
    }
  }

  saveHistory(reportData) {
    this.historySessions.push(reportData);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.historySessions));
  }

  // Setup Web Speech Recognition
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "ko-KR";

      this.recognition.onstart = () => {
        this.isRecognizing = true;
        this.updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript;
        }
        const txtArea = document.getElementById("txt-candidate-answer");
        if (txtArea) {
          txtArea.value = finalTranscript;
          this.updateCharCount();
        }
      };

      this.recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        this.updateMicUI(false);
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
        this.updateMicUI(false);
      };
    } else {
      console.warn("Web Speech Recognition not supported in this browser.");
      const ind = document.getElementById("stt-status-indicator");
      if (ind) ind.textContent = "브라우저 음성인식 미지원 (키보드 입력 가능)";
    }
  }

  // Setup Voices for Interviewers
  setupVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // 한국어 음성 탐색
      this.selectedVoice = voices.find(v => v.lang === "ko-KR" || v.lang.startsWith("ko")) || voices[0];
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Speak interviewer question with persona tone
  speakQuestion(questionObj) {
    if (!this.sessionState.ttsEnabled || !this.synth) return;
    this.synth.cancel(); // Stop any previous speech

    const panelInfo = INTERVIEW_PANEL[questionObj.panel] || INTERVIEW_PANEL.CEO;
    const utterance = new SpeechSynthesisUtterance(questionObj.question);
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.lang = "ko-KR";
    utterance.pitch = panelInfo.voicePitch || 1.0;
    utterance.rate = panelInfo.voiceRate || 1.0;

    // Highlight interviewer
    this.highlightInterviewer(panelInfo.id, true);

    utterance.onend = () => {
      this.highlightInterviewer(panelInfo.id, false);
      // Auto-start STT if enabled
      if (this.sessionState.sttEnabled && this.recognition && !this.isRecognizing) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };

    utterance.onerror = () => {
      this.highlightInterviewer(panelInfo.id, false);
    };

    this.synth.speak(utterance);
  }

  highlightInterviewer(panelId, isSpeaking) {
    document.querySelectorAll(".panel-chair").forEach(el => el.classList.remove("active-speaker"));
    const chair = document.getElementById(`chair-${panelId}`);
    if (chair && isSpeaking) {
      chair.classList.add("active-speaker");
    }
  }

  // UI Event Bindings
  bindEvents() {
    // Start Interview Button
    document.getElementById("btn-start-interview").addEventListener("click", () => this.startInterview());

    // Pause / Resume Button
    document.getElementById("btn-pause-resume").addEventListener("click", () => this.togglePause());

    // Finish Early
    document.getElementById("btn-finish-early").addEventListener("click", () => {
      if (confirm("정말로 면접을 종료하고 지금까지의 답변을 바탕으로 평가 보고서를 생성하시겠습니까?")) {
        this.finishInterview();
      }
    });

    // Mic Button
    document.getElementById("btn-toggle-mic").addEventListener("click", () => this.toggleMic());

    // Replay TTS
    document.getElementById("btn-replay-tts").addEventListener("click", () => {
      const currentQ = this.sessionState.questions[this.sessionState.currentIndex];
      if (currentQ) this.speakQuestion(currentQ);
    });

    // Next Question Button
    document.getElementById("btn-submit-answer").addEventListener("click", () => this.submitAnswerAndNext());

    // Answer text counter
    document.getElementById("txt-candidate-answer").addEventListener("input", () => this.updateCharCount());

    // View History Button
    document.getElementById("btn-view-history").addEventListener("click", () => this.showView("view-history-dash"));
    document.getElementById("btn-back-to-setup").addEventListener("click", () => this.showView("view-setup"));

    // Report Actions
    document.getElementById("btn-retry-interview").addEventListener("click", () => this.showView("view-setup"));
    document.getElementById("btn-print-report").addEventListener("click", () => window.print());
    document.getElementById("btn-export-json").addEventListener("click", () => this.exportHistoryJSON());
    document.getElementById("btn-github-backup").addEventListener("click", () => this.showGitHubBackupGuide());
  }

  showView(viewId) {
    document.querySelectorAll(".view-panel").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add("active");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Start Interview Flow
  startInterview() {
    // Read Settings
    const diffRadio = document.querySelector('input[name="difficulty"]:checked');
    this.sessionState.difficulty = diffRadio ? parseInt(diffRadio.value) : 3;
    this.sessionState.totalQuestions = parseInt(document.getElementById("q-count").value) || 12;
    this.sessionState.ttsEnabled = document.getElementById("toggle-tts").checked;
    this.sessionState.sttEnabled = document.getElementById("toggle-stt").checked;
    this.sessionState.hintEnabled = document.getElementById("toggle-hint").checked;

    // Reset State
    this.sessionState.isActive = true;
    this.sessionState.isPaused = false;
    this.sessionState.currentIndex = 0;
    this.sessionState.answers = [];
    this.sessionState.timerSeconds = 30 * 60; // 30분 카운트다운

    // Generate Question Set
    this.sessionState.questions = generateInterviewSet(this.sessionState.difficulty, this.sessionState.totalQuestions);

    // Show View & Start Timer
    this.showView("view-interview");
    this.startTimer();
    this.loadQuestion(0);
  }

  // 30-Minute Timer Logic
  startTimer() {
    clearInterval(this.sessionState.timerInterval);
    this.updateTimerDisplay();

    this.sessionState.timerInterval = setInterval(() => {
      if (!this.sessionState.isPaused) {
        this.sessionState.timerSeconds--;
        this.updateTimerDisplay();

        if (this.sessionState.timerSeconds <= 0) {
          clearInterval(this.sessionState.timerInterval);
          alert("30분 실전 면접 시간이 모두 종료되었습니다. 최종 평가 보고서를 생성합니다.");
          this.finishInterview();
        }
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, this.sessionState.timerSeconds) / 60);
    const secs = Math.max(0, this.sessionState.timerSeconds) % 60;
    const str = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const el = document.getElementById("timer-text");
    if (el) el.textContent = str;
  }

  togglePause() {
    this.sessionState.isPaused = !this.sessionState.isPaused;
    const btnText = document.getElementById("btn-pause-text");
    const btnIcon = document.getElementById("btn-pause-icon");

    if (this.sessionState.isPaused) {
      if (this.synth) this.synth.pause();
      if (this.recognition && this.isRecognizing) this.recognition.stop();
      btnText.textContent = "면접 재개";
      btnIcon.textContent = "▶";
    } else {
      if (this.synth) this.synth.resume();
      btnText.textContent = "일시정지";
      btnIcon.textContent = "⏸️";
    }
  }

  // Load Specific Question
  loadQuestion(index) {
    if (index >= this.sessionState.questions.length) {
      this.finishInterview();
      return;
    }

    this.sessionState.currentIndex = index;
    const qObj = this.sessionState.questions[index];
    const panelInfo = INTERVIEW_PANEL[qObj.panel] || INTERVIEW_PANEL.CEO;

    // Update Top Progress Bar
    const progressPercent = Math.round(((index + 1) / this.sessionState.questions.length) * 100);
    document.getElementById("lbl-question-progress").textContent = `질문 ${index + 1} / ${this.sessionState.questions.length}`;
    document.getElementById("progress-bar-fill").style.width = `${progressPercent}%`;

    // Update Dialogue Card Elements
    document.getElementById("current-speaker-tag").textContent = `${panelInfo.name} (${panelInfo.title})`;
    document.getElementById("current-category-tag").textContent = qObj.category;
    document.getElementById("current-diff-tag").textContent = `Level ${qObj.difficulty}`;
    document.getElementById("current-question-text").textContent = qObj.question;

    // Update Hints
    const hintDrawer = document.getElementById("hint-drawer");
    const hintList = document.getElementById("hint-list");
    if (this.sessionState.hintEnabled && qObj.idealPoints) {
      hintDrawer.style.display = "block";
      hintList.innerHTML = qObj.idealPoints.map(pt => `<li>${pt}</li>`).join("");
    } else {
      hintDrawer.style.display = "none";
    }

    // Reset Answer Text Area
    const txtArea = document.getElementById("txt-candidate-answer");
    txtArea.value = "";
    this.updateCharCount();

    // Trigger TTS
    this.speakQuestion(qObj);
  }

  // Mic Toggle
  toggleMic() {
    if (!this.recognition) {
      alert("현재 브라우저는 Web Speech API 마이크를 지원하지 않습니다. 텍스트로 직접 입력해 주세요.");
      return;
    }

    if (this.isRecognizing) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("STT restart error:", e);
      }
    }
  }

  updateMicUI(isListening) {
    const btn = document.getElementById("btn-toggle-mic");
    const label = document.getElementById("lbl-mic-text");
    const ind = document.getElementById("stt-status-indicator");

    if (isListening) {
      btn.classList.add("active");
      label.textContent = "답변 녹음 중지";
      ind.textContent = "🎙️ 실시간 음성 듣는 중...";
      ind.classList.add("listening");
    } else {
      btn.classList.remove("active");
      label.textContent = "음성 답변 시작";
      ind.textContent = "마이크 대기 중";
      ind.classList.remove("listening");
    }
  }

  updateCharCount() {
    const txtArea = document.getElementById("txt-candidate-answer");
    const count = txtArea ? txtArea.value.length : 0;
    document.getElementById("lbl-char-count").textContent = count;
  }

  // Submit Answer & Evaluate
  submitAnswerAndNext() {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
    }
    if (this.synth) {
      this.synth.cancel();
    }

    const currentQ = this.sessionState.questions[this.sessionState.currentIndex];
    const answerText = document.getElementById("txt-candidate-answer").value.trim();

    // Evaluate Answer
    const evalResult = evaluateAnswer(answerText, currentQ);

    // Save Answer Record
    this.sessionState.answers.push({
      questionIndex: this.sessionState.currentIndex + 1,
      question: currentQ,
      answerText: answerText,
      evalResult: evalResult,
      timestamp: new Date().toLocaleTimeString()
    });

    // Check if Follow-up required (난이도 4~5단계이고 꼬리질문이 있는 경우 30% 확률로 꼬리질문 인젝션)
    if (this.sessionState.difficulty >= 4 && currentQ.followUp && Math.random() < 0.35 && !currentQ._isFollowUp) {
      const followUpQ = {
        id: currentQ.id + 1000,
        qNumber: `${currentQ.qNumber}-꼬리질문`,
        category: `[심층 꼬리질문] ${currentQ.category}`,
        panel: currentQ.panel,
        difficulty: 5,
        question: currentQ.followUp,
        keywords: currentQ.keywords.slice(0, 3),
        idealPoints: ["원칙에 부합하는 소신 답변", "아동의 안전과 기관의 규정을 일관되게 고수"],
        _isFollowUp: true
      };
      // 다음 질문으로 꼬리질문 삽입
      this.sessionState.questions.splice(this.sessionState.currentIndex + 1, 0, followUpQ);
    }

    // Move Next
    this.sessionState.currentIndex++;
    if (this.sessionState.currentIndex < this.sessionState.questions.length) {
      this.loadQuestion(this.sessionState.currentIndex);
    } else {
      this.finishInterview();
    }
  }

  // Finish Interview & Generate Comprehensive Report
  finishInterview() {
    clearInterval(this.sessionState.timerInterval);
    this.sessionState.isActive = false;
    if (this.synth) this.synth.cancel();
    if (this.recognition && this.isRecognizing) this.recognition.stop();

    // Calculate Final Metrics
    const totalCount = this.sessionState.answers.length || 1;
    let sumScore = 0;
    let commonScores = { child_focus: 0, integrity: 0, professionalism: 0, challenge: 0 };
    let leadershipScores = { vision_setting: 0, business_mindset: 0, decision_making: 0, performance_mgmt: 0, motivation: 0 };

    this.sessionState.answers.forEach(a => {
      sumScore += a.evalResult.score;
      const ana = a.evalResult.analysis;
      commonScores.child_focus += (ana.clarity + ana.alignment) / 2;
      commonScores.integrity += (ana.competency + ana.evidence) / 2;
      commonScores.professionalism += (ana.competency + ana.evidence) / 2;
      commonScores.challenge += (ana.clarity + ana.competency) / 2;

      leadershipScores.vision_setting += (ana.alignment + ana.clarity) / 2;
      leadershipScores.business_mindset += (ana.evidence + ana.competency) / 2;
      leadershipScores.decision_making += (ana.clarity + ana.evidence) / 2;
      leadershipScores.performance_mgmt += (ana.competency + ana.clarity) / 2;
      leadershipScores.motivation += (ana.alignment + ana.competency) / 2;
    });

    const finalAvg = Math.round(sumScore / totalCount);
    Object.keys(commonScores).forEach(k => commonScores[k] = Math.round(commonScores[k] / totalCount));
    Object.keys(leadershipScores).forEach(k => leadershipScores[k] = Math.round(leadershipScores[k] / totalCount));

    let finalGrade = "B (보통)";
    if (finalAvg >= 90) finalGrade = "S (승진 최우수 적격)";
    else if (finalAvg >= 80) finalGrade = "A (승진 우수 적격)";
    else if (finalAvg >= 70) finalGrade = "B (직무 수행 가능)";
    else if (finalAvg >= 60) finalGrade = "C (다소 보완 필요)";
    else finalGrade = "D (집중 훈련 요망)";

    const durationSeconds = (30 * 60) - Math.max(0, this.sessionState.timerSeconds);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationRemainSeconds = durationSeconds % 60;

    const reportData = {
      sessionId: `SES-${Date.now()}`,
      sessionNumber: this.sessionState.sessionNumber,
      date: new Date().toLocaleDateString('ko-KR'),
      time: new Date().toLocaleTimeString('ko-KR'),
      durationStr: `${durationMinutes}분 ${durationRemainSeconds}초`,
      difficulty: this.sessionState.difficulty,
      questionCount: totalCount,
      finalScore: finalAvg,
      finalGrade: finalGrade,
      commonScores: commonScores,
      leadershipScores: leadershipScores,
      answers: this.sessionState.answers,
      comment: this.generateOverallComment(finalAvg, commonScores, leadershipScores)
    };

    // Save to History
    this.saveHistory(reportData);
    this.renderReport(reportData);
    this.showView("view-report");
  }

  generateOverallComment(score, common, lead) {
    if (score >= 88) {
      return `신지애 팀장은 23년 차 최고참 팀장으로서의 현장 전문성과 초록우산 2026 역량모델에 대한 깊은 이해를 완벽히 증명하였습니다. 특히 서울센터 무연고 영아 7명 보호 성과와 경기남부 신입 9명 육성 구조, 2027 국가사업 전환 대비 전략이 면접관들의 엄격한 기준을 충분히 충족하였습니다. 향후 위기관리 L4 사후평가 개선 계획을 지속 실천한다면 재단 산하 기관장으로서 탁월한 성과를 창출할 것으로 최종 평가됩니다.`;
    } else if (score >= 75) {
      return `초록우산 기관장으로서 요구되는 핵심 리더십과 현장 전문성을 고르게 갖추고 있습니다. 다만 날카로운 압박 질문(위기관리 2점 자평의 이유, 8개월 보호조치 지연, 경력 적합성 등)에서 핵심 수치와 객관적 법적 근거를 조금 더 단호하게 제시한다면 면접관들에게 더욱 강력한 확신을 줄 수 있습니다.`;
    } else {
      return `답변의 성실성은 돋보이나, 일부 질문에서 답변 길이가 짧거나 핵심 키워드(숫자, 지표, 재단 역량모델 용어)가 다소 누락되었습니다. 120개 기출 질문에 포함된 신지애 팀장의 고유 포트폴리오 근거(신입 9명, 지정후원 1,000만원, 1,007세대 등)를 의식적으로 반복 인용하는 집중 훈련을 권장합니다.`;
    }
  }

  // Render Report View & Charts
  renderReport(reportData) {
    document.getElementById("report-session-badge").textContent = `제 ${reportData.sessionNumber}회차 실전 모의면접`;
    document.getElementById("report-date-text").textContent = `${reportData.date} ${reportData.time} | 소요 시간: ${reportData.durationStr} | 출제 문항: ${reportData.questionCount}문항 (Level ${reportData.difficulty})`;
    document.getElementById("report-final-score").textContent = reportData.finalScore;
    document.getElementById("report-final-grade").textContent = reportData.finalGrade;
    document.getElementById("report-overall-comment").textContent = reportData.comment;
    document.getElementById("report-qa-count").textContent = reportData.questionCount;

    // Render QA Accordion
    const qaList = document.getElementById("report-qa-list");
    qaList.innerHTML = reportData.answers.map((item, idx) => {
      const q = item.question;
      const evalR = item.evalResult;
      const matchedBadges = evalR.matchedKeywords.map(k => `<span class="kw-badge matched">✓ ${k}</span>`).join(" ");
      const missingBadges = evalR.missingKeywords.map(k => `<span class="kw-badge missing">✗ ${k}</span>`).join(" ");

      return `
        <div class="qa-item ${idx === 0 ? 'expanded' : ''}">
          <div class="qa-item-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="qa-item-title">
              <span class="badge">${q.qNumber}</span>
              <span>${q.question.substring(0, 50)}...</span>
            </div>
            <div class="qa-item-score">${evalR.score}점 (${evalR.grade})</div>
          </div>
          <div class="qa-item-body">
            <div class="qa-block-title">【면접관 전체 질문】</div>
            <p><strong>${q.question}</strong></p>
            
            <div class="qa-block-title">【신지애 팀장 응답 전문】</div>
            <div class="qa-answer-box">${item.answerText || "(녹음 및 입력된 답변 없음)"}</div>

            <div class="qa-block-title">【면접관 패널 정밀 피드백】</div>
            <div class="qa-feedback-box">${evalR.feedback}</div>

            <div class="qa-block-title">【키워드 및 역량 반영도 검증】</div>
            <div class="qa-tags-wrap">
              ${matchedBadges || '<span class="kw-badge">일치 키워드 없음</span>'}
              ${missingBadges}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Render Charts
    this.renderCharts(reportData);
  }

  renderCharts(reportData) {
    // 1. Radar Chart: 4 Common Competencies
    const ctxCommon = document.getElementById("chart-common-competency").getContext("2d");
    if (this.charts.common) this.charts.common.destroy();

    this.charts.common = new Chart(ctxCommon, {
      type: 'radar',
      data: {
        labels: ['아동중심', '진정성', '전문성', '도전정신'],
        datasets: [{
          label: '신지애 팀장 획득 점수',
          data: [
            reportData.commonScores.child_focus,
            reportData.commonScores.integrity,
            reportData.commonScores.professionalism,
            reportData.commonScores.challenge
          ],
          backgroundColor: 'rgba(0, 132, 80, 0.25)',
          borderColor: '#008450',
          pointBackgroundColor: '#008450',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#008450'
        }, {
          label: '기관장 기준선 (합격선: 80점)',
          data: [80, 80, 80, 80],
          borderColor: 'rgba(194, 153, 56, 0.7)',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            suggestedMin: 30,
            suggestedMax: 100,
            ticks: { stepSize: 20 }
          }
        }
      }
    });

    // 2. Bar Chart: 5 Leadership Competencies
    const ctxLead = document.getElementById("chart-leadership-competency").getContext("2d");
    if (this.charts.leadership) this.charts.leadership.destroy();

    this.charts.leadership = new Chart(ctxLead, {
      type: 'bar',
      data: {
        labels: ['비전제시', '경영마인드', '의사결정', '성과관리', '동기부여'],
        datasets: [{
          label: '리더십 역량 점수',
          data: [
            reportData.leadershipScores.vision_setting,
            reportData.leadershipScores.business_mindset,
            reportData.leadershipScores.decision_making,
            reportData.leadershipScores.performance_mgmt,
            reportData.leadershipScores.motivation
          ],
          backgroundColor: [
            '#008450',
            '#1a56db',
            '#c29938',
            '#059669',
            '#4f46e5'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // 3. Line Chart: Historical Development Trend
    const ctxHist = document.getElementById("chart-history-trend").getContext("2d");
    if (this.charts.history) this.charts.history.destroy();

    const labels = this.historySessions.map(s => `제 ${s.sessionNumber}회차`);
    const scores = this.historySessions.map(s => s.finalScore);

    this.charts.history = new Chart(ctxHist, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '회차별 종합 점수 추이',
          data: scores,
          borderColor: '#008450',
          backgroundColor: 'rgba(0, 132, 80, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: '#008450'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 40,
            max: 100
          }
        }
      }
    });
  }

  // Render History Dashboard Table
  renderHistoryTable() {
    const tbody = document.getElementById("history-tbody");
    if (!tbody) return;

    if (this.historySessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: #94a3b8;">아직 진행된 모의면접 회차가 없습니다. 실전 면접을 시작해 보세요.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.historySessions.slice().reverse().map(s => `
      <tr>
        <td><strong>제 ${s.sessionNumber}회차</strong></td>
        <td>${s.date} ${s.time}</td>
        <td>Level ${s.difficulty}</td>
        <td>${s.questionCount}문항</td>
        <td>${s.durationStr}</td>
        <td><strong style="color:var(--primary);">${s.finalScore}점</strong></td>
        <td><span class="badge">${s.finalGrade}</span></td>
        <td><button class="btn btn-sm btn-outline" onclick="app.viewPastSession('${s.sessionId}')">결과 보기</button></td>
      </tr>
    `).join("");
  }

  viewPastSession(sessionId) {
    const found = this.historySessions.find(s => s.sessionId === sessionId);
    if (found) {
      this.renderReport(found);
      this.showView("view-report");
    }
  }

  // Export JSON Backup
  exportHistoryJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.historySessions, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `childfund_interview_history_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
  }

  // GitHub Backup Guide
  showGitHubBackupGuide() {
    const guideMsg = `[GitHub 백업 및 원격 동기화 안내]

1. [데이터 JSON 백업] 버튼을 눌러 모의면접 결과 파일을 다운로드합니다.
2. 본인 GitHub 계정의 저장소(예: childfund-interview-practice)에 업로드하거나, GitHub Gist(https://gist.github.com)에 붙여넣어 안전하게 영구 보존할 수 있습니다.
3. 또는 이 프로젝트 디렉토리 전체를 git remote에 푸시(push)하여 PC, 아이폰, 갤럭시 등 어디서나 GitHub Pages(웹 배포)를 통해 실시간으로 면접 연습을 이어갈 수 있습니다.

지금 바로 JSON 백업을 진행하시겠습니까?`;

    if (confirm(guideMsg)) {
      this.exportHistoryJSON();
    }
  }
}

// Global App Instance
let app;
window.addEventListener("DOMContentLoaded", () => {
  app = new InterviewSimulator();
});
