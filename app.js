// Šachový kalendář tréninků
// Sledování středečních a čtvrtečních tréninků, počtu lekcí a rozborů

(function () {
  'use strict';

  // Klíče úložiště
  const STORAGE_KEY = 'chess_training_calendar_data_v2';
  const THEME_KEY = 'chess_training_calendar_theme';

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
  let currentDate = new Date(); // Zobrazený měsíc a rok
  let trainingsData = {}; // Formát: { "YYYY-MM-DD": { completed: true, count: 1, notes: "...", tags: [] } }
  let selectedDateKey = null;
  let viewFilter = 'all'; // 'all' nebo 'wed-thu'

  // DOM Prvky
  const calendarGrid = document.getElementById('calendar-days-grid');
  const currentMonthDisplay = document.getElementById('current-month-display');
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const todayBtn = document.getElementById('today-btn');
  const bulkCheckBtn = document.getElementById('bulk-check-btn');
  const viewAllBtn = document.getElementById('view-all-btn');
  const viewFocusBtn = document.getElementById('view-focus-btn');
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

  // --- INICIALIZACE ---
  function init() {
    loadTheme();
    loadTrainingsData();
    setupEventListeners();
    renderCalendar();
    updateStats();
  }

  // --- SPRÁVA MOTIVU (DARK / LIGHT) ---
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

  // --- NAČÍTÁNÍ A UKLÁDÁNÍ DAT ---
  function loadTrainingsData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        trainingsData = JSON.parse(saved);
      } else {
        // Zkusit starší klíč pokud existuje
        const oldSaved = localStorage.getItem('training_calendar_data_v1');
        if (oldSaved) {
          trainingsData = JSON.parse(oldSaved);
        } else {
          // První spuštění: nachystat vzorová šachová data pro aktuální měsíc
          trainingsData = seedInitialChessData();
        }
        saveTrainingsData();
      }
    } catch (e) {
      console.error('Chyba při načítání dat z localStorage:', e);
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

  // Vytvoření vzorových šachových tréninků pro středy a čtvrtky
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
      const dayOfWeek = date.getDay(); // 3 = Středa, 4 = Čtvrtek
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
          // Budoucí tréninkový den
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

  // Pomocný formát data: YYYY-MM-DD
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

  // --- VYKRESLENÍ KALENDÁŘE ---
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Nadpis měsíce např. "Říjen 2026"
    currentMonthDisplay.textContent = `${CZECH_MONTHS[month]} ${year}`;

    // Vyčistit mřížku
    calendarGrid.innerHTML = '';

    // Výpočet dnů
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Pondělí jako 1. den v týdnu (v JS je Neděle 0)
    let startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    // Dny z předchozího měsíce
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const cell = createDayCell(prevDate, true);
      calendarGrid.appendChild(cell);
    }

    // Dny aktuálního měsíce
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const cell = createDayCell(date, false);
      calendarGrid.appendChild(cell);
    }

    // Dny z následujícího měsíce do konce řádku
    const totalRendered = startingDayIndex + totalDays;
    const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      const cell = createDayCell(nextDate, true);
      calendarGrid.appendChild(cell);
    }

    updateStats();
  }

  function createDayCell(date, isOutsideMonth) {
    const cell = document.createElement('div');
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay(); // 3 = Středa, 4 = Čtvrtek
    const isWed = dayOfWeek === 3;
    const isThu = dayOfWeek === 4;
    const isTrainingDay = isWed || isThu;

    const todayKey = formatDateKey(new Date());
    const isToday = dateKey === todayKey;

    const entry = trainingsData[dateKey] || { completed: false, count: 0, notes: '', tags: [] };
    const isCompleted = entry.completed;
    const count = entry.count || 0;
    const hasNote = Boolean(entry.notes && entry.notes.trim().length > 0);

    // Filtr zaměření pouze na St & Čt
    if (viewFilter === 'wed-thu' && !isTrainingDay && !isOutsideMonth) {
      cell.classList.add('opacity-25', 'grayscale', 'pointer-events-none');
    }

    // Třídy pro buňku
    cell.className = `day-cell relative min-h-[135px] p-2.5 sm:p-3 flex flex-col justify-between border-b border-r border-slate-200 dark:border-slate-800 transition-all ${
      isOutsideMonth
        ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-40'
        : isTrainingDay
          ? 'bg-indigo-50/20 dark:bg-indigo-950/20'
          : 'bg-white dark:bg-slate-900'
    } ${isToday ? 'ring-2 ring-inset ring-brand-500' : ''}`;

    // Horní řádek: Číslo dne + Odznáček dne (St / Čt)
    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between gap-1';

    const dayNumSpan = document.createElement('span');
    dayNumSpan.className = `text-sm font-bold flex items-center justify-center w-7 h-7 rounded-lg ${
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
      targetBadge.className = `text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
        isCompleted
          ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300'
          : 'bg-schedule-100 text-schedule-700 dark:bg-schedule-900/60 dark:text-schedule-300'
      }`;
      targetBadge.textContent = isWed ? 'Středa' : 'Čtvrtek';
      badgeContainer.appendChild(targetBadge);
    }

    if (hasNote) {
      const noteBadge = document.createElement('span');
      noteBadge.className = 'w-2 h-2 rounded-full bg-amber-500 inline-block';
      noteBadge.title = 'Obsahuje poznámku k tréninku';
      badgeContainer.appendChild(noteBadge);
    }

    topRow.appendChild(badgeContainer);
    cell.appendChild(topRow);

    // Střed: Tlačítko odškrtnutí & Počet tréninků
    const midContent = document.createElement('div');
    midContent.className = 'my-2 flex flex-col gap-1.5';

    // Tlačítko se symbolem zaškrtnutí
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = `w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
      isCompleted
        ? 'bg-brand-500 hover:bg-brand-600 border-brand-600 text-white shadow-sm check-pop'
        : isTrainingDay
          ? 'bg-schedule-50/70 hover:bg-schedule-100/90 dark:bg-slate-800 dark:hover:bg-slate-750 border-schedule-200 dark:border-schedule-800 text-schedule-700 dark:text-schedule-300'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
    }`;

    checkBtn.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="w-4 h-4 rounded-md flex items-center justify-center ${
          isCompleted
            ? 'bg-white/20 text-white'
            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
        }">
          ${isCompleted ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
        </span>
        <span class="truncate">${isCompleted ? 'Splněno' : (isTrainingDay ? 'Trénink' : 'Zapsat')}</span>
      </div>
      <span class="font-mono text-[11px] font-bold opacity-90">${count > 0 ? `${count}x` : '-'}</span>
    `;

    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDayCompletion(dateKey, isTrainingDay);
    });
    midContent.appendChild(checkBtn);

    // Přímé počítadlo počtu tréninků (+ / -)
    if (isCompleted || isTrainingDay) {
      const counterRow = document.createElement('div');
      counterRow.className = 'flex items-center justify-between px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400';
      
      counterRow.innerHTML = `
        <span class="text-[10px]">Tréninky:</span>
        <div class="flex items-center gap-1">
          <button type="button" class="minus-btn w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 leading-none" title="Ubrat trénink">-</button>
          <span class="w-4 text-center font-mono font-bold text-slate-900 dark:text-white">${count}</span>
          <button type="button" class="plus-btn w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 leading-none" title="Přidat trénink">+</button>
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

    // Spodní řádek: Náhled poznámky nebo výzva k přidání
    const bottomRow = document.createElement('div');
    bottomRow.className = 'mt-auto pt-1 border-t border-slate-100 dark:border-slate-800/80 cursor-pointer';

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
        <span>${isTrainingDay ? 'Poznámka k partii' : 'Zapsat poznámku'}</span>
      `;
      bottomRow.appendChild(addPrompt);
    }

    cell.addEventListener('click', () => {
      openDayModal(dateKey, date, isTrainingDay);
    });

    cell.appendChild(bottomRow);
    return cell;
  }

  // --- AKCE A ZMĚNY STAVU ---
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
    renderCalendar();
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
    renderCalendar();
  }

  // Označit nebo odznačit všechny středy a čtvrtky v měsíci
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
    renderCalendar();
  }

  // --- MODÁLNÍ OKNO PRO DETAIL DNE ---
  function openDayModal(dateKey, date, isTrainingDay) {
    selectedDateKey = dateKey;
    const entry = trainingsData[dateKey] || { completed: false, count: isTrainingDay ? 1 : 0, notes: '', tags: [] };

    // Titulek v češtině
    modalDateTitle.textContent = formatCzechDateFull(date);

    if (isTrainingDay) {
      modalBadgeDay.textContent = date.getDay() === 3 ? 'Středeční šachový trénink' : 'Čtvrteční šachový trénink';
      modalBadgeDay.classList.remove('hidden');
    } else {
      modalBadgeDay.classList.add('hidden');
    }

    // Vyplnění polí
    modalCompletedToggle.checked = Boolean(entry.completed);
    updateModalStatusLabel(Boolean(entry.completed));
    modalCountInput.value = entry.count !== undefined ? entry.count : (entry.completed ? 1 : 0);
    modalNotesInput.value = entry.notes || '';

    // Štítky
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

    // Zobrazení s animací
    dayModal.classList.remove('hidden');
    setTimeout(() => {
      const content = dayModal.querySelector('.modal-content');
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
      modalNotesInput.focus();
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
    renderCalendar();
    closeDayModal();
  }

  function clearModalData() {
    if (!selectedDateKey) return;
    delete trainingsData[selectedDateKey];
    saveTrainingsData();
    renderCalendar();
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
    dlAnchorElem.setAttribute('download', `sachove_treninky_zaloha_${formatDateKey(new Date())}.json`);
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
          renderCalendar();
          exportModal.classList.add('hidden');
          alert('Šachová tréninková data byla úspěšně obnovena!');
        } else {
          alert('Neplatný formát souboru. Nahrajte platný JSON soubor.');
        }
      } catch (err) {
        alert('Chyba při čtení souboru se zálohou.');
      }
    };
    reader.readAsText(file);
  }

  // --- POSLUCHAČE UDÁLOSTÍ ---
  function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });

    todayBtn.addEventListener('click', () => {
      currentDate = new Date();
      renderCalendar();
    });

    bulkCheckBtn.addEventListener('click', bulkToggleWedThu);

    viewAllBtn.addEventListener('click', () => {
      viewFilter = 'all';
      viewAllBtn.className = 'px-2.5 py-1.5 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white';
      viewFocusBtn.className = 'px-2.5 py-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      renderCalendar();
    });

    viewFocusBtn.addEventListener('click', () => {
      viewFilter = 'wed-thu';
      viewFocusBtn.className = 'px-2.5 py-1.5 rounded-md transition-colors bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white';
      viewAllBtn.className = 'px-2.5 py-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      renderCalendar();
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
      }
    });

    dayModal.addEventListener('click', (e) => {
      if (e.target === dayModal) closeDayModal();
    });

    exportModal.addEventListener('click', (e) => {
      if (e.target === exportModal) exportModal.classList.add('hidden');
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
