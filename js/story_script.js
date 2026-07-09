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
