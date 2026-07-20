// ===== Story 페이지: 탭 필터링 + 팝업 모달 =====

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.story-card');
    const modal = document.getElementById('story-modal');

    // 카드 클릭 시 팝업으로 전체 콘텐츠 노출
    cards.forEach(card => {
        card.addEventListener('click', () => openModal(card));
        card.style.cursor = 'pointer';
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
});

/**
 * 탭 메뉴 선택 시 해당 카테고리의 콘텐츠 리스트만 노출
 * @param {string} category - 'all' | 'film' | 'game'
 * @param {HTMLElement} btn - 클릭된 탭 버튼
 */
function filterGallery(category, btn) {
    const cards = document.querySelectorAll('.story-card');
    const tabs = document.querySelectorAll('.tab-btn');

    // 탭 active 스타일 갱신
    tabs.forEach(tab => tab.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // 카드 노출/숨김 처리
    cards.forEach(card => {
        const cardCategory = card.dataset.category;
        const isMatch = category === 'all' || cardCategory === category;
        card.style.display = isMatch ? '' : 'none';
    });
}

/**
 * 카드 클릭 시 전체 콘텐츠를 팝업(모달)으로 노출
 * @param {HTMLElement} card
 */
function openModal(card) {
    const modal = document.getElementById('story-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalBody = document.getElementById('modal-body-text');

    modalTitle.textContent = card.dataset.title || '';
    modalDate.textContent = card.dataset.date || '';

    // data-content(JSON 문자열) 파싱
    let contentList = [];
    try {
        contentList = JSON.parse(card.dataset.content);
    } catch (err) {
        console.error('콘텐츠 데이터를 불러오지 못했습니다:', err);
        contentList = [{ type: 'text', value: '콘텐츠를 불러오는 중 오류가 발생했습니다.' }];
    }

    // 모달 본문 렌더링
    modalBody.innerHTML = '';
    contentList.forEach(item => {
        if (item.type === 'text') {
            const p = document.createElement('p');
            p.className = 'post-text-block';
            // 줄바꿈(\n) 유지
            item.value.split('\n').forEach((line, idx, arr) => {
                p.appendChild(document.createTextNode(line));
                if (idx < arr.length - 1) p.appendChild(document.createElement('br'));
            });
            modalBody.appendChild(p);
        } else if (item.type === 'image') {
            const img = document.createElement('img');
            img.className = 'post-image-block';
            img.src = item.value;
            img.alt = card.dataset.title || '';
            img.loading = 'lazy';
            modalBody.appendChild(img);
        }
    });

    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

/**
 * 팝업 닫기 (오버레이 클릭 또는 닫기 버튼)
 */
function closeModal(event) {
    // 모달 콘텐츠 내부 클릭 시에는 닫히지 않도록 처리
    if (event && event.target.closest('.modal-content') && !event.target.closest('.modal-close')) {
        return;
    }
    const modal = document.getElementById('story-modal');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}
