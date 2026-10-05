/* Chat thế giới dùng API local và PostgreSQL; không gửi tiến trình game lên server. */
(() => {
  const root = document.getElementById('worldChat');
  if (!root) return;
  const battle = document.getElementById('battle');
  const inputModeButton = document.getElementById('inBtn');
  const toggle = root.querySelector('.wc-toggle');
  const panel = root.querySelector('.wc-panel');
  const maximizeButton = root.querySelector('.wc-maximize');
  const list = root.querySelector('.wc-list');
  const systemList = root.querySelector('.wc-system-list');
  const form = root.querySelector('.wc-form');
  const input = root.querySelector('.wc-input');
  const sendButton = root.querySelector('.wc-send');
  const emojiToggle = root.querySelector('.wc-emoji-toggle');
  const emojiPicker = root.querySelector('.wc-emoji-picker');
  const emojiGrid = root.querySelector('.wc-emoji-grid');
  const emojiClose = root.querySelector('.wc-emoji-close');
  if ([toggle, panel, maximizeButton, list, systemList, form, input, sendButton, emojiToggle, emojiPicker, emojiGrid, emojiClose].some(node => !node)) {
    // Keep a usable basic chat toggle when an older HTML shell is paired with
    // this script; missing optional chat controls must not hide the whole widget.
    root.hidden = false;
    if (toggle && panel) toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    return;
  }
  const unreadBadge = root.querySelector('.wc-unread');
  const onlineLabel = root.querySelector('.wc-online');
  const statusLabel = root.querySelector('.wc-status');
  const tabButtons = [...root.querySelectorAll('[data-chat-tab]')];
  const FACTION_SHORT = {
    shaolin: 'TL', emei: 'NM', tangmen: 'ĐM', wudang: 'VĐ', wudu: 'NĐ',
    cuiyan: 'TY', gaibang: 'CB', kunlun: 'CL', tianwang: 'TV', tianren: 'TN'
  };
  const CHAT_SHOW_TIME_KEY = 'jxidle_chat_show_time';
  let showTime = true;
  try { showTime = localStorage.getItem(CHAT_SHOW_TIME_KEY) !== 'false'; } catch (_) { /* Mặc định hiện giờ nếu storage bị chặn. */ }
  const MAX_MESSAGES = 80;
  const IDLE_FRAME_MS = 5000;
  let source = null;
  let unread = 0;
  let lastSentAt = 0;
  let idleFrameTimer = 0;
  let pendingMessage = null;
  let pendingArticle = null;
  let activeTab = 'world';
  const knownIds = new Set();
  const recent = [];
  let smileyEmojis = null;

  function positionInputModeButton() {
    if (!inputModeButton) return;
    if (root.hidden || panel.hidden || !document.body.classList.contains('deskland')) {
      inputModeButton.style.removeProperty('top');
      inputModeButton.style.removeProperty('bottom');
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const battleRect = battle.getBoundingClientRect();
    const scale = battle.offsetHeight ? battleRect.height / battle.offsetHeight : 1;
    const top = Math.max(0, (panelRect.top - battleRect.top) / scale - inputModeButton.offsetHeight - 8);
    inputModeButton.style.setProperty('top', `${top}px`, 'important');
    inputModeButton.style.setProperty('bottom', 'auto', 'important');
  }

  function buildSmileyEmojis() {
    const ranges = [
      [0x2639, 0x263a], [0x1f600, 0x1f644],
      [0x1f910, 0x1f917], [0x1f920, 0x1f92f],
      [0x1f970, 0x1f97a], [0x1f9d0, 0x1f9d0],
      [0x1fae0, 0x1fae8]
    ];
    const emojis = [];
    for (const [from, to] of ranges) for (let cp = from; cp <= to; cp++) {
      const char = String.fromCodePoint(cp);
      emojis.push(cp <= 0x263a ? `${char}\ufe0f` : char);
    }
    return [...new Set(emojis)];
  }

  function renderSmileys() {
    if (!smileyEmojis) smileyEmojis = buildSmileyEmojis();
    const fragment = document.createDocumentFragment();
    for (const emoji of smileyEmojis) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wc-emoji-item';
      button.dataset.emoji = emoji;
      button.textContent = emoji;
      button.title = emoji;
      button.setAttribute('aria-label', emoji);
      button.setAttribute('role', 'gridcell');
      fragment.append(button);
    }
    emojiGrid.replaceChildren(fragment);
    emojiGrid.scrollTop = 0;
  }

  function setEmojiPicker(open, refresh = true) {
    if (open) renderSmileys();
    emojiPicker.hidden = !open;
    panel.classList.toggle('wc-emoji-open', open);
    root.classList.toggle('wc-emoji-active', open);
    emojiToggle.setAttribute('aria-expanded', String(open));
    if (refresh && !panel.hidden) showFrameAndStartIdle();
  }

  function insertEmoji(emoji) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (input.value.length - (end - start) + emoji.length > input.maxLength) return;
    input.setRangeText(emoji, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setEmojiPicker(false);
    input.focus({ preventScroll: true });
  }

  function clientId() {
    const key = 'jxidle_chat_client_id';
    try {
      const saved = localStorage.getItem(key);
      if (saved && /^[0-9a-f-]{16,64}$/i.test(saved)) return saved;
      const fresh = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, fresh);
      return fresh;
    } catch (_) {
      return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function identity() {
    const playerFaction = typeof S !== 'undefined' && S && S.fac && FAC[S.fac] ? FAC[S.fac] : null;
    const faction = playerFaction ? S.fac : '';
    return {
      name: playerFaction ? String(S.name || playerFaction.n).trim().slice(0, 24) : '',
      faction,
      level: typeof S !== 'undefined' && S && S.fac ? Math.max(1, Number(S.lvl) || 1) : 1
    };
  }

  function showStatus(text, state = '') {
    statusLabel.textContent = text;
    statusLabel.dataset.state = state;
    statusLabel.hidden = !text;
  }

  function setUnread(value) {
    unread = value;
    unreadBadge.textContent = unread > 99 ? '99+' : String(unread);
    unreadBadge.hidden = unread < 1;
  }

  function timeText(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function renderMessage(message) {
    const article = document.createElement('div');
    article.className = 'wc-line';
    const time = document.createElement('span');
    time.className = 'wc-time';
    time.textContent = timeText(message.created_at);
    time.hidden = !showTime;
    const timeSpace = document.createElement('span');
    timeSpace.className = 'wc-time-space';
    timeSpace.textContent = ' ';
    timeSpace.hidden = !showTime;
    const player = document.createElement('b');
    player.className = 'wc-name';
    player.textContent = String(message.name || 'Tân thủ');
    const faction = FAC[message.faction];
    const factionName = document.createElement('span');
    factionName.className = 'wc-faction';
    factionName.textContent = FACTION_SHORT[message.faction] || (faction ? faction.n : String(message.faction || 'Giang hồ'));
    const level = document.createElement('span');
    level.className = 'wc-level';
    level.textContent = `Lv${Number(message.level) || 1}:`;
    const body = document.createElement('span');
    body.className = 'wc-message-text';
    body.textContent = String(message.message || '');
    article.append(time, timeSpace, player, document.createTextNode(' '), factionName, document.createTextNode(' '), level, document.createTextNode(' '), body);
    return article;
  }

  function addMessage(message, notify = false) {
    if (!message || message.id == null) return;
    const id = String(message.id);
    if (knownIds.has(id)) return;
    const serverTime = new Date(message.created_at).getTime();
    if (pendingMessage && pendingArticle
      && String(message.name || 'Tân thủ') === pendingMessage.name
      && String(message.faction || '') === pendingMessage.faction
      && (Number(message.level) || 1) === pendingMessage.level
      && String(message.message || '') === pendingMessage.message
      && Number.isFinite(serverTime) && serverTime >= pendingMessage.startedAt - 5_000) {
      const confirmedArticle = renderMessage(message);
      if (pendingArticle.isConnected) pendingArticle.replaceWith(confirmedArticle);
      else list.append(confirmedArticle);
      pendingMessage = null;
      pendingArticle = null;
      knownIds.add(id);
      recent.push(id);
      if (recent.length > MAX_MESSAGES * 2) knownIds.delete(recent.shift());
      while (list.children.length > MAX_MESSAGES) list.firstElementChild.remove();
      if (!panel.hidden && activeTab === 'world') list.scrollTop = list.scrollHeight;
      return;
    }
    knownIds.add(id);
    recent.push(id);
    if (recent.length > MAX_MESSAGES * 2) knownIds.delete(recent.shift());
    list.append(renderMessage(message));
    while (list.children.length > MAX_MESSAGES) list.firstElementChild.remove();

    if (notify && (panel.hidden || activeTab !== 'world')) setUnread(unread + 1);
    else if (!panel.hidden && activeTab === 'world') list.scrollTop = list.scrollHeight;
  }

  function loadInitial(messages) {
    list.replaceChildren();
    knownIds.clear();
    recent.length = 0;
    for (const message of messages || []) addMessage(message, false);
    if (pendingArticle && !pendingArticle.isConnected) list.append(pendingArticle);
    list.scrollTop = list.scrollHeight;
  }

  function syncSystemLog(logs) {
    systemList.replaceChildren();
    for (const entry of (Array.isArray(logs) ? logs : []).slice(0, 40)) {
      const row = document.createElement('div');
      row.innerHTML = String(entry);
      systemList.append(row);
    }
    if (activeTab === 'system') systemList.scrollTop = 0;
  }

  function setTab(tab) {
    activeTab = tab === 'system' ? 'system' : 'world';
    const isWorld = activeTab === 'world';
    list.hidden = !isWorld;
    systemList.hidden = isWorld;
    form.hidden = !isWorld;
    tabButtons.forEach(button => {
      const selected = button.dataset.chatTab === activeTab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (isWorld) {
      setUnread(0);
      list.scrollTop = list.scrollHeight;
    } else {
      systemList.scrollTop = 0;
    }
  }

  document.addEventListener('world-chat-time-visibility-change', event => {
    showTime = !!event.detail?.visible;
    root.querySelectorAll('.wc-time, .wc-time-space').forEach(element => { element.hidden = !showTime; });
  });

  function updatePresence(count) {
    const online = Math.max(0, Number(count) || 0);
    onlineLabel.textContent = `Online ${online}`;
  }

  function connect() {
    if (source) return;
    source = new EventSource(`/api/chat/stream?client_id=${encodeURIComponent(clientId())}`);
    source.addEventListener('open', () => {
      showStatus('', 'ok');
    });
    source.addEventListener('ready', event => {
      try {
        const data = JSON.parse(event.data);
        loadInitial(data.messages);
        updatePresence(data.online);
      } catch (_) { showStatus('Dữ liệu chat không hợp lệ', 'error'); }
    });
    source.addEventListener('message', event => {
      try { addMessage(JSON.parse(event.data), true); } catch (_) { /* Bỏ qua sự kiện lỗi định dạng. */ }
    });
    source.addEventListener('presence', event => {
      try { updatePresence(JSON.parse(event.data).online); } catch (_) { /* Bỏ qua sự kiện lỗi định dạng. */ }
    });
    source.addEventListener('error', () => {
      showStatus('Đang nối lại…', 'wait');
    });
  }

  async function start() {
    try {
      const response = await fetch('/api/chat/messages?limit=1', { cache: 'no-store' });
      if (!response.headers.get('content-type')?.includes('application/json')) return;
      root.hidden = false;
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        showStatus(result.error || 'Database chat chưa sẵn sàng', 'error');
      }
      connect();
    } catch (_) {
      // Trang tĩnh không có API chat thì không hiển thị nút chưa hoạt động.
    }
  }

  function setOpen(open) {
    if (!open) {
      clearTimeout(idleFrameTimer);
      idleFrameTimer = 0;
      setEmojiPicker(false, false);
      panel.classList.remove('wc-idle');
      setMaximized(false);
    }
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng chat thế giới' : 'Mở chat thế giới');
    root.classList.toggle('wc-open', open);
    positionInputModeButton();
    if (open) {
      showFrameAndStartIdle();
      if (activeTab === 'world') {
        setUnread(0);
        list.scrollTop = list.scrollHeight;
      } else systemList.scrollTop = 0;
    }
  }

  function showFrameAndStartIdle() {
    if (panel.hidden) return;
    clearTimeout(idleFrameTimer);
    panel.classList.remove('wc-idle');
    idleFrameTimer = setTimeout(() => {
      if (!panel.hidden && !panel.classList.contains('wc-emoji-open')) panel.classList.add('wc-idle');
    }, IDLE_FRAME_MS);
  }

  function hideFrameForJoystick() {
    if (panel.hidden) return;
    clearTimeout(idleFrameTimer);
    idleFrameTimer = 0;
    panel.classList.add('wc-idle');
  }

  function setMaximized(maximized) {
    panel.classList.toggle('wc-maximized', maximized);
    root.classList.toggle('wc-maximized', maximized);
    maximizeButton.textContent = maximized ? '×' : '⛶';
    maximizeButton.setAttribute('aria-expanded', String(maximized));
    maximizeButton.setAttribute('aria-label', maximized ? 'Thu nhỏ khung chat' : 'Phóng to khung chat');
    maximizeButton.title = maximized ? 'Thu nhỏ khung chat' : 'Phóng to khung chat';
    positionInputModeButton();
    if (maximized) list.scrollTop = list.scrollHeight;
  }

  async function send(event) {
    event.preventDefault();
    const who = identity();
    const message = [...input.value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, 240).join('');
    if (!who.name || !who.faction) { showStatus('Hãy tạo nhân vật trước', 'wait'); return; }
    if (!message) return;
    const wait = 1500 - (Date.now() - lastSentAt);
    if (wait > 0) { showStatus(`Chờ ${Math.ceil(wait / 1000)} giây rồi gửi tiếp`, 'wait'); return; }

    pendingMessage = { ...who, message, startedAt: Date.now() };
    pendingArticle = renderMessage({ ...pendingMessage, id: `pending-${Date.now()}`, created_at: new Date().toISOString() });
    pendingArticle.classList.add('wc-pending');
    list.append(pendingArticle);
    while (list.children.length > MAX_MESSAGES) list.firstElementChild.remove();
    list.scrollTop = list.scrollHeight;
    input.value = '';
    showStatus('Đang gửi…', 'wait');
    sendButton.disabled = true;
    input.disabled = true;
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...who, message })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không gửi được tin nhắn.');
      lastSentAt = Date.now();
      showStatus('Đã gửi', 'ok');
      if (result.message) addMessage(result.message, false);
    } catch (error) {
      if (pendingArticle) {
        pendingArticle.classList.remove('wc-pending');
        pendingArticle.classList.add('wc-failed');
        const delivery = document.createElement('span');
        delivery.className = 'wc-delivery';
        delivery.textContent = ' (chưa gửi)';
        pendingArticle.append(delivery);
        pendingArticle = null;
        pendingMessage = null;
        showStatus(error.message || 'Không kết nối được chat', 'error');
      } else {
        showStatus('Đã gửi', 'ok');
      }
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
    }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  maximizeButton.addEventListener('click', () => setMaximized(!panel.classList.contains('wc-maximized')));
  emojiToggle.addEventListener('click', () => setEmojiPicker(emojiPicker.hidden));
  emojiClose.addEventListener('click', () => setEmojiPicker(false));
  emojiGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-emoji]');
    if (button) insertEmoji(button.dataset.emoji);
  });
  document.addEventListener('click', event => {
    if (!emojiPicker.hidden && !emojiPicker.contains(event.target) && !emojiToggle.contains(event.target)) setEmojiPicker(false);
  });
  for (const type of ['pointerdown', 'pointermove', 'click', 'keydown', 'focusin', 'input', 'wheel']) {
    panel.addEventListener(type, showFrameAndStartIdle, { passive: type === 'pointermove' || type === 'wheel' });
  }
  tabButtons.forEach(button => button.addEventListener('click', () => setTab(button.dataset.chatTab)));
  form.addEventListener('submit', send);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !emojiPicker.hidden) {
      event.preventDefault();
      event.stopPropagation();
      setEmojiPicker(false);
      return;
    }
    if (event.key === 'Enter' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey
      && !root.hidden
      && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !event.target.isContentEditable
      && !event.target.closest('button,a,[role="button"]')) {
      const modal = document.getElementById('modal');
      if (!modal || modal.classList.contains('hidden')) {
        event.preventDefault();
        if (panel.hidden) setOpen(true);
        else showFrameAndStartIdle();
        input.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key !== 'Escape' || panel.hidden) return;
    if (panel.classList.contains('wc-maximized')) {
      event.preventDefault();
      event.stopPropagation();
      setMaximized(false);
      showFrameAndStartIdle();
    } else {
      setOpen(false);
    }
  });
  window.addEventListener('pagehide', () => { if (source) source.close(); });
  window.syncWorldChatSystem = syncSystemLog;
  window.hideWorldChatFrameForJoystick = hideFrameForJoystick;
  window.positionWorldChatModeButton = positionInputModeButton;
  setUnread(0);
  syncSystemLog(typeof R !== 'undefined' && R && R.logs ? R.logs : []);
  setTab('world');
  showStatus('Đang kết nối…', 'wait');
  window.addEventListener('resize', positionInputModeButton);
  start();
})();
