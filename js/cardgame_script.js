let level = 1, time = 0, timerInterval, flippedCards = [], matchedCount = 0;
const board = document.getElementById('card-board'), rippleContainer = document.getElementById('ripple-container');
const cuteIcons = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];

document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.03) return; 
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const size = 100;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.pageX - size / 2}px`;
    ripple.style.top = `${e.pageY - size / 2}px`;
    rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 3000);
});

function startGame() {
    matchedCount = 0; time = 0; document.getElementById('timer').innerText = time;
    board.innerHTML = ''; flippedCards = [];
    const deck = [...cuteIcons.slice(0, (level+1)), ...cuteIcons.slice(0, (level+1))].sort(() => Math.random() - 0.5);
    board.style.gridTemplateColumns = `repeat(4, 1fr)`;

    deck.forEach(icon => {
        const card = document.createElement('div');
        card.className = 'card is-flipped';
        card.innerHTML = `<div class="card-face card-back"></div><div class="card-face card-front">${icon}</div>`;
        card.onclick = () => flipCard(card);
        board.appendChild(card);
    });

    setTimeout(() => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('is-flipped'));
        timerInterval = setInterval(() => { document.getElementById('timer').innerText = ++time; }, 1000);
    }, 3000);
}

function flipCard(card) {
    if (flippedCards.length >= 2 || card.classList.contains('is-flipped') || card.classList.contains('hidden')) return;
    card.classList.add('is-flipped');
    flippedCards.push(card);
    if (flippedCards.length === 2) {
        if (flippedCards[0].innerHTML === flippedCards[1].innerHTML) {
            flippedCards.forEach(c => setTimeout(() => c.classList.add('hidden'), 500));
            matchedCount += 2;
            flippedCards = [];
            if (matchedCount === (level + 1) * 2) endGame();
        } else {
            setTimeout(() => { flippedCards.forEach(c => c.classList.remove('is-flipped')); flippedCards = []; }, 1000);
        }
    }
}

function endGame() {
    clearInterval(timerInterval);
    alert(`성공! 다음 단계로 이동합니다.`);
    level++;
    document.getElementById('level').innerText = level;
    startGame();
}
startGame();
// 이전 화면으로 돌아가기
function goBack() {
    window.history.back();
}