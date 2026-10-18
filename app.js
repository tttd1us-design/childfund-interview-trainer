// 초록우산 어린이재단 기관장 승진 실전 AI 면접 시뮬레이터 (신지애 팀장 전용) - 상업용 고도화 엔진

class InterviewSimulator {
  constructor() {
    this.sessionState = {
      isActive: false,
      isPaused: false,
      difficulty: 3,
      totalQuestions: 12,
      currentIndex: 0,
      questions: [],
      answers: [], // { question, answerText, audioBlobUrl, evalResult, timestamp }
      timerSeconds: 30 * 60, // 30분
      timerInterval: null,
      ttsEnabled: true,
      sttEnabled: true,
      recordAudioEnabled: true,
      hintEnabled: false,
      sessionNumber: 1
    };

    // Voice & Speech Synthesis / Recognition
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isRecognizing = false;
    
    // Male & Female Voice Maps
    this.maleVoice = null;
    this.femaleVoice = null;
    this.fallbackVoice = null;

    // Media Recorder (실제 오디오 녹음기)
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentAudioBlobUrl = null;

    // Charts references
    this.charts = {
      common: null,
      leadership: null,
      history: null
    };

    // Storage Keys
    this.THEME_KEY = "childfund_interview_theme";
    this.FONT_KEY = "childfund_interview_fontsize";
    this.AUTH_KEY = "childfund_security_auth_shin";
    this.USERS_KEY = "childfund_interview_users_list";
    this.CURRENT_USER_KEY = "childfund_current_user_id";
    this.CORRECT_PASSCODE = "1014"; // 보안 인증 비밀번호

    // User Profile State
    this.users = [];
    this.currentUser = null;

    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadUsers();
    this.loadThemeAndFont();
    this.loadHistory();
    this.setupSpeechRecognition();
    this.setupVoices();
    this.bindEvents();
    this.renderHistoryTable();
  }

  // Multi-User Management System
  loadUsers() {
    try {
      const savedUsers = localStorage.getItem(this.USERS_KEY);
      if (savedUsers) {
        this.users = JSON.parse(savedUsers);
      } else {
        // Default Primary User (신지애 팀장)
        this.users = [
          {
            id: "user_shin",
            name: "신지애 팀장",
            dept: "경기남부센터 복지사업1팀",
            badge: "본 면접자",
            createdAt: new Date().toISOString()
          }
        ];
        this.saveUsers();
      }

      // Load or default current user
      const savedCurrentId = localStorage.getItem(this.CURRENT_USER_KEY);
      this.currentUser = this.users.find(u => u.id === savedCurrentId) || this.users[0];
      this.updateHeaderUserDisplay();
    } catch (e) {
      this.users = [{ id: "user_shin", name: "신지애 팀장", dept: "경기남부센터", badge: "본 면접자" }];
      this.currentUser = this.users[0];
    }
  }

  saveUsers() {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users));
    if (this.currentUser) {
      localStorage.setItem(this.CURRENT_USER_KEY, this.currentUser.id);
    }
  }

  updateHeaderUserDisplay() {
    if (!this.currentUser) return;
    const nameOnly = this.currentUser.name.replace(" 팀장", "");
    const headerUserName = document.getElementById("lbl-header-user-name");
    const candidateName = document.getElementById("lbl-header-candidate-name");
    const centerName = document.getElementById("lbl-header-center-name");
    const userBadge = document.getElementById("lbl-header-user-badge");

    if (headerUserName) headerUserName.textContent = nameOnly;
    if (candidateName) candidateName.textContent = this.currentUser.name;
    if (centerName) centerName.textContent = this.currentUser.dept || "초록우산";
    if (userBadge) userBadge.textContent = this.currentUser.badge || "면접자";
  }

  openUserModal() {
    this.renderUserProfiles();
    const modal = document.getElementById("user-modal");
    if (modal) modal.style.display = "flex";
  }

  closeUserModal() {
    const modal = document.getElementById("user-modal");
    if (modal) modal.style.display = "none";
  }

  renderUserProfiles() {
    const container = document.getElementById("user-profiles-list");
    if (!container) return;

    container.innerHTML = this.users.map(u => {
      const isActive = this.currentUser && this.currentUser.id === u.id;
      const historyKey = `childfund_interview_sessions_${u.id}`;
      const sessions = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const sessionCount = sessions.length;

      // Allow deleting if more than 1 user
      const deleteBtn = this.users.length > 1 ? `
        <button class="btn-delete-user" onclick="event.stopPropagation(); app.deleteUser('${u.id}')" title="사용자 및 면접 기록 삭제">삭제</button>
      ` : '';

      return `
        <div class="user-chip ${isActive ? 'active-user' : ''}" onclick="app.switchUser('${u.id}')">
          <div class="user-chip-left">
            <span class="user-avatar-icon">${u.name.includes("테스터") || u.name.includes("test") ? '🧪' : '👤'}</span>
            <div>
              <div class="user-name-text">${u.name} ${isActive ? '<span style="color:var(--primary); font-size:0.85rem;">(선택됨)</span>' : ''}</div>
              <div class="user-dept-text">${u.dept || '소속 미지정'}</div>
            </div>
          </div>
          <div class="user-chip-right">
            <span class="user-sessions-count">누적 ${sessionCount}회차</span>
            ${deleteBtn}
          </div>
        </div>
      `;
    }).join("");
  }

  switchUser(userId) {
    const target = this.users.find(u => u.id === userId);
    if (!target) return;

    this.currentUser = target;
    localStorage.setItem(this.CURRENT_USER_KEY, target.id);
    this.updateHeaderUserDisplay();
    this.loadHistory(); // Load target user's isolated history
    this.renderHistoryTable();
    this.closeUserModal();
  }

  addNewUser() {
    const nameInp = document.getElementById("new-user-name");
    const deptInp = document.getElementById("new-user-dept");
    const name = nameInp ? nameInp.value.trim() : "";
    const dept = deptInp ? deptInp.value.trim() : "";

    if (!name) return;

    const newUser = {
      id: `user_${Date.now()}`,
      name: name,
      dept: dept || (name.includes("테스트") ? "테스트 환경" : "초록우산 복지부서"),
      badge: name.includes("테스트") ? "테스터" : "심사 대상",
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsers();
    this.switchUser(newUser.id); // Automatically switch to the newly created user

    if (nameInp) nameInp.value = "";
    if (deptInp) deptInp.value = "";
  }

  deleteUser(userId) {
    if (this.users.length <= 1) {
      alert("최소 1명의 면접자 프로필은 유지되어야 합니다.");
      return;
    }

    const target = this.users.find(u => u.id === userId);
    if (!target) return;

    if (confirm(`'${target.name}' 사용자와 축적된 모든 모의면접 기록을 삭제하시겠습니까?\n(테스트 기록을 정리할 때 유용합니다.)`)) {
      // Remove isolated session data
      localStorage.removeItem(`childfund_interview_sessions_${userId}`);
      
      // Filter out user
      this.users = this.users.filter(u => u.id !== userId);
      
      // If deleted active user, fallback to first user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = this.users[0];
        localStorage.setItem(this.CURRENT_USER_KEY, this.currentUser.id);
      }

      this.saveUsers();
      this.updateHeaderUserDisplay();
      this.loadHistory();
      this.renderHistoryTable();
      this.renderUserProfiles();
    }
  }

  // Full Data Backup & Restore
  exportAllDataBackup() {
    const backupBundle = {
      backupDate: new Date().toISOString(),
      version: "2.0.0",
      users: this.users,
      sessionsByUser: {}
    };

    this.users.forEach(u => {
      const key = `childfund_interview_sessions_${u.id}`;
      backupBundle.sessionsByUser[u.id] = JSON.parse(localStorage.getItem(key) || "[]");
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupBundle, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `childfund_interview_FULL_BACKUP_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
  }

  importDataBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bundle = JSON.parse(e.target.result);
        if (!bundle.users || !bundle.sessionsByUser) {
          alert("유효한 초록우산 면접 백업 파일 형식이 아닙니다.");
          return;
        }

        if (confirm("백업 파일의 데이터를 불러오시겠습니까? 기존의 데이터와 안전하게 병합됩니다.")) {
          // Merge users
          bundle.users.forEach(impUser => {
            if (!this.users.some(u => u.id === impUser.id)) {
              this.users.push(impUser);
            }
            // Restore sessions for this user
            const key = `childfund_interview_sessions_${impUser.id}`;
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const imported = bundle.sessionsByUser[impUser.id] || [];
            
            // Deduplicate by sessionId
            const merged = [...existing];
            imported.forEach(impSess => {
              if (!merged.some(m => m.sessionId === impSess.sessionId)) {
                merged.push(impSess);
              }
            });
            localStorage.setItem(key, JSON.stringify(merged));
          });

          this.saveUsers();
          this.loadHistory();
          this.renderHistoryTable();
          this.renderUserProfiles();
          alert("데이터가 성공적으로 복원 및 동기화되었습니다!");
        }
      } catch (err) {
        alert("백업 파일을 읽는 중 오류가 발생했습니다: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset file input
  }

  // Security Passcode (1014) Verification
  checkAuthentication() {
    const isAuth = sessionStorage.getItem(this.AUTH_KEY);
    const gateway = document.getElementById("security-gateway");
    const appEl = document.getElementById("app");

    if (isAuth === "true") {
      if (gateway) gateway.style.display = "none";
      if (appEl) appEl.style.display = "flex";
    } else {
      if (gateway) gateway.style.display = "flex";
      if (appEl) appEl.style.display = "none";
      setTimeout(() => {
        const inp = document.getElementById("passcode-input");
        if (inp) inp.focus();
      }, 300);
    }
  }

  verifyPasscode() {
    const inp = document.getElementById("passcode-input");
    const errBox = document.getElementById("passcode-error-msg");
    const entered = inp ? inp.value.trim() : "";

    if (entered === this.CORRECT_PASSCODE) {
      sessionStorage.setItem(this.AUTH_KEY, "true");
      if (errBox) errBox.style.display = "none";
      this.checkAuthentication();
    } else {
      if (errBox) {
        errBox.style.display = "block";
        errBox.classList.remove("shake");
        void errBox.offsetWidth; // trigger reflow
        errBox.classList.add("shake");
      }
      if (inp) {
        inp.value = "";
        inp.focus();
      }
    }
  }

  lockScreen() {
    sessionStorage.removeItem(this.AUTH_KEY);
    this.checkAuthentication();
  }

  // Dark/Light Theme & Font Size
  loadThemeAndFont() {
    const savedTheme = localStorage.getItem(this.THEME_KEY) || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";

    const savedFont = localStorage.getItem(this.FONT_KEY) || "lg";
    this.applyFontSize(savedFont);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(this.THEME_KEY, next);
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
  }

  applyFontSize(size) {
    document.querySelectorAll(".font-resizer .btn-tool").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`btn-font-${size}`);
    if (btn) btn.classList.add("active");

    let qVal = "1.65rem";
    let bodyVal = "1.12rem";
    if (size === "md") {
      qVal = "1.35rem";
      bodyVal = "1.02rem";
    } else if (size === "lg") {
      qVal = "1.65rem";
      bodyVal = "1.12rem";
    } else if (size === "xl") {
      qVal = "2.05rem"; // 시원시원한 특대형 폰트
      bodyVal = "1.25rem";
    }
    document.documentElement.style.setProperty("--q-font-size", qVal);
    document.documentElement.style.setProperty("--body-font-size", bodyVal);
    localStorage.setItem(this.FONT_KEY, size);
  }

  // Load Saved Sessions for Current Active User
  loadHistory() {
    try {
      const userId = this.currentUser ? this.currentUser.id : "user_shin";
      const userKey = `childfund_interview_sessions_${userId}`;
      
      // Auto-migrate legacy data to user_shin if present
      if (userId === "user_shin" && !localStorage.getItem(userKey)) {
        const legacyData = localStorage.getItem("childfund_interview_sessions_shin");
        if (legacyData) {
          localStorage.setItem(userKey, legacyData);
        }
      }

      const data = localStorage.getItem(userKey);
      this.historySessions = data ? JSON.parse(data) : [];
      this.sessionState.sessionNumber = this.historySessions.length + 1;
    } catch (e) {
      this.historySessions = [];
    }
  }

  saveHistory(reportData) {
    const userId = this.currentUser ? this.currentUser.id : "user_shin";
    const userKey = `childfund_interview_sessions_${userId}`;

    const storableReport = {
      ...reportData,
      candidateId: userId,
      candidateName: this.currentUser ? this.currentUser.name : "신지애 팀장",
      answers: reportData.answers.map(a => ({
        ...a,
        audioBlobUrl: null
      }))
    };
    this.historySessions.push(storableReport);
    localStorage.setItem(userKey, JSON.stringify(this.historySessions));
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

  // Setup Voices for Male and Female Interviewers
  setupVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      const koVoices = voices.filter(v => v.lang === "ko-KR" || v.lang.startsWith("ko"));

      // 브라우저에 등록된 음성 중 남성/여성 탐색
      this.femaleVoice = koVoices.find(v => 
        v.name.toLowerCase().includes("female") || 
        v.name.includes("여성") || 
        v.name.includes("Yuna") || 
        v.name.includes("Suni") ||
        v.name.includes("Heami")
      );

      this.maleVoice = koVoices.find(v => 
        v.name.toLowerCase().includes("male") || 
        v.name.includes("남성") || 
        v.name.includes("InJoon") || 
        v.name.includes("MinHo")
      );

      this.fallbackVoice = koVoices[0] || voices[0];

      // 만약 시스템에 남/여 분리 보이스가 별도로 없다면 기본 보이스 기반 피치(Pitch) 차별화 적용
      if (!this.femaleVoice) this.femaleVoice = this.fallbackVoice;
      if (!this.maleVoice) this.maleVoice = this.fallbackVoice;
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Speak interviewer question with gender and persona pitch/rate
  speakQuestion(questionObj) {
    if (!this.sessionState.ttsEnabled || !this.synth) return;
    this.synth.cancel(); // Stop any previous speech

    const panelInfo = INTERVIEW_PANEL[questionObj.panel] || INTERVIEW_PANEL.CEO;
    const utterance = new SpeechSynthesisUtterance(questionObj.question);
    
    // Choose Voice by Gender
    if (panelInfo.gender === "female" && this.femaleVoice) {
      utterance.voice = this.femaleVoice;
    } else if (panelInfo.gender === "male" && this.maleVoice) {
      utterance.voice = this.maleVoice;
    } else if (this.fallbackVoice) {
      utterance.voice = this.fallbackVoice;
    }

    utterance.lang = "ko-KR";
    utterance.pitch = panelInfo.voicePitch || (panelInfo.gender === "female" ? 1.2 : 0.85);
    utterance.rate = panelInfo.voiceRate || 1.0;

    // Highlight interviewer card
    this.highlightInterviewer(panelInfo.id, true);

    utterance.onend = () => {
      this.highlightInterviewer(panelInfo.id, false);
      // Auto-start STT & Recorder if enabled
      if (this.sessionState.sttEnabled && !this.isRecognizing) {
        this.startAnsweringProcess();
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
    // Theme & Font
    document.getElementById("btn-theme-toggle").addEventListener("click", () => this.toggleTheme());
    document.getElementById("btn-font-md").addEventListener("click", () => this.applyFontSize("md"));
    document.getElementById("btn-font-lg").addEventListener("click", () => this.applyFontSize("lg"));
    document.getElementById("btn-font-xl").addEventListener("click", () => this.applyFontSize("xl"));

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
    document.getElementById("btn-copy-url").addEventListener("click", () => this.copyAppUrl());

    // User Modal Backdrop Click
    const userModal = document.getElementById("user-modal");
    if (userModal) {
      userModal.addEventListener("click", (e) => {
        if (e.target === userModal) this.closeUserModal();
      });
    }
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
    const diffRadio = document.querySelector('input[name="difficulty"]:checked');
    this.sessionState.difficulty = diffRadio ? parseInt(diffRadio.value) : 3;
    this.sessionState.totalQuestions = parseInt(document.getElementById("q-count").value) || 12;
    this.sessionState.ttsEnabled = document.getElementById("toggle-tts").checked;
    this.sessionState.sttEnabled = document.getElementById("toggle-stt").checked;
    this.sessionState.recordAudioEnabled = document.getElementById("toggle-record-audio").checked;
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
      this.stopAnsweringProcess();
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
    const genderPill = document.getElementById("current-gender-pill");
    if (genderPill) {
      genderPill.textContent = panelInfo.gender === "female" ? "여성 음성" : "남성 음성";
      genderPill.className = `gender-pill ${panelInfo.gender}`;
    }

    document.getElementById("current-category-tag").textContent = qObj.category;
    document.getElementById("current-diff-tag").textContent = `Level ${qObj.difficulty}`;
    
    // Question Text Display (텍스트로도 크고 선명하게 써줌)
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

    // Hide Audio Preview for new question
    const audioPreview = document.getElementById("answer-audio-preview");
    if (audioPreview) audioPreview.style.display = "none";
    this.currentAudioBlobUrl = null;

    // Reset Answer Text Area
    const txtArea = document.getElementById("txt-candidate-answer");
    txtArea.value = "";
    this.updateCharCount();

    // Trigger TTS
    this.speakQuestion(qObj);
  }

  // Start Real Audio Recording & Speech Recognition
  async startAnsweringProcess() {
    if (this.recognition && !this.isRecognizing) {
      try {
        this.recognition.start();
      } catch (e) {}
    }

    // Real Audio Recording with MediaRecorder
    if (this.sessionState.recordAudioEnabled && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.currentAudioBlobUrl = URL.createObjectURL(audioBlob);
          const player = document.getElementById("recorded-audio-player");
          const preview = document.getElementById("answer-audio-preview");
          if (player && preview) {
            player.src = this.currentAudioBlobUrl;
            preview.style.display = "flex";
          }
          // Stop stream tracks
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        const liveInd = document.getElementById("recording-live-indicator");
        if (liveInd) liveInd.style.display = "inline-block";
      } catch (err) {
        console.warn("Audio recording permission or device not available:", err);
      }
    }
  }

  stopAnsweringProcess() {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    const liveInd = document.getElementById("recording-live-indicator");
    if (liveInd) liveInd.style.display = "none";
  }

  // Mic Toggle Button
  toggleMic() {
    if (this.isRecognizing || (this.mediaRecorder && this.mediaRecorder.state === "recording")) {
      this.stopAnsweringProcess();
    } else {
      this.startAnsweringProcess();
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
    this.stopAnsweringProcess();
    if (this.synth) this.synth.cancel();

    const currentQ = this.sessionState.questions[this.sessionState.currentIndex];
    const answerText = document.getElementById("txt-candidate-answer").value.trim();

    // Evaluate Answer
    const evalResult = evaluateAnswer(answerText, currentQ);

    // Save Answer Record with Recorded Audio
    this.sessionState.answers.push({
      questionIndex: this.sessionState.currentIndex + 1,
      question: currentQ,
      answerText: answerText,
      audioBlobUrl: this.currentAudioBlobUrl,
      evalResult: evalResult,
      timestamp: new Date().toLocaleTimeString()
    });

    // Check if Follow-up required (Level 4~5에서 꼬리질문 발동)
    if (this.sessionState.difficulty >= 4 && currentQ.followUp && Math.random() < 0.4 && !currentQ._isFollowUp) {
      const followUpQ = {
        id: currentQ.id + 1000,
        qNumber: `${currentQ.qNumber}-꼬리질문`,
        category: `[심층 꼬리질문] ${currentQ.category}`,
        panel: currentQ.panel,
        difficulty: 5,
        question: currentQ.followUp,
        keywords: currentQ.keywords.slice(0, 3),
        idealPoints: ["원칙에 부합하는 소신 답변", "아동의 안전과 기관 규정을 일관되게 고수"],
        _isFollowUp: true
      };
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
    this.stopAnsweringProcess();
    if (this.synth) this.synth.cancel();

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

      const audioPlaybackHtml = item.audioBlobUrl ? `
        <div style="margin: 10px 0;">
          <span style="font-size:0.82rem; font-weight:600; color:var(--primary);">🎧 내 실제 답변 음성 다시듣기:</span>
          <audio controls src="${item.audioBlobUrl}" style="width: 100%; height: 36px; margin-top: 4px;"></audio>
        </div>
      ` : '';

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
            ${audioPlaybackHtml}

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

  // Copy App Web URL
  copyAppUrl() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert("🔗 면접 연습 프로그램 접속 주소가 클립보드에 복사되었습니다!\n스마트폰 카카오톡이나 메모장에 붙여넣어 언제든지 접속하세요:\n" + url);
      });
    } else {
      prompt("아래 주소를 복사하여 스마트폰이나 다른 기기에서 접속하세요:", url);
    }
  }
}

// Global App Instance
let app;
window.addEventListener("DOMContentLoaded", () => {
  app = new InterviewSimulator();
});
