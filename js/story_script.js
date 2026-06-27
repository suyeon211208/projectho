
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.gallery-card');
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
window.openStoryModal = function(element) {
    const modal = document.getElementById('story-modal');
    const bodyText = document.getElementById('modal-body-text');
    
    try {
        const title = element.getAttribute('data-title');
        const date = element.getAttribute('data-date');
        const contentBlocks = JSON.parse(element.getAttribute('data-content'));
        
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-date').innerText = date;
        
        bodyText.innerHTML = '';
        
        contentBlocks.forEach(block => {
            const div = document.createElement('div');
            if (block.type === 'text') {
                div.innerHTML = `<p style="margin-bottom: 20px;">${block.value}</p>`;
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', function() {
            window.openStoryModal(this);
        });
    });
});