// popup.js (Версія 8.3 - Остаточне виправлення локалізації)

const languages = [
    { code: 'ua', name: 'Українська', value: 'українською' },
    { code: 'gb', name: 'English', value: 'англійською' },
    { code: 'pl', name: 'Polski', value: 'польською' },
    { code: 'de', name: 'Deutsch', value: 'німецькою' },
    { code: 'fr', name: 'Français', value: 'французькою' },
    { code: 'es', name: 'Español', value: 'іспанською' },
    { code: 'pt', name: 'Português', value: 'португальською' },
    { code: 'jp', name: '日本語', value: 'японською' },
    { code: 'kr', name: '한국어', value: 'корейською' },
    { code: 'cn', name: '中文', value: 'китайською' }
];

// === СПОЧАТКУ ВСІ ОГОЛОШЕННЯ ФУНКЦІЙ ===

function localizeHTML() {
    // Знаходимо ВСІ елементи, які треба перекласти
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        const translation = chrome.i18n.getMessage(key);
        if (translation) {
            // Просто встановлюємо текстовий вміст елемента, це найнадійніше
            element.textContent = translation;
        }
    });

    // Окремо обробляємо атрибути title для підказок
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.dataset.i18nTitle;
        const translation = chrome.i18n.getMessage(key);
        if (translation) {
            element.title = translation;
        }
    });
}

function setupTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function setupTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    chrome.storage.local.get(['theme'], res => setTheme(res.theme || 'light'));
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    });
}

function setTheme(themeName) {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    document.body.className = themeName === 'dark' ? 'dark-theme' : '';
    themeToggleBtn.textContent = themeName === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.title = themeName === 'dark' ? 'Світла тема' : 'Темна тема';
}

function setupCustomSelect() {
    const select = document.getElementById('language-select');
    const trigger = select.querySelector('.select-trigger');
    const optionsContainer = select.querySelector('.custom-options');
    optionsContainer.innerHTML = '';
    languages.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'option';
        option.dataset.value = lang.value;
        option.innerHTML = `<span class="fi fi-${lang.code}"></span><span style="margin-left: 10px;">${lang.name}</span>`;
        option.addEventListener('click', (e) => { e.stopPropagation(); setSelectedLanguage(lang); select.classList.remove('open'); });
        optionsContainer.appendChild(option);
    });
    chrome.storage.local.get(['savedLanguage'], res => {
        const initialLang = languages.find(l => l.value === res.savedLanguage) || languages[0];
        setSelectedLanguage(initialLang);
    });
    trigger.addEventListener('click', (e) => { e.stopPropagation(); select.classList.toggle('open'); });
}

function setSelectedLanguage(lang) {
    const trigger = document.querySelector('.select-trigger');
    trigger.innerHTML = `<div class="trigger-content"><span class="fi fi-${lang.code}"></span><span style="margin-left: 10px;">${lang.code.toUpperCase()}</span></div><div class="arrow"></div>`;
    trigger.dataset.selectedValue = lang.value;
    chrome.storage.local.set({ savedLanguage: lang.value });
    document.querySelectorAll('.custom-options .option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === lang.value);
    });
}

function setupLengthSlider() {
    const optionsContainer = document.querySelector('.summary-options');
    const optionButtons = optionsContainer.querySelectorAll('.option-btn');
    const moveSlider = (targetButton) => {
        optionsContainer.style.setProperty('--slider-left', `${targetButton.offsetLeft}px`);
        optionsContainer.style.setProperty('--slider-width', `${targetButton.offsetWidth}px`);
        optionButtons.forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');
    };
    const initiallyActiveButton = optionsContainer.querySelector('.option-btn.active');
    if (initiallyActiveButton) setTimeout(() => moveSlider(initiallyActiveButton), 50);
    optionButtons.forEach(button => button.addEventListener('click', () => moveSlider(button)));
}

function setupActionButtons() {
    document.getElementById('summarize-btn').addEventListener('click', handleSummarizeClick);
    document.getElementById('copy-btn').addEventListener('click', (e) => handleCopyClick(null, e.currentTarget));
    document.getElementById('share-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const text = document.getElementById('summary-text').textContent;
        handleShareClick(text, e.currentTarget);
    });
    document.getElementById('donate-btn').addEventListener('click', () => {
        const donationUrl = 'https://www.buymeacoffee.com/your-page';
        chrome.tabs.create({ url: donationUrl });
    });
}

async function handleSummarizeClick() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const summaryText = document.getElementById('summary-text');
    const actionsToolbar = document.getElementById('actions-toolbar');
    loadingSpinner.classList.remove('hidden');
    summaryText.textContent = '';
    actionsToolbar.classList.add('hidden');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes("youtube.com/watch")) {
        summaryText.textContent = chrome.i18n.getMessage("errorYoutubePage");
        loadingSpinner.classList.add('hidden');
        return;
    }
    try {
        const summaryLength = document.querySelector('.option-btn.active').dataset.length;
        const selectedLanguage = document.querySelector('.select-trigger').dataset.selectedValue;
        const response = await fetch('http://localhost:5000/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: tab.url, language: selectedLanguage, summary_length: summaryLength }),
        });
        const data = await response.json();
        if (!response.ok) {
            if (data.error && (data.error.includes("не знайдено") || data.error.includes("вимкнено"))) { throw new Error(chrome.i18n.getMessage("errorNoSubtitles")); }
            throw new Error(data.error || 'Невідома помилка сервера');
        }
        summaryText.textContent = data.summary;
        actionsToolbar.classList.remove('hidden');
        await saveToHistory({ text: data.summary, url: tab.url, title: tab.title });
        await renderHistory();
    } catch (error) {
        summaryText.textContent = `Помилка: ${error.message}`;
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

async function saveToHistory(newEntry) {
    const { history = [] } = await chrome.storage.local.get('history');
    history.unshift({ ...newEntry, id: Date.now() });
    const trimmedHistory = history.slice(0, 10);
    await chrome.storage.local.set({ history: trimmedHistory });
}

async function renderHistory() {
    const historyListDiv = document.getElementById('history-list');
    const { history = [] } = await chrome.storage.local.get('history');
    historyListDiv.innerHTML = ''; 
    if (history.length === 0) {
        historyListDiv.innerHTML = `<p class="empty-history">${chrome.i18n.getMessage("historyEmpty")}</p>`;
        return;
    }
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `<p>${item.text}</p><div class="result-actions"><button class="copy-btn" data-i18n-title="copyButtonTitle"><i class="fas fa-copy"></i> <span data-i18n="copyButtonTitle"></span></button><button class="share-trigger-btn" data-i18n-title="shareButtonTitle"><i class="fas fa-share-alt"></i> <span data-i18n="shareButtonTitle"></span></button></div>`;
        historyItem.querySelector('.copy-btn').addEventListener('click', (e) => handleCopyClick(item.text, e.currentTarget));
        historyItem.querySelector('.share-trigger-btn').addEventListener('click', (e) => { e.stopPropagation(); handleShareClick(item.text, e.currentTarget, item.url); });
        historyListDiv.appendChild(historyItem);
    });
    localizeHTML();
}

function handleCopyClick(textToCopy, buttonElement) {
    const text = typeof textToCopy === 'string' ? textToCopy : document.getElementById('summary-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
        if (buttonElement) {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = `✅ ${chrome.i18n.getMessage("copiedAlert")}`;
            setTimeout(() => { buttonElement.innerHTML = originalHTML; }, 2000);
        }
    }).catch(err => { console.error('Не вдалося скопіювати текст: ', err); });
}

function handleShareClick(textToShare, triggerButton, urlToShare) {
    const shareMenu = document.getElementById('share-menu');
    if (shareMenu.classList.contains('visible') && shareMenu.trigger === triggerButton) { shareMenu.classList.remove('visible'); return; }
    updateShareLinks(textToShare, urlToShare);
    const btnRect = triggerButton.getBoundingClientRect();
    const containerRect = document.querySelector('.app-container').getBoundingClientRect();
    shareMenu.style.top = `${btnRect.top - containerRect.top + btnRect.height + 5}px`;
    shareMenu.style.left = `${btnRect.left - containerRect.left}px`;
    shareMenu.classList.add('visible');
    shareMenu.trigger = triggerButton;
}

async function updateShareLinks(text, url) {
    let pageUrl = url;
    if (!pageUrl) { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); pageUrl = tab.url; }
    const encodedUrl = encodeURIComponent(pageUrl);
    const encodedText = encodeURIComponent(text.substring(0, 250) + "...");
    document.querySelector('.share-link[data-network="twitter"]').href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    document.querySelector('.share-link[data-network="facebook"]').href = `https://www.facebook.com/sharer/sharer.php?u=youtu.be/&quote=${encodedUrl}&quote=${encodedText}`;
    document.querySelector('.share-link[data-network="telegram"]').href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
}

// === І ЛИШЕ В САМОМУ КІНЦІ - ЗАПУСК СКРИПТА ===

document.addEventListener('DOMContentLoaded', () => {
    localizeHTML();
    setupTabs();
    setupTheme();
    setupCustomSelect();
    setupLengthSlider();
    setupActionButtons();
    renderHistory();
    
    window.addEventListener('click', (e) => {
        const langSelect = document.getElementById('language-select');
        if (langSelect && !langSelect.contains(e.target)) { langSelect.classList.remove('open'); }
        const shareMenu = document.getElementById('share-menu');
        if (shareMenu && !shareMenu.contains(e.target) && !e.target.closest('.share-trigger-btn')) { shareMenu.classList.remove('visible'); }
    });
});