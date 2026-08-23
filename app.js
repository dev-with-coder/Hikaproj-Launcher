// Hikaproj Launcher - Main Application Script

// ============================================
// Data Store & State Management
// ============================================
const STORE = {
  bookmarks: [],
  rssFeeds: [],
  providers: [],
  models: [],
  chats: [],
  searchHistory: [],
  settings: {
    theme: 'dark',
    background: { type: 'color', value: '', opacity: 0.8, blur: 5 },
    visibility: { search: true, bookmarks: true, rss: true, weather: true, ai: true },
    weather: { provider: 'openmeteo', location: { lat: 35.6895, lon: 139.6917 } }
  }
};

// ============================================
// Utility Functions
// ============================================
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function saveData() {
  localStorage.setItem('hikaproj-launcher', JSON.stringify(STORE));
}

function loadData() {
  const data = localStorage.getItem('hikaproj-launcher');
  if (data) {
    const parsed = JSON.parse(data);
    Object.assign(STORE, parsed);
  }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=default&sz=64';
  }
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTheme();
  initDateTime();
  initSearch();
  initBookmarks();
  initRSS();
  initWeather();
  initAI();
  initSettings();
  initPWA();
  renderAll();
});

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.error('SW registration failed:', err));
  }
}

function initTheme() {
  const isDark = STORE.settings.theme === 'dark' || 
    (!STORE.settings.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  updateBackground();
}

function updateBackground() {
  const bg = STORE.settings.background;
  const layer = document.getElementById('background-layer');
  if (bg.type === 'image' && bg.value) {
    layer.style.backgroundImage = `url(${bg.value})`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center';
    layer.style.opacity = bg.opacity;
    layer.style.filter = `blur(${bg.blur}px)`;
  } else {
    layer.style.backgroundImage = 'none';
    layer.style.opacity = 1;
    layer.style.filter = 'none';
  }
}

// ============================================
// Date & Time
// ============================================
function initDateTime() {
  function update() {
    const now = new Date();
    const hours = now.getHours();
    let greeting = 'こんにちは';
    if (hours >= 5 && hours < 11) greeting = 'おはようございます';
    else if (hours >= 11 && hours < 17) greeting = 'こんにちは';
    else if (hours >= 17 && hours < 22) greeting = 'こんばんは';
    else greeting = 'おやすみなさい';
    
    document.getElementById('greeting-text').textContent = greeting;
    document.getElementById('datetime-text').textContent = 
      now.toLocaleString('ja-JP', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
  }
  update();
  setInterval(update, 1000);
}

// ============================================
// Search Functionality
// ============================================
function initSearch() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');
  const engineSelect = document.getElementById('search-engine');
  
  engineSelect.value = STORE.search.defaultEngine || 'google';
  renderSearchHistory();
  
  const engines = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    yahoo: 'https://search.yahoo.co.jp/search?p='
  };
  
  function performSearch() {
    const query = input.value.trim();
    if (!query) return;
    
    const engine = engineSelect.value;
    STORE.search.defaultEngine = engine;
    
    // Add to history
    const idx = STORE.searchHistory.indexOf(query);
    if (idx > -1) STORE.searchHistory.splice(idx, 1);
    STORE.searchHistory.unshift(query);
    if (STORE.searchHistory.length > 20) STORE.searchHistory.pop();
    saveData();
    renderSearchHistory();
    
    window.open(engines[engine] + encodeURIComponent(query), '_blank');
    input.value = '';
  }
  
  btn.addEventListener('click', performSearch);
  input.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
  engineSelect.addEventListener('change', () => { STORE.search.defaultEngine = engineSelect.value; saveData(); });
}

function renderSearchHistory() {
  const container = document.getElementById('search-history');
  container.innerHTML = STORE.searchHistory.slice(0, 5).map(q => 
    `<button onclick="document.getElementById('search-input').value='${q.replace(/'/g, "\\'")}';" 
             class="text-xs bg-white/10 dark:bg-black/20 px-2 py-1 rounded hover:bg-primary/50 transition">${q}</button>`
  ).join('');
}

// ============================================
// Bookmarks
// ============================================
let editingBookmarkId = null;

function initBookmarks() {
  document.getElementById('add-bookmark-btn').addEventListener('click', () => openBookmarkModal());
  document.getElementById('save-bookmark-btn').addEventListener('click', saveBookmark);
  document.getElementById('bookmark-search').addEventListener('input', renderBookmarks);
}

function openBookmarkModal(id = null) {
  editingBookmarkId = id;
  const modal = document.getElementById('bookmark-modal');
  const title = document.getElementById('bookmark-modal-title');
  
  if (id) {
    const bm = STORE.bookmarks.find(b => b.id === id);
    title.textContent = 'ブックマークを編集';
    document.getElementById('bm-title').value = bm.title;
    document.getElementById('bm-url').value = bm.url;
    document.getElementById('bm-category').value = bm.category || '';
  } else {
    title.textContent = 'ブックマークを追加';
    document.getElementById('bm-title').value = '';
    document.getElementById('bm-url').value = '';
    document.getElementById('bm-category').value = '';
  }
  
  // Populate categories
  const categories = [...new Set(STORE.bookmarks.map(b => b.category).filter(Boolean))];
  document.getElementById('bm-categories').innerHTML = categories.map(c => `<option value="${c}">`).join('');
  
  modal.classList.remove('hidden');
}

function closeBookmarkModal() {
  document.getElementById('bookmark-modal').classList.add('hidden');
  editingBookmarkId = null;
}

function saveBookmark() {
  const title = document.getElementById('bm-title').value.trim();
  const url = document.getElementById('bm-url').value.trim();
  const category = document.getElementById('bm-category').value.trim();
  
  if (!title || !url) return alert('名前と URL を入力してください');
  
  if (editingBookmarkId) {
    const bm = STORE.bookmarks.find(b => b.id === editingBookmarkId);
    bm.title = title;
    bm.url = url;
    bm.category = category;
  } else {
    STORE.bookmarks.push({
      id: generateId(),
      title,
      url,
      category,
      icon: getFaviconUrl(url),
      order: STORE.bookmarks.length
    });
  }
  
  saveData();
  renderBookmarks();
  closeBookmarkModal();
}

function deleteBookmark(id) {
  if (!confirm('削除しますか？')) return;
  STORE.bookmarks = STORE.bookmarks.filter(b => b.id !== id);
  saveData();
  renderBookmarks();
}

function renderBookmarks() {
  const container = document.getElementById('bookmarks-container');
  const filter = document.getElementById('bookmark-search').value.toLowerCase();
  
  const filtered = STORE.bookmarks.filter(b => 
    b.title.toLowerCase().includes(filter) || b.url.toLowerCase().includes(filter)
  );
  
  container.innerHTML = filtered.map(bm => `
    <div class="bookmark-card draggable-item glass-effect rounded-xl p-4 cursor-pointer relative group"
         draggable="true" data-id="${bm.id}"
         onclick="window.open('${bm.url.replace(/'/g, "\\'")}', '_blank')">
      <button onclick="event.stopPropagation(); openBookmarkModal('${bm.id}')" 
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-primary">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="event.stopPropagation(); deleteBookmark('${bm.id}')" 
              class="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-500">
        <i class="fas fa-trash"></i>
      </button>
      <img src="${bm.icon}" alt="" class="w-10 h-10 rounded-lg mb-2 bg-white/20">
      <p class="font-medium text-sm truncate">${bm.title}</p>
      ${bm.category ? `<p class="text-xs text-gray-500 dark:text-gray-400">${bm.category}</p>` : ''}
    </div>
  `).join('');
  
  // Drag and drop
  setupDragDrop(container, 'bookmarks');
}

// ============================================
// RSS Feeds
// ============================================
let currentRssFeed = 'all';

function initRSS() {
  document.getElementById('manage-rss-btn').addEventListener('click', openRssModal);
  document.getElementById('add-rss-btn').addEventListener('click', () => openRssModal(null));
  document.getElementById('save-rss-btn').addEventListener('click', saveRssFeed);
  refreshRSS();
}

function openRssModal(id = null) {
  const modal = document.getElementById('rss-modal');
  const title = document.getElementById('rss-modal-title');
  
  if (id) {
    const feed = STORE.rssFeeds.find(f => f.id === id);
    title.textContent = 'RSS フィードを編集';
    document.getElementById('rss-name').value = feed.name;
    document.getElementById('rss-url').value = feed.url;
  } else {
    title.textContent = 'RSS フィードを追加';
    document.getElementById('rss-name').value = '';
    document.getElementById('rss-url').value = '';
  }
  
  modal.classList.remove('hidden');
}

function closeRssModal() {
  document.getElementById('rss-modal').classList.add('hidden');
}

function saveRssFeed() {
  const name = document.getElementById('rss-name').value.trim();
  const url = document.getElementById('rss-url').value.trim();
  
  if (!name || !url) return alert('名前と URL を入力してください');
  
  STORE.rssFeeds.push({ id: generateId(), name, url, order: STORE.rssFeeds.length });
  saveData();
  closeRssModal();
  renderRSSTabs();
  refreshRSS();
}

function deleteRssFeed(id) {
  if (!confirm('削除しますか？')) return;
  STORE.rssFeeds = STORE.rssFeeds.filter(f => f.id !== id);
  saveData();
  renderRSSTabs();
  refreshRSS();
}

function renderRSSTabs() {
  const container = document.getElementById('rss-tabs');
  container.innerHTML = `
    <button onclick="switchRssFeed('all')" 
            class="px-3 py-1 rounded-lg text-sm ${currentRssFeed === 'all' ? 'bg-primary text-white' : 'bg-white/10'}">
      すべて
    </button>
    ${STORE.rssFeeds.map(f => `
      <button onclick="switchRssFeed('${f.id}')" 
              class="px-3 py-1 rounded-lg text-sm ${currentRssFeed === f.id ? 'bg-primary text-white' : 'bg-white/10'}">
        ${f.name}
      </button>
    `).join('')}
  `;
}

function switchRssFeed(id) {
  currentRssFeed = id;
  renderRSSTabs();
  refreshRSS();
}

async function refreshRSS() {
  const container = document.getElementById('rss-content');
  container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> 読込中...</div>';
  
  let feeds = STORE.rssFeeds;
  if (currentRssFeed !== 'all') {
    feeds = feeds.filter(f => f.id === currentRssFeed);
  }
  
  const allItems = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(`https://api.rss2json.com/api/v1/rss.json?rss_url=${encodeURIComponent(feed.url)}`);
      const data = await res.json();
      if (data.status === 'ok') {
        data.items.slice(0, 5).forEach(item => {
          allItems.push({ ...item, feedName: feed.name });
        });
      }
    } catch (err) {
      console.error('RSS fetch error:', err);
    }
  }
  
  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  if (allItems.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-gray-500">ニュースがありません</div>';
    return;
  }
  
  container.innerHTML = allItems.map(item => `
    <div class="glass-effect rounded-xl p-4 hover:bg-white/10 transition">
      <p class="text-xs text-gray-500 mb-1">${item.feedName} • ${new Date(item.pubDate).toLocaleDateString()}</p>
      <a href="${item.link}" target="_blank" class="font-medium hover:text-primary block">${item.title}</a>
      ${item.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">${item.description.replace(/<[^>]*>/g, '')}</p>` : ''}
    </div>
  `).join('');
}

// ============================================
// Weather
// ============================================
async function initWeather() {
  const provider = STORE.settings.weather.provider;
  document.getElementById('weather-provider').value = provider;
  document.getElementById('jma-location-setting').classList.toggle('hidden', provider !== 'jma');
  document.getElementById('jma-location').value = 
    provider === 'jma' ? (STORE.settings.weather.location.cityCode || '') : 
    `${STORE.settings.weather.location.lat},${STORE.settings.weather.location.lon}`;
  
  await fetchWeather();
  setInterval(fetchWeather, 1800000); // 30 minutes
}

async function fetchWeather() {
  const provider = STORE.settings.weather.provider;
  const loc = STORE.settings.weather.location;
  
  try {
    let temp, desc;
    
    if (provider === 'openmeteo') {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true`
      );
      const data = await res.json();
      temp = Math.round(data.current_weather.temperature);
      desc = getWeatherDesc(data.current_weather.weathercode);
    } else {
      // JMA - simplified implementation using Open-Meteo as fallback
      // Full JMA API requires XML parsing through CORS proxy
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat || 35.6895}&longitude=${loc.lon || 139.6917}&current_weather=true`
      );
      const data = await res.json();
      temp = Math.round(data.current_weather.temperature);
      desc = getWeatherDesc(data.current_weather.weathercode) + ' (JMA)';
    }
    
    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-desc').textContent = desc;
  } catch (err) {
    console.error('Weather fetch error:', err);
  }
}

function getWeatherDesc(code) {
  const descs = {
    0: '晴れ', 1: 'ほぼ晴れ', 2: '曇り', 3: '曇り',
    45: '霧', 48: '霧',
    51: '霧雨', 53: '霧雨', 55: '霧雨',
    61: '雨', 63: '雨', 65: '雨',
    71: '雪', 73: '雪', 75: '雪',
    95: '雷雨', 96: '雷雨', 99: '雷雨'
  };
  return descs[code] || '不明';
}

// ============================================
// AI Chat
// ============================================
let currentChatId = null;

function initAI() {
  document.getElementById('new-chat-btn').addEventListener('click', newChat);
  document.getElementById('chat-send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  populateModelSelect();
}

function populateModelSelect() {
  const select = document.getElementById('ai-model-select');
  select.innerHTML = STORE.models.map(m => 
    `<option value="${m.id}">${m.name} (${m.modelId})</option>`
  ).join('') || '<option value="">モデルを設定してください</option>';
}

function newChat() {
  currentChatId = generateId();
  STORE.chats.push({ id: currentChatId, messages: [], createdAt: new Date().toISOString() });
  saveData();
  renderChatMessages([]);
}

function renderChatMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 dark:text-gray-400 mt-20">
        <i class="fas fa-comments text-4xl mb-2"></i>
        <p>AI チャットを開始するには、メッセージを入力してください</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = messages.map(msg => `
    <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
      <div class="max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white/10'}">
        ${marked.parse(msg.content)}
      </div>
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
  hljs.highlightAll();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content) return;
  
  const modelId = document.getElementById('ai-model-select').value;
  const model = STORE.models.find(m => m.id === modelId);
  if (!model) return alert('モデルを選択してください');
  
  const provider = STORE.providers.find(p => p.id === model.providerId);
  if (!provider) return alert('プロバイダが設定されていません');
  
  if (!currentChatId) newChat();
  
  const chat = STORE.chats.find(c => c.id === currentChatId);
  chat.messages.push({ role: 'user', content });
  saveData();
  renderChatMessages(chat.messages);
  input.value = '';
  
  // Show typing indicator
  const container = document.getElementById('chat-messages');
  container.innerHTML += `
    <div class="flex justify-start">
      <div class="bg-white/10 rounded-xl p-3 typing-indicator">
        <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
        <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
        <span class="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
      </div>
    </div>
  `;
  container.scrollTop = container.scrollHeight;
  
  try {
    const response = await callAI(provider, model, chat.messages);
    chat.messages.push({ role: 'assistant', content: response });
    saveData();
    renderChatMessages(chat.messages);
  } catch (err) {
    chat.messages.push({ role: 'assistant', content: `エラー: ${err.message}` });
    saveData();
    renderChatMessages(chat.messages);
  }
}

async function callAI(provider, model, messages) {
  const endpoint = getAIEndpoint(provider);
  const payload = getAIPayload(provider, model, messages);
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  
  const data = await res.json();
  return extractAIResponse(provider, data);
}

function getAIEndpoint(provider) {
  switch (provider.type) {
    case 'gemini':
      return `${provider.baseUrl}/models/${model.modelId}:generateContent?key=${provider.apiKey}`;
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    default:
      return `${provider.baseUrl}/chat/completions`;
  }
}

function getAIPayload(provider, model, messages) {
  const formattedMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  
  if (provider.type === 'gemini') {
    return {
      contents: [{ parts: [{ text: messages[messages.length - 1].content }] }]
    };
  }
  
  return {
    model: model.modelId,
    messages: formattedMessages,
    stream: false
  };
}

function extractAIResponse(provider, data) {
  if (provider.type === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  }
  return data.choices?.[0]?.message?.content || 'No response';
}

// ============================================
// Settings
// ============================================
function initSettings() {
  document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Visibility toggles
  ['search', 'bookmarks', 'rss', 'weather', 'ai'].forEach(key => {
    const el = document.getElementById(`vis-${key}`);
    el.checked = STORE.settings.visibility[key];
    el.addEventListener('change', () => {
      STORE.settings.visibility[key] = el.checked;
      saveData();
      renderAll();
    });
  });
  
  // Background settings
  document.getElementById('bg-url').value = STORE.settings.background.value || '';
  document.getElementById('bg-opacity').value = STORE.settings.background.opacity;
  document.getElementById('opacity-value').textContent = STORE.settings.background.opacity;
  document.getElementById('bg-blur').value = STORE.settings.background.blur;
  document.getElementById('blur-value').textContent = STORE.settings.background.blur;
  
  document.getElementById('bg-url').addEventListener('change', e => {
    STORE.settings.background.type = 'image';
    STORE.settings.background.value = e.target.value;
    saveData();
    updateBackground();
  });
  
  document.getElementById('bg-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        STORE.settings.background.type = 'image';
        STORE.settings.background.value = ev.target.result;
        saveData();
        updateBackground();
      };
      reader.readAsDataURL(file);
    }
  });
  
  document.getElementById('bg-opacity').addEventListener('input', e => {
    STORE.settings.background.opacity = parseFloat(e.target.value);
    document.getElementById('opacity-value').textContent = e.target.value;
    saveData();
    updateBackground();
  });
  
  document.getElementById('bg-blur').addEventListener('input', e => {
    STORE.settings.background.blur = parseInt(e.target.value);
    document.getElementById('blur-value').textContent = e.target.value;
    saveData();
    updateBackground();
  });
  
  // Weather settings
  document.getElementById('weather-provider').addEventListener('change', e => {
    STORE.settings.weather.provider = e.target.value;
    document.getElementById('jma-location-setting').classList.toggle('hidden', e.target.value !== 'jma');
    saveData();
    initWeather();
  });
  
  document.getElementById('jma-location').addEventListener('change', e => {
    const val = e.target.value;
    if (val.includes(',')) {
      const [lat, lon] = val.split(',').map(Number);
      STORE.settings.weather.location = { lat, lon };
    } else {
      STORE.settings.weather.location.cityCode = val;
    }
    saveData();
    initWeather();
  });
  
  // Export/Import
  document.getElementById('export-all-btn').addEventListener('click', exportAll);
  document.getElementById('export-selected-btn').addEventListener('click', () => {
    document.getElementById('export-options').classList.remove('hidden');
  });
  document.getElementById('confirm-export-btn').addEventListener('click', exportSelected);
  document.getElementById('import-file').addEventListener('change', handleImport);
  
  renderProvidersList();
  renderModelsList();
  renderRssFeedsList();
}

function openSettingsModal() {
  document.getElementById('settings-modal').classList.remove('hidden');
  renderProvidersList();
  renderModelsList();
  renderRssFeedsList();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function toggleTheme() {
  const isDark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', isDark);
  STORE.settings.theme = isDark ? 'dark' : 'light';
  saveData();
}

// Provider management
let editingProviderId = null;

document.getElementById('add-provider-btn').addEventListener('click', () => openProviderModal());
document.getElementById('save-provider-btn').addEventListener('click', saveProvider);

function openProviderModal(id = null) {
  editingProviderId = id;
  const modal = document.getElementById('provider-modal');
  const title = document.getElementById('provider-modal-title');
  
  if (id) {
    const p = STORE.providers.find(p => p.id === id);
    title.textContent = 'プロバイダを編集';
    document.getElementById('prov-name').value = p.name;
    document.getElementById('prov-type').value = p.type;
    document.getElementById('prov-baseurl').value = p.baseUrl;
    document.getElementById('prov-apikey').value = p.apiKey;
  } else {
    title.textContent = 'プロバイダを追加';
    document.getElementById('prov-name').value = '';
    document.getElementById('prov-type').value = 'openai';
    document.getElementById('prov-baseurl').value = '';
    document.getElementById('prov-apikey').value = '';
  }
  
  modal.classList.remove('hidden');
}

function closeProviderModal() {
  document.getElementById('provider-modal').classList.add('hidden');
  editingProviderId = null;
}

function saveProvider() {
  const name = document.getElementById('prov-name').value.trim();
  const type = document.getElementById('prov-type').value;
  const baseUrl = document.getElementById('prov-baseurl').value.trim();
  const apiKey = document.getElementById('prov-apikey').value.trim();
  
  if (!name || !apiKey) return alert('名前と API キーを入力してください');
  
  if (editingProviderId) {
    const p = STORE.providers.find(p => p.id === editingProviderId);
    p.name = name;
    p.type = type;
    p.baseUrl = baseUrl || getDefaultBaseUrl(type);
    p.apiKey = apiKey;
  } else {
    STORE.providers.push({
      id: generateId(),
      name,
      type,
      baseUrl: baseUrl || getDefaultBaseUrl(type),
      apiKey,
      priority: STORE.providers.length + 1
    });
  }
  
  saveData();
  closeProviderModal();
  renderProvidersList();
  populateModelSelect();
}

function getDefaultBaseUrl(type) {
  const urls = {
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    openai: 'https://api.openai.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1',
    opencode: 'https://api.opencode.ai/v1'
  };
  return urls[type] || '';
}

function deleteProvider(id) {
  if (!confirm('削除しますか？')) return;
  STORE.providers = STORE.providers.filter(p => p.id !== id);
  STORE.models = STORE.models.filter(m => m.providerId !== id);
  saveData();
  renderProvidersList();
  renderModelsList();
}

function renderProvidersList() {
  const container = document.getElementById('providers-list');
  container.innerHTML = STORE.providers.map((p, idx) => `
    <div class="glass-effect rounded-xl p-3 flex justify-between items-center draggable-item" draggable="true" data-idx="${idx}" data-type="provider">
      <div>
        <p class="font-medium">${p.name}</p>
        <p class="text-xs text-gray-500">${p.type} • ${p.baseUrl}</p>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="moveItem('provider', ${idx}, -1)" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-chevron-up"></i></button>
        <button onclick="moveItem('provider', ${idx}, 1)" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-chevron-down"></i></button>
        <button onclick="openProviderModal('${p.id}')" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-edit"></i></button>
        <button onclick="deleteProvider('${p.id}')" class="p-1 hover:bg-red-500/20 text-red-500 rounded"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('<p class="text-sm text-gray-500 text-center">ドラッグ＆ドロップは現在サポートされていません。矢印ボタンで並び替えてください。</p>') || 
    '<p class="text-sm text-gray-500 text-center py-4">プロバイダがありません</p>';
}

// Model management
let editingModelId = null;

document.getElementById('add-model-btn').addEventListener('click', () => openModelModal());
document.getElementById('save-model-btn').addEventListener('click', saveModel);

function openModelModal(id = null) {
  editingModelId = id;
  const modal = document.getElementById('model-modal');
  const title = document.getElementById('model-modal-title');
  
  // Populate provider dropdown
  const provSelect = document.getElementById('model-provider');
  provSelect.innerHTML = STORE.providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  if (id) {
    const m = STORE.models.find(m => m.id === id);
    title.textContent = 'モデルを編集';
    document.getElementById('model-name').value = m.name;
    document.getElementById('model-id').value = m.modelId;
    provSelect.value = m.providerId;
  } else {
    title.textContent = 'モデルを追加';
    document.getElementById('model-name').value = '';
    document.getElementById('model-id').value = '';
    provSelect.value = STORE.providers[0]?.id || '';
  }
  
  modal.classList.remove('hidden');
}

function closeModelModal() {
  document.getElementById('model-modal').classList.add('hidden');
  editingModelId = null;
}

function saveModel() {
  const name = document.getElementById('model-name').value.trim();
  const modelId = document.getElementById('model-id').value.trim();
  const providerId = document.getElementById('model-provider').value;
  
  if (!name || !modelId || !providerId) return alert('すべての項目を入力してください');
  
  if (editingModelId) {
    const m = STORE.models.find(m => m.id === editingModelId);
    m.name = name;
    m.modelId = modelId;
    m.providerId = providerId;
  } else {
    STORE.models.push({
      id: generateId(),
      name,
      modelId,
      providerId,
      priority: STORE.models.length + 1
    });
  }
  
  saveData();
  closeModelModal();
  renderModelsList();
  populateModelSelect();
}

function deleteModel(id) {
  if (!confirm('削除しますか？')) return;
  STORE.models = STORE.models.filter(m => m.id !== id);
  saveData();
  renderModelsList();
  populateModelSelect();
}

function renderModelsList() {
  const container = document.getElementById('models-list');
  container.innerHTML = STORE.models.map((m, idx) => {
    const provider = STORE.providers.find(p => p.id === m.providerId);
    return `
      <div class="glass-effect rounded-xl p-3 flex justify-between items-center draggable-item" draggable="true" data-idx="${idx}" data-type="model">
        <div>
          <p class="font-medium">${m.name}</p>
          <p class="text-xs text-gray-500">${m.modelId} • ${provider?.name || 'Unknown'}</p>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="moveItem('model', ${idx}, -1)" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-chevron-up"></i></button>
          <button onclick="moveItem('model', ${idx}, 1)" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-chevron-down"></i></button>
          <button onclick="openModelModal('${m.id}')" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-edit"></i></button>
          <button onclick="deleteModel('${m.id}')" class="p-1 hover:bg-red-500/20 text-red-500 rounded"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-sm text-gray-500 text-center py-4">モデルがありません</p>';
}

// RSS feeds list in settings
function renderRssFeedsList() {
  const container = document.getElementById('rss-feeds-list');
  container.innerHTML = STORE.rssFeeds.map((f, idx) => `
    <div class="glass-effect rounded-xl p-3 flex justify-between items-center">
      <div>
        <p class="font-medium">${f.name}</p>
        <p class="text-xs text-gray-500 truncate max-w-xs">${f.url}</p>
      </div>
      <button onclick="deleteRssFeed('${f.id}')" class="p-1 hover:bg-red-500/20 text-red-500 rounded"><i class="fas fa-trash"></i></button>
    </div>
  `).join('') || '<p class="text-sm text-gray-500 text-center py-4">RSS フィードがありません</p>';
}

// Move item (priority reordering)
function moveItem(type, idx, delta) {
  const arr = type === 'provider' ? STORE.providers : STORE.models;
  if (idx + delta < 0 || idx + delta >= arr.length) return;
  [arr[idx], arr[idx + delta]] = [arr[idx + delta], arr[idx]];
  saveData();
  if (type === 'provider') renderProvidersList();
  else renderModelsList();
}

// Drag and drop setup
function setupDragDrop(container, type) {
  let draggedItem = null;
  
  container.querySelectorAll('.draggable-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      draggedItem = item;
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      draggedItem = null;
      item.classList.remove('dragging');
    });
    
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (!draggedItem || draggedItem === item) return;
      
      const items = Array.from(container.querySelectorAll('.draggable-item'));
      const draggedIdx = items.indexOf(draggedItem);
      const targetIdx = items.indexOf(item);
      
      const arr = type === 'bookmarks' ? STORE.bookmarks : 
                  type === 'provider' ? STORE.providers : STORE.models;
      
      if (draggedIdx < targetIdx) {
        container.insertBefore(draggedItem, item.nextSibling);
        arr.splice(targetIdx + 1, 0, arr.splice(draggedIdx, 1)[0]);
      } else {
        container.insertBefore(draggedItem, item);
        arr.splice(targetIdx, 0, arr.splice(draggedIdx, 1)[0]);
      }
      
      saveData();
      if (type === 'bookmarks') renderBookmarks();
      else if (type === 'provider') renderProvidersList();
      else renderModelsList();
    });
  });
}

// Export/Import
function exportAll() {
  downloadJSON(STORE, 'hikaproj-launcher-all.json');
}

function exportSelected() {
  const options = document.querySelectorAll('.export-option:checked');
  const selected = Array.from(options).map(o => o.value);
  
  const data = { version: '1.0', exportedAt: new Date().toISOString() };
  
  if (selected.includes('bookmarks')) data.bookmarks = STORE.bookmarks;
  if (selected.includes('rss')) data.rssFeeds = STORE.rssFeeds;
  if (selected.includes('ai')) { data.providers = STORE.providers; data.models = STORE.models; data.chats = STORE.chats; }
  if (selected.includes('background')) data.background = STORE.settings.background;
  if (selected.includes('search')) data.searchHistory = STORE.searchHistory;
  
  downloadJSON(data, 'hikaproj-launcher-selected.json');
  document.getElementById('export-options').classList.add('hidden');
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const mode = document.getElementById('import-mode').value;
      
      if (mode === 'overwrite') {
        Object.assign(STORE, data);
      } else if (mode === 'merge') {
        if (data.bookmarks) {
          const existingIds = new Set(STORE.bookmarks.map(b => b.id));
          data.bookmarks.forEach(b => { if (!existingIds.has(b.id)) STORE.bookmarks.push(b); });
        }
        if (data.rssFeeds) {
          const existingIds = new Set(STORE.rssFeeds.map(f => f.id));
          data.rssFeeds.forEach(f => { if (!existingIds.has(f.id)) STORE.rssFeeds.push(f); });
        }
        if (data.providers) {
          const existingIds = new Set(STORE.providers.map(p => p.id));
          data.providers.forEach(p => { if (!existingIds.has(p.id)) STORE.providers.push(p); });
        }
        if (data.models) {
          const existingIds = new Set(STORE.models.map(m => m.id));
          data.models.forEach(m => { if (!existingIds.has(m.id)) STORE.models.push(m); });
        }
      } else if (mode === 'keep') {
        if (!STORE.bookmarks.length && data.bookmarks) STORE.bookmarks = data.bookmarks;
        if (!STORE.rssFeeds.length && data.rssFeeds) STORE.rssFeeds = data.rssFeeds;
        if (!STORE.providers.length && data.providers) STORE.providers = data.providers;
        if (!STORE.models.length && data.models) STORE.models = data.models;
        if (!STORE.settings.background.value && data.background) STORE.settings.background = data.background;
      }
      
      saveData();
      renderAll();
      alert('インポート完了しました');
    } catch (err) {
      alert('エラー: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function renderAll() {
  renderBookmarks();
  renderRSSTabs();
  refreshRSS();
  populateModelSelect();
  updateBackground();
  
  // Toggle sections
  document.getElementById('search-section').classList.toggle('hidden', !STORE.settings.visibility.search);
  document.getElementById('bookmarks-section').classList.toggle('hidden', !STORE.settings.visibility.bookmarks);
  document.getElementById('rss-section').classList.toggle('hidden', !STORE.settings.visibility.rss);
  document.getElementById('greeting-section').classList.toggle('hidden', !STORE.settings.visibility.weather);
  document.getElementById('ai-section').classList.toggle('hidden', !STORE.settings.visibility.ai);
}
