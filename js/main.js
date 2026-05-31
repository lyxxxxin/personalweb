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
    'AI Agent Developer',
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

// Restore history from localStorage
let chatHistory = [];
try { chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]'); } catch {}
let chatOpen = false;
let chatBusy = false;

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

const TOOL_ICONS = {
    search_resume:       '🔍',
    get_project_details: '📂',
    get_skills:          '⚙️',
    get_contact_info:    '📱',
    get_github_trending: '🐙',
    get_ai_papers:       '📄',
};

async function sendMessage(preset) {
    const text = (preset || chatInput.value).trim();
    if (!text || chatBusy) return;

    chatInput.value = '';
    chatBusy = true;
    chatSendBtn.disabled = true;

    appendMsg('user', escapeHtml(text));

    // Streaming assistant bubble
    const bubble = appendMsg('assistant', '<span class="stream-cursor">▋</span>');
    let fullText = '';
    let toolEl = null;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('No stream');

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                let evt;
                try { evt = JSON.parse(line.slice(6)); } catch { continue; }

                if (evt.type === 'tool') {
                    // Show tool indicator
                    const icon = TOOL_ICONS[evt.name] || '🔧';
                    if (!toolEl) {
                        toolEl = document.createElement('div');
                        toolEl.className = 'tool-indicator';
                        chatMsgs.appendChild(toolEl);
                    }
                    toolEl.textContent = `${icon} ${evt.display || evt.name}…`;
                    chatMsgs.scrollTop = chatMsgs.scrollHeight;

                } else if (evt.type === 'text') {
                    if (toolEl) { toolEl.remove(); toolEl = null; }
                    fullText += evt.content;
                    bubble.innerHTML = formatReply(fullText) + '<span class="stream-cursor">▋</span>';
                    chatMsgs.scrollTop = chatMsgs.scrollHeight;

                } else if (evt.type === 'done') {
                    bubble.innerHTML = formatReply(fullText);
                    if (toolEl) toolEl.remove();
                }
            }
        }

        if (!fullText) bubble.innerHTML = '抱歉，未收到回答，请重试。';
        else bubble.innerHTML = formatReply(fullText);

        // Memory: keep last 20 turns (token trim happens server-side too)
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: fullText });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

        // Persist to localStorage
        try { localStorage.setItem('chatHistory', JSON.stringify(chatHistory.slice(-10))); } catch {}

    } catch (err) {
        if (toolEl) toolEl.remove();
        bubble.innerHTML = `网络错误：${escapeHtml(err.message)}`;
    }

    chatBusy = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatReply(text) {
    return text.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

// ===== DIGEST WIDGET =====
async function loadDigest() {
    const githubEl = document.getElementById('digestGithub');
    const papersEl = document.getElementById('digestPapers');
    if (!githubEl || !papersEl) return;

    try {
        const res  = await fetch('/api/digest');
        const data = await res.json();

        // GitHub trending
        if (data.github?.length) {
            githubEl.innerHTML = data.github.slice(0, 5).map(r => `
                <a href="${r.url}" target="_blank" rel="noopener" class="digest-item">
                    <div class="digest-item-top">
                        <span class="digest-repo">${escapeHtml(r.name)}</span>
                        <span class="digest-stars">★ ${r.stars >= 1000 ? (r.stars/1000).toFixed(1)+'k' : r.stars}</span>
                    </div>
                    <p class="digest-desc">${escapeHtml(r.description || '')}</p>
                    ${r.language ? `<span class="digest-lang">${escapeHtml(r.language)}</span>` : ''}
                </a>`).join('');
        } else {
            githubEl.innerHTML = '<p class="digest-empty">暂无数据</p>';
        }

        // ArXiv papers
        if (data.papers?.length) {
            papersEl.innerHTML = data.papers.slice(0, 4).map(p => `
                <a href="${p.url}" target="_blank" rel="noopener" class="digest-item">
                    <div class="digest-item-top">
                        <span class="digest-date">${p.date || ''}</span>
                    </div>
                    <p class="digest-paper-title">${escapeHtml(p.title || '')}</p>
                    <p class="digest-desc">${escapeHtml(p.summary || '')}</p>
                </a>`).join('');
        } else {
            papersEl.innerHTML = '<p class="digest-empty">暂无数据</p>';
        }
    } catch {
        if (githubEl) githubEl.innerHTML = '<p class="digest-empty">加载失败，请刷新重试</p>';
    }
}

// Load digest when agent section scrolls into view
const digestObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        loadDigest();
        digestObserver.disconnect();
    }
}, { threshold: 0.1 });

const agentSection = document.getElementById('agent');
if (agentSection) digestObserver.observe(agentSection);
