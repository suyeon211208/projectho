// script.js
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('scroll-video');
    const header = document.querySelector('.main-header');

    // 모바일 햄버거 메뉴 토글
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

    let targetTime = 0;
    let currentTime = 0;
    const accel = 0.2; // 스크롤 감속도 (부드러운 효과)

    // 히어로 텍스트 박스: 스크롤에 따라 사라지며 좌측으로 흘러나가는 인터랙션
    const heroBox = document.querySelector('.hero-box');

    function updateHeroParallax() {
        if (!heroBox) return;
        const heroProgress = Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);

        heroBox.style.opacity = String(1 - heroProgress);
        heroBox.style.transform = `translate(${-heroProgress * 80}px, ${-heroProgress * 30}px)`;
        heroBox.style.filter = `blur(${heroProgress * 5}px)`;
    }

    // 스크롤 위치에 따라 헤더 상태 제어 및 목표 영상 시간 계산
    function handleScrollEffects() {
        const currentScroll = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFraction = maxScroll <= 0 ? 0 : currentScroll / maxScroll;

        // 1. 헤더 클래스 제어 (스크롤이 20px 이상 내려가면 scrolled 클래스 추가)
        if (currentScroll > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // 2. 비디오 목표 재생 시간 계산
        if (video.duration) {
            targetTime = video.duration * scrollFraction;
        }

        // 3. 히어로 텍스트 패럴랙스 업데이트
        updateHeroParallax();
    }

    // 영상을 부드럽게 재생시키는 루프 함수
    function renderLoop() {
        currentTime += (targetTime - currentTime) * accel;
        
        if (video.duration) {
            video.currentTime = currentTime;
        }

        requestAnimationFrame(renderLoop);
    }

    // 영상 메타데이터 로드 완료 시 초기화 및 루프 시작
    video.addEventListener('loadedmetadata', () => {
        handleScrollEffects();
        requestAnimationFrame(renderLoop);
    });

    // 스크롤 및 화면 크기 변경 시 이벤트 바인딩
    window.addEventListener('scroll', handleScrollEffects);
    window.addEventListener('resize', handleScrollEffects);
});
