// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ===== MOBILE NAV =====
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ===== TYPED TEXT =====
const phrases = [
    'Backend Engineer',
    '搜索系统工程师',
    '分布式架构专家',
    'Java Developer',
];
let pi = 0, ci = 0, deleting = false;
const typedEl = document.getElementById('typedText');

function type() {
    const word = phrases[pi];
    if (deleting) {
        typedEl.textContent = word.slice(0, --ci);
    } else {
        typedEl.textContent = word.slice(0, ++ci);
    }

    let delay = deleting ? 70 : 110;
    if (!deleting && ci === word.length) { delay = 2200; deleting = true; }
    else if (deleting && ci === 0)       { deleting = false; pi = (pi + 1) % phrases.length; delay = 350; }

    setTimeout(type, delay);
}
setTimeout(type, 1600);

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${i * 0.08}s`;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navItems.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
}, { passive: true });

// ===== CHAT WIDGET =====
const chatFab     = document.getElementById('chatFab');
const chatPanel   = document.getElementById('chatPanel');
const chatInput   = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMsgs    = document.getElementById('chatMessages');
const chatCloseBtn = document.getElementById('chatCloseBtn');

let chatHistory = [];   // { role, content } pairs (text only)
let chatOpen    = false;
let chatBusy    = false;

function toggleChat(forceOpen) {
    chatOpen = forceOpen !== undefined ? forceOpen : !chatOpen;
    chatFab.classList.toggle('open', chatOpen);
    chatPanel.classList.toggle('open', chatOpen);
    if (chatOpen) setTimeout(() => chatInput.focus(), 250);
}

chatFab.addEventListener('click', () => toggleChat());
chatCloseBtn.addEventListener('click', () => toggleChat(false));

// "开始对话" button in agent section
document.getElementById('agentOpenBtn').addEventListener('click', () => {
    document.getElementById('chatPanel').scrollIntoView({ behavior: 'smooth', block: 'end' });
    toggleChat(true);
});

// Example question buttons
document.querySelectorAll('.example-q').forEach(btn => {
    btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        toggleChat(true);
        setTimeout(() => sendMessage(q), 300);
    });
});

// Send on Enter
chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatSendBtn.addEventListener('click', () => sendMessage());

function appendMsg(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = html;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
}

function showTyping() {
    return appendMsg('loading', '<div class="typing-dots"><span></span><span></span><span></span></div>');
}

async function sendMessage(preset) {
    const text = (preset || chatInput.value).trim();
    if (!text || chatBusy) return;

    chatInput.value = '';
    chatBusy = true;
    chatSendBtn.disabled = true;

    appendMsg('user', escapeHtml(text));
    const loader = showTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory }),
        });

        const data = await res.json();
        loader.remove();

        const reply = data.response || data.error || '抱歉，出现了错误，请重试。';
        appendMsg('assistant', formatReply(reply));

        // Keep last 10 turns to avoid token bloat
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    } catch {
        loader.remove();
        appendMsg('assistant', '网络错误，请检查连接后重试。');
    }

    chatBusy = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatReply(text) {
    // Convert newlines to <p> blocks for readability
    return text.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
}
