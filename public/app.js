const state = {
  operators: [],
  mode: 'chainGame',
  chainGame: {
    currentPlayer: 'A',
    currentAction: 'disable',
    selections: {
      A: { disable: [], select: [] },
      B: { disable: [], select: [] }
    }
  },
  combat: {
    available: [],
    currentOperator: null,
    playerA: { talent: 20, intel: 0, action: '放弃', cost: 1, revealed: false },
    playerB: { talent: 20, intel: 0, action: '放弃', cost: 1, revealed: false },
    roundLog: [],
    roster: { A: [], B: [] },
    disabledSubProfessions: [],
    ended: false,
    phase: 'idle',
    confirmedA: false,
    confirmedB: false,
    activePlayer: 'A',
    viewPlayer: 'A'
  }
};

const elements = {
  modeButtons: document.getElementById('modeButtons'),
  chainGameView: document.getElementById('chainGameView'),
  chainCombatView: document.getElementById('chainCombatView'),
  operatorList: document.getElementById('operatorList'),
  operatorSearch: document.getElementById('operatorSearch'),
  currentPlayer: document.getElementById('currentPlayer'),
  currentAction: document.getElementById('currentAction'),
  disableCount: document.getElementById('disableCount'),
  selectCount: document.getElementById('selectCount'),
  selectionSummary: document.getElementById('selectionSummary'),
  chainGameResult: document.getElementById('chainGameResult'),
  generateChainGameBtn: document.getElementById('generateChainGameBtn'),
  startRoundBtn: document.getElementById('startRoundBtn'),
  endCombatBtn: document.getElementById('endCombatBtn'),
  combatViewPlayer: document.getElementById('combatViewPlayer'),
  combatStatus: document.getElementById('combatStatus'),
  currentOperatorCard: document.getElementById('currentOperatorCard'),
  roundLog: document.getElementById('roundLog'),
  finalRoster: document.getElementById('finalRoster'),
  playerADecision: document.getElementById('playerADecision'),
  playerBDecision: document.getElementById('playerBDecision'),
  talentA: document.getElementById('talentA'),
  intelA: document.getElementById('intelA'),
  talentB: document.getElementById('talentB'),
  intelB: document.getElementById('intelB')
};

async function bootstrap() {
  const response = await fetch('/api/operators');
  state.operators = await response.json();
  state.combat.available = [...state.operators];
  renderOperatorList();
  renderSelectionSummary();
  bindEvents();
  renderCombatInterface();
}

function bindEvents() {
  elements.modeButtons.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    state.mode = button.dataset.mode;
    document.querySelectorAll('#modeButtons button').forEach((item) => item.classList.toggle('active', item === button));
    elements.chainGameView.classList.toggle('hidden', state.mode !== 'chainGame');
    elements.chainCombatView.classList.toggle('hidden', state.mode !== 'chainCombat');
  });

  elements.operatorSearch.addEventListener('input', renderOperatorList);
  elements.currentPlayer.addEventListener('change', (event) => {
    state.chainGame.currentPlayer = event.target.value;
    renderSelectionSummary();
    renderOperatorList();
  });
  elements.currentAction.addEventListener('change', (event) => {
    state.chainGame.currentAction = event.target.value;
    renderSelectionSummary();
    renderOperatorList();
  });
  elements.disableCount.addEventListener('input', () => {
    enforceSelectionLimits();
    renderSelectionSummary();
    renderOperatorList();
  });
  elements.selectCount.addEventListener('input', () => {
    enforceSelectionLimits();
    renderSelectionSummary();
    renderOperatorList();
  });
  elements.generateChainGameBtn.addEventListener('click', generateChainGameResult);

  elements.startRoundBtn.addEventListener('click', startCombatRound);
  elements.endCombatBtn.addEventListener('click', () => {
    state.combat.ended = true;
    elements.combatStatus.textContent = '对局已结束，已生成双方名单。';
    renderCombatInterface();
  });
  elements.combatViewPlayer.addEventListener('change', (event) => {
    state.combat.viewPlayer = event.target.value;
    renderCombatInterface();
  });
}

function clampSelectionLimit(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function enforceSelectionLimits() {
  const disableLimit = clampSelectionLimit(elements.disableCount.value);
  const selectLimit = clampSelectionLimit(elements.selectCount.value);

  state.chainGame.selections.A.disable = state.chainGame.selections.A.disable.slice(0, disableLimit);
  state.chainGame.selections.B.disable = state.chainGame.selections.B.disable.slice(0, disableLimit);
  state.chainGame.selections.A.select = state.chainGame.selections.A.select.slice(0, selectLimit);
  state.chainGame.selections.B.select = state.chainGame.selections.B.select.slice(0, selectLimit);
}

function isGloballyDisabled(name) {
  return state.chainGame.selections.A.disable.includes(name) || state.chainGame.selections.B.disable.includes(name);
}

function isGloballySelected(name) {
  return state.chainGame.selections.A.select.includes(name) || state.chainGame.selections.B.select.includes(name);
}

function canSelectChainOperator(player, action, name) {
  const current = state.chainGame.selections[player][action];
  if (current.includes(name)) {
    return true;
  }

  const globallyDisabled = isGloballyDisabled(name);
  const globallySelected = isGloballySelected(name);

  if (action === 'select') {
    if (globallyDisabled) return false;
    if (globallySelected) return false;
  }

  if (action === 'disable') {
    if (globallyDisabled) return false;
    if (globallySelected) return false;
  }

  if (action === 'select' && state.chainGame.selections[player].disable.includes(name)) {
    return false;
  }

  const limit = action === 'disable' ? clampSelectionLimit(elements.disableCount.value) : clampSelectionLimit(elements.selectCount.value);
  if (limit > 0 && current.length >= limit) {
    return false;
  }

  return true;
}

function renderOperatorList() {
  const query = elements.operatorSearch.value.trim().toLowerCase();
  const list = state.operators.filter((operator) => {
    return [operator.name, operator.branch, operator.subProfession].join(' ').toLowerCase().includes(query);
  });

  elements.operatorList.innerHTML = '';
  list.forEach((operator) => {
    const card = document.createElement('div');
    card.className = 'operator-card';
    const player = state.chainGame.currentPlayer;
    const action = state.chainGame.currentAction;
    const current = state.chainGame.selections[player][action];
    const selected = current.includes(operator.name);
    const globallyDisabled = isGloballyDisabled(operator.name);
    const globallySelected = isGloballySelected(operator.name);
    const disabledByPlayer = state.chainGame.selections[player].disable.includes(operator.name);
    const locked = (action === 'select' && globallyDisabled && !selected) || (action === 'disable' && globallySelected && !selected);

    card.classList.toggle('active', selected || globallyDisabled || globallySelected);
    card.classList.toggle('disabled', globallyDisabled);
    card.classList.toggle('locked', locked);
    card.innerHTML = `
      <img src="${operator.image}" alt="${operator.name}" />
      <strong>${operator.name}</strong>
      <div>${operator.branch}</div>
      <div>${operator.subProfession}</div>
      <div class="tag">${globallyDisabled ? '已禁用' : globallySelected ? '已选择' : ''}</div>
    `;
    card.addEventListener('click', () => {
      if (locked) {
        return;
      }
      toggleChainSelection(operator.name);
    });
    elements.operatorList.appendChild(card);
  });
}

function toggleChainSelection(name) {
  const player = state.chainGame.currentPlayer;
  const action = state.chainGame.currentAction;
  const arr = state.chainGame.selections[player][action];
  if (!canSelectChainOperator(player, action, name)) {
    return;
  }

  if (arr.includes(name)) {
    state.chainGame.selections[player][action] = arr.filter((item) => item !== name);
    if (action === 'disable') {
      state.chainGame.selections.A.select = state.chainGame.selections.A.select.filter((item) => item !== name);
      state.chainGame.selections.B.select = state.chainGame.selections.B.select.filter((item) => item !== name);
    }
  } else {
    state.chainGame.selections[player][action].push(name);
    if (action === 'disable') {
      state.chainGame.selections.A.select = state.chainGame.selections.A.select.filter((item) => item !== name);
      state.chainGame.selections.B.select = state.chainGame.selections.B.select.filter((item) => item !== name);
    }
    if (action === 'select') {
      state.chainGame.selections[player].disable = state.chainGame.selections[player].disable.filter((item) => item !== name);
    }
  }
  renderSelectionSummary();
  renderOperatorList();
}

function renderSelectionSummary() {
  const player = state.chainGame.currentPlayer;
  const action = state.chainGame.currentAction;
  const current = state.chainGame.selections[player][action];
  const summary = [
    ['玩家A 禁用', state.chainGame.selections.A.disable],
    ['玩家A 选择', state.chainGame.selections.A.select],
    ['玩家B 禁用', state.chainGame.selections.B.disable],
    ['玩家B 选择', state.chainGame.selections.B.select]
  ]
    .map(([label, items]) => `<div><strong>${label}</strong><div>${items.length ? items.join('、') : '暂无'}</div></div>`)
    .join('');

  elements.selectionSummary.innerHTML = `
    <p>当前正在编辑：${player === 'A' ? '玩家A' : '玩家B'} · ${action === 'disable' ? '禁用' : '选择'}</p>
    <div class="selection-list">${summary}</div>
    <p>当前列表：${current.length ? current.join('、') : '暂无'}</p>
  `;
}

function generateChainGameResult() {
  enforceSelectionLimits();
  const disableCount = Number(elements.disableCount.value) || 0;
  const selectCount = Number(elements.selectCount.value) || 0;

  const buildList = (player, type) => {
    const names = state.chainGame.selections[player][type];
    const limit = type === 'disable' ? disableCount : selectCount;
    return names.slice(0, limit).map((name) => state.operators.find((operator) => operator.name === name)).filter(Boolean);
  };

  const resultA = { disable: buildList('A', 'disable'), select: buildList('A', 'select') };
  const resultB = { disable: buildList('B', 'disable'), select: buildList('B', 'select') };

  elements.chainGameResult.innerHTML = `
    <div class="selection-panel">
      <h4>玩家A</h4>
      <p><strong>禁用：</strong>${resultA.disable.length ? resultA.disable.map((item) => item.name).join('、') : '暂无'}</p>
      <p><strong>选择：</strong>${resultA.select.length ? resultA.select.map((item) => item.name).join('、') : '暂无'}</p>
    </div>
    <div class="selection-panel">
      <h4>玩家B</h4>
      <p><strong>禁用：</strong>${resultB.disable.length ? resultB.disable.map((item) => item.name).join('、') : '暂无'}</p>
      <p><strong>选择：</strong>${resultB.select.length ? resultB.select.map((item) => item.name).join('、') : '暂无'}</p>
    </div>
  `;
}

function startCombatRound() {
  if (state.combat.ended) {
    elements.combatStatus.textContent = '对局已经结束，无法继续进行。';
    return;
  }
  if (state.combat.available.length === 0) {
    elements.combatStatus.textContent = '已经没有可用干员。';
    return;
  }

  const randomIndex = Math.floor(Math.random() * state.combat.available.length);
  state.combat.currentOperator = state.combat.available[randomIndex];
  state.combat.playerA.action = '放弃';
  state.combat.playerB.action = '放弃';
  state.combat.playerA.cost = 1;
  state.combat.playerB.cost = 1;
  state.combat.playerA.revealed = false;
  state.combat.playerB.revealed = false;
  state.combat.confirmedA = false;
  state.combat.confirmedB = false;
  state.combat.activePlayer = 'A';
  state.combat.viewPlayer = 'A';
  state.combat.phase = 'decision';
  renderCombatInterface();
  elements.combatStatus.textContent = `新回合：随机抽取了干员，当前仅显示子职业。玩家A先决定。`;
}

function renderCombatInterface() {
  elements.talentA.textContent = state.combat.playerA.talent;
  elements.intelA.textContent = state.combat.playerA.intel;
  elements.talentB.textContent = state.combat.playerB.talent;
  elements.intelB.textContent = state.combat.playerB.intel;
  elements.combatViewPlayer.value = state.combat.viewPlayer;

  renderCombatPlayerDecision('A', elements.playerADecision);
  renderCombatPlayerDecision('B', elements.playerBDecision);

  if (!state.combat.currentOperator) {
    elements.currentOperatorCard.innerHTML = '<p>点击“开始新回合”开始抽取干员。</p>';
  } else {
    const viewPlayerKey = state.combat.viewPlayer;
    const player = state.combat[viewPlayerKey === 'A' ? 'playerA' : 'playerB'];
    const revealed = player.revealed;
    const playerInfo = revealed ? renderOperatorInfo(state.combat.currentOperator) : '<p>未查看完整信息。</p>';

    elements.currentOperatorCard.innerHTML = `
      <div>
        <h4>${state.combat.currentOperator.subProfession}</h4>
        <p>当前视角：玩家${viewPlayerKey}</p>
        <p>当前仅显示子职业；若消耗情报点数，则可以查看完整信息。</p>
        <div class="info-section">
          <div><strong>玩家${viewPlayerKey}视角</strong>${playerInfo}</div>
        </div>
      </div>
    `;
  }

  elements.roundLog.innerHTML = state.combat.roundLog.length
    ? state.combat.roundLog.map((entry) => `<div>${entry}</div>`).join('')
    : '<p>暂无回合记录。</p>';

  elements.finalRoster.innerHTML = `
    <div class="roster-section">
      <h4>玩家A 已获干员</h4>
      <div id="rosterA" class="operator-grid compact"></div>
    </div>
    <div class="roster-section">
      <h4>玩家B 已获干员</h4>
      <div id="rosterB" class="operator-grid compact"></div>
    </div>
    <div class="roster-section">
      <h4>已被禁用的子职业</h4>
      <div id="rosterDisabled" class="operator-grid compact"></div>
    </div>
  `;

  const rosterAContainer = document.getElementById('rosterA');
  const rosterBContainer = document.getElementById('rosterB');
  const rosterDisabledContainer = document.getElementById('rosterDisabled');
  if (state.combat.roster.A.length === 0) {
    rosterAContainer.innerHTML = '<p>暂无</p>';
  } else {
    state.combat.roster.A.forEach((operator) => {
      const card = document.createElement('div');
      card.className = 'operator-card';
      card.innerHTML = `
        <img src="${operator.image}" alt="${operator.name}" />
        <strong>${operator.name}</strong>
        <div>${operator.branch}</div>
      `;
      rosterAContainer.appendChild(card);
    });
  }
  if (state.combat.roster.B.length === 0) {
    rosterBContainer.innerHTML = '<p>暂无</p>';
  } else {
    state.combat.roster.B.forEach((operator) => {
      const card = document.createElement('div');
      card.className = 'operator-card';
      card.innerHTML = `
        <img src="${operator.image}" alt="${operator.name}" />
        <strong>${operator.name}</strong>
        <div>${operator.branch}</div>
      `;
      rosterBContainer.appendChild(card);
    });
  }
  if (state.combat.disabledSubProfessions.length === 0) {
    rosterDisabledContainer.innerHTML = '<p>暂无</p>';
  } else {
    state.combat.disabledSubProfessions.forEach((subProfession) => {
      const card = document.createElement('div');
      card.className = 'operator-card';
      card.innerHTML = `
        <strong>${subProfession}</strong>
      `;
      rosterDisabledContainer.appendChild(card);
    });
  }
}

function renderCombatPlayerDecision(playerKey, container) {
  const player = state.combat[playerKey === 'A' ? 'playerA' : 'playerB'];
  const name = playerKey === 'A' ? '玩家A' : '玩家B';
  const confirmed = playerKey === 'A' ? state.combat.confirmedA : state.combat.confirmedB;
  const active = state.combat.activePlayer === playerKey;
  const viewPlayerKey = state.combat.viewPlayer;
  const isCurrentView = playerKey === viewPlayerKey;

  if (!isCurrentView) {
    container.innerHTML = `
      <div><strong>${name}</strong> 当前不可见</div>
      <div>请切换视角到玩家${name === '玩家A' ? 'A' : 'B'}查看。</div>
    `;
    return;
  }

  if (confirmed) {
    container.innerHTML = `
      <div><strong>${name}</strong> 已确认</div>
      <div>决定：${player.action}</div>
      <div>人才点数：${player.cost}</div>
      <div>${player.revealed ? '已查看完整信息。' : '尚未查看完整信息。'}</div>
    `;
    return;
  }

  if (!active) {
    container.innerHTML = `
      <div><strong>${name}</strong> 当前不可见</div>
      <div>等待 ${state.combat.activePlayer === 'A' ? '玩家A' : '玩家B'} 决定。</div>
    `;
    return;
  }

  container.classList.toggle('player-active', active);

  container.innerHTML = `
    <label>
      决定
      <select id="action${playerKey}">
        <option value="抢夺" ${player.action === '抢夺' ? 'selected' : ''}>抢夺</option>
        <option value="放弃" ${player.action === '放弃' ? 'selected' : ''}>放弃</option>
      </select>
    </label>
    <label>
      人才点数
      <input id="cost${playerKey}" type="number" min="1" max="20" value="${player.cost}" />
    </label>
    <button id="submit${playerKey}">确认</button>
    <button id="intel${playerKey}" class="secondary">消耗2情报查看信息</button>
    <div>${player.revealed ? '已查看完整信息。' : '尚未查看完整信息。'}</div>
  `;

  const actionSelect = container.querySelector(`#action${playerKey}`);
  const costInput = container.querySelector(`#cost${playerKey}`);
  const submitButton = container.querySelector(`#submit${playerKey}`);
  const intelButton = container.querySelector(`#intel${playerKey}`);

  actionSelect.addEventListener('change', (event) => {
    player.action = event.target.value;
  });

  costInput.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    player.cost = Number.isNaN(value) ? 1 : Math.min(20, Math.max(1, value));
    event.target.value = player.cost;
  });

  submitButton.addEventListener('click', () => {
    if (!state.combat.currentOperator) {
      elements.combatStatus.textContent = '请先开始新回合。';
      return;
    }
    if (!active) {
      elements.combatStatus.textContent = `当前轮到 ${state.combat.activePlayer === 'A' ? '玩家A' : '玩家B'} 决策。`;
      return;
    }
    if (playerKey === 'A') {
      state.combat.playerA.action = actionSelect.value;
      state.combat.playerA.cost = Number(costInput.value) || 1;
      state.combat.confirmedA = true;
      state.combat.activePlayer = 'B';
      state.combat.viewPlayer = 'B';
    } else {
      state.combat.playerB.action = actionSelect.value;
      state.combat.playerB.cost = Number(costInput.value) || 1;
      state.combat.confirmedB = true;
    }
    if (state.combat.confirmedA && state.combat.confirmedB) {
      resolveCombatRound();
    } else {
      renderCombatInterface();
      elements.combatStatus.textContent = `${name} 已确认，轮到 ${state.combat.activePlayer === 'A' ? '玩家A' : '玩家B'} 决策。`;
    }
  });

  intelButton.addEventListener('click', () => {
    if (!state.combat.currentOperator) {
      elements.combatStatus.textContent = '请先开始新回合。';
      return;
    }
    if (!active) {
      elements.combatStatus.textContent = `当前轮到 ${state.combat.activePlayer === 'A' ? '玩家A' : '玩家B'} 决策。`;
      return;
    }
    if (playerKey === 'A') {
      if (state.combat.playerA.intel < 2) {
        elements.combatStatus.textContent = '情报点数不足，无法查看完整信息。';
        return;
      }
      state.combat.playerA.intel -= 2;
      state.combat.playerA.revealed = true;
    } else {
      if (state.combat.playerB.intel < 2) {
        elements.combatStatus.textContent = '情报点数不足，无法查看完整信息。';
        return;
      }
      state.combat.playerB.intel -= 2;
      state.combat.playerB.revealed = true;
    }
    renderCombatInterface();
    elements.combatStatus.textContent = `${name} 消耗了 2 情报点数，已查看完整信息。`;
  });
}

function resolveCombatRound() {
  if (!state.combat.currentOperator) return;
  const operator = state.combat.currentOperator;
  const aAction = state.combat.playerA.action;
  const bAction = state.combat.playerB.action;
  const aCost = state.combat.playerA.cost;
  const bCost = state.combat.playerB.cost;
  const aLost = aAction === '抢夺' ? aCost : 0;
  const bLost = bAction === '抢夺' ? bCost : 0;

  if (aAction === '放弃' && bAction === '放弃') {
    state.combat.playerA.talent = Math.min(50, state.combat.playerA.talent + 5);
    state.combat.playerB.talent = Math.min(50, state.combat.playerB.talent + 5);
    state.combat.playerA.intel += 1;
    state.combat.playerB.intel += 1;
    state.combat.roundLog.unshift(`双方均放弃，${operator.name}不被获得，且其子职业${operator.subProfession}被禁用。`);
    disableSubProfession(operator.subProfession);
  } else if (aAction === '抢夺' && bAction === '抢夺') {
    state.combat.playerA.talent = Math.max(0, state.combat.playerA.talent - aCost);
    state.combat.playerB.talent = Math.max(0, state.combat.playerB.talent - bCost);
    if (aCost > bCost) {
      grantOperator('A');
      state.combat.roundLog.unshift(`双方都抢夺，玩家A以 ${aCost} 点人才点数获胜。`);
    } else if (bCost > aCost) {
      grantOperator('B');
      state.combat.roundLog.unshift(`双方都抢夺，玩家B以 ${bCost} 点人才点数获胜。`);
    } else {
      state.combat.roundLog.unshift(`双方都抢夺且投入相同，${operator.name}无人获得，且其子职业${operator.subProfession}被禁用。`);
      disableSubProfession(operator.subProfession);
    }
  } else if (aAction === '抢夺' && bAction === '放弃') {
    state.combat.playerA.talent = Math.max(0, state.combat.playerA.talent - aCost);
    state.combat.playerB.talent = Math.min(50, state.combat.playerB.talent + 5);
    state.combat.playerB.intel += 1;
    grantOperator('A');
    state.combat.roundLog.unshift(`玩家A抢夺，玩家B放弃，${operator.name}归玩家A，玩家B获得 5 人才和 1 情报。`);
  } else if (aAction === '放弃' && bAction === '抢夺') {
    state.combat.playerB.talent = Math.max(0, state.combat.playerB.talent - bCost);
    state.combat.playerA.talent = Math.min(50, state.combat.playerA.talent + 5);
    state.combat.playerA.intel += 1;
    grantOperator('B');
    state.combat.roundLog.unshift(`玩家B抢夺，玩家A放弃，${operator.name}归玩家B，玩家A获得 5 人才和 1 情报。`);
  } else {
    state.combat.roundLog.unshift(`错误回合：未识别的选择结果。`);
  }

  state.combat.available = state.combat.available.filter((item) => item.name !== operator.name);
  state.combat.currentOperator = null;
  state.combat.confirmedA = false;
  state.combat.confirmedB = false;
  state.combat.activePlayer = 'A';
  state.combat.viewPlayer = 'A';

  if (state.combat.available.length > 0) {
    startCombatRound();
  } else {
    state.combat.ended = true;
    renderCombatInterface();
    elements.combatStatus.textContent = '没有更多可用干员，连锁对抗结束。';
  }
}

function grantOperator(side) {
  const operator = state.combat.currentOperator;
  state.combat.roster[side].push(operator);
}

function renderOperatorInfo(operator) {
  return `
    <div class="operator-full-info">
      <img src="${operator.image}" alt="${operator.name}" />
      <div>
        <div><strong>${operator.name}</strong></div>
        <div>干员分支：${operator.branch}</div>
        <div>子职业：${operator.subProfession}</div>
      </div>
    </div>
  `;
}

function disableSubProfession(subProfession) {
  if (!state.combat.disabledSubProfessions.includes(subProfession)) {
    state.combat.disabledSubProfessions.push(subProfession);
  }
  state.combat.available = state.combat.available.filter((operator) => operator.subProfession !== subProfession);
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<h1>初始化失败</h1><p>请检查服务端是否成功启动。</p>';
});
