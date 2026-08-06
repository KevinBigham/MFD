(() => {
  const STORAGE_KEY = 'mfd-ui-overhaul-prototype-v1';
  const defaultState = {
    screen: 'today',
    week: 14,
    depthChoice: '',
    depthComplete: false,
    offense: '',
    defense: '',
    gameplanComplete: false,
    warningAcknowledged: false,
    advanced: false,
    chipMuted: false
  };

  const loadState = () => {
    try { return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return { ...defaultState }; }
  };
  let state = loadState();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const screens = $$('[data-screen]');
  const pageScroll = $('.page-scroll');
  const readinessDialog = $('#readinessDialog');
  const chipPanel = $('#chipPanel');
  const placeholderDialog = $('#placeholderDialog');

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function remainingTasks() {
    return Number(!state.depthComplete) + Number(!state.gameplanComplete);
  }

  function taskName(id) {
    return id === 'depth' ? 'Fill the LT depth slot' : 'Set the Denver game plan';
  }

  function nextTask() {
    if (!state.depthComplete) return 'depth';
    if (!state.gameplanComplete) return 'gameplan';
    return 'readiness';
  }

  function showToast(message) {
    const region = $('#toastRegion');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function setScreen(name, options = {}) {
    state.screen = name;
    saveState();
    screens.forEach(s => s.classList.toggle('is-active', s.dataset.screen === name));
    updateNav(name);
    updateDock();
    updatePhase(name);
    if (pageScroll) pageScroll.scrollTop = 0;
    const heading = $(`#screen-${name} h1`);
    if (heading && options.focus !== false) {
      heading.setAttribute('tabindex', '-1');
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  }

  function updateNav(screen) {
    let hub = 'today';
    if (screen === 'depth') hub = 'team';
    if (screen === 'gameplan') hub = 'game';
    $$('[data-nav]').forEach(btn => {
      const active = btn.dataset.nav === hub;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
  }

  function updatePhase(screen) {
    const steps = $$('.phase-strip li');
    const index = screen === 'today' ? 0 : screen === 'depth' ? 1 : screen === 'gameplan' ? 2 : screen === 'advanced' ? 4 : 0;
    steps.forEach((li, i) => li.classList.toggle('is-current', i === index));
  }

  function updateTasks() {
    const remaining = remainingTasks();
    $$('[data-task-count]').forEach(node => {
      node.textContent = String(remaining);
      node.hidden = remaining === 0;
    });
    const taskLabel = $('[data-task-label]');
    if (taskLabel) taskLabel.textContent = `${2 - remaining} of 2 complete`;
    $$('[data-task]').forEach(row => {
      const complete = row.dataset.task === 'depth' ? state.depthComplete : state.gameplanComplete;
      row.classList.toggle('is-complete', complete);
      const b = $('.task-meta b', row);
      const small = $('.task-meta small', row);
      if (complete) { b.textContent = 'Complete'; small.textContent = 'Review'; }
      else { b.textContent = 'Required'; small.textContent = row.dataset.task === 'depth' ? '~30 sec' : '~45 sec'; }
    });
    const summary = $('[data-readiness-summary]');
    if (summary) {
      const dot = $('.status-dot', summary);
      const strong = $('strong', summary);
      const small = $('small', summary);
      dot.className = `status-dot ${remaining ? 'status-dot--warning' : 'status-dot--good'}`;
      strong.textContent = remaining ? `${remaining} required` : 'Ready with 1 warning';
      small.textContent = remaining ? 'Not ready to advance' : 'Review, then play Sunday';
    }
    const chipStatus = $('[data-chip-status]');
    if (chipStatus) chipStatus.textContent = remaining ? `${remaining} decision${remaining === 1 ? '' : 's'} left` : 'Ready to play';
  }

  function updateDock() {
    const dock = $('#actionDock');
    const title = $('#dockTitle');
    const subtitle = $('#dockSubtitle');
    const secondary = $('#dockSecondary');
    const primary = $('#dockPrimary');
    const remaining = remainingTasks();
    dock.hidden = state.screen === 'advanced';
    if (state.screen === 'depth') {
      title.textContent = state.depthChoice ? `Start ${selectedDepthName()}` : 'Choose a starting left tackle';
      subtitle.textContent = state.depthChoice ? 'Preview ready • no change yet' : 'One selection required';
      secondary.textContent = 'Cancel';
      primary.textContent = state.depthComplete ? 'Save again' : 'Save depth chart';
      primary.disabled = !state.depthChoice;
    } else if (state.screen === 'gameplan') {
      const completeSelection = state.offense && state.defense;
      title.textContent = completeSelection ? 'Game plan ready to save' : 'Choose two priorities';
      subtitle.textContent = completeSelection ? 'Previewed against Denver' : 'Offense + defense required';
      secondary.textContent = 'Cancel';
      primary.textContent = state.gameplanComplete ? 'Save again' : 'Save game plan';
      primary.disabled = !completeSelection;
    } else {
      title.textContent = remaining ? `${remaining} decision${remaining === 1 ? '' : 's'} required` : 'Ready for Sunday';
      subtitle.textContent = remaining ? 'Resolve required work before advancing' : 'One matchup warning to review';
      secondary.textContent = remaining ? 'Review tasks' : 'Review plan';
      primary.textContent = remaining ? 'Check readiness' : 'Review & play';
      primary.disabled = false;
    }
  }

  function selectedDepthName() {
    return { ward: 'Caleb Ward', brooks: 'Jalen Brooks', avery: 'Derek Avery' }[state.depthChoice] || '';
  }

  const depthProjection = {
    ward: { title: 'Caleb Ward at LT', copy: 'The safest answer against Denver’s edge rush. You lose some run push but protect the quarterback.', pass: 'Strong', run: 'Average', continuity: 'Good' },
    brooks: { title: 'Jalen Brooks at LT', copy: 'A developmental gamble with real run-game upside. Denver can isolate him in obvious passing downs.', pass: 'Risk', run: 'Strong', continuity: 'Average' },
    avery: { title: 'Derek Avery at LT', copy: 'The natural-position veteran. Lower ceiling, but the smallest assignment change for the line.', pass: 'Average', run: 'Below avg.', continuity: 'Strong' }
  };

  function updateDepthForm() {
    const choice = state.depthChoice;
    $$('input[name="leftTackle"]').forEach(input => input.checked = input.value === choice);
    const p = depthProjection[choice];
    $('#depthProjectionTitle').textContent = p ? p.title : 'Choose a player';
    $('#depthProjectionCopy').textContent = p ? p.copy : 'The staff projection will update here before anything changes.';
    const values = p ? [p.pass, p.run, p.continuity] : ['—','—','—'];
    $$('#depthProjectionStats dd').forEach((dd,i) => dd.textContent = values[i]);
  }

  const planData = {
    quick: { label: 'Quick rhythm', score: 8 }, balanced: { label: 'Balanced offense', score: 5 }, attack: { label: 'Vertical attack', score: 2 },
    contain: { label: 'Contain the quarterback', score: 8 }, pressure: { label: 'Pressure packages', score: 5 }, takeaway: { label: 'Takeaway hunt', score: 4 }
  };

  function updateGameplanForm() {
    $$('input[name="offense"]').forEach(input => input.checked = input.value === state.offense);
    $$('input[name="defense"]').forEach(input => input.checked = input.value === state.defense);
    const complete = state.offense && state.defense;
    if (!complete) {
      $('#planSummaryTitle').textContent = 'Choose both priorities';
      $('#planSummaryCopy').textContent = 'Your selected identity and priority will become the staff’s game-day instructions.';
      $('#planConfidence').textContent = '—';
      $('#planConfidenceBar').style.width = '0';
      return;
    }
    const score = planData[state.offense].score + planData[state.defense].score;
    const pct = Math.round(58 + score * 2.1);
    const grade = pct >= 88 ? 'A' : pct >= 80 ? 'B+' : pct >= 72 ? 'B' : 'C+';
    $('#planSummaryTitle').textContent = `${planData[state.offense].label} + ${planData[state.defense].label}`;
    $('#planSummaryCopy').textContent = state.offense === 'quick' && state.defense === 'contain'
      ? 'The plan attacks Denver’s clearest weaknesses while protecting your emergency left tackle.'
      : 'The staff can execute this plan, but it leaves at least one matchup risk less protected.';
    $('#planConfidence').textContent = grade;
    $('#planConfidenceBar').style.width = `${Math.min(96,pct)}%`;
  }

  function renderReadiness() {
    const remaining = remainingTasks();
    const title = $('#readinessTitle');
    const body = $('#readinessBody');
    const advance = $('#advanceButton');
    const footerCancel = $('.sheet-footer .button--secondary', readinessDialog);
    if (remaining) {
      title.textContent = 'Not ready yet';
      body.innerHTML = `
        <p>${remaining} required decision${remaining === 1 ? '' : 's'} still block Sunday. Each item returns you here automatically when complete.</p>
        <div class="readiness-list">
          ${readinessItem('depth', state.depthComplete, 'Fill the LT depth slot', 'An injured starter left the position empty.')}
          ${readinessItem('gameplan', state.gameplanComplete, 'Set the Denver game plan', 'Choose offensive and defensive priorities.')}
        </div>
        <p class="draft-note"><span aria-hidden="true">✓</span> Optional contracts, rankings, and milestones can safely wait.</p>`;
      advance.textContent = 'Resolve blockers';
      advance.disabled = true;
      footerCancel.textContent = 'Keep working';
    } else {
      title.textContent = 'Ready for Sunday';
      body.innerHTML = `
        <p>Required work is complete. Review one explicit risk before the game begins.</p>
        <div class="readiness-list">
          ${readinessItem('depth', true, `Start ${selectedDepthName() || 'Caleb Ward'} at LT`, 'Depth chart saved.')}
          ${readinessItem('gameplan', true, 'Denver game plan saved', 'Staff instructions are ready.')}
        </div>
        <div class="warning-box">
          <label><input type="checkbox" id="warningCheck" ${state.warningAcknowledged ? 'checked' : ''}/><span><b>Matchup warning: emergency left tackle</b><small>Denver ranks #3 in pressure rate. The plan reduces—but does not remove—the risk.</small></span></label>
        </div>`;
      advance.textContent = 'Play Week 14 vs Denver';
      advance.disabled = !state.warningAcknowledged;
      footerCancel.textContent = 'Review again';
      const check = $('#warningCheck');
      check?.addEventListener('change', () => {
        state.warningAcknowledged = check.checked;
        saveState();
        advance.disabled = !check.checked;
      });
    }
    $$('[data-readiness-route]', body).forEach(btn => btn.addEventListener('click', () => {
      readinessDialog.close();
      setScreen(btn.dataset.readinessRoute);
    }));
  }

  function readinessItem(route, complete, title, copy) {
    return `<div class="readiness-item ${complete ? 'is-complete' : ''}">
      <span aria-hidden="true">${complete ? '✓' : '!'}</span>
      <span><b>${title}</b><small>${copy}</small></span>
      ${complete ? '<small>Complete</small>' : `<button class="button button--tertiary" type="button" data-readiness-route="${route}">Resolve</button>`}
    </div>`;
  }

  function openReadiness() {
    renderReadiness();
    readinessDialog.showModal();
  }

  function renderChip() {
    const next = nextTask();
    const body = $('#chipBody');
    const action = $('#chipAction');
    if (state.chipMuted) {
      body.innerHTML = `<p class="chip-message">Guidance is muted. I’ll stay out of the way until you ask.</p><div class="chip-facts"><div><b>Where you are</b><span>${currentLocationLabel()}</span></div></div>`;
      action.textContent = 'Unmute guidance';
      action.dataset.action = 'unmute';
      $('#muteChip').textContent = 'Keep muted';
      return;
    }
    $('#muteChip').textContent = 'Mute guidance';
    if (next === 'depth') {
      body.innerHTML = `<p class="chip-message">Start with left tackle. The lineup decision changes which game plan is safest.</p><div class="chip-facts"><div><b>Why first</b><span>Marcus Bell’s injury created the only hard blocker in the lineup.</span></div><div><b>Best evidence</b><span>Denver is #3 in pressure rate; Caleb Ward grades highest in pass protection.</span></div></div>`;
      action.textContent = 'Set left tackle'; action.dataset.action = 'depth';
    } else if (next === 'gameplan') {
      body.innerHTML = `<p class="chip-message">The depth chart is handled. Now build the plan around the replacement tackle.</p><div class="chip-facts"><div><b>Recommended</b><span>Quick rhythm on offense; contain the quarterback on defense.</span></div><div><b>What can wait</b><span>Contracts, rankings, and the career milestone are optional this week.</span></div></div>`;
      action.textContent = 'Set game plan'; action.dataset.action = 'gameplan';
    } else {
      body.innerHTML = `<p class="chip-message">You’re ready. Review the one pressure-matchup warning, then play Sunday.</p><div class="chip-facts"><div><b>What changed</b><span>Both required decisions are saved and the staff plan is coherent.</span></div><div><b>Remaining risk</b><span>An emergency left tackle still faces an elite edge rush.</span></div></div>`;
      action.textContent = 'Review readiness'; action.dataset.action = 'readiness';
    }
  }

  function currentLocationLabel() {
    return state.screen === 'depth' ? 'Team / Depth chart' : state.screen === 'gameplan' ? 'Game / Matchup plan' : state.screen === 'advanced' ? 'Game / Week 14 result' : 'Today / Monday briefing';
  }

  function renderAll() {
    $$('[data-week-number]').forEach(n => n.textContent = String(state.week));
    updateTasks();
    updateDepthForm();
    updateGameplanForm();
    setScreen(state.screen, { focus: false });
  }

  $$('[data-open-screen]').forEach(el => el.addEventListener('click', () => setScreen(el.dataset.openScreen)));
  $$('[data-nav]').forEach(el => el.addEventListener('click', () => {
    const target = el.dataset.nav;
    if (target === 'today') setScreen('today');
    else if (target === 'team') setScreen('depth');
    else if (target === 'game') setScreen('gameplan');
    else {
      $('#placeholderTitle').textContent = `${target[0].toUpperCase() + target.slice(1)} hub: represented, not implemented`;
      placeholderDialog.showModal();
    }
  }));
  $$('[data-placeholder]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    $('#placeholderTitle').textContent = `${el.dataset.placeholder}: represented, not implemented`;
    placeholderDialog.showModal();
  }));

  $('#depthForm').addEventListener('change', e => {
    if (e.target.name === 'leftTackle') {
      state.depthChoice = e.target.value;
      state.warningAcknowledged = false;
      saveState(); updateDepthForm(); updateDock();
    }
  });
  $('#gameplanForm').addEventListener('change', e => {
    if (e.target.name === 'offense') state.offense = e.target.value;
    if (e.target.name === 'defense') state.defense = e.target.value;
    state.warningAcknowledged = false;
    saveState(); updateGameplanForm(); updateDock();
  });

  $('#dockSecondary').addEventListener('click', () => {
    if (state.screen === 'depth' || state.screen === 'gameplan') setScreen('today');
    else {
      const n = nextTask();
      setScreen(n === 'readiness' ? 'today' : n);
    }
  });
  $('#dockPrimary').addEventListener('click', () => {
    if (state.screen === 'depth') {
      if (!state.depthChoice) return;
      state.depthComplete = true; state.warningAcknowledged = false; saveState(); updateTasks(); showToast(`Depth chart saved: ${selectedDepthName()} starts at LT.`); setScreen('today');
    } else if (state.screen === 'gameplan') {
      if (!(state.offense && state.defense)) return;
      state.gameplanComplete = true; state.warningAcknowledged = false; saveState(); updateTasks(); showToast('Denver game plan saved.'); setScreen('today');
    } else openReadiness();
  });

  $('#advanceButton').addEventListener('click', () => {
    if (remainingTasks() || !state.warningAcknowledged) return;
    readinessDialog.close();
    state.advanced = true; state.screen = 'advanced'; saveState(); setScreen('advanced');
    showToast('Week 14 simulated with the saved lineup and plan.');
  });
  $('#continueWeek15').addEventListener('click', () => {
    state = { ...defaultState, week: 15 };
    saveState(); renderAll(); showToast('Week 15 briefing ready.');
  });

  $('#chipTrigger').addEventListener('click', () => { renderChip(); chipPanel.showModal(); $('#chipTrigger').setAttribute('aria-expanded','true'); });
  chipPanel.addEventListener('close', () => $('#chipTrigger').setAttribute('aria-expanded','false'));
  $('#muteChip').addEventListener('click', () => { state.chipMuted = true; saveState(); renderChip(); showToast('Chip guidance muted.'); });
  $('#chipAction').addEventListener('click', () => {
    const action = $('#chipAction').dataset.action;
    if (action === 'unmute') { state.chipMuted = false; saveState(); renderChip(); showToast('Chip guidance restored.'); return; }
    chipPanel.close();
    if (action === 'readiness') openReadiness(); else setScreen(action);
  });

  $('#resetPrototype').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY); state = { ...defaultState }; renderAll(); showToast('Prototype reset to Monday briefing.');
  });
  $('#searchButton').addEventListener('click', () => { $('#placeholderTitle').textContent = 'Search is a power tool—not required for the weekly loop'; placeholderDialog.showModal(); });
  $('#notificationsButton').addEventListener('click', () => { $('#placeholderTitle').textContent = 'Notifications resolve to durable destinations'; placeholderDialog.showModal(); });
  $('#profileButton').addEventListener('click', () => { $('#placeholderTitle').textContent = 'System and Dynasty stay reachable without crowding phone navigation'; placeholderDialog.showModal(); });

  renderAll();
})();
