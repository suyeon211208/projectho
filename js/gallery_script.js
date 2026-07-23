/**
 * Premium Visual Studio - Gallery 통합 인터랙션 스크립트 (멀티 슬라이더 완벽 병합본)
 */

// 슬라이더 제어용 전역 변수
let currentMediaList = [];
let currentSlideIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.gallery-card');
    const modalContent = document.querySelector('.modal-content');
    const particleContainer = document.getElementById('particle-container');
    const titleElement = document.getElementById('gallery-title');

    /* =============================================================
       0. [About 동일 효과] 모바일 햄버거 메뉴 토글
       ============================================================= */
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const menuBackdrop = document.getElementById('menu-backdrop');

    function closeMobileMenu() {
        if (navMenu) navMenu.classList.remove('open');
        if (menuToggle) {
            menuToggle.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
        if (menuBackdrop) menuBackdrop.classList.remove('open');
        document.body.style.overflow = '';
    }

    function toggleMobileMenu() {
        const isOpen = navMenu.classList.toggle('open');
        menuToggle.classList.toggle('open', isOpen);
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        if (menuBackdrop) menuBackdrop.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', toggleMobileMenu);
        navMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeMobileMenu);
        });
        if (menuBackdrop) menuBackdrop.addEventListener('click', closeMobileMenu);
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) closeMobileMenu();
        });
    }

    /* =============================================================
       1. [About 동일 효과] 마우스 무브 트래킹 액체 파티클 시스템
       ============================================================= */
    let lastX = 0, lastY = 0;
    window.addEventListener('mousemove', (e) => {
        const distance = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (distance > 15) {
            createParticle(e.clientX, e.clientY);
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 16 + 8;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 60 + 30;
        const mx = Math.cos(angle) * velocity;
        const my = Math.sin(angle) * velocity;
        particle.style.setProperty('--mx', `${mx}px`);
        particle.style.setProperty('--my', `${my}px`);
        
        particleContainer.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 1000);
    }

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

    /* =============================================================
       3. 갤러리 고유 효과: 카드 마우스 3D 자석 틸트(기울임)
       ============================================================= */
    cards.forEach(card => {
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
    });
});

/* =============================================================
   4. 액체 확장 마스크 전개 모달 함수 제어 (멀티 슬라이더 지원형)
   ============================================================= */
function openModal(e, title, category, desc, author, date, imgPath) {
    const modalContent = document.querySelector('.modal-content');
    
    // 데이터 렌더링 매핑
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-category').innerText = category.toUpperCase();
    document.getElementById('modal-desc').innerText = desc;
    document.getElementById('modal-author').innerText = author;
    document.getElementById('modal-date').innerText = date;
    
    // [핵심] 콤마(,)가 포함된 문자열이 오면 쪼개서 배열로 만들고, 아니면 단일 배열화
    if (typeof imgPath === 'string' && imgPath.includes(',')) {
        currentMediaList = imgPath.split(',').map(item => item.trim());
    } else {
        currentMediaList = [imgPath];
    }
    
    currentSlideIndex = 0; // 시작 인덱스 초기화
    renderMediaItem();     // 미디어 아이템 화면 로드

    // 마우스 클릭 위치 좌표 캡처하여 CSS 변수로 송출
    const clickX = e.clientX;
    const clickY = e.clientY;
    modalContent.style.setProperty('--click-x', `${clickX}px`);
    modalContent.style.setProperty('--click-y', `${clickY}px`);

    const modal = document.getElementById('gallery-modal');
    modal.style.display = 'flex';
    
    setTimeout(() => { modal.classList.add('show'); }, 10);
    document.body.style.overflow = 'hidden'; 
}

/* 현재 인덱스에 맞는 이미지/비디오를 화면에 렌더링하는 함수 */
function renderMediaItem() {
    const imgElement = document.getElementById('modal-real-img');
    const videoElement = document.getElementById('modal-real-video');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    const activePath = currentMediaList[currentSlideIndex];
    const isVideo = /\.(mp4|mov|webm|m4v)/i.test(activePath);

    // 이미지 개수가 2개 이상일 때만 좌우 버튼 노출 보장
    if (currentMediaList.length > 1) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }

    if (isVideo && videoElement) {
        if (imgElement) { imgElement.style.display = 'none'; imgElement.src = ''; }
        
        videoElement.src = activePath;
        videoElement.style.display = 'block';
        videoElement.muted = true;
        videoElement.load();
        videoElement.play().catch(() => { videoElement.controls = true; });
    } else if (imgElement) {
        if (videoElement) { videoElement.pause(); videoElement.src = ''; videoElement.style.display = 'none'; }
        
        imgElement.src = activePath;
        imgElement.style.display = 'block';
    }
}

/* 좌우 화살표 클릭 핸들러 */
function moveSlide(direction) {
    if (currentMediaList.length <= 1) return;
    
    currentSlideIndex += direction;
    
    if (currentSlideIndex < 0) currentSlideIndex = currentMediaList.length - 1;
    if (currentSlideIndex >= currentMediaList.length) currentSlideIndex = 0;
    
    renderMediaItem();
}

// 모달 닫기 제어 함수
function closeModal(e) {
    const isOverlay = e.target.classList.contains('modal-overlay');
    const isCloseBtn = e.target.classList.contains('modal-close') || e.target.closest('.modal-close');

    if (isOverlay || isCloseBtn) {
        const modal = document.getElementById('gallery-modal');
        modal.classList.remove('show');
        
        const videoElement = document.getElementById('modal-real-video');
        const imgElement = document.getElementById('modal-real-img');
        
        if (videoElement) { videoElement.pause(); videoElement.src = ""; }
        if (imgElement) { imgElement.src = ""; }

        setTimeout(() => { 
            modal.style.display = 'none'; 
            document.body.style.overflow = 'auto'; 
        }, 400); 
    }
}

/* =============================================================
   5. 카테고리 필터링 제어 함수
   ============================================================= */
function filterGallery(category) {
    const cards = document.querySelectorAll('.gallery-card');
    const buttons = document.querySelectorAll('.tab-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
            card.style.display = 'block';
            setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => { card.style.display = 'none'; }, 300);
        }
    });
}
