// ─── 상담 저장/불러오기 공용 모듈 ───

const CONSULTATION_KEYS = [
    'clientName', 'clientGender', 'currentAge', 'retireAge',
    'birthYear', 'birthMonth', 'birthDay',
    'initialCapital', 'monthlyAdd',
    'dividendYield', 'annualReturn', 'profitThreshold',
    'targetAsset', 'targetDividend',
    'calc_monthly', 'calc_start_age', 'calc_life_age', 'calc_return_rate'
];

// 각 페이지별 입력 필드 → localStorage 키 매핑
// collectCurrentPage()에서 현재 페이지의 입력값을 localStorage에 먼저 저장
function collectCurrentPage() {
    const path = location.pathname.split('/').pop().replace('.html', '');

    const collectors = {
        'dividend1-1': () => {
            const el = (id) => document.getElementById(id);
            if (el('birth-year')) {
                const birthYear = el('birth-year').value;
                const currentYear = new Date().getFullYear();
                if (birthYear) localStorage.setItem('currentAge', currentYear - parseInt(birthYear) + 1);
            }
            if (el('retire-age') && el('retire-age').value) localStorage.setItem('retireAge', el('retire-age').value);
            if (el('client-name') && el('client-name').value.trim()) localStorage.setItem('clientName', el('client-name').value.trim());
            if (typeof selectedGender !== 'undefined' && selectedGender) localStorage.setItem('clientGender', selectedGender);
        },
        'dividend1-2': () => {
            const el = (id) => document.getElementById(id);
            if (el('initial-capital')) localStorage.setItem('initialCapital', el('initial-capital').value.replace(/,/g, '') || '0');
            if (el('monthly-add')) localStorage.setItem('monthlyAdd', el('monthly-add').value.replace(/,/g, '') || '0');
        },
        'dividend1-3': () => {
            const el = (id) => document.getElementById(id);
            if (el('dividend-yield')) localStorage.setItem('dividendYield', el('dividend-yield').value);
            if (el('annual-return')) localStorage.setItem('annualReturn', el('annual-return').value);
            if (el('profit-threshold')) localStorage.setItem('profitThreshold', el('profit-threshold').value.replace(/,/g, '') || '0');
        },
        'dividend1-4': () => {
            const el = (id) => document.getElementById(id);
            if (el('target-asset')) localStorage.setItem('targetAsset', el('target-asset').value.replace(/,/g, '') || '0');
            if (el('target-dividend')) localStorage.setItem('targetDividend', el('target-dividend').value.replace(/,/g, '') || '0');
        },
        'dividend2-1': () => {
            const el = document.getElementById('input-monthly');
            if (el && el.value) localStorage.setItem('calc_monthly', el.value.replace(/[^0-9]/g, ''));
        },
        'dividend2-2': () => {
            const el = document.getElementById('calc-start-age');
            if (el && el.value) localStorage.setItem('calc_start_age', el.value);
        },
        'dividend2-3': () => {
            const el = document.getElementById('calc-rate');
            if (el && el.value) localStorage.setItem('calc_return_rate', el.value);
            localStorage.setItem('calc_life_age', '100');
        },
        'dividend2-result': () => {
            const el = (id) => document.getElementById(id);
            if (el('input-monthly')) localStorage.setItem('calc_monthly', el('input-monthly').value.replace(/[^0-9]/g, ''));
            if (el('input-start-age')) localStorage.setItem('calc_start_age', el('input-start-age').value);
            if (el('input-rate')) localStorage.setItem('calc_return_rate', el('input-rate').value);
        },
        'dividend2-print': () => {
            const el = (id) => document.getElementById(id);
            if (el('input-monthly')) localStorage.setItem('calc_monthly', el('input-monthly').value.replace(/[^0-9]/g, ''));
            if (el('input-start-age')) localStorage.setItem('calc_start_age', el('input-start-age').value);
            if (el('input-rate')) localStorage.setItem('calc_return_rate', el('input-rate').value);
        }
    };

    if (collectors[path]) collectors[path]();
}

function saveConsultation() {
    // 1) 현재 페이지의 입력값을 먼저 localStorage에 저장
    collectCurrentPage();

    // 2) localStorage에서 모든 상담 키를 수집
    const data = {};
    let hasData = false;
    CONSULTATION_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null && val !== '') {
            data[key] = val;
            hasData = true;
        }
    });

    if (!hasData) {
        showIOToast('저장할 상담 데이터가 없습니다.');
        return;
    }

    data._savedAt = new Date().toISOString();
    const clientName = data.clientName || '고객';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = '상담_' + clientName + '_' + dateStr + '.json';

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showIOToast('"' + clientName + '" 님의 상담 데이터가 저장되었습니다.');
}

function loadConsultation(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let loadedCount = 0;

            CONSULTATION_KEYS.forEach(key => {
                if (data[key] !== undefined && data[key] !== '') {
                    localStorage.setItem(key, data[key]);
                    loadedCount++;
                }
            });

            const clientName = data.clientName || '고객';
            showIOToast('"' + clientName + '" 님의 데이터 ' + loadedCount + '개 항목 불러오기 완료!');

            // 메인 페이지의 고객 배지 업데이트
            const badge = document.getElementById('badge-text');
            if (badge) {
                const gender = data.clientGender || '';
                const genderIcon = gender === 'male' ? ' <i class="fas fa-mars text-blue-400"></i>' : gender === 'female' ? ' <i class="fas fa-venus text-pink-400"></i>' : '';
                badge.innerHTML = clientName + ' 님' + genderIcon;
            }

            // 현재 페이지의 입력 필드에 불러온 값 반영
            setTimeout(() => populateCurrentPage(), 100);
        } catch (err) {
            showIOToast('올바른 상담 파일인지 확인해주세요.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// 불러온 데이터를 현재 페이지의 입력 필드에 반영
function populateCurrentPage() {
    const path = location.pathname.split('/').pop().replace('.html', '');

    const populators = {
        'dividend1-1': () => {
            const el = (id) => document.getElementById(id);
            const name = localStorage.getItem('clientName');
            if (name && el('client-name')) el('client-name').value = name;

            const gender = localStorage.getItem('clientGender');
            if (gender && typeof selectGender === 'function') selectGender(gender);

            const age = parseInt(localStorage.getItem('currentAge'));
            const retireAge = localStorage.getItem('retireAge');
            if (age && el('birth-year')) {
                const currentYear = new Date().getFullYear();
                el('birth-year').value = currentYear - age + 1;
            }
            if (retireAge && el('retire-age')) el('retire-age').value = retireAge;
        },
        'dividend1-2': () => {
            const el = (id) => document.getElementById(id);
            const ic = localStorage.getItem('initialCapital');
            const ma = localStorage.getItem('monthlyAdd');
            if (ic && el('initial-capital')) el('initial-capital').value = Number(ic).toLocaleString();
            if (ma && el('monthly-add')) el('monthly-add').value = Number(ma).toLocaleString();
        },
        'dividend1-3': () => {
            const el = (id) => document.getElementById(id);
            const dy = localStorage.getItem('dividendYield');
            const ar = localStorage.getItem('annualReturn');
            const pt = localStorage.getItem('profitThreshold');
            if (dy && el('dividend-yield')) el('dividend-yield').value = dy;
            if (ar && el('annual-return')) el('annual-return').value = ar;
            if (pt && el('profit-threshold')) el('profit-threshold').value = Number(pt).toLocaleString();
        },
        'dividend1-4': () => {
            const el = (id) => document.getElementById(id);
            const ta = localStorage.getItem('targetAsset');
            const td = localStorage.getItem('targetDividend');
            if (ta && el('target-asset')) el('target-asset').value = Number(ta).toLocaleString();
            if (td && el('target-dividend')) el('target-dividend').value = Number(td).toLocaleString();
        },
        'dividend2-1': () => {
            const val = localStorage.getItem('calc_monthly');
            const el = document.getElementById('input-monthly');
            if (val && el) el.value = Number(val).toLocaleString();
        },
        'dividend2-2': () => {
            const val = localStorage.getItem('calc_start_age');
            const el = document.getElementById('calc-start-age');
            if (val && el) el.value = val;
        },
        'dividend2-3': () => {
            const val = localStorage.getItem('calc_return_rate');
            const el = document.getElementById('calc-rate');
            if (val && el) el.value = val;
        },
        'dividend2-result': () => {
            const el = (id) => document.getElementById(id);
            const m = localStorage.getItem('calc_monthly');
            const s = localStorage.getItem('calc_start_age');
            const r = localStorage.getItem('calc_return_rate');
            if (m && el('input-monthly')) el('input-monthly').value = Number(m).toLocaleString();
            if (s && el('input-start-age')) el('input-start-age').value = s;
            if (r && el('input-rate')) el('input-rate').value = r;
            if (typeof calculateRequiredAsset === 'function') calculateRequiredAsset();
        },
        'dividend2-print': () => {
            const el = (id) => document.getElementById(id);
            const m = localStorage.getItem('calc_monthly');
            const s = localStorage.getItem('calc_start_age');
            const r = localStorage.getItem('calc_return_rate');
            if (m && el('input-monthly')) el('input-monthly').value = Number(m).toLocaleString();
            if (s && el('input-start-age')) el('input-start-age').value = s;
            if (r && el('input-rate')) el('input-rate').value = r;
            if (typeof calculateRequiredAsset === 'function') calculateRequiredAsset();
        }
    };

    if (populators[path]) populators[path]();
}

// 토스트 메시지
function showIOToast(msg) {
    let t = document.getElementById('io-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'io-toast';
        t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(30,35,45,0.95);border:1px solid rgba(196,164,106,0.4);color:#e8d5b5;padding:1rem 2rem;border-radius:0.75rem;font-weight:600;font-size:0.95rem;opacity:0;transition:all 0.4s ease;z-index:9999;pointer-events:none;white-space:nowrap;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2500);
}

// 저장/불러오기 버튼 UI를 자동 삽입
function injectSaveLoadButtons() {
    // 숨겨진 file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'consultation-file-loader';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', loadConsultation);
    document.body.appendChild(fileInput);

    const btnStyle = 'padding:0.45rem 1rem;border-radius:0.4rem;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.3s ease;display:flex;align-items:center;gap:0.4rem;';

    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<i class="fas fa-download"></i> 저장';
    saveBtn.style.cssText = btnStyle + 'background:linear-gradient(to right,#c4a46a,#e8d5b5);color:#0a0c10;border:none;';
    saveBtn.onmouseenter = () => saveBtn.style.opacity = '0.85';
    saveBtn.onmouseleave = () => saveBtn.style.opacity = '1';
    saveBtn.onclick = saveConsultation;

    const loadBtn = document.createElement('button');
    loadBtn.innerHTML = '<i class="fas fa-upload"></i> 불러오기';
    loadBtn.style.cssText = btnStyle + 'background:transparent;color:#e8d5b5;border:1px solid rgba(196,164,106,0.4);';
    loadBtn.onmouseenter = () => { loadBtn.style.borderColor = '#c4a46a'; loadBtn.style.background = 'rgba(196,164,106,0.1)'; };
    loadBtn.onmouseleave = () => { loadBtn.style.borderColor = 'rgba(196,164,106,0.4)'; loadBtn.style.background = 'transparent'; };
    loadBtn.onclick = () => fileInput.click();

    // 사이드바가 있는 페이지: 저장 버튼을 메인으로 버튼 왼쪽에 배치
    const sidebar = document.querySelector('aside, .sidebar');
    if (sidebar) {
        // 메인으로 버튼 찾기 (absolute로 배치된 버튼)
        const mainBtn = sidebar.querySelector('button[onclick*="location.href"]');
        if (mainBtn) {
            // 메인으로 버튼을 감싸는 컨테이너 생성
            const wrapper = document.createElement('div');
            wrapper.id = 'io-buttons';
            wrapper.style.cssText = 'position:absolute;top:2rem;right:2rem;display:flex;gap:0.5rem;z-index:10;';
            mainBtn.style.position = 'relative';
            mainBtn.style.top = 'auto';
            mainBtn.style.right = 'auto';
            mainBtn.parentNode.insertBefore(wrapper, mainBtn);
            wrapper.appendChild(saveBtn);
            wrapper.appendChild(mainBtn);
        } else {
            const container = document.createElement('div');
            container.id = 'io-buttons';
            container.style.cssText = 'display:flex;gap:0.5rem;margin-top:3.5rem;margin-bottom:0.5rem;';
            container.appendChild(saveBtn);
            sidebar.insertBefore(container, sidebar.children[1] || null);
        }
    } else {
        // 사이드바 없는 페이지(메인 등): nav-right-group이 있으면 그 안에, 없으면 고정 배치
        const navGroup = document.getElementById('nav-right-group');
        if (navGroup) {
            navGroup.appendChild(saveBtn);
            navGroup.appendChild(loadBtn);
        } else {
            const container = document.createElement('div');
            container.id = 'io-buttons';
            container.style.cssText = 'position:fixed;top:1.2rem;right:1.5rem;display:flex;gap:0.5rem;z-index:9999;';
            container.appendChild(saveBtn);
            container.appendChild(loadBtn);
            document.body.appendChild(container);
        }
    }

    // 인쇄 시 숨기기
    const printStyle = document.createElement('style');
    printStyle.textContent = '@media print { #io-buttons, #io-toast { display: none !important; } }';
    document.head.appendChild(printStyle);
}

// ─── guide-box 페이지네이션 (좌우 화살표) ───
function setupGuideBoxPagination() {
    document.querySelectorAll('.guide-box').forEach(box => {
        if (box.dataset.paginationSetup) return;
        box.dataset.paginationSetup = 'true';

        // 단어 단위 줄바꿈 + 콘텐츠 세로 중앙 정렬
        box.style.wordBreak = 'keep-all';
        box.style.overflowWrap = 'break-word';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.justifyContent = 'center';
        box.style.alignItems = 'center';

        // 패딩 제거 후 내부 wrapper에 패딩 적용 (정확한 overflow 판정)
        const cs = getComputedStyle(box);
        const padTop = parseFloat(cs.paddingTop);
        const padBottom = parseFloat(cs.paddingBottom);
        const padLeft = cs.paddingLeft;
        const padRight = cs.paddingRight;
        box.style.padding = '0';

        // 기존 콘텐츠를 clip 영역으로 감싸기
        const clip = document.createElement('div');
        clip.className = 'guide-clip';
        clip.style.cssText = 'width:100%;height:100%;overflow:hidden;position:relative;';

        const inner = document.createElement('div');
        inner.className = 'guide-inner';
        inner.style.cssText = 'transition:transform 0.4s cubic-bezier(0.23,1,0.32,1);padding:' + padTop + 'px ' + padRight + ' ' + padBottom + 'px ' + padLeft + ';word-break:keep-all;overflow-wrap:break-word;';

        while (box.firstChild) inner.appendChild(box.firstChild);
        clip.appendChild(inner);
        box.appendChild(clip);

        setTimeout(() => {
            const clipH = clip.clientHeight;
            const innerH = inner.scrollHeight;
            if (innerH <= clipH + 2) return; // 넘치지 않으면 종료

            const totalPages = Math.ceil(innerH / clipH);
            let page = 0;

            // 좌우 화살표 버튼 스타일
            const btnCSS = 'position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(196,164,106,0.15);border:1px solid rgba(196,164,106,0.3);color:#e8d5b5;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease;z-index:10;';

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.style.cssText = btnCSS + 'left:0.75rem;';
            prevBtn.onmouseenter = () => { prevBtn.style.background = 'rgba(196,164,106,0.3)'; prevBtn.style.borderColor = '#c4a46a'; };
            prevBtn.onmouseleave = () => { prevBtn.style.background = 'rgba(196,164,106,0.15)'; prevBtn.style.borderColor = 'rgba(196,164,106,0.3)'; };

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.style.cssText = btnCSS + 'right:0.75rem;';
            nextBtn.onmouseenter = () => { nextBtn.style.background = 'rgba(196,164,106,0.3)'; nextBtn.style.borderColor = '#c4a46a'; };
            nextBtn.onmouseleave = () => { nextBtn.style.background = 'rgba(196,164,106,0.15)'; nextBtn.style.borderColor = 'rgba(196,164,106,0.3)'; };

            // 페이지 인디케이터 (하단 점)
            const dots = document.createElement('div');
            dots.style.cssText = 'position:absolute;bottom:0.5rem;left:50%;transform:translateX(-50%);display:flex;gap:0.4rem;z-index:10;';
            for (let i = 0; i < totalPages; i++) {
                const dot = document.createElement('span');
                dot.style.cssText = 'width:6px;height:6px;border-radius:50%;transition:all 0.3s ease;';
                dots.appendChild(dot);
            }

            function updateView() {
                inner.style.transform = 'translateY(' + (-page * clipH) + 'px)';
                prevBtn.style.display = page === 0 ? 'none' : 'flex';
                nextBtn.style.display = page >= totalPages - 1 ? 'none' : 'flex';
                Array.from(dots.children).forEach((dot, i) => {
                    dot.style.background = i === page ? '#c4a46a' : 'rgba(255,255,255,0.2)';
                });
            }

            prevBtn.onclick = () => { if (page > 0) { page--; updateView(); } };
            nextBtn.onclick = () => { if (page < totalPages - 1) { page++; updateView(); } };

            box.appendChild(prevBtn);
            box.appendChild(nextBtn);
            box.appendChild(dots);
            updateView();
        }, 200);
    });
}

// ─── 한글 IME 숫자 입력 보정 ───
// IME 활성 상태에서도 e.code로 물리 키를 감지하여 숫자를 직접 삽입
function setupIMENumericInputs() {
    document.querySelectorAll('input[inputmode="numeric"], input[inputmode="decimal"]').forEach(el => {
        if (el.dataset.imeFixed) return;
        el.dataset.imeFixed = 'true';

        const isDecimal = el.getAttribute('inputmode') === 'decimal';

        // IME가 활성화된 상태에서 키 입력 가로채기
        el.addEventListener('keydown', function(e) {
            // IME가 활성화되지 않은 상태면 기본 동작
            if (e.key !== 'Process' && !e.isComposing) return;

            // 물리 키 코드로 숫자 키인지 판별
            const digitMatch = e.code.match(/^(Digit|Numpad)(\d)$/);
            if (digitMatch) {
                e.preventDefault();
                const digit = digitMatch[2];
                const start = el.selectionStart;
                const end = el.selectionEnd;
                el.value = el.value.slice(0, start) + digit + el.value.slice(end);
                el.setSelectionRange(start + 1, start + 1);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            // 소수점 허용 (decimal 모드)
            if (isDecimal && (e.code === 'Period' || e.code === 'NumpadDecimal')) {
                e.preventDefault();
                const start = el.selectionStart;
                const end = el.selectionEnd;
                el.value = el.value.slice(0, start) + '.' + el.value.slice(end);
                el.setSelectionRange(start + 1, start + 1);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            // Backspace, Delete, Tab, 화살표, Home, End, Enter 허용
            const allowedCodes = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight',
                                  'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'];
            if (allowedCodes.includes(e.code)) return;

            // Ctrl/Meta 조합 허용 (복사, 붙여넣기 등)
            if (e.ctrlKey || e.metaKey) return;

            // 그 외 키(한글 등) 차단
            e.preventDefault();
        });

        // 조합 완료 후 잔여 한글 제거 (안전장치)
        el.addEventListener('compositionend', function() {
            const pattern = isDecimal ? /[^0-9.]/g : /[^0-9]/g;
            const cleaned = this.value.replace(pattern, '');
            if (cleaned !== this.value) {
                this.value = cleaned;
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });
}

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', () => {
    injectSaveLoadButtons();
    setupGuideBoxPagination();
    setupIMENumericInputs();
});
