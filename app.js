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
    
    // Male & Female Voice Maps & Gemini Neural TTS Audio Cache
    this.maleVoice = null;
    this.femaleVoice = null;
    this.fallbackVoice = null;
    this.ttsAudioCache = new Map();
    this.currentTtsAudio = null;
    this.ttsRequestId = 0;

    // Media Recorder (실제 오디오 녹음기) & Web Audio API Visualizer
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.currentAudioBlobUrl = null;
    this.audioContext = null;
    this.analyser = null;
    this.visualizerAnimationId = null;

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
    this.recognitionSupported = !!SpeechRecognition;
    this.accumulatedTranscript = "";

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "ko-KR";

        this.recognition.onstart = () => {
          this.isRecognizing = true;
          this.updateMicUI(true);
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              this.accumulatedTranscript += (this.accumulatedTranscript ? " " : "") + transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const txtArea = document.getElementById("txt-candidate-answer");
          if (txtArea) {
            const fullText = (this.accumulatedTranscript + (interimTranscript ? " " + interimTranscript : "")).trim();
            txtArea.value = fullText;
            this.updateCharCount();
          }
        };

        this.recognition.onerror = (event) => {
          console.warn("Speech recognition notice:", event.error);
          const ind = document.getElementById("stt-status-indicator");
          if (event.error === "not-allowed") {
            if (ind) ind.textContent = "⚠️ 마이크 권한이 차단되었습니다. 브라우저 주소창 좌측에서 마이크를 허용해 주세요.";
          } else if (event.error === "no-speech") {
            // Keep waiting for user speech
          }
        };

        this.recognition.onend = () => {
          this.isRecognizing = false;
          // 사용자가 명시적으로 중지하지 않았고 여전히 녹음 중이라면 (특히 모바일/크롬에서 침묵 시 자동종료 방지) 자동 재연결
          if (this.isAnsweringActive && this.sessionState.sttEnabled) {
            try {
              this.recognition.start();
            } catch (e) {}
          } else {
            this.updateMicUI(false);
          }
        };
      } catch (err) {
        console.warn("SpeechRecognition init failed:", err);
      }
    } else {
      console.warn("Web Speech Recognition not supported in this browser.");
      const ind = document.getElementById("stt-status-indicator");
      if (ind) ind.textContent = "🎙️ 음성 녹음 전용 모드 (iOS Safari는 실제 음성 녹음 및 키보드 입력 지원)";
    }
  }

  // Setup High-Quality Natural Voices for Male and Female Interviewers (Fallback Engine)
  setupVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      const koVoices = voices.filter(v => v.lang === "ko-KR" || v.lang.startsWith("ko"));

      // 보이스 자연스러움(Natural/Online/Neural) 우선순위 점수 계산 함수
      const scoreVoice = (v, targetGender) => {
        let score = 0;
        const n = v.name;
        const nl = n.toLowerCase();

        // 1순위: Microsoft Natural Online / Neural 고품질 음성 (까칠함이 전혀 없는 아나운서급 보이스)
        if (nl.includes("natural") || nl.includes("online") || nl.includes("neural")) score += 100;
        if (nl.includes("google")) score += 60;
        if (nl.includes("apple") || nl.includes("siri") || n.includes("Yuna") || n.includes("Sora")) score += 50;

        if (targetGender === "female") {
          if (n.includes("SunHi") || n.includes("선희")) score += 50;
          if (n.includes("SeoHyeon") || n.includes("서현") || n.includes("SoonBok")) score += 45;
          if (n.includes("Yuna") || n.includes("유나") || n.includes("Sora") || n.includes("소라")) score += 40;
          if (nl.includes("female") || n.includes("여성")) score += 30;
          if (n.includes("Heami") || n.includes("혜미")) score += 10; // 구형 데스크톱 음성은 후순위
        } else {
          if (n.includes("InJoon") || n.includes("인준")) score += 50;
          if (n.includes("BongJin") || n.includes("봉진") || n.includes("GookMin") || n.includes("국민")) score += 45;
          if (n.includes("MinHo") || n.includes("민호")) score += 40;
          if (nl.includes("male") || n.includes("남성")) score += 30;
        }
        return score;
      };

      if (koVoices.length > 0) {
        const sortedFemale = [...koVoices].sort((a, b) => scoreVoice(b, "female") - scoreVoice(a, "female"));
        const sortedMale = [...koVoices].sort((a, b) => scoreVoice(b, "male") - scoreVoice(a, "male"));
        this.femaleVoice = sortedFemale[0];
        this.maleVoice = sortedMale[0];
        this.fallbackVoice = sortedFemale[0] || koVoices[0];
      } else {
        this.fallbackVoice = voices[0] || null;
        this.femaleVoice = this.fallbackVoice;
        this.maleVoice = this.fallbackVoice;
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Stop any ongoing speech (both Gemini Neural Audio and Web Speech Synthesis)
  stopSpeaking() {
    this.ttsRequestId++;
    if (this.currentTtsAudio) {
      try {
        this.currentTtsAudio.pause();
        this.currentTtsAudio.currentTime = 0;
      } catch (e) {}
      this.currentTtsAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    document.querySelectorAll(".panel-chair").forEach(el => el.classList.remove("active-speaker"));
  }

  // Convert 24kHz 16-bit Mono Linear PCM Base64 from Gemini TTS to playable WAV Blob URL
  pcm16Base64ToWavUrl(base64Pcm, sampleRate = 24000) {
    const binaryStr = atob(base64Pcm);
    const pcmLen = binaryStr.length;
    const wavBuffer = new ArrayBuffer(44 + pcmLen);
    const view = new DataView(wavBuffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF WAV Header (16-bit Mono PCM)
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcmLen, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);           // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);  // SampleRate (24000 Hz)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);           // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true);          // BitsPerSample (16 bits)
    writeStr(36, "data");
    view.setUint32(40, pcmLen, true);      // Subchunk2Size

    const uint8 = new Uint8Array(wavBuffer, 44);
    for (let i = 0; i < pcmLen; i++) {
      uint8[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([wavBuffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }

  // Request Ultra-Natural Human-Like Speech from Google Gemini 2.5 Neural TTS
  async fetchGeminiNeuralTtsUrl(questionObj, panelInfo) {
    const cacheKey = `${questionObj.panel}_${questionObj.id}_${questionObj.question.slice(0, 30)}`;
    if (this.ttsAudioCache.has(cacheKey)) {
      return this.ttsAudioCache.get(cacheKey);
    }

    if (typeof geminiEvaluator === "undefined" || !geminiEvaluator.getApiKey) return null;
    const apiKey = geminiEvaluator.getApiKey();
    if (!apiKey) return null;

    const voiceName = panelInfo.geminiVoice || (panelInfo.gender === "female" ? "Aoede" : "Charon");
    const styleGuide = panelInfo.voicePrompt || "따뜻하고 부드러우며 귀에 편안하게 들리는 아나운서 목소리로 천천히 자연스럽게 질문해 주세요: ";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const ttsModels = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];

    try {
      for (const ttsModel of ttsModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${styleGuide}${questionObj.question}` }] }],
                generationConfig: {
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName }
                    }
                  }
                }
              })
            }
          );

          if (!response.ok) continue;
          const data = await response.json();
          const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (!inlineData || !inlineData.data) continue;

          clearTimeout(timeoutId);
          const wavUrl = this.pcm16Base64ToWavUrl(inlineData.data, 24000);
          this.ttsAudioCache.set(cacheKey, wavUrl);
          return wavUrl;
        } catch (innerErr) {
          // try next TTS model
        }
      }
      clearTimeout(timeoutId);
      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  // Pre-fetch next question's neural voice in the background for 0ms instant playback
  prefetchNextQuestionAudio(nextIndex) {
    if (!this.sessionState.ttsEnabled || !this.sessionState.questions) return;
    if (nextIndex >= this.sessionState.questions.length) return;
    const nextQ = this.sessionState.questions[nextIndex];
    if (!nextQ) return;
    const panelInfo = INTERVIEW_PANEL[nextQ.panel] || INTERVIEW_PANEL.CEO;
    this.fetchGeminiNeuralTtsUrl(nextQ, panelInfo).catch(() => {});
  }

  // Speak interviewer question using Gemini Neural Voice (Primary) or Warm Natural Web Speech (Fallback)
  async speakQuestion(questionObj) {
    if (!this.sessionState.ttsEnabled) return;
    this.stopSpeaking();

    const currentReqId = this.ttsRequestId;
    const panelInfo = INTERVIEW_PANEL[questionObj.panel] || INTERVIEW_PANEL.CEO;
    const replayBtn = document.getElementById("btn-replay-tts");

    // Highlight interviewer card immediately
    this.highlightInterviewer(panelInfo.id, true);
    if (replayBtn) replayBtn.textContent = "🔊 부드러운 음성 연결 중...";

    // 1순위: Google Gemini 2.5 Neural TTS (아나운서급 따뜻하고 편안한 육성)
    const neuralWavUrl = await this.fetchGeminiNeuralTtsUrl(questionObj, panelInfo);
    if (currentReqId !== this.ttsRequestId) return; // 다른 질문으로 넘어갔거나 중지된 경우 무시

    if (neuralWavUrl) {
      try {
        if (replayBtn) replayBtn.textContent = "🔊 질문 다시 듣기";
        const audio = new Audio(neuralWavUrl);
        audio.volume = 0.95;
        this.currentTtsAudio = audio;

        audio.onended = () => {
          if (currentReqId !== this.ttsRequestId) return;
          this.highlightInterviewer(panelInfo.id, false);
          this.currentTtsAudio = null;
          if (this.sessionState.sttEnabled && !this.isRecognizing && !this.sessionState.isPaused) {
            this.startAnsweringProcess();
          }
        };

        audio.onerror = () => {
          if (currentReqId !== this.ttsRequestId) return;
          this.currentTtsAudio = null;
          this.speakWithWebSpeechFallback(questionObj, panelInfo, currentReqId);
        };

        await audio.play();
        return;
      } catch (playErr) {
        this.currentTtsAudio = null;
      }
    }

    // 2순위: 브라우저 고품질 Natural Web Speech API 폴백 (피치 왜곡 제거 & 부드러운 호흡 조율)
    if (replayBtn) replayBtn.textContent = "🔊 질문 다시 듣기";
    this.speakWithWebSpeechFallback(questionObj, panelInfo, currentReqId);
  }

  // Warm, Unhurried Web Speech Fallback (No metallic pitch distortion)
  speakWithWebSpeechFallback(questionObj, panelInfo, reqId) {
    if (!this.synth || reqId !== this.ttsRequestId) return;
    this.synth.cancel();

    // 문장 사이 호흡이 자연스럽고 편안하게 이어지도록 쉼표/마침표 뒤 미세 여백 정리
    const comfortableText = questionObj.question
      .replace(/\s+/g, " ")
      .replace(/([.?!])\s*/g, "$1  ");

    const utterance = new SpeechSynthesisUtterance(comfortableText);

    if (panelInfo.gender === "female" && this.femaleVoice) {
      utterance.voice = this.femaleVoice;
    } else if (panelInfo.gender === "male" && this.maleVoice) {
      utterance.voice = this.maleVoice;
    } else if (this.fallbackVoice) {
      utterance.voice = this.fallbackVoice;
    }

    utterance.lang = "ko-KR";
    // 피치를 과도하게 꺾으면 기계음/까칠함이 발생하므로 0.96 ~ 1.04 이내의 가장 자연스러운 육성 대역 유지
    utterance.pitch = panelInfo.voicePitch || (panelInfo.gender === "female" ? 1.02 : 0.96);
    // 다그치듯 빠르지 않고 편안하게 들리는 속도 (0.92 ~ 0.94)
    utterance.rate = panelInfo.voiceRate || 0.93;
    utterance.volume = 0.95;

    this.highlightInterviewer(panelInfo.id, true);

    utterance.onend = () => {
      if (reqId !== this.ttsRequestId) return;
      this.highlightInterviewer(panelInfo.id, false);
      if (this.sessionState.sttEnabled && !this.isRecognizing && !this.sessionState.isPaused) {
        this.startAnsweringProcess();
      }
    };

    utterance.onerror = () => {
      if (reqId !== this.ttsRequestId) return;
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

    // Mic Buttons (Start & Stop)
    document.getElementById("btn-toggle-mic").addEventListener("click", () => this.startAnsweringProcess());
    const btnStopMic = document.getElementById("btn-stop-mic");
    if (btnStopMic) {
      btnStopMic.addEventListener("click", () => this.stopAnsweringProcess());
    }

    // Replay TTS
    document.getElementById("btn-replay-tts").addEventListener("click", () => {
      const currentQ = this.sessionState.questions[this.sessionState.currentIndex];
      if (currentQ) this.speakQuestion(currentQ);
    });

    // Next Question Button
    document.getElementById("btn-submit-answer").addEventListener("click", () => this.submitAnswerAndNext());

    // Answer text counter & sync manual edits with STT buffer
    document.getElementById("txt-candidate-answer").addEventListener("input", (e) => {
      this.accumulatedTranscript = e.target.value;
      this.updateCharCount();
    });

    // View History Button
    document.getElementById("btn-view-history").addEventListener("click", () => this.showView("view-history-dash"));
    document.getElementById("btn-back-to-setup").addEventListener("click", () => this.showView("view-setup"));

    // Report Actions
    document.getElementById("btn-retry-interview").addEventListener("click", () => this.showView("view-setup"));
    document.getElementById("btn-print-report").addEventListener("click", () => window.print());
    document.getElementById("btn-export-json").addEventListener("click", () => this.exportHistoryJSON());
    document.getElementById("btn-copy-url").addEventListener("click", () => this.copyAppUrl());
    
    // GitHub Open-Source html2pdf.js Integration for 1-Click High-Res PDF Export
    const btnDownloadPdf = document.getElementById("btn-download-pdf");
    if (btnDownloadPdf) {
      btnDownloadPdf.addEventListener("click", () => this.downloadPdfReport());
    }

    // User Modal Backdrop Click
    const userModal = document.getElementById("user-modal");
    if (userModal) {
      userModal.addEventListener("click", (e) => {
        if (e.target === userModal) this.closeUserModal();
      });
    }
  }

  // 1-Click Professional PDF Report Export via html2pdf.js
  downloadPdfReport() {
    if (typeof html2pdf === "undefined") {
      alert("PDF 모듈을 불러오는 중입니다. 브라우저 인쇄 창으로 연결합니다.");
      window.print();
      return;
    }

    const reportElement = document.getElementById("view-report");
    if (!reportElement) return;

    const candidateName = this.currentUser ? this.currentUser.name.replace(/\s+/g, "_") : "신지애팀장";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `초록우산_기관장승진_심사보고서_${candidateName}_${dateStr}.pdf`;

    const exportBar = document.querySelector(".report-export-bar");
    if (exportBar) exportBar.style.display = "none";

    const opt = {
      margin: [10, 10, 10, 10],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(reportElement).save().then(() => {
      if (exportBar) exportBar.style.display = "flex";
    }).catch(err => {
      console.error("PDF generation notice:", err);
      if (exportBar) exportBar.style.display = "flex";
      window.print();
    });
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
  async startInterview() {
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

    // 사용자 제스처(시작 버튼 클릭) 시점에 미리 마이크 권한을 승인받아 브라우저 정책 차단 방지
    if ((this.sessionState.recordAudioEnabled || this.sessionState.sttEnabled) && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (!this.audioStream || !this.audioStream.active) {
          this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (err) {
        console.warn("초기 마이크 권한 요청 알림 (사용자 거부 또는 미지원):", err);
      }
    }

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
      if (this.currentTtsAudio && !this.currentTtsAudio.paused) {
        try { this.currentTtsAudio.pause(); } catch (e) {}
      }
      if (this.synth) this.synth.pause();
      this.stopAnsweringProcess();
      btnText.textContent = "면접 재개";
      btnIcon.textContent = "▶";
    } else {
      if (this.currentTtsAudio && this.currentTtsAudio.paused) {
        try { this.currentTtsAudio.play(); } catch (e) {}
      }
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
      genderPill.textContent = panelInfo.gender === "female" ? "여성 음성 (부드러운 톤)" : "남성 음성 (편안한 톤)";
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
    this.audioChunks = [];
    this.accumulatedTranscript = "";

    // Reset Answer Text Area
    const txtArea = document.getElementById("txt-candidate-answer");
    txtArea.value = "";
    this.updateCharCount();

    // Update Answer Box User Title
    const userTitle = document.getElementById("lbl-answer-user-title");
    if (userTitle) {
      userTitle.textContent = `${this.currentUser ? this.currentUser.name : "신지애 팀장"} 답변석`;
    }

    // Reset Mic UI to idle
    this.stopAnsweringProcess();

    // Trigger TTS & Pre-fetch next question's neural audio in background
    this.speakQuestion(qObj);
    this.prefetchNextQuestionAudio(index + 1);
  }

  // Start Real Audio Recording & Speech Recognition
  async startAnsweringProcess() {
    this.isAnsweringActive = true;
    const ind = document.getElementById("stt-status-indicator");
    const liveInd = document.getElementById("recording-live-indicator");
    const visualBar = document.getElementById("recording-visual-bar");

    // 1. Web Speech Recognition STT 활성화
    if (this.recognition && this.sessionState.sttEnabled) {
      try {
        if (!this.isRecognizing) {
          this.recognition.start();
        }
      } catch (e) {
        console.warn("STT start retry:", e);
      }
    }

    // 2. Real Audio Recording with MediaRecorder (iOS Safari, Android Chrome, PC 완벽 호환)
    if (this.sessionState.recordAudioEnabled && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (!this.audioStream || !this.audioStream.active) {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        }

        this.audioChunks = [];

        // iOS Safari 및 구형 브라우저 대응 MIME 타입 탐색
        let mimeType = 'audio/webm';
        if (typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4'; // iOS Safari 최적 포맷
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            mimeType = 'audio/aac';
          } else {
            mimeType = ''; // 브라우저 기본값
          }
        }

        const options = mimeType ? { mimeType } : {};
        this.mediaRecorder = new MediaRecorder(this.audioStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          if (this.audioChunks.length > 0) {
            const actualMime = this.mediaRecorder.mimeType || mimeType || 'audio/webm';
            const audioBlob = new Blob(this.audioChunks, { type: actualMime });
            this.currentAudioBlobUrl = URL.createObjectURL(audioBlob);
            
            const player = document.getElementById("recorded-audio-player");
            const preview = document.getElementById("answer-audio-preview");
            if (player && preview) {
              player.src = this.currentAudioBlobUrl;
              preview.style.display = "flex";
            }
          }
        };

        // 300ms 단위로 오디오 청크 분할 수집 (데이터 유실 방지)
        this.mediaRecorder.start(300);

        // 녹음 진행 타이머 시작
        this.recordingSeconds = 0;
        clearInterval(this.recordingTimerInterval);
        this.recordingTimerInterval = setInterval(() => {
          this.recordingSeconds++;
          const m = String(Math.floor(this.recordingSeconds / 60)).padStart(2, '0');
          const s = String(this.recordingSeconds % 60).padStart(2, '0');
          const timerEl = document.getElementById("lbl-recording-time");
          if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);

        if (liveInd) {
          liveInd.style.display = "inline-flex";
        }
        if (visualBar) {
          visualBar.style.display = "flex";
        }
        // Start live frequency visualizer on canvas
        this.startCanvasVisualizer(this.audioStream);
        this.updateMicUI(true);
      } catch (err) {
        console.warn("마이크 접근 또는 Audio 녹음기 실행 오류:", err);
        if (ind) {
          ind.textContent = "⚠️ 마이크 권한을 허용해 주세요 (브라우저 주소창 설정 확인)";
        }
        this.updateMicUI(false);
      }
    } else {
      this.updateMicUI(true);
    }
  }

  // Web Audio API Realtime Mic Frequency Bar Visualizer on HTML5 Canvas
  startCanvasVisualizer(stream) {
    const canvas = document.getElementById("canvas-mic-visualizer");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!this.isAnsweringActive) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        this.visualizerAnimationId = requestAnimationFrame(draw);
        this.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.6;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          const barHeight = Math.max(3, (val / 255) * canvas.height * 0.95);
          ctx.fillStyle = val > 120 ? '#10b981' : (val > 40 ? '#008450' : 'rgba(0, 132, 80, 0.4)');
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      };

      if (this.visualizerAnimationId) cancelAnimationFrame(this.visualizerAnimationId);
      draw();
    } catch (e) {
      console.warn("Visualizer init notice:", e);
    }
  }

  stopCanvasVisualizer() {
    if (this.visualizerAnimationId) {
      cancelAnimationFrame(this.visualizerAnimationId);
      this.visualizerAnimationId = null;
    }
    const canvas = document.getElementById("canvas-mic-visualizer");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  stopAnsweringProcess() {
    this.isAnsweringActive = false;
    clearInterval(this.recordingTimerInterval);
    this.stopCanvasVisualizer();

    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    const liveInd = document.getElementById("recording-live-indicator");
    if (liveInd) {
      liveInd.style.display = "none";
    }

    const visualBar = document.getElementById("recording-visual-bar");
    if (visualBar) {
      visualBar.style.display = "none";
    }

    this.updateMicUI(false);

    // MediaRecorder가 작동 중이라면 stop 완료 후 Blob URL이 생성될 때까지 비동기 대기
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        const prevOnStop = this.mediaRecorder.onstop;
        this.mediaRecorder.onstop = (e) => {
          if (prevOnStop) prevOnStop(e);
          resolve();
        };
        try {
          this.mediaRecorder.stop();
        } catch (err) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  // Mic Toggle Button
  toggleMic() {
    if (this.isAnsweringActive || this.isRecognizing || (this.mediaRecorder && this.mediaRecorder.state === "recording")) {
      this.stopAnsweringProcess();
    } else {
      this.startAnsweringProcess();
    }
  }

  updateMicUI(isListening) {
    const btnStart = document.getElementById("btn-toggle-mic");
    const btnStop = document.getElementById("btn-stop-mic");
    const ind = document.getElementById("stt-status-indicator");

    if (isListening) {
      if (btnStart) btnStart.style.display = "none";
      if (btnStop) btnStop.style.display = "inline-flex";
      if (ind) {
        ind.textContent = "🎙️ 실시간 음성 듣는 중... (소리 내어 말씀하시면 글자로 써집니다)";
        ind.classList.add("listening");
      }
    } else {
      if (btnStart) btnStart.style.display = "inline-flex";
      if (btnStop) btnStop.style.display = "none";
      if (ind) {
        ind.textContent = "마이크 대기 중 (답변을 시작하려면 [음성 답변 시작] 클릭)";
        ind.classList.remove("listening");
      }
    }
  }

  updateCharCount() {
    const txtArea = document.getElementById("txt-candidate-answer");
    const count = txtArea ? txtArea.value.length : 0;
    document.getElementById("lbl-char-count").textContent = count;
  }

  // Preview interviewer's comfortable voice from Setup Lobby with interactive feedback
  previewInterviewerVoice(panelKey) {
    const panelInfo = INTERVIEW_PANEL[panelKey] || INTERVIEW_PANEL.CEO;
    const sampleGreetings = {
      CEO: "반갑습니다, 신지애 팀장님. 오늘 면접에 오신 것을 환영합니다. 긴장하지 마시고, 그동안 현장에서 쌓아오신 경험과 기관장으로서의 비전을 편안하게 말씀해 주시기 바랍니다.",
      EXEC_DIRECTOR: "안녕하세요, 박서진 이사입니다. 경기남부센터에서 보여주신 가정위탁 사업 성과가 인상 깊었습니다. 오늘 준비하신 생각들을 차분하고 편안하게 들려주세요.",
      HR_DIRECTOR: "반갑습니다, 인사기획팀장 김태호입니다. 동료들과 함께 호흡하며 느끼셨던 리더십과 조직 운영의 지혜를 편안한 마음으로 이야기해 주시면 됩니다.",
      EXTERNAL_EXAMINER: "안녕하세요, 외부 면접위원 이선우 교수입니다. 아동의 권리와 복지 현장의 발전을 위해 함께 고민하는 자리이니, 평소 소신을 자연스럽게 말씀해 주세요."
    };
    const sampleQ = {
      id: `preview_${panelKey}`,
      panel: panelKey,
      question: sampleGreetings[panelKey] || sampleGreetings.CEO
    };

    // If currently speaking this audio, stop it
    if (this.currentTtsAudio && !this.currentTtsAudio.paused) {
      this.stopSpeaking();
      return;
    }

    const prevTts = this.sessionState.ttsEnabled;
    const prevStt = this.sessionState.sttEnabled;
    this.sessionState.ttsEnabled = true;
    this.sessionState.sttEnabled = false;

    this.speakQuestion(sampleQ).finally(() => {
      this.sessionState.ttsEnabled = prevTts;
      this.sessionState.sttEnabled = prevStt;
    });
  }

  // Submit Answer & Evaluate
  async submitAnswerAndNext() {
    await this.stopAnsweringProcess();
    this.stopSpeaking();

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

    // Check if Follow-up required (난이도별 동적 꼬리질문 확률: L1=0%, L2=15%, L3=30%, L4=50%, L5=75%)
    const followUpProbMap = { 1: 0.0, 2: 0.15, 3: 0.30, 4: 0.50, 5: 0.75 };
    const followUpProb = followUpProbMap[this.sessionState.difficulty] ?? 0.30;

    if (currentQ.followUp && Math.random() < followUpProb && !currentQ._isFollowUp) {
      const followUpQ = {
        id: currentQ.id + 10000,
        qNumber: `${currentQ.qNumber}-꼬리질문`,
        category: `[심층 꼬리질문] ${currentQ.category}`,
        panel: currentQ.panel,
        difficulty: Math.min(5, (currentQ.difficulty || 3) + 1),
        question: currentQ.followUp,
        keywords: currentQ.keywords ? currentQ.keywords.slice(0, 3) : ["원칙 준수", "아동 안전", "신속한 대처"],
        idealPoints: currentQ.idealPoints || ["원칙에 부합하는 소신 답변", "아동의 안전과 기관 규정을 일관되게 고수"],
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

  // Finish Interview & Generate Comprehensive Report (중도 완료 및 전체 완료 모두 완벽 지원)
  async finishInterview() {
    clearInterval(this.sessionState.timerInterval);
    this.sessionState.isActive = false;
    await this.stopAnsweringProcess();
    this.stopSpeaking();

    // 현재 작성 중이던 답변이나 녹음된 오디오가 있고 아직 제출되지 않았다면 자동 취합
    const txtArea = document.getElementById("txt-candidate-answer");
    const currentQ = this.sessionState.questions[this.sessionState.currentIndex];
    const currentTxt = txtArea ? txtArea.value.trim() : "";

    // 이미 등록된 답변 수가 현재 인덱스보다 적다면 현재 답변(텍스트 또는 음성녹음) 자동 등록
    if (currentQ && this.sessionState.answers.length <= this.sessionState.currentIndex && (currentTxt.length > 0 || this.currentAudioBlobUrl)) {
      const finalTxt = currentTxt || "(음성 녹음 파일로 답변 제출됨)";
      const evalResult = evaluateAnswer(finalTxt, currentQ);
      this.sessionState.answers.push({
        questionIndex: this.sessionState.currentIndex + 1,
        question: currentQ,
        answerText: finalTxt,
        audioBlobUrl: this.currentAudioBlobUrl,
        evalResult: evalResult,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    const totalCount = this.sessionState.answers.length;
    if (totalCount === 0) {
      alert("아직 작성된 답변이 없습니다. 최소 1문항 이상 답변을 진행한 후 완료해 주세요.");
      return;
    }

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
      plannedCount: this.sessionState.totalQuestions,
      isPartial: totalCount < this.sessionState.totalQuestions,
      finalScore: finalAvg,
      finalGrade: finalGrade,
      commonScores: commonScores,
      leadershipScores: leadershipScores,
      answers: this.sessionState.answers,
      comment: this.generateOverallComment(finalAvg, commonScores, leadershipScores)
    };

    this.currentReportData = reportData;

    // Save to History
    this.saveHistory(reportData);
    this.renderReport(reportData);
    this.showView("view-report");

    // Google Gemini AI 심층 보고서 비동기 생성 트리거
    this.requestGeminiAnalysis(reportData);
  }

  // Google Gemini AI 심층 분석 요청 및 렌더링
  async requestGeminiAnalysis(reportData) {
    const contentBox = document.getElementById("gemini-report-content");
    if (!contentBox) return;

    contentBox.innerHTML = `
      <div class="gemini-loading">
        <span class="spinner"></span>
        <span>Google Gemini AI가 질의응답 ${reportData.questionCount}문항을 팩트체크하여 냉정하게 심층 심사 중입니다...</span>
      </div>
    `;

    try {
      const candidateProfile = {
        name: this.currentUser ? this.currentUser.name : "신지애 팀장",
        center: this.currentUser ? this.currentUser.dept : "경기남부센터",
        currentRank: "3급",
        totalTenure: "23년 8개월"
      };

      const markdownText = await geminiEvaluator.generateGeminiReport(reportData, candidateProfile);
      
      // Render Markdown using marked.js if available, else plain text with line breaks
      if (typeof marked !== 'undefined') {
        contentBox.innerHTML = marked.parse(markdownText);
      } else {
        contentBox.innerHTML = markdownText.replace(/\n/g, "<br>");
      }
    } catch (err) {
      contentBox.innerHTML = `<p style="color:var(--danger);">Gemini 분석 생성 중 오류가 발생했습니다: ${err.message}</p>`;
    }
  }

  promptGeminiApiKey() {
    const currentKey = geminiEvaluator.getApiKey();
    const newKey = prompt("Google Gemini API 키를 입력해 주세요.\n(입력하시면 Google Gemini 1.5/2.0의 실제 AI 심층 분석이 실시간 연동됩니다. 취소하거나 비워두면 초록우산 2026 역량모델 내장 고성능 AI 엔진으로 작동합니다):", currentKey);

    if (newKey !== null) {
      geminiEvaluator.setApiKey(newKey);
      alert(newKey.trim() ? "Gemini API 키가 안전하게 등록되었습니다!" : "API 키가 초기화되었습니다. 내장 AI 심사 엔진으로 작동합니다.");
      if (this.currentReportData) {
        this.requestGeminiAnalysis(this.currentReportData);
      }
    }
  }

  regenerateGeminiAnalysis() {
    if (this.currentReportData) {
      this.requestGeminiAnalysis(this.currentReportData);
    } else {
      alert("재분석할 면접 리포트 데이터가 없습니다.");
    }
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

  // Render Report View & Charts (중도 완료 및 전체 완료 완벽 지원)
  renderReport(reportData) {
    const candidateName = reportData.candidateName || (this.currentUser ? this.currentUser.name : "신지애 팀장");
    const partialNotice = reportData.isPartial ? ` (중도 완료: ${reportData.questionCount}문항 / 계획: ${reportData.plannedCount}문항)` : ` (전체 ${reportData.questionCount}문항 완주)`;

    document.getElementById("report-session-badge").textContent = `제 ${reportData.sessionNumber}회차 실전 모의면접${partialNotice}`;
    document.getElementById("report-date-text").textContent = `${reportData.date} ${reportData.time} | 소요 시간: ${reportData.durationStr} | 평가 진행: ${reportData.questionCount}문항 응답 완료 (난이도 Level ${reportData.difficulty})`;
    document.getElementById("report-final-score").textContent = reportData.finalScore;
    document.getElementById("report-final-grade").textContent = reportData.finalGrade;
    document.getElementById("report-overall-comment").textContent = reportData.comment;
    document.getElementById("report-qa-count").textContent = reportData.questionCount;

    // Render QA Accordion (각 문항별 점수, 응답 전문, 오디오 녹음, 대응 분석 완벽 시각화)
    const qaList = document.getElementById("report-qa-list");
    qaList.innerHTML = reportData.answers.map((item, idx) => {
      const q = item.question;
      const evalR = item.evalResult;
      const matchedBadges = evalR.matchedKeywords.map(k => `<span class="kw-badge matched">✓ ${k}</span>`).join(" ");
      const missingBadges = evalR.missingKeywords.map(k => `<span class="kw-badge missing">✗ ${k}</span>`).join(" ");
      const ana = evalR.analysis || { clarity: 80, competency: 80, evidence: 80, alignment: 80 };

      const audioPlaybackHtml = item.audioBlobUrl ? `
        <div style="margin: 12px 0; background: var(--bg-card); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <span style="font-size:0.9rem; font-weight:700; color:var(--primary);">🎧 내가 답변한 실제 녹음 음성 다시듣기:</span>
          <audio controls src="${item.audioBlobUrl}" style="width: 100%; height: 38px; margin-top: 6px;"></audio>
        </div>
      ` : '';

      return `
        <div class="qa-item ${idx === 0 ? 'expanded' : ''}">
          <div class="qa-item-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="qa-item-title">
              <span class="badge">${q.qNumber}</span>
              <span><strong>${q.question.substring(0, 55)}${q.question.length > 55 ? '...' : ''}</strong></span>
            </div>
            <div class="qa-item-score" style="font-size: 1.15rem; font-weight: 800;">
              ${evalR.score}점 <span class="badge" style="margin-left: 6px;">${evalR.grade}</span>
            </div>
          </div>
          <div class="qa-item-body">
            <div class="qa-block-title">【면접관 전체 질문】</div>
            <p style="font-family: var(--font-serif); font-size: 1.15rem; line-height: 1.6; margin-bottom: 12px;"><strong>${q.question}</strong></p>
            
            <div class="qa-block-title">【${candidateName} 실제 답변 내용 전문】</div>
            <div class="qa-answer-box">${item.answerText || "(녹음 및 입력된 답변 없음)"}</div>
            ${audioPlaybackHtml}

            <!-- 세부 대응 역량 분석 4대 지표 -->
            <div class="qa-block-title">【문항별 세부 대응 역량 지표 분석】</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; background: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <div style="text-align:center;"><span style="font-size:0.82rem; color:var(--text-muted); display:block;">논리 명확성</span><strong style="color:var(--primary); font-size:1.1rem;">${ana.clarity}점</strong></div>
              <div style="text-align:center;"><span style="font-size:0.82rem; color:var(--text-muted); display:block;">역량 적합도</span><strong style="color:#1a56db; font-size:1.1rem;">${ana.competency}점</strong></div>
              <div style="text-align:center;"><span style="font-size:0.82rem; color:var(--text-muted); display:block;">근거 충실도</span><strong style="color:#c29938; font-size:1.1rem;">${ana.evidence}점</strong></div>
              <div style="text-align:center;"><span style="font-size:0.82rem; color:var(--text-muted); display:block;">재단 방향 일치</span><strong style="color:#4f46e5; font-size:1.1rem;">${ana.alignment}점</strong></div>
            </div>

            <!-- 1. 출제 의도 및 채점 잣대 -->
            <div class="qa-block-title">💡 【면접관 출제 의도 및 필수 채점 잣대】</div>
            <div class="qa-intent-box">${evalR.examinerIntent || '초록우산 기관장으로서의 직무 수행 적격성 및 전략적 리더십을 검증합니다.'}</div>

            <!-- 2. 객관적·비판적 심사평 (팀장 관점 vs 기관장 관점 진단) -->
            <div class="qa-block-title">⚠️ 【객관적·비판적 심사평 & '팀장 티' 취약점 진단】</div>
            <div class="qa-critique-box">${evalR.criticalReview || evalR.feedback}</div>

            <!-- 3. 실전 합격 원포인트 모범 답변 스크립트 -->
            <div class="qa-block-title">🏆 【실전 1등 합격 원포인트 모범 답변 스크립트】</div>
            <div class="qa-model-box">${evalR.idealModelScript || '원칙과 기준을 세우고 조직과 끝까지 동행하겠습니다.'}</div>

            <!-- 4. 예상 송곳 꼬리질문 및 철벽 방어 전략 -->
            ${evalR.followUpDefense ? `
              <div class="qa-block-title">🗡️ 【예상 송곳 꼬리질문 & 철벽 방어 가이드】</div>
              <div class="qa-followup-box">${evalR.followUpDefense}</div>
            ` : ''}

            <div class="qa-block-title" style="margin-top: 14px;">【포트폴리오 핵심 키워드 매칭 검증】</div>
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

    // Trigger Passing Celebration Confetti (GitHub Open-Source: catdad/canvas-confetti)
    if (typeof confetti === "function" && reportData.finalScore >= 80) {
      setTimeout(() => {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#008450', '#d97706', '#2563eb', '#10b981', '#f59e0b']
          });
        } catch (e) {}
      }, 400);
    }
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
