/**
 * Parizod Calculator - Application Logic & Engine
 * Features: Standard, Scientific, Unit Converter, Sound FX, History & Themes
 */

(function () {
  'use strict';

  // State Management
  const state = {
    expression: '',
    currentInput: '0',
    justCalculated: false,
    angleMode: 'deg', // 'deg' or 'rad'
    memory: 0,
    soundEnabled: true,
    theme: 'rose-gold',
    history: []
  };

  // DOM Elements
  const mainDisplay = document.getElementById('mainDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const memoryIndicator = document.getElementById('memoryIndicator');
  const degRadIndicator = document.getElementById('degRadIndicator');
  const degRadBtn = document.getElementById('degRadBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyOverlay = document.getElementById('historyOverlay');
  const historyBadge = document.getElementById('historyBadge');
  const historyList = document.getElementById('historyList');
  const soundToggle = document.getElementById('soundToggle');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');
  const themeBtn = document.getElementById('themeBtn');
  const themeMenu = document.getElementById('themeMenu');
  const toast = document.getElementById('toast');
  const calculatorView = document.getElementById('calculatorView');
  const converterView = document.getElementById('converterView');
  const scientificPanel = document.getElementById('scientificPanel');
  const appContainer = document.querySelector('.calculator-app');

  // Web Audio Context for synthesized sound FX (Zero external dependencies)
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.05, gainValue = 0.08) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playClickSound() {
    playTone(720, 'sine', 0.04, 0.06);
  }

  function playSuccessSound() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      playTone(523.25, 'triangle', 0.08, 0.07); // C5
      setTimeout(() => playTone(659.25, 'triangle', 0.1, 0.07), 60); // E5
      setTimeout(() => playTone(783.99, 'triangle', 0.16, 0.08), 120); // G5
    } catch (e) {}
  }

  function playErrorSound() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      playTone(220, 'sawtooth', 0.12, 0.08);
      setTimeout(() => playTone(180, 'sawtooth', 0.15, 0.08), 80);
    } catch (e) {}
  }

  // Toast Notification
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // Formatting Numbers safely
  function formatNumber(num) {
    if (isNaN(num)) return 'Xato';
    if (!isFinite(num)) return 'Cheksiz';

    // Round small floating-point errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
    const fixed = parseFloat(Number(num).toPrecision(12));
    
    // Check if number is very large or very small
    if (Math.abs(fixed) >= 1e12 || (Math.abs(fixed) < 1e-7 && fixed !== 0)) {
      return fixed.toExponential(6);
    }

    const parts = fixed.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  }

  function unformatNumber(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\s+/g, '');
  }

  // Update Display UI
  function updateDisplay() {
    mainDisplay.textContent = state.currentInput;
    expressionDisplay.textContent = state.expression;

    // Adjust font size dynamically if number is too long
    const len = state.currentInput.length;
    if (len > 14) {
      mainDisplay.style.fontSize = '1.5rem';
    } else if (len > 9) {
      mainDisplay.style.fontSize = '1.9rem';
    } else {
      mainDisplay.style.fontSize = '2.5rem';
    }

    // Memory Indicator
    if (state.memory !== 0) {
      memoryIndicator.classList.remove('hidden');
    } else {
      memoryIndicator.classList.add('hidden');
    }

    // Angle mode indicator
    if (degRadIndicator) {
      degRadIndicator.textContent = state.angleMode.toUpperCase();
    }
  }

  // Calculator Input Actions
  function inputDigit(digit) {
    playClickSound();

    if (state.justCalculated) {
      state.currentInput = digit;
      state.expression = '';
      state.justCalculated = false;
    } else if (state.currentInput === '0' || state.currentInput === 'Xato') {
      state.currentInput = digit;
    } else {
      state.currentInput += digit;
    }
    updateDisplay();
  }

  function inputDecimal() {
    playClickSound();

    if (state.justCalculated) {
      state.currentInput = '0.';
      state.expression = '';
      state.justCalculated = false;
      updateDisplay();
      return;
    }

    if (!state.currentInput.includes('.')) {
      state.currentInput += '.';
    }
    updateDisplay();
  }

  function inputOperator(opDisplay, opSymbol) {
    playClickSound();

    const val = state.currentInput;

    if (state.justCalculated) {
      state.expression = val + ' ' + opDisplay + ' ';
      state.currentInput = '0';
      state.justCalculated = false;
    } else {
      if (state.expression.endsWith('+ ') || state.expression.endsWith('- ') ||
          state.expression.endsWith('× ') || state.expression.endsWith('÷ ') ||
          state.expression.endsWith('^ ')) {
        if (state.currentInput === '0') {
          // Replace operator
          state.expression = state.expression.slice(0, -3) + ' ' + opDisplay + ' ';
          updateDisplay();
          return;
        }
      }
      state.expression += (val + ' ' + opDisplay + ' ');
      state.currentInput = '0';
    }
    updateDisplay();
  }

  function clearAll() {
    playClickSound();
    state.expression = '';
    state.currentInput = '0';
    state.justCalculated = false;
    updateDisplay();
  }

  function backspace() {
    playClickSound();
    if (state.justCalculated) {
      clearAll();
      return;
    }
    if (state.currentInput.length > 1) {
      state.currentInput = state.currentInput.slice(0, -1);
    } else {
      state.currentInput = '0';
    }
    updateDisplay();
  }

  function negateNumber() {
    playClickSound();
    if (state.currentInput === '0' || state.currentInput === 'Xato') return;

    if (state.currentInput.startsWith('-')) {
      state.currentInput = state.currentInput.slice(1);
    } else {
      state.currentInput = '-' + state.currentInput;
    }
    updateDisplay();
  }

  function percent() {
    playClickSound();
    const current = parseFloat(state.currentInput);
    if (isNaN(current)) return;

    const res = current / 100;
    state.currentInput = String(res);
    updateDisplay();
  }

  // Factorial helper
  function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Overflow for JS 64-bit float
    if (!Number.isInteger(n)) return NaN;
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  // Scientific Single-Argument Functions
  function executeScientific(action) {
    playClickSound();
    const current = parseFloat(state.currentInput);
    if (isNaN(current) && action !== 'pi' && action !== 'e') return;

    let result = 0;
    let formulaDesc = '';

    switch (action) {
      case 'sin': {
        const angle = state.angleMode === 'deg' ? (current * Math.PI) / 180 : current;
        result = Math.sin(angle);
        // Correct tiny float precision for sin(180) etc.
        if (Math.abs(result) < 1e-15) result = 0;
        formulaDesc = `sin(${current})`;
        break;
      }
      case 'cos': {
        const angle = state.angleMode === 'deg' ? (current * Math.PI) / 180 : current;
        result = Math.cos(angle);
        if (Math.abs(result) < 1e-15) result = 0;
        formulaDesc = `cos(${current})`;
        break;
      }
      case 'tan': {
        const angle = state.angleMode === 'deg' ? (current * Math.PI) / 180 : current;
        if (Math.abs(Math.cos(angle)) < 1e-15) {
          result = NaN;
        } else {
          result = Math.tan(angle);
          if (Math.abs(result) < 1e-15) result = 0;
        }
        formulaDesc = `tan(${current})`;
        break;
      }
      case 'log':
        if (current <= 0) result = NaN;
        else result = Math.log10(current);
        formulaDesc = `log(${current})`;
        break;
      case 'ln':
        if (current <= 0) result = NaN;
        else result = Math.log(current);
        formulaDesc = `ln(${current})`;
        break;
      case 'sqrt':
        if (current < 0) result = NaN;
        else result = Math.sqrt(current);
        formulaDesc = `√(${current})`;
        break;
      case 'sqr':
        result = Math.pow(current, 2);
        formulaDesc = `sqr(${current})`;
        break;
      case 'inv':
        if (current === 0) result = NaN;
        else result = 1 / current;
        formulaDesc = `1/(${current})`;
        break;
      case 'fact':
        result = factorial(current);
        formulaDesc = `${current}!`;
        break;
      case 'pi':
        state.currentInput = String(Math.PI);
        updateDisplay();
        return;
      case 'e':
        state.currentInput = String(Math.E);
        updateDisplay();
        return;
      default:
        return;
    }

    if (isNaN(result) || !isFinite(result)) {
      playErrorSound();
      state.currentInput = 'Xato';
      state.expression = formulaDesc;
      state.justCalculated = true;
    } else {
      const cleanResult = parseFloat(Number(result).toPrecision(12));
      addHistory(formulaDesc, cleanResult);
      state.currentInput = String(cleanResult);
      state.expression = formulaDesc + ' =';
      state.justCalculated = true;
    }
    updateDisplay();
  }

  // Safe Math Expression Evaluator
  function evaluateExpression() {
    let fullExpr = state.expression + state.currentInput;
    if (!fullExpr || fullExpr.trim() === '') return;

    // Convert display operators to JS mathematical operators
    let parsed = fullExpr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    // Remove dangling operators at end
    parsed = parsed.trim().replace(/[\+\-\*\/\%]$/, '');

    try {
      // Validate that only safe math characters exist
      if (!/^[0-9\.\+\-\*\/\(\)\%\s\*\*eE]+$/.test(parsed)) {
        throw new Error('Noto\'g\'ri belgi');
      }

      // Safe evaluation using Function
      const evalFn = new Function(`'use strict'; return (${parsed})`);
      const result = evalFn();

      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Natija xato');
      }

      const cleanResult = parseFloat(Number(result).toPrecision(12));

      playSuccessSound();
      addHistory(fullExpr, cleanResult);

      state.expression = fullExpr + ' =';
      state.currentInput = String(cleanResult);
      state.justCalculated = true;
      updateDisplay();
    } catch (err) {
      playErrorSound();
      state.currentInput = 'Xato';
      state.justCalculated = true;
      updateDisplay();
    }
  }

  // Memory Functions
  function handleMemory(action) {
    playClickSound();
    const current = parseFloat(state.currentInput) || 0;

    switch (action) {
      case 'mc':
        state.memory = 0;
        showToast('Xotira tozalandi');
        break;
      case 'mr':
        state.currentInput = String(state.memory);
        state.justCalculated = false;
        showToast('Xotiradan o\'qildi: ' + state.memory);
        break;
      case 'm-plus':
        state.memory += current;
        showToast('Xotiraga qo\'shildi (+)');
        break;
      case 'm-minus':
        state.memory -= current;
        showToast('Xotiradan ayirildi (-)');
        break;
      case 'ms':
        state.memory = current;
        showToast('Xotiraga saqlandi: ' + state.memory);
        break;
    }
    updateDisplay();
  }

  // History Management
  function loadHistory() {
    try {
      const stored = localStorage.getItem('parizod_history');
      if (stored) {
        state.history = JSON.parse(stored);
        renderHistory();
      }
    } catch (e) {}
  }

  function addHistory(expr, res) {
    const item = {
      id: Date.now(),
      expr: expr,
      res: res,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.history.unshift(item);
    if (state.history.length > 40) {
      state.history.pop();
    }
    try {
      localStorage.setItem('parizod_history', JSON.stringify(state.history));
    } catch (e) {}
    renderHistory();
  }

  function clearHistory() {
    playClickSound();
    state.history = [];
    try {
      localStorage.removeItem('parizod_history');
    } catch (e) {}
    renderHistory();
    showToast('Tarix tozalandi');
  }

  function renderHistory() {
    historyBadge.textContent = state.history.length;

    if (state.history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M7 15h0M2 9.5h20"></path>
          </svg>
          <p>Hozircha hisob-kitoblar yo'q</p>
          <small>Bajarilgan barcha amallar shu yerda saqlanadi</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = '';
    state.history.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="hist-expr">${item.expr} =</div>
        <div class="hist-res">${item.res}</div>
      `;
      el.addEventListener('click', () => {
        playClickSound();
        state.currentInput = String(item.res);
        state.expression = item.expr + ' =';
        state.justCalculated = true;
        updateDisplay();
        toggleHistory(false);
      });
      historyList.appendChild(el);
    });
  }

  function toggleHistory(show) {
    playClickSound();
    const shouldOpen = show !== undefined ? show : !historyDrawer.classList.contains('open');
    if (shouldOpen) {
      historyDrawer.classList.add('open');
      historyOverlay.classList.remove('hidden');
    } else {
      historyDrawer.classList.remove('open');
      historyOverlay.classList.add('hidden');
    }
  }

  // Theme Management
  function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    state.theme = themeName;
    try {
      localStorage.setItem('parizod_theme', themeName);
    } catch (e) {}

    // Update active check in menu
    document.querySelectorAll('.theme-opt').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-set-theme') === themeName);
    });
  }

  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('parizod_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {}
  }

  // Unit Converter Engine
  const conversionRates = {
    currency: {
      UZS: 1,
      USD: 12850,
      EUR: 13950,
      RUB: 132,
      TRY: 375,
      CNY: 1780
    },
    length: {
      m: 1,
      cm: 0.01,
      mm: 0.001,
      km: 1000,
      inch: 0.0254,
      ft: 0.3048
    },
    weight: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      ton: 1000,
      lb: 0.453592
    },
    temp: {
      C: 'C',
      F: 'F',
      K: 'K'
    }
  };

  const unitLabels = {
    currency: {
      UZS: "O'zbek so'mi (UZS)",
      USD: "AQSH dollari (USD)",
      EUR: "Yevro (EUR)",
      RUB: "Rossiya rubli (RUB)",
      TRY: "Turk lirasi (TRY)",
      CNY: "Xitoy yuani (CNY)"
    },
    length: {
      m: "Metr (m)",
      cm: "Santimetr (cm)",
      mm: "Millimetr (mm)",
      km: "Kilometr (km)",
      inch: "Dyuym (inch)",
      ft: "Fut (ft)"
    },
    weight: {
      kg: "Kilogramm (kg)",
      g: "Gramm (g)",
      mg: "Milligramm (mg)",
      ton: "Tonna (t)",
      lb: "Funt (lb)"
    },
    temp: {
      C: "Selsiy (°C)",
      F: "Farengeyt (°F)",
      K: "Kelvin (K)"
    }
  };

  let currentConvType = 'currency';
  const convFromValue = document.getElementById('convFromValue');
  const convToValue = document.getElementById('convToValue');
  const convFromUnit = document.getElementById('convFromUnit');
  const convToUnit = document.getElementById('convToUnit');
  const convFormulaText = document.getElementById('convFormulaText');
  const convSwapBtn = document.getElementById('convSwapBtn');

  function initConverterOptions(type) {
    currentConvType = type;
    const units = unitLabels[type];
    convFromUnit.innerHTML = '';
    convToUnit.innerHTML = '';

    const keys = Object.keys(units);
    keys.forEach((key, index) => {
      const opt1 = new Option(units[key], key);
      const opt2 = new Option(units[key], key);
      convFromUnit.add(opt1);
      convToUnit.add(opt2);
    });

    if (keys.length > 1) {
      convFromUnit.selectedIndex = 1; // e.g. USD
      convToUnit.selectedIndex = 0;   // e.g. UZS
    }

    calculateConversion();
  }

  function calculateConversion() {
    const val = parseFloat(convFromValue.value);
    if (isNaN(val)) {
      convToValue.value = '';
      return;
    }

    const from = convFromUnit.value;
    const to = convToUnit.value;

    let res = 0;

    if (currentConvType === 'temp') {
      // Temperature conversion
      let celsius = val;
      if (from === 'F') celsius = (val - 32) * (5 / 9);
      else if (from === 'K') celsius = val - 273.15;

      if (to === 'C') res = celsius;
      else if (to === 'F') res = (celsius * 9 / 5) + 32;
      else if (to === 'K') res = celsius + 273.15;

      convFormulaText.textContent = `${val} ${from} = ${res.toFixed(2)} ${to}`;
    } else {
      // Base ratio conversions
      const rates = conversionRates[currentConvType];
      const valInBase = val * rates[from];
      res = valInBase / rates[to];

      let formattedRes = res >= 1000 ? res.toFixed(2) : parseFloat(res.toPrecision(6));
      convToValue.value = formattedRes;
      convFormulaText.textContent = `1 ${from} ≈ ${(rates[from] / rates[to]).toLocaleString()} ${to}`;
    }

    if (currentConvType === 'temp') {
      convToValue.value = parseFloat(res.toFixed(3));
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Mode Switching Tabs
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        playClickSound();
        document.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const mode = tab.getAttribute('data-mode');
        if (mode === 'standard') {
          calculatorView.classList.remove('hidden');
          converterView.classList.add('hidden');
          scientificPanel.classList.add('hidden');
          degRadIndicator.classList.add('hidden');
          appContainer.classList.remove('wide-mode');
        } else if (mode === 'scientific') {
          calculatorView.classList.remove('hidden');
          converterView.classList.add('hidden');
          scientificPanel.classList.remove('hidden');
          degRadIndicator.classList.remove('hidden');
          appContainer.classList.add('wide-mode');
        } else if (mode === 'converter') {
          calculatorView.classList.add('hidden');
          converterView.classList.remove('hidden');
          appContainer.classList.remove('wide-mode');
        }
      });
    });

    // Keypad Click Event Delegation
    document.querySelector('.keypad').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;

      const num = btn.getAttribute('data-num');
      const action = btn.getAttribute('data-action');
      const op = btn.getAttribute('data-op');

      if (num !== null) {
        inputDigit(num);
      } else if (op) {
        inputOperator(op, action);
      } else if (action === 'equals') {
        evaluateExpression();
      } else if (action === 'clear-all') {
        clearAll();
      } else if (action === 'backspace') {
        backspace();
      } else if (action === 'percent') {
        percent();
      } else if (action === 'dot') {
        inputDecimal();
      } else if (action === 'negate') {
        negateNumber();
      }
    });

    // Scientific Panel Event Delegation
    scientificPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-sci');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      if (action === 'angle-toggle') {
        state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
        degRadBtn.textContent = state.angleMode.toUpperCase();
        degRadIndicator.textContent = state.angleMode.toUpperCase();
        playClickSound();
        showToast(`Burchak o'lchovi: ${state.angleMode.toUpperCase()}`);
      } else if (action === 'open-paren') {
        playClickSound();
        if (state.currentInput === '0' || state.justCalculated) {
          state.currentInput = '(';
          state.justCalculated = false;
        } else {
          state.currentInput += '(';
        }
        updateDisplay();
      } else if (action === 'close-paren') {
        playClickSound();
        state.currentInput += ')';
        updateDisplay();
      } else if (action === 'pow') {
        inputOperator('^', 'pow');
      } else {
        executeScientific(action);
      }
    });

    // Memory Bar Event Delegation
    document.querySelector('.memory-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('.mem-btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      handleMemory(action);
    });

    // Copy Display Value
    document.getElementById('copyBtn').addEventListener('click', () => {
      playClickSound();
      navigator.clipboard.writeText(state.currentInput).then(() => {
        showToast('Natija nusxalandi: ' + state.currentInput);
      }).catch(() => {
        showToast('Nusxalash imkoni bo\'lmadi');
      });
    });

    // Sound Toggle
    soundToggle.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      soundOnIcon.classList.toggle('hidden', !state.soundEnabled);
      soundOffIcon.classList.toggle('hidden', state.soundEnabled);
      showToast(state.soundEnabled ? 'Ovoz yoqildi' : 'Ovoz o\'chirildi');
      if (state.soundEnabled) playClickSound();
    });

    // Theme Picker
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playClickSound();
      themeMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!themeMenu.contains(e.target) && e.target !== themeBtn) {
        themeMenu.classList.remove('show');
      }
    });

    document.querySelectorAll('.theme-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        playClickSound();
        const t = btn.getAttribute('data-set-theme');
        setTheme(t);
        themeMenu.classList.remove('show');
        showToast('Mavzu yangilandi');
      });
    });

    // History Drawer Triggers
    document.getElementById('historyToggleBtn').addEventListener('click', () => toggleHistory());
    document.getElementById('closeHistoryBtn').addEventListener('click', () => toggleHistory(false));
    historyOverlay.addEventListener('click', () => toggleHistory(false));
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    // Converter Event Listeners
    document.querySelectorAll('.conv-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        playClickSound();
        document.querySelectorAll('.conv-type-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        initConverterOptions(btn.getAttribute('data-conv-type'));
      });
    });

    convFromValue.addEventListener('input', calculateConversion);
    convFromUnit.addEventListener('change', calculateConversion);
    convToUnit.addEventListener('change', calculateConversion);

    convSwapBtn.addEventListener('click', () => {
      playClickSound();
      const tempIdx = convFromUnit.selectedIndex;
      convFromUnit.selectedIndex = convToUnit.selectedIndex;
      convToUnit.selectedIndex = tempIdx;
      calculateConversion();
    });

    // Keyboard Shortcuts Support
    window.addEventListener('keydown', (e) => {
      // Don't intercept if typing in converter input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const key = e.key;

      if (!isNaN(key) && key !== ' ') {
        animateButton(`[data-num="${key}"]`);
        inputDigit(key);
      } else if (key === '.' || key === ',') {
        animateButton('[data-action="dot"]');
        inputDecimal();
      } else if (key === '+') {
        animateButton('[data-action="add"]');
        inputOperator('+', 'add');
      } else if (key === '-') {
        animateButton('[data-action="subtract"]');
        inputOperator('−', 'subtract');
      } else if (key === '*') {
        animateButton('[data-action="multiply"]');
        inputOperator('×', 'multiply');
      } else if (key === '/') {
        e.preventDefault();
        animateButton('[data-action="divide"]');
        inputOperator('÷', 'divide');
      } else if (key === '%') {
        animateButton('[data-action="percent"]');
        percent();
      } else if (key === '^') {
        animateButton('[data-action="pow"]');
        inputOperator('^', 'pow');
      } else if (key === '(' || key === ')') {
        if (key === '(') animateButton('[data-action="open-paren"]');
        else animateButton('[data-action="close-paren"]');
        if (state.currentInput === '0' || state.justCalculated) {
          state.currentInput = key;
          state.justCalculated = false;
        } else {
          state.currentInput += key;
        }
        updateDisplay();
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        animateButton('.btn-equals');
        evaluateExpression();
      } else if (key === 'Backspace') {
        animateButton('#btnDelete');
        backspace();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        animateButton('#btnAC');
        clearAll();
      }
    });
  }

  function animateButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('btn-active');
      setTimeout(() => btn.classList.remove('btn-active'), 140);
    }
  }

  // Application Entry Point
  function init() {
    initTheme();
    loadHistory();
    initConverterOptions('currency');
    setupEventListeners();
    updateDisplay();
  }

  // Boot on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
