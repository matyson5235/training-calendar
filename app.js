// Tajný portál aplikací • secret.apartmanytobias.cz
// Šachový kalendář & BSS Autorestart Dashboard

(function () {
  'use strict';

  // --- KLÍČE ÚLOŽIŠTĚ ---
  const STORAGE_KEY = 'chess_training_calendar_data_v2';
  const THEME_KEY = 'chess_training_calendar_theme';
  const FORMAT_KEY = 'chess_calendar_view_format';
  const AUTH_KEY = 'portal_session_auth_v1';
  const PIN_HASH_KEY = 'portal_master_pin_hash_v1';
  const ACTIVE_TAB_KEY = 'portal_active_tab_v1';
  const SALT = 'secret_apartmany_tobias_2026_salt';

  // Výchozí hash pro PIN "1234" (předpočítaný pro offline a první spuštění)
  // sha256("1234" + SALT)
  const DEFAULT_PIN_HASH = '179be1907cb50cb05a8d9b158525b68df004314c19ba88d9047b744a71399ee8';

  // Názvy měsíců a dnů v češtině
  const CZECH_MONTHS = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];

  const CZECH_MONTHS_GENITIVE = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
  ];

  const CZECH_DAYS_LONG = [
    'Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'
  ];

  // Stav aplikace
  let currentDate = new Date();
  let trainingsData = {};
  let selectedDateKey = null;
  let viewFilter = 'all';
  let viewFormat = 'grid';
  let isUnlocked = false;

  // DOM Prvky: Zámek
  const portalLockScreen = document.getElementById('portal-lock-screen');
  const lockPinInput = document.getElementById('lock-pin-input');
  const lockErrorMsg = document.getElementById('lock-error-msg');
  const rememberMeCheckbox = document.getElementById('remember-me-checkbox');
  const togglePinVisibilityBtn = document.getElementById('toggle-pin-visibility');
  const lockPortalBtn = document.getElementById('lock-portal-btn');

  // DOM Prvky: Přepínač aplikací
  const navTabSachy = document.getElementById('nav-tab-sachy');
  const navTabBss = document.getElementById('nav-tab-bss');
  const appViewSachy = document.getElementById('app-view-sachy');
  const appViewBss = document.getElementById('app-view-bss');
  const changePinModalBtn = document.getElementById('change-pin-modal-btn');
  const changePinModal = document.getElementById('change-pin-modal');
  const closePinModalBtn = document.getElementById('close-pin-modal-btn');
  const cancelChangePinBtn = document.getElementById('cancel-change-pin-btn');
  const changePinForm = document.getElementById('change-pin-form');
  const changePinMsg = document.getElementById('change-pin-msg');

  // DOM Prvky: Kalendář
  const calendarDaysGrid = document.getElementById('calendar-days-grid');
  const calendarViewContainer = document.getElementById('calendar-view-container');
  const agendaViewContainer = document.getElementById('agenda-view-container');
  const agendaCardsList = document.getElementById('agenda-cards-list');
  const currentMonthDisplay = document.getElementById('current-month-display');
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const todayBtn = document.getElementById('today-btn');
  const bulkCheckBtn = document.getElementById('bulk-check-btn');
  const viewAllBtn = document.getElementById('view-all-btn');
  const viewFocusBtn = document.getElementById('view-focus-btn');
  const formatGridBtn = document.getElementById('format-grid-btn');
  const formatAgendaBtn = document.getElementById('format-agenda-btn');
  const gridFilterContainer = document.getElementById('grid-filter-container');
  const themeToggle = document.getElementById('theme-toggle');

  // Prvky statistik
  const statTotalTrainings = document.getElementById('stat-total-trainings');
  const statWedThuCompleted = document.getElementById('stat-wed-thu-completed');
  const statWedThuPercent = document.getElementById('stat-wed-thu-percent');
  const statNotesCount = document.getElementById('stat-notes-count');
  const statStreak = document.getElementById('stat-streak');

  // Modální okno dne
  const dayModal = document.getElementById('day-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const modalClearBtn = document.getElementById('modal-clear-btn');
  const modalDateTitle = document.getElementById('modal-date-title');
  const modalBadgeDay = document.getElementById('modal-badge-day');
  const modalCompletedToggle = document.getElementById('modal-completed-toggle');
  const modalStatusText = document.getElementById('modal-status-text');
  const modalCountInput = document.getElementById('modal-count-input');
  const modalCountMinus = document.getElementById('modal-count-minus');
  const modalCountPlus = document.getElementById('modal-count-plus');
  const modalNotesInput = document.getElementById('modal-notes-input');
  const quickTagButtons = document.querySelectorAll('#modal-quick-tags .tag-btn');

  // Exportní modál
  const exportModalBtn = document.getElementById('export-modal-btn');
  const exportModal = document.getElementById('export-modal');
  const exportCloseBtn = document.getElementById('export-close-btn');
  const downloadJsonBtn = document.getElementById('download-json-btn');
  const downloadCsvBtn = document.getElementById('download-csv-btn');
  const importJsonFile = document.getElementById('import-json-file');

  // --- HASH FUNKCE (SHA-256) ---
  async function computeHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getStoredPinHash() {
    return localStorage.getItem(PIN_HASH_KEY) || DEFAULT_PIN_HASH;
  }

  // --- ZABEZPEČENÍ & AUTH ---
  function checkSessionAuth() {
    const sessionAuth = sessionStorage.getItem(AUTH_KEY);
    const localAuth = localStorage.getItem(AUTH_KEY);

    if (sessionAuth === 'true' || localAuth === 'true') {
      unlockPortal(false);
    } else {
      lockPortal();
    }
  }

  async function handleUnlockAttempt() {
    const enteredPin = lockPinInput.value.trim();
    if (!enteredPin) return;

    const enteredHash = await computeHash(enteredPin);
    const expectedHash = getStoredPinHash();

    if (enteredHash === expectedHash) {
      lockErrorMsg.classList.add('hidden');
      if (rememberMeCheckbox.checked) {
        localStorage.setItem(AUTH_KEY, 'true');
      }
      sessionStorage.setItem(AUTH_KEY, 'true');
      unlockPortal(true);
    } else {
      lockErrorMsg.classList.remove('hidden');
      lockPinInput.classList.add('shake-error', 'border-rose-500');
      setTimeout(() => {
        lockPinInput.classList.remove('shake-error', 'border-rose-500');
      }, 500);
      lockPinInput.value = '';
      lockPinInput.focus();
    }
  }

  function unlockPortal(animate) {
    isUnlocked = true;
    if (animate) {
      portalLockScreen.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      portalLockScreen.style.opacity = '0';
      portalLockScreen.style.transform = 'scale(1.03)';
      setTimeout(() => {
        portalLockScreen.classList.add('hidden');
      }, 250);
    } else {
      portalLockScreen.classList.add('hidden');
    }
    loadActiveTab();
    render();
  }

  function lockPortal() {
    isUnlocked = false;
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
    portalLockScreen.classList.remove('hidden');
    portalLockScreen.style.opacity = '1';
    portalLockScreen.style.transform = 'scale(1)';
    lockPinInput.value = '';
    lockErrorMsg.classList.add('hidden');
    setTimeout(() => {
      lockPinInput.focus();
    }, 100);
  }

  // Pomocné funkce pro numerickou klávesnici (globální pro onclick v HTML)
  window.appendPinDigit = function (digit) {
    lockPinInput.value += digit;
  };

  window.clearPinInput = function () {
    lockPinInput.value = '';
    lockErrorMsg.classList.add('hidden');
  };

  window.handleUnlockAttempt = handleUnlockAttempt;

  function togglePinVisibility() {
    if (lockPinInput.type === 'password') {
      lockPinInput.type = 'text';
      togglePinVisibilityBtn.textContent = '🔒';
    } else {
      lockPinInput.type = 'password';
      togglePinVisibilityBtn.textContent = '👁️';
    }
  }

  // --- ZMĚNA PINU ---
  async function handleChangePinSubmit() {
    const oldPin = document.getElementById('input-old-pin').value.trim();
    const newPin = document.getElementById('input-new-pin').value.trim();
    const confirmPin = document.getElementById('input-confirm-pin').value.trim();

    const oldHash = await computeHash(oldPin);
    const expectedHash = getStoredPinHash();

    if (oldHash !== expectedHash) {
      showChangePinMsg('Současný PIN je nesprávný.', 'text-rose-500');
      return;
    }

    if (newPin.length < 4) {
      showChangePinMsg('Nový PIN musí mít alespoň 4 znaky.', 'text-rose-500');
      return;
    }

    if (newPin !== confirmPin) {
      showChangePinMsg('Nové PINy se neshodují.', 'text-rose-500');
      return;
    }

    const newHash = await computeHash(newPin);
    localStorage.setItem(PIN_HASH_KEY, newHash);
    showChangePinMsg('PIN byl úspěšně změněn!', 'text-emerald-500');

    setTimeout(() => {
      changePinModal.classList.add('hidden');
      changePinForm.reset();
      changePinMsg.classList.add('hidden');
    }, 1000);
  }

  function showChangePinMsg(msg, colorClass) {
    changePinMsg.textContent = msg;
    changePinMsg.className = `text-xs font-semibold ${colorClass}`;
    changePinMsg.classList.remove('hidden');
  }

  window.handleChangePinSubmit = handleChangePinSubmit;

  // --- PŘEPÍNAČ APLIKACÍ (TABS) ---
  function setActiveTab(tab) {
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
    if (tab === 'bss') {
      navTabBss.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg transition-all bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white flex items-center gap-1.5';
      navTabSachy.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5';
      appViewSachy.classList.add('hidden');
      appViewBss.classList.remove('hidden');
    } else {
      navTabSachy.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg transition-all bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white flex items-center gap-1.5';
      navTabBss.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5';
      appViewBss.classList.add('hidden');
      appViewSachy.classList.remove('hidden');
      render();
    }
  }

  function loadActiveTab() {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY) || 'sachy';
    setActiveTab(saved);
  }

  // --- INICIALIZACE KALENDÁŘE ---
  function init() {
    loadTheme();
    loadTrainingsData();
    loadViewFormat();
    setupEventListeners();
    checkSessionAuth();
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }

  function loadViewFormat() {
    const saved = localStorage.getItem(FORMAT_KEY);
    if (saved === 'agenda' || saved === 'grid') {
      viewFormat = saved;
    }
    updateFormatButtons();
  }

  function setViewFormat(format) {
    viewFormat = format;
    localStorage.setItem(FORMAT_KEY, format);
    updateFormatButtons();
    render();
  }

  function updateFormatButtons() {
    if (viewFormat === 'grid') {
      calendarViewContainer.classList.remove('hidden');
      agendaViewContainer.classList.add('hidden');
      gridFilterContainer.classList.remove('hidden');
      formatGridBtn.className = 'px-2.5 py-1 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white flex items-center gap-1';
      formatAgendaBtn.className = 'px-2.5 py-1 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1';
    } else {
      calendarViewContainer.classList.add('hidden');
      agendaViewContainer.classList.remove('hidden');
      gridFilterContainer.classList.add('hidden');
      formatAgendaBtn.className = 'px-2.5 py-1 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white flex items-center gap-1';
      formatGridBtn.className = 'px-2.5 py-1 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1';
    }
  }

  function loadTrainingsData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        trainingsData = JSON.parse(saved);
      } else {
        const oldSaved = localStorage.getItem('training_calendar_data_v1');
        if (oldSaved) {
          trainingsData = JSON.parse(oldSaved);
        } else {
          trainingsData = seedInitialChessData();
        }
        saveTrainingsData();
      }
    } catch (e) {
      console.error('Chyba při načítání dat:', e);
      trainingsData = {};
    }
  }

  function saveTrainingsData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trainingsData));
    } catch (e) {
      console.error('Chyba při ukládání dat:', e);
    }
  }

  function seedInitialChessData() {
    const data = {};
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const sampleNotes = [
      { count: 1, note: '1 trénink: 45 min taktika na Lichess (Puzzle Storm) + propočet', tags: ['Taktika & Diagramy'] },
      { count: 2, note: '2 tréninky: Odpoledne rozbor Sicilské obrany + večer 3 vážné rapid partie', tags: ['Teorie zahájení', 'Cvičné partie / Bleskovky'] },
      { count: 1, note: '1 trénink: Klubový trénink v oddíle, rozbor chyb z víkendové ligy', tags: ['Lekce s trenérem / Klub', 'Rozbor vlastních partií'] },
      { count: 2, note: '2 tréninky: Věžové koncovky (Lucenova a Philidorova pozice) + taktika', tags: ['Trénink koncovek', 'Taktika & Diagramy'] }
    ];

    let sampleIdx = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dateKey = formatDateKey(date);

      if (dayOfWeek === 3 || dayOfWeek === 4) {
        if (date <= now) {
          const sample = sampleNotes[sampleIdx % sampleNotes.length];
          sampleIdx++;
          data[dateKey] = {
            completed: true,
            count: sample.count,
            notes: sample.note,
            tags: sample.tags,
            updatedAt: Date.now()
          };
        } else {
          data[dateKey] = {
            completed: true,
            count: 1,
            notes: 'Plánovaný šachový trénink',
            tags: ['Taktika & Diagramy'],
            updatedAt: Date.now()
          };
        }
      }
    }
    return data;
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatCzechDateFull(date) {
    const dow = CZECH_DAYS_LONG[date.getDay()];
    const day = date.getDate();
    const month = CZECH_MONTHS_GENITIVE[date.getMonth()];
    const year = date.getFullYear();
    return `${dow}, ${day}. ${month} ${year}`;
  }

  // --- RENDERING ---
  function render() {
    if (!isUnlocked) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    currentMonthDisplay.textContent = `${CZECH_MONTHS[month]} ${year}`;

    if (viewFormat === 'grid') {
      renderCalendarGrid();
    } else {
      renderAgendaView();
    }

    updateStats();
  }

  function renderCalendarGrid() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    calendarDaysGrid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const cell = createGridCell(prevDate, true);
      calendarDaysGrid.appendChild(cell);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const cell = createGridCell(date, false);
      calendarDaysGrid.appendChild(cell);
    }

    const totalRendered = startingDayIndex + totalDays;
    const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      const cell = createGridCell(nextDate, true);
      calendarDaysGrid.appendChild(cell);
    }
  }

  function createGridCell(date, isOutsideMonth) {
    const cell = document.createElement('div');
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();
    const isWed = dayOfWeek === 3;
    const isThu = dayOfWeek === 4;
    const isTrainingDay = isWed || isThu;

    const todayKey = formatDateKey(new Date());
    const isToday = dateKey === todayKey;

    const entry = trainingsData[dateKey] || { completed: false, count: 0, notes: '', tags: [] };
    const isCompleted = entry.completed;
    const count = entry.count || 0;
    const hasNote = Boolean(entry.notes && entry.notes.trim().length > 0);

    if (viewFilter === 'wed-thu' && !isTrainingDay && !isOutsideMonth) {
      cell.classList.add('opacity-20', 'grayscale', 'pointer-events-none');
    }

    cell.className = `day-cell relative min-h-[76px] sm:min-h-[135px] p-1.5 sm:p-3 flex flex-col justify-between border-b border-r border-slate-200 dark:border-slate-800 transition-all select-none ${
      isOutsideMonth
        ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-40'
        : isTrainingDay
          ? 'bg-indigo-50/25 dark:bg-indigo-950/25'
          : 'bg-white dark:bg-slate-900'
    } ${isToday ? 'ring-2 ring-inset ring-brand-500' : ''}`;

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between gap-0.5 sm:gap-1';

    const dayNumSpan = document.createElement('span');
    dayNumSpan.className = `text-xs sm:text-sm font-bold flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-lg ${
      isToday
        ? 'bg-brand-500 text-white font-extrabold shadow-sm'
        : isOutsideMonth
          ? 'text-slate-400 dark:text-slate-600'
          : 'text-slate-800 dark:text-slate-200'
    }`;
    dayNumSpan.textContent = date.getDate();
    topRow.appendChild(dayNumSpan);

    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'flex items-center gap-1';

    if (isTrainingDay && !isOutsideMonth) {
      const targetBadge = document.createElement('span');
      targetBadge.className = `text-[9px] sm:text-[10px] font-extrabold uppercase px-1 sm:px-1.5 py-0.5 rounded tracking-wider ${
        isCompleted
          ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300'
          : 'bg-schedule-100 text-schedule-700 dark:bg-schedule-900/60 dark:text-schedule-300'
      }`;
      targetBadge.innerHTML = `<span class="sm:hidden">${isWed ? 'St' : 'Čt'}</span><span class="hidden sm:inline">${isWed ? 'Středa' : 'Čtvrtek'}</span>`;
      badgeContainer.appendChild(targetBadge);
    }

    if (hasNote) {
      const noteBadge = document.createElement('span');
      noteBadge.className = 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 inline-block shrink-0';
      noteBadge.title = 'Obsahuje poznámku k tréninku';
      badgeContainer.appendChild(noteBadge);
    }

    topRow.appendChild(badgeContainer);
    cell.appendChild(topRow);

    const midContent = document.createElement('div');
    midContent.className = 'my-1 sm:my-2 flex flex-col gap-1';

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = `w-full py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-between border transition-all active:scale-95 ${
      isCompleted
        ? 'bg-brand-500 hover:bg-brand-600 border-brand-600 text-white shadow-sm check-pop'
        : isTrainingDay
          ? 'bg-schedule-50/70 hover:bg-schedule-100/90 dark:bg-slate-800 dark:hover:bg-slate-750 border-schedule-200 dark:border-schedule-800 text-schedule-700 dark:text-schedule-300'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
    }`;

    checkBtn.innerHTML = `
      <div class="flex items-center gap-1 sm:gap-1.5 min-w-0">
        <span class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center shrink-0 ${
          isCompleted
            ? 'bg-white/20 text-white'
            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
        }">
          ${isCompleted ? '<svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
        </span>
        <span class="truncate hidden sm:inline">${isCompleted ? 'Splněno' : (isTrainingDay ? 'Trénink' : 'Zapsat')}</span>
      </div>
      <span class="font-mono text-[10px] sm:text-[11px] font-bold opacity-90">${count > 0 ? `${count}x` : (isCompleted ? '✓' : '-')}</span>
    `;

    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDayCompletion(dateKey, isTrainingDay);
    });
    midContent.appendChild(checkBtn);

    if (isCompleted || isTrainingDay) {
      const counterRow = document.createElement('div');
      counterRow.className = 'hidden sm:flex items-center justify-between px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400';
      
      counterRow.innerHTML = `
        <span class="text-[10px]">Tréninky:</span>
        <div class="flex items-center gap-1">
          <button type="button" class="minus-btn w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 leading-none">-</button>
          <span class="w-4 text-center font-mono font-bold text-slate-900 dark:text-white">${count}</span>
          <button type="button" class="plus-btn w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 leading-none">+</button>
        </div>
      `;

      counterRow.querySelector('.minus-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        adjustDayCount(dateKey, -1);
      });

      counterRow.querySelector('.plus-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        adjustDayCount(dateKey, 1);
      });

      midContent.appendChild(counterRow);
    }

    cell.appendChild(midContent);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'mt-auto pt-0.5 sm:pt-1 border-t border-slate-100 dark:border-slate-800/80 cursor-pointer hidden sm:block';

    if (hasNote) {
      const noteSnippet = document.createElement('div');
      noteSnippet.className = 'text-[11px] text-slate-600 dark:text-slate-300 truncate flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors';
      noteSnippet.innerHTML = `
        <span class="text-[11px] shrink-0">♟️</span>
        <span class="truncate italic">${escapeHtml(entry.notes)}</span>
      `;
      bottomRow.appendChild(noteSnippet);
    } else {
      const addPrompt = document.createElement('div');
      addPrompt.className = 'text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1';
      addPrompt.innerHTML = `
        <span class="text-xs">+</span>
        <span>${isTrainingDay ? 'Poznámka' : 'Zápis'}</span>
      `;
      bottomRow.appendChild(addPrompt);
    }

    cell.addEventListener('click', () => {
      openDayModal(dateKey, date, isTrainingDay);
    });

    cell.appendChild(bottomRow);
    return cell;
  }

  function renderAgendaView() {
    agendaCardsList.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let targetDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      const isWed = dow === 3;
      const isThu = dow === 4;
      const isTarget = isWed || isThu;
      const key = formatDateKey(date);
      const entry = trainingsData[key] || { completed: false, count: 0, notes: '', tags: [] };

      if (isTarget || entry.completed) {
        targetDaysCount++;
        const card = createAgendaCard(date, key, isTarget, isWed, entry);
        agendaCardsList.appendChild(card);
      }
    }

    if (targetDaysCount === 0) {
      agendaCardsList.innerHTML = `
        <div class="text-center py-10 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p class="text-2xl mb-2">♟️</p>
          <p class="text-sm font-semibold">Žádné tréninky v tomto měsíci</p>
        </div>
      `;
    }
  }

  function createAgendaCard(date, dateKey, isTarget, isWed, entry) {
    const card = document.createElement('div');
    const isToday = dateKey === formatDateKey(new Date());
    const isCompleted = entry.completed;
    const count = entry.count || 0;
    const hasNotes = Boolean(entry.notes && entry.notes.trim().length > 0);

    card.className = `p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
      isCompleted
        ? 'bg-white dark:bg-slate-900 border-brand-500/40 shadow-sm'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    } ${isToday ? 'ring-2 ring-brand-500' : ''}`;

    const dateFormatted = formatCzechDateFull(date);

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-bold text-slate-900 dark:text-white">${dateFormatted}</span>
            ${isTarget ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300' : 'bg-schedule-100 text-schedule-700 dark:bg-schedule-900/60 dark:text-schedule-300'}">${isWed ? 'Středa' : 'Čtvrtek'}</span>` : ''}
            ${isToday ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white">Dnes</span>' : ''}
          </div>
          
          <div class="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <span class="font-semibold text-slate-700 dark:text-slate-300">Počet tréninků:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-white px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">${count}x</span>
            </span>
            ${entry.tags && entry.tags.length > 0 ? `<span class="text-slate-400">&bull;</span> <span class="truncate max-w-[150px] text-brand-600 dark:text-brand-400 font-medium">${entry.tags.join(', ')}</span>` : ''}
          </div>

          ${hasNotes ? `
            <div class="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 border border-slate-100 dark:border-slate-800">
              <span class="shrink-0 text-sm">♟️</span>
              <p class="italic leading-relaxed">${escapeHtml(entry.notes)}</p>
            </div>
          ` : `
            <p class="mt-2 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
              <span>+ Přidat poznámku k partii</span>
            </p>
          `}
        </div>

        <button type="button" class="agenda-check-btn shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border transition-all active:scale-95 ${
          isCompleted
            ? 'bg-brand-500 border-brand-600 text-white shadow-md shadow-brand-500/20'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
        }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.agenda-check-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDayCompletion(dateKey, isTarget);
    });

    card.addEventListener('click', () => {
      openDayModal(dateKey, date, isTarget);
    });

    return card;
  }

  // --- MUTACE DAT ---
  function toggleDayCompletion(dateKey, isTrainingDay) {
    if (!trainingsData[dateKey]) {
      trainingsData[dateKey] = {
        completed: true,
        count: 1,
        notes: isTrainingDay ? 'Šachový trénink splněn' : '',
        tags: ['Taktika & Diagramy'],
        updatedAt: Date.now()
      };
    } else {
      const current = trainingsData[dateKey].completed;
      trainingsData[dateKey].completed = !current;
      if (!current && (trainingsData[dateKey].count || 0) === 0) {
        trainingsData[dateKey].count = 1;
      }
      trainingsData[dateKey].updatedAt = Date.now();
    }

    saveTrainingsData();
    render();
  }

  function adjustDayCount(dateKey, delta) {
    if (!trainingsData[dateKey]) {
      trainingsData[dateKey] = {
        completed: delta > 0,
        count: Math.max(0, delta),
        notes: '',
        tags: [],
        updatedAt: Date.now()
      };
    } else {
      let newCount = (trainingsData[dateKey].count || 0) + delta;
      if (newCount < 0) newCount = 0;
      trainingsData[dateKey].count = newCount;
      if (newCount > 0) {
        trainingsData[dateKey].completed = true;
      }
      trainingsData[dateKey].updatedAt = Date.now();
    }

    saveTrainingsData();
    render();
  }

  function bulkToggleWedThu() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let wedThuCount = 0;
    let completedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      if (dow === 3 || dow === 4) {
        wedThuCount++;
        const key = formatDateKey(date);
        if (trainingsData[key] && trainingsData[key].completed) {
          completedCount++;
        }
      }
    }

    const shouldCompleteAll = completedCount < wedThuCount;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      if (dow === 3 || dow === 4) {
        const key = formatDateKey(date);
        if (!trainingsData[key]) {
          trainingsData[key] = {
            completed: shouldCompleteAll,
            count: shouldCompleteAll ? 1 : 0,
            notes: shouldCompleteAll ? 'Pravidelný šachový trénink' : '',
            tags: ['Taktika & Diagramy'],
            updatedAt: Date.now()
          };
        } else {
          trainingsData[key].completed = shouldCompleteAll;
          if (shouldCompleteAll && (trainingsData[key].count || 0) === 0) {
            trainingsData[key].count = 1;
          }
          trainingsData[key].updatedAt = Date.now();
        }
      }
    }

    saveTrainingsData();
    render();
  }

  // --- DETAIL DNE MODÁL ---
  function openDayModal(dateKey, date, isTrainingDay) {
    selectedDateKey = dateKey;
    const entry = trainingsData[dateKey] || { completed: false, count: isTrainingDay ? 1 : 0, notes: '', tags: [] };

    modalDateTitle.textContent = formatCzechDateFull(date);

    if (isTrainingDay) {
      modalBadgeDay.textContent = date.getDay() === 3 ? 'Středeční trénink' : 'Čtvrteční trénink';
      modalBadgeDay.classList.remove('hidden');
    } else {
      modalBadgeDay.classList.add('hidden');
    }

    modalCompletedToggle.checked = Boolean(entry.completed);
    updateModalStatusLabel(Boolean(entry.completed));
    modalCountInput.value = entry.count !== undefined ? entry.count : (entry.completed ? 1 : 0);
    modalNotesInput.value = entry.notes || '';

    const activeTags = entry.tags || [];
    quickTagButtons.forEach(btn => {
      const tag = btn.dataset.tag;
      if (activeTags.includes(tag)) {
        btn.classList.add('bg-brand-500', 'text-white', 'border-brand-500');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'border-slate-200');
      } else {
        btn.classList.remove('bg-brand-500', 'text-white', 'border-brand-500');
        btn.classList.add('text-slate-600', 'dark:text-slate-300', 'border-slate-200');
      }
    });

    dayModal.classList.remove('hidden');
    setTimeout(() => {
      const content = dayModal.querySelector('.modal-content');
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  function closeDayModal() {
    const content = dayModal.querySelector('.modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      dayModal.classList.add('hidden');
      selectedDateKey = null;
    }, 150);
  }

  function updateModalStatusLabel(isCompleted) {
    if (isCompleted) {
      modalStatusText.textContent = 'Splněno ✓';
      modalStatusText.className = 'text-sm font-bold text-brand-600 dark:text-brand-400';
    } else {
      modalStatusText.textContent = 'Zatím nesplněno';
      modalStatusText.className = 'text-sm font-bold text-slate-500 dark:text-slate-400';
    }
  }

  function saveModalData() {
    if (!selectedDateKey) return;

    const completed = modalCompletedToggle.checked;
    const count = Math.max(0, parseInt(modalCountInput.value, 10) || 0);
    const notes = modalNotesInput.value.trim();

    const selectedTags = [];
    quickTagButtons.forEach(btn => {
      if (btn.classList.contains('bg-brand-500')) {
        selectedTags.push(btn.dataset.tag);
      }
    });

    trainingsData[selectedDateKey] = {
      completed: completed || count > 0,
      count: count,
      notes: notes,
      tags: selectedTags,
      updatedAt: Date.now()
    };

    saveTrainingsData();
    render();
    closeDayModal();
  }

  function clearModalData() {
    if (!selectedDateKey) return;
    delete trainingsData[selectedDateKey];
    saveTrainingsData();
    render();
    closeDayModal();
  }

  // --- STATISTIKY ---
  function updateStats() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let totalTrainingsCount = 0;
    let wedThuTotal = 0;
    let wedThuCompleted = 0;
    let notesCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      const isTargetDay = dow === 3 || dow === 4;
      const key = formatDateKey(date);
      const entry = trainingsData[key];

      if (isTargetDay) {
        wedThuTotal++;
        if (entry && entry.completed) {
          wedThuCompleted++;
        }
      }

      if (entry && entry.completed) {
        totalTrainingsCount += (entry.count !== undefined ? entry.count : 1);
      }

      if (entry && entry.notes && entry.notes.trim().length > 0) {
        notesCount++;
      }
    }

    const streak = calculateStreak();

    statTotalTrainings.textContent = totalTrainingsCount;
    statWedThuCompleted.textContent = `${wedThuCompleted}/${wedThuTotal}`;
    const percent = wedThuTotal > 0 ? Math.round((wedThuCompleted / wedThuTotal) * 100) : 0;
    statWedThuPercent.textContent = `${percent}%`;
    statNotesCount.textContent = notesCount;
    statStreak.textContent = streak;
  }

  function calculateStreak() {
    let streakCount = 0;
    let checkDate = new Date();

    for (let week = 0; week < 52; week++) {
      let weekHasTraining = false;
      for (let day = 0; day < 7; day++) {
        const d = new Date(checkDate);
        d.setDate(checkDate.getDate() - (week * 7 + day));
        const key = formatDateKey(d);
        if (trainingsData[key] && trainingsData[key].completed) {
          weekHasTraining = true;
          break;
        }
      }
      if (weekHasTraining) {
        streakCount++;
      } else if (week > 0) {
        break;
      }
    }
    return streakCount;
  }

  // --- EXPORT A IMPORT ---
  function exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trainingsData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `sachove_treninky_${formatDateKey(new Date())}.json`);
    dlAnchorElem.click();
  }

  function exportCSV() {
    const rows = [['Datum', 'Den v týdnu', 'Tréninkový den (St/Čt)', 'Splněno', 'Počet tréninků', 'Poznámky', 'Štítky']];
    const sortedKeys = Object.keys(trainingsData).sort();

    sortedKeys.forEach(key => {
      const date = parseDateKey(key);
      const dow = CZECH_DAYS_LONG[date.getDay()];
      const isTarget = date.getDay() === 3 || date.getDay() === 4;
      const entry = trainingsData[key];
      rows.push([
        key,
        dow,
        isTarget ? 'Ano' : 'Ne',
        entry.completed ? 'Splněno' : 'Ne',
        entry.count || 0,
        `"${(entry.notes || '').replace(/"/g, '""')}"`,
        `"${(entry.tags || []).join('; ')}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `sachove_treninky_${formatDateKey(new Date())}.csv`);
    dlAnchor.click();
  }

  function handleImportJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (typeof imported === 'object' && imported !== null) {
          trainingsData = Object.assign({}, trainingsData, imported);
          saveTrainingsData();
          render();
          exportModal.classList.add('hidden');
          alert('Šachová data byla úspěšně obnovena!');
        } else {
          alert('Neplatný formát souboru.');
        }
      } catch (err) {
        alert('Chyba při čtení zálohy.');
      }
    };
    reader.readAsText(file);
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Auth & Zámek
    lockPortalBtn.addEventListener('click', lockPortal);
    togglePinVisibilityBtn.addEventListener('click', togglePinVisibility);

    // Změna PINu
    changePinModalBtn.addEventListener('click', () => {
      changePinModal.classList.remove('hidden');
      document.getElementById('input-old-pin').focus();
    });
    closePinModalBtn.addEventListener('click', () => {
      changePinModal.classList.add('hidden');
    });
    cancelChangePinBtn.addEventListener('click', () => {
      changePinModal.classList.add('hidden');
    });

    // Přepínač aplikací
    navTabSachy.addEventListener('click', () => setActiveTab('sachy'));
    navTabBss.addEventListener('click', () => setActiveTab('bss'));

    // Kalendář navigace
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });

    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });

    todayBtn.addEventListener('click', () => {
      currentDate = new Date();
      render();
    });

    bulkCheckBtn.addEventListener('click', bulkToggleWedThu);

    formatGridBtn.addEventListener('click', () => setViewFormat('grid'));
    formatAgendaBtn.addEventListener('click', () => setViewFormat('agenda'));

    viewAllBtn.addEventListener('click', () => {
      viewFilter = 'all';
      viewAllBtn.className = 'px-2 py-1 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white';
      viewFocusBtn.className = 'px-2 py-1 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      render();
    });

    viewFocusBtn.addEventListener('click', () => {
      viewFilter = 'wed-thu';
      viewFocusBtn.className = 'px-2 py-1 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white';
      viewAllBtn.className = 'px-2 py-1 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      render();
    });

    themeToggle.addEventListener('click', toggleTheme);

    modalCloseBtn.addEventListener('click', closeDayModal);
    modalCancelBtn.addEventListener('click', closeDayModal);
    modalSaveBtn.addEventListener('click', saveModalData);
    modalClearBtn.addEventListener('click', clearModalData);

    modalCompletedToggle.addEventListener('change', (e) => {
      updateModalStatusLabel(e.target.checked);
      if (e.target.checked && parseInt(modalCountInput.value, 10) === 0) {
        modalCountInput.value = 1;
      }
    });

    modalCountMinus.addEventListener('click', () => {
      const val = Math.max(0, (parseInt(modalCountInput.value, 10) || 0) - 1);
      modalCountInput.value = val;
      if (val === 0) {
        modalCompletedToggle.checked = false;
        updateModalStatusLabel(false);
      }
    });

    modalCountPlus.addEventListener('click', () => {
      const val = (parseInt(modalCountInput.value, 10) || 0) + 1;
      modalCountInput.value = val;
      modalCompletedToggle.checked = true;
      updateModalStatusLabel(true);
    });

    quickTagButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const isActive = btn.classList.toggle('bg-brand-500');
        if (isActive) {
          btn.classList.add('text-white', 'border-brand-500');
          btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'border-slate-200');
        } else {
          btn.classList.remove('text-white', 'border-brand-500');
          btn.classList.add('text-slate-600', 'dark:text-slate-300', 'border-slate-200');
        }
      });
    });

    exportModalBtn.addEventListener('click', () => {
      exportModal.classList.remove('hidden');
    });
    exportCloseBtn.addEventListener('click', () => {
      exportModal.classList.add('hidden');
    });
    downloadJsonBtn.addEventListener('click', exportJSON);
    downloadCsvBtn.addEventListener('click', exportCSV);
    importJsonFile.addEventListener('change', handleImportJSON);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!dayModal.classList.contains('hidden')) closeDayModal();
        if (!exportModal.classList.contains('hidden')) exportModal.classList.add('hidden');
        if (!changePinModal.classList.contains('hidden')) changePinModal.classList.add('hidden');
      }
    });

    dayModal.addEventListener('click', (e) => {
      if (e.target === dayModal) closeDayModal();
    });

    exportModal.addEventListener('click', (e) => {
      if (e.target === exportModal) exportModal.classList.add('hidden');
    });

    changePinModal.addEventListener('click', (e) => {
      if (e.target === changePinModal) changePinModal.classList.add('hidden');
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
