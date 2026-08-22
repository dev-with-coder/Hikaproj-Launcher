const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR',
    es: 'es-ES',
    fr: 'fr-FR'
};
const langSelect = 'ja';
function updateClock() {
    const timeEl = document.getElementById('realtime-time');
    const dateEl = document.getElementById('realtime-date');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    const lang = langSelect.value || 'ja';
    const locale = localeMap[lang] || 'ja-JP';
    const dateOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    };
    dateEl.textContent = new Intl.DateTimeFormat(locale, dateOptions).format(now);
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: lang === 'en',
        hourCycle: 'h23'
    };
    timeEl.textContent = new Intl.DateTimeFormat(locale, timeOptions).format(now);
}
setInterval(updateClock, 1000);

function applyLanguage(lang) {
    updateClock();
}
window.addEventListener('DOMContentLoaded', () => {
    const userLang = (navigator.language || navigator.userLanguage).toLowerCase();
    let targetLang = 'ja';
    if (userLang.startsWith('en')) targetLang = 'en';
    else if (userLang.startsWith('zh')) targetLang = 'zh';
    else if (userLang.startsWith('ko')) targetLang = 'ko';
    else if (userLang.startsWith('es')) targetLang = 'es';
    else if (userLang.startsWith('fr')) targetLang = 'fr';
    langSelect.value = targetLang;
    applyLanguage(targetLang);
});
function md5(str) {
    return CryptoJS.MD5(str).toString();
}

function getGravatarUrl(email, size = 80) {
    if (!email) return null;
    return `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?s=${size}&d=mm`;
}

function getUserInfo() {
    const token = keycloak.tokenParsed || {};
    const idToken = keycloak.idTokenParsed || {};
    const username = token.preferred_username || idToken.preferred_username || token.name || idToken.name || 'Guest';
    return {
        username,
        email: token.email || idToken.email || '',
        avatarUrl: getGravatarUrl(token.email || idToken.email || '', 80)
    };
}
const keycloak = new Keycloak({
    url: 'https://accounts.hikaproj.com',
    realm: 'normal',
    clientId: 'hikaproj-hp'
});
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const userAvatarIcon = document.getElementById('user-avatar-icon');
const userAvatarImg = document.getElementById('user-avatar-img');
const userStatusText = document.getElementById('user-status-text');
const authActionArea = document.getElementById('auth-action-area');
const userInfoArea = document.getElementById('user-info-area');
const keycloakLoginBtn = document.getElementById('keycloak-login-btn');
const keycloakLogoutBtn = document.getElementById('keycloak-logout-btn');
const keycloakUsernameSpan = document.getElementById('keycloak-username');
const keycloakEmailSpan = document.getElementById('keycloak-email');
const dropdownAvatarImg = document.getElementById('dropdown-avatar-img');
const dropdownAvatarInitial = document.getElementById('dropdown-avatar-initial');
const dropdownAvatarContainer = document.getElementById('dropdown-avatar-container');
const profileLinkArea = document.getElementById('profile-link-area');

function toggleUserMenu() {
    const isExpanded = userDropdown.classList.contains('hidden');
    if (isExpanded) {
        userDropdown.classList.remove('hidden');
        userMenuBtn.setAttribute('aria-expanded', 'true');
    } else {
        userDropdown.classList.add('hidden');
        userMenuBtn.setAttribute('aria-expanded', 'false');
    }
}
if (userMenuBtn) userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserMenu();
});
document.addEventListener('click', () => {
    if (userDropdown) userDropdown.classList.add('hidden');
    if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
});
if (userDropdown) userDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});

function updateUI(authenticated) {
    const currentLang = langSelect.value || 'ja';
    if (!userMenuBtn) return;
    if (authenticated) {
        const {
            username,
            email,
            avatarUrl
        } = getUserInfo();
        userMenuBtn.classList.remove('bg-slate-200', 'text-slate-500');
        userMenuBtn.classList.add('bg-cf-orange', 'text-white');
        if (avatarUrl) {
            userAvatarImg.src = avatarUrl;
            userAvatarImg.classList.remove('hidden');
            userAvatarIcon.classList.add('hidden');
        } else {
            userAvatarImg.classList.add('hidden');
            userAvatarIcon.classList.remove('hidden');
            userAvatarIcon.className = "fa-solid fa-user text-sm";
        }
        userStatusText.textContent = `ログイン中： ${username}`;
        userStatusText.classList.remove('text-slate-400');
        userStatusText.classList.add('text-emerald-600', 'font-semibold');
        keycloakUsernameSpan.textContent = username;
        keycloakEmailSpan.textContent = email || '(メールアドレス未設定)';
        if (avatarUrl) {
            dropdownAvatarImg.src = avatarUrl;
            dropdownAvatarImg.classList.remove('hidden');
            dropdownAvatarInitial.classList.add('hidden');
            dropdownAvatarContainer.classList.remove('bg-cf-orange');
            dropdownAvatarContainer.style.backgroundColor = 'transparent';
        } else {
            dropdownAvatarImg.classList.add('hidden');
            dropdownAvatarInitial.classList.remove('hidden');
            dropdownAvatarInitial.textContent = username.charAt(0).toUpperCase() || 'U';
            dropdownAvatarContainer.classList.add('bg-cf-orange');
            dropdownAvatarContainer.style.backgroundColor = '';
        }
        keycloakLogoutBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket mr-2"></i>ログアウト`;
        authActionArea.classList.add('hidden');
        userInfoArea.classList.remove('hidden');
    } else {
        userMenuBtn.classList.remove('bg-cf-orange', 'text-white');
        userMenuBtn.classList.add('bg-slate-200', 'text-slate-500');
        userAvatarImg.classList.add('hidden');
        userAvatarIcon.classList.remove('hidden');
        userAvatarIcon.className = "fa-solid fa-user text-sm";
        userStatusText.textContent = 'ログインしていません';
        userStatusText.classList.remove('text-emerald-600', 'font-semibold');
        userStatusText.classList.add('text-slate-400');
        authActionArea.classList.remove('hidden');
        userInfoArea.classList.add('hidden');
    }
    if (typeof updateGreetingAndWeather === 'function') updateGreetingAndWeather();
}
if (profileLinkArea) {
    profileLinkArea.addEventListener('click', () => {
        if (keycloak.authenticated) {
            try {
                window.location.href = keycloak.createAccountUrl();
            } catch (e) {
                window.location.href = `${keycloak.url}/realms/${keycloak.realm}/account`;
            }
        }
    });
}
keycloak.init({
    onLoad: 'check-sso'
}).then((authenticated) => {
    updateUI(keycloak.token ? true : authenticated);
}).catch(() => {
    updateUI(false);
});
if (keycloakLoginBtn) keycloakLoginBtn.addEventListener('click', () => {
    keycloak.login({
        redirectUri: window.location.href
    });
});
if (keycloakLogoutBtn) keycloakLogoutBtn.addEventListener('click', () => {
    keycloak.logout({
        redirectUri: window.location.href
    });
});
keycloak.onAuthSuccess = () => {
    updateUI(true);
};
keycloak.onAuthLogout = () => {
    updateUI(false);
};
keycloak.onTokenExpired = () => {
    keycloak.updateToken(30).catch(() => updateUI(false));
};
setInterval(() => {
    keycloak.updateToken(30).then(() => {
        if (keycloak.authenticated) updateUI(true);
    }).catch(() => updateUI(false));
}, 60000);