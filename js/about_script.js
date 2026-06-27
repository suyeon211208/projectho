document.addEventListener("DOMContentLoaded", () => {
    
    // -------------------------------------------------------------
    // [공통 모듈] 전역 마우스 좌표 트래킹 및 파티클 엔진
    // -------------------------------------------------------------
    const particleContainer = document.getElementById("particle-container");
    let mouseX = 0;
    let mouseY = 0;
    let lastParticleX = 0;
    let lastParticleY = 0;
    const movementThreshold = 8; 

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!particleContainer) return;

        const distance = Math.hypot(mouseX - lastParticleX, mouseY - lastParticleY);
        if (distance > movementThreshold) {
            createParticle(mouseX, mouseY);
            lastParticleX = mouseX;
            lastParticleY = mouseY;
        }
    });

    function createParticle(x, y) {
        const particle = document.createElement("div");
        particle.classList.add("particle");

        const size = Math.random() * 5 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const destinationX = (Math.random() - 0.5) * 80; 
        const destinationY = (Math.random() - 0.5) * 80; 
        
        particle.style.setProperty("--mx", `${destinationX}px`);
        particle.style.setProperty("--my", `${destinationY}px`);

        particleContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
    }


    // -------------------------------------------------------------
    // [텍스트 스플릿 엔진 1] 히어로 영역 자석 호버 글자 분해
    // -------------------------------------------------------------
    const typingTextElement = document.getElementById("typing-text");
    let allChars = [];

    if (typingTextElement) {
        const originalText = typingTextElement.innerHTML;
        let newHTML = "";
        const lines = originalText.split("<br>");
        
        lines.forEach((line, index) => {
            for (let char of line) {
                if (char === " ") {
                    newHTML += "<span>&nbsp;</span>";
                } else {
                    newHTML += `<span>${char}</span>`;
                }
            }
            if (index < lines.length - 1) newHTML += "<br>";
        });
        
        typingTextElement.innerHTML = newHTML;
        allChars = typingTextElement.querySelectorAll("span");

        allChars.forEach((char) => {
            if (char.textContent !== "\u00A0") {
                char.addEventListener("mouseenter", () => char.classList.add("hovered"));
                char.addEventListener("mouseleave", () => char.classList.remove("hovered"));
            }
        });
    }


    // -------------------------------------------------------------
    // ★ [하이엔드 텍스트 엔진 2] 액체 텍스트(Liquid Typo) 분해 및 물리 연산
    // -------------------------------------------------------------
    const liquidTargets = document.querySelectorAll(".liquid-target");
    let liquidCharNodes = [];

    liquidTargets.forEach((target) => {
        const textContent = target.textContent;
        const words = textContent.split(" ");
        target.innerHTML = ""; // 기존 평면 글자 비우기

        words.forEach((word) => {
            const wordSpan = document.createElement("span");
            wordSpan.classList.add("liquid-word");

            for (let char of word) {
                const charSpan = document.createElement("span");
                charSpan.classList.add("liquid-char");
                charSpan.textContent = char;
                wordSpan.appendChild(charSpan);
                liquidCharNodes.push(charSpan); // 실시간 거리 연산 배열에 등록
            }

            target.appendChild(wordSpan);
            // 단어 사이에 공백 생성
            target.appendChild(document.createTextNode(" "));
        });
    });

    // 초당 60프레임 최적화 루프를 통해 마우스와 글자의 거리를 계산해 밀어내는 함수
    function updateLiquidTypography() {
        liquidCharNodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            // 글자의 정중앙 좌표 추출
            const charX = rect.left + rect.width / 2;
            const charY = rect.top + rect.height / 2;

            // 마우스 커서와 개별 글자 간의 기하학적 거리 계산
            const deltaX = charX - mouseX;
            const deltaY = charY - mouseY;
            const distance = Math.hypot(deltaX, deltaY);

            const activeRadius = 100; // 마우스 영향 반경 (100px 이내 유입 시 왜곡 시작)

            if (distance < activeRadius) {
                // 가까울수록 강력하게 밀려나도록 가중치 팩터 설계
                const force = (activeRadius - distance) / activeRadius;
                const pushStrength = 22; // 최대 밀려날 픽셀 강도 (px)
                
                // 마우스가 다가오는 반대 궤적으로 벡터 이동 연산
                const moveX = (deltaX / distance) * force * pushStrength;
                const moveY = (deltaY / distance) * force * pushStrength;

                node.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + force * 0.15})`;
                node.classList.add("active-dist");
            } else {
                // 반경을 벗어나면 CSS transition 스프링 역학에 의해 자연스럽게 홈 포지션 복귀
                node.style.transform = "translate(0px, 0px) scale(1)";
                node.classList.remove("active-dist");
            }
        });

        requestAnimationFrame(updateLiquidTypography);
    }
    // 루프 애니메이션 시작
    if (liquidCharNodes.length > 0) {
        requestAnimationFrame(updateLiquidTypography);
    }


    // -------------------------------------------------------------
    // 통합 스크롤 매트릭스 제어부 (방어 코드 전면 탑재)
    // -------------------------------------------------------------
    window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY;

        // [인터랙션 1] 타이핑 효과 연동 엔진
        const heroTrigger = document.getElementById("hero-section-trigger");
        if (heroTrigger && allChars.length > 0) {
            const heroStart = heroTrigger.offsetTop;
            const heroDuration = heroTrigger.offsetHeight - window.innerHeight;

            if (scrollTop >= heroStart && scrollTop <= heroStart + heroDuration) {
                const progress = (scrollTop - heroStart) / heroDuration;
                const totalChars = allChars.length;
                const activeIndex = Math.floor(progress * totalChars);

                allChars.forEach((char, idx) => {
                    if (!char.classList.contains("hovered")) {
                        if (idx <= activeIndex) {
                            char.style.opacity = "1";
                            char.style.transform = "translateY(0px)";
                        } else {
                            char.style.opacity = "0.1";
                            char.style.transform = "translateY(15px)";
                        }
                    } else {
                        if (idx <= activeIndex) char.style.opacity = "1";
                    }
                });
            }
        }

        // [인터랙션 2] 섹션 2: 필름 그레인 활성화 및 유기적 오라 확장
        const sec2Trigger = document.getElementById("pin-section-trigger");
        if (sec2Trigger) {
            const sec2Sticky = sec2Trigger.querySelector(".sticky-section");
            const grainOverlay = sec2Trigger.querySelector(".grain-overlay");
            const text1 = document.getElementById("text-1");
            const text2 = document.getElementById("text-2");
            const sphere = document.getElementById("sphere-obj");

            const sec2Start = sec2Trigger.offsetTop;
            const sec2Duration = sec2Trigger.offsetHeight - window.innerHeight;

            if (scrollTop >= sec2Start && scrollTop <= sec2Start + sec2Duration) {
                const progress = (scrollTop - sec2Start) / sec2Duration;

                if (progress > 0.25) {
                    if (sec2Sticky) sec2Sticky.style.backgroundColor = "#070a12"; 
                    if (grainOverlay) grainOverlay.style.opacity = "1"; 
                    if (text1) text1.style.color = "#f1f5f9"; 
                    if (text2) text2.style.color = "#ffffff";
                } else {
                    if (sec2Sticky) sec2Sticky.style.backgroundColor = "#f8fafc"; 
                    if (grainOverlay) grainOverlay.style.opacity = "0"; 
                    if (text1) text1.style.color = "#334155";
                    if (text2) text2.style.color = "#0f172a";
                }

                if (sphere) {
                    const sphereScale = 0.4 + progress * 4.2;
                    sphere.style.transform = `scale(${sphereScale}) rotate(${progress * 135}deg)`;
                    sphere.style.opacity = Math.min(progress * 1.8, 0.85); 
                }

                if (text1) {
                    text1.style.transform = `translateX(${-progress * 40}px)`;
                    text1.style.letterSpacing = `${0.03 + progress * 0.08}em`;
                }
                if (text2) {
                    text2.style.transform = `translateX(${progress * 40}px)`;
                    text2.style.letterSpacing = `${0.03 + progress * 0.1}em`;
                }
            }
        }

        // [인터랙션 3] 클립 패스(Clip Path) 활용 카드 섹션 스택업 슬라이드
        const sec3Trigger = document.getElementById("transition-section-trigger");
        if (sec3Trigger) {
            const panel2 = document.getElementById("p2");
            const sec3Start = sec3Trigger.offsetTop;
            const sec3Duration = sec3Trigger.offsetHeight - window.innerHeight;

            if (scrollTop >= sec3Start && scrollTop <= sec3Start + sec3Duration) {
                const progress = (scrollTop - sec3Start) / sec3Duration;

                if (panel2) {
                    const clipPercent = 100 - (progress * 100);
                    panel2.style.clipPath = `inset(${clipPercent}% 0% 0% 0%)`;
                    panel2.style.opacity = 0.8 + (progress * 0.2);
                }
            }
        }
    });
});