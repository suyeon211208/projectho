const STORAGE_KEY = 'projectho_story_posts';

document.addEventListener('DOMContentLoaded', () => {
    const modalContent = document.querySelector('.modal-content');
    const particleContainer = document.getElementById('particle-container');
    const titleElement = document.getElementById('gallery-title');

    /* =============================================================
       2. [About 동일 효과] 타이틀 스플릿 문자 호버 업 모션
       ============================================================= */
    if (titleElement) {
        const rawText = titleElement.innerText;
        titleElement.innerHTML = '';
        [...rawText].forEach(char => {
            const span = document.createElement('span');
            span.innerText = char === ' ' ? '\u00A0' : char;
            titleElement.appendChild(span);
            span.addEventListener('mouseenter', () => { span.classList.add('hovered'); });
            span.addEventListener('mouseleave', () => { setTimeout(() => span.classList.remove('hovered'), 200); });
        });
    }

    // 최초 로드 시 존재하는 카드에 인터랙션(틸트/클릭) 바인딩
    document.querySelectorAll('.story-card').forEach(bindCardInteractions);

    // localStorage에 저장된 글이 있다면 이어서 렌더링
    renderStoredPosts();

    // 글쓰기 폼 바인딩
    bindWriteForm();
});

/* =============================================================
   3. 갤러리 고유 효과: 카드 마우스 3D 자석 틸트(기울임)
   + 클릭 시 모달 오픈
   (동적으로 추가되는 글쓰기 카드에도 동일하게 적용)
   ============================================================= */
function bindCardInteractions(card) {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        const angleX = (yc - y) / 12;
        const angleY = (x - xc) / 12;
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
    card.addEventListener('click', function () {
        window.openStoryModal(this);
    });
}

/* =============================================================
   data-content 속성 안에 실제 줄바꿈(엔터)이 그대로 들어있으면
   JSON.parse가 "Bad control character in string literal" 에러를
   내기 때문에, 파싱 전에 문자열 리터럴 내부의 제어문자만
   안전하게 \n, \r, \t 로 이스케이프 처리한다.
   (문자열 바깥의 JSON 구조는 건드리지 않는다)
   ============================================================= */
function sanitizeJSONString(str) {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (escaped) {
            result += char;
            escaped = false;
            continue;
        }

        if (char === '\\') {
            result += char;
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }

        if (inString) {
            if (char === '\n') { result += '\\n'; continue; }
            if (char === '\r') { result += '\\r'; continue; }
            if (char === '\t') { result += '\\t'; continue; }
        }

        result += char;
    }

    return result;
}

window.openStoryModal = function(element) {
    const modal = document.getElementById('story-modal');
    const bodyText = document.getElementById('modal-body-text');

    try {
        const title = element.getAttribute('data-title');
        const date = element.getAttribute('data-date');
        const rawContent = element.getAttribute('data-content');
        const contentBlocks = JSON.parse(sanitizeJSONString(rawContent));

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-date').innerText = date;

        bodyText.innerHTML = '';

        contentBlocks.forEach(block => {
            const div = document.createElement('div');
            if (block.type === 'text') {
                div.innerHTML = `<p style="margin-bottom: 20px;">${escapeHtml(block.value).replace(/\n/g, '<br>')}</p>`;
            } else if (block.type === 'image') {
                div.innerHTML = `<img src="${block.value}">`;
            }
            bodyText.appendChild(div);
        });

        modal.classList.add('active'); // active 클래스 추가로 display 변경
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error("데이터 파싱 에러:", e);
    }
};

window.closeModal = function(e) {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        document.getElementById('story-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

/* =============================================================
   탭 메뉴: 선택한 카테고리의 카드만 노출
   ============================================================= */
function filterGallery(category, btn) {
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.story-card').forEach(card => {
        const match = category === 'all' || card.dataset.category === category;
        card.style.display = match ? '' : 'none';
    });
}

/* =============================================================
   글쓰기: 서버 없이 localStorage에 저장
   ============================================================= */
function openWriteModal() {
    document.getElementById('write-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeWriteModal = function(e) {
    // 버튼 클릭(인자 없음) 또는 오버레이/닫기버튼 클릭 시 닫힘
    if (!e || e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        document.getElementById('write-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('write-form').reset();
    }
};

function bindWriteForm() {
    const form = document.getElementById('write-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = document.getElementById('write-category').value;
        const title = document.getElementById('write-title').value.trim();
        const excerpt = document.getElementById('write-excerpt').value.trim();
        const body = document.getElementById('write-body').value.trim();
        const fileInput = document.getElementById('write-images');

        if (!title || !body) return;

        const images = await filesToBase64(fileInput.files);

        const content = [{ type: 'text', value: body }];
        images.forEach(src => content.push({ type: 'image', value: src }));

        const post = {
            id: 'post_' + Date.now(),
            category,
            title,
            excerpt: excerpt || body.slice(0, 60),
            date: formatToday(),
            content
        };

        savePost(post);
        appendCardToGrid(post, true);
        closeWriteModal();
    });
}

function filesToBase64(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return Promise.resolve([]);

    const readers = files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }));

    return Promise.all(readers);
}

function formatToday() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function getStoredPosts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (err) {
        console.error('저장된 글을 불러오지 못했습니다:', err);
        return [];
    }
}

function savePost(post) {
    const posts = getStoredPosts();
    posts.unshift(post);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (err) {
        console.error('저장에 실패했습니다. 이미지 용량이 너무 클 수 있습니다:', err);
        alert('저장에 실패했습니다. 이미지 용량을 줄이거나 개수를 줄여주세요.');
    }
}

function renderStoredPosts() {
    getStoredPosts().forEach(post => appendCardToGrid(post, false, true));
}

function appendCardToGrid(post, prepend, isInitialRender) {
    const grid = document.getElementById('story-grid');
    const card = document.createElement('article');
    card.className = 'story-card';
    card.dataset.category = post.category;
    card.setAttribute('data-title', post.title);
    card.setAttribute('data-date', post.date);
    card.setAttribute('data-content', JSON.stringify(post.content));

    card.innerHTML = `
        <span class="date">${escapeHtml(post.date)}</span>
        <h2 class="title">${escapeHtml(post.title)}</h2>
        <p class="excerpt">${escapeHtml(post.excerpt)}</p>
    `;

    if (prepend) {
        grid.insertBefore(card, grid.firstChild);
    } else {
        grid.appendChild(card);
    }

    bindCardInteractions(card);

    if (!isInitialRender) {
        const activeTab = document.querySelector('.tab-btn.active');
        const activeFilter = activeTab ? activeTab.dataset.filter : 'all';
        if (activeFilter !== 'all' && post.category !== activeFilter) {
            card.style.display = 'none';
        }
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
