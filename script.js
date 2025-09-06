document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gridContainer = document.getElementById('grid-container');
    const messageArea = document.getElementById('message-area');
    const absenceDisplay = document.getElementById('absence-display');
    const remainingDaysDisplay = document.getElementById('remaining-days-display');
    const dailyPlayCountDisplay = document.getElementById('daily-play-count-display');
    const remainingWordsCountSpan = document.getElementById('remaining-words-count');
    const motivationModal = document.getElementById('motivation-modal');
    const closeModalButton = document.querySelector('.close-button');
    const startGameButton = document.getElementById('start-game-button');
    const progressText = document.getElementById('progress-text');
    const encouragementText = document.getElementById('encouragement-text');
    const dailyGoalModal = document.getElementById('daily-goal-modal');
    const exitGameButton = document.getElementById('exit-game-button');

    // --- Constants ---
    const GRID_ROWS = 10;
    const GRID_COLS = 8;
    const WORDS_PER_PUZZLE = 8;
    const ENCOURAGEMENTS = [
        '정말 빠르시네요!', '대단해요!', '오늘도 화이팅!', '천재 아닌가요?', '엄청난 집중력이시네요!', 
        '와! 벌써 다 하셨어요?', '최고의 플레이어!'
    ];
    const ALL_POSSIBLE_WORDS = [
        '행복', '기쁨', '사랑', '평화', '희망', '건강', '웃음', '감사', 
        '용기', '지혜', '성장', '발전', '성공', '미래', '소망', '도전', 
        '열정', '긍정', '자유', '평온', '신뢰', '배려', '나눔', '화합', 
        '창조', '무궁화', '풍요', '순수', '진실', '정의', '아름다움', '따뜻함', 
        '밝음', '새싹', '햇살', '무지개', '하늘', '바다', '선물', '축복',
        '소망', '환희', '영광', '승리', '진달래', '안정', '조화', '포용', 
        '이해', '존중', '친절', '예의', '예감', '예쁨', '소나기', '개나리',
        '꽃잔디', '꽃밭', '꽃봉오리', '연필', '책상', '책임', '두꺼비', '개구리',
        '소풍', '놀이터', '황소', '소나무', '소녀', '소년', '금반지', '소라'
    ].filter(word => word.length >= 2);

    const COLOR_PALETTES = [
        { bg: '#f0f8ff', h1: '#4a7c59', cell_bg: '#ffffff' },
        { bg: '#fff0f5', h1: '#8b0000', cell_bg: '#ffffff' },
        { bg: '#fffacd', h1: '#8b4513', cell_bg: '#ffffff' },
        { bg: '#e6e6fa', h1: '#4b0082', cell_bg: '#ffffff' }
    ];

    // --- Game and Attendance State ---
    const gameState = {
        currentGrid: [],
        foundWords: new Set(),
        selectedCells: [],
        isSelecting: false,
        wordsToFind: []
    };

    const attendanceState = {
        lastPlayedDate: null,
        dailyPlayCount: 0,
        attendanceStreak: 0,
        absenceCount: 0,
        dailyGoalMetToday: false
    };

    const STORAGE_KEYS = {
        LAST_PLAYED: 'lastPlayedDate',
        DAILY_COUNT: 'dailyPlayCount',
        STREAK: 'attendanceStreak',
        ABSENCE: 'absenceCount',
        GOAL_MET: 'dailyGoalMetToday'
    };
    
    const GOALS = {
        VOUCHER_DAYS: 30,
        DAILY_TARGET: 10,
        GRACE_DAYS: 3
    };

    // --- Main Logic ---

    function loadAttendanceState() {
        attendanceState.attendanceStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0');
        attendanceState.absenceCount = parseInt(localStorage.getItem(STORAGE_KEYS.ABSENCE) || '0');
        attendanceState.dailyPlayCount = parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_COUNT) || '0');
        attendanceState.dailyGoalMetToday = (localStorage.getItem(STORAGE_KEYS.GOAL_MET) === 'true');
        return localStorage.getItem(STORAGE_KEYS.LAST_PLAYED);
    }

    function resetDailyState() {
        attendanceState.dailyPlayCount = 0;
        attendanceState.dailyGoalMetToday = false;
    }

    function handleAbsences(diffDays) {
        if (attendanceState.dailyPlayCount < GOALS.DAILY_TARGET) {
            attendanceState.absenceCount += diffDays;
        }

        if (attendanceState.absenceCount > GOALS.GRACE_DAYS) {
            attendanceState.attendanceStreak = 0;
            attendanceState.absenceCount = 0;
        }
        resetDailyState();
    }

    function handleAttendance() {
        const lastPlayedDateStr = loadAttendanceState();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastPlayedDateStr) {
            const lastDate = new Date(lastPlayedDateStr);
            lastDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                handleAbsences(diffDays);
            }
        } else {
            Object.assign(attendanceState, { dailyPlayCount: 0, attendanceStreak: 0, absenceCount: 0, dailyGoalMetToday: false });
        }

        updateAndSaveState();
    }

    function updateAndSaveState() {
        localStorage.setItem(STORAGE_KEYS.LAST_PLAYED, new Date().toISOString());
        localStorage.setItem(STORAGE_KEYS.DAILY_COUNT, attendanceState.dailyPlayCount.toString());
        localStorage.setItem(STORAGE_KEYS.STREAK, attendanceState.attendanceStreak.toString());
        localStorage.setItem(STORAGE_KEYS.ABSENCE, attendanceState.absenceCount.toString());
        localStorage.setItem(STORAGE_KEYS.GOAL_MET, attendanceState.dailyGoalMetToday.toString());

        absenceDisplay.textContent = attendanceState.absenceCount.toString();
        const remainingDays = Math.max(0, GOALS.VOUCHER_DAYS - attendanceState.attendanceStreak);
        remainingDaysDisplay.textContent = remainingDays.toString();
        progressText.innerHTML = `오늘 게임 ${GOALS.DAILY_TARGET}회 중 <span id="daily-play-count-display">${attendanceState.dailyPlayCount}</span>회`;
    }

    function getRandomKoreanChar() {
        let charCode;
        const start = 0xAC00;
        const end = 0xD7A3;
        do {
            charCode = Math.floor(Math.random() * (end - start + 1)) + start;
        } while ((charCode - start) % 28 === 0);
        return String.fromCharCode(charCode);
    }

    function initializeGame() {
        gridContainer.innerHTML = '';
        messageArea.style.display = 'none';
        messageArea.textContent = '';
        gameState.foundWords.clear();
        gameState.selectedCells = [];
        gameState.isSelecting = false;

        const shuffledWords = [...ALL_POSSIBLE_WORDS].sort(() => 0.5 - Math.random());
        gameState.wordsToFind = shuffledWords.slice(0, WORDS_PER_PUZZLE);

        const randomPalette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        document.body.style.backgroundColor = randomPalette.bg;
        document.querySelector('h1').style.color = randomPalette.h1;
        gridContainer.style.backgroundColor = '#ccc';

        gameState.currentGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(''));

        placeWordsInGrid();
        fillEmptyCells();
        renderGrid();

        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.style.backgroundColor = randomPalette.cell_bg;
        });

        remainingWordsCountSpan.textContent = `${gameState.wordsToFind.length}개`;
        encouragementText.textContent = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    }

    function placeWordsInGrid() {
        let placementGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));

        gameState.wordsToFind.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 500) {
                const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                const row = Math.floor(Math.random() * GRID_ROWS);
                const col = Math.floor(Math.random() * GRID_COLS);

                let canPlace = false;
                if (direction === 'horizontal' && col + word.length <= GRID_COLS) {
                    let isSpaceFree = true;
                    for (let i = 0; i < word.length; i++) {
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const checkRow = row + dr;
                                const checkCol = col + i + dc;
                                if (checkRow >= 0 && checkRow < GRID_ROWS && checkCol >= 0 && checkCol < GRID_COLS) {
                                    if (placementGrid[checkRow][checkCol]) { isSpaceFree = false; break; }
                                }
                            }
                            if (!isSpaceFree) break;
                        }
                        if (!isSpaceFree) break;
                    }
                    canPlace = isSpaceFree;
                } else if (direction === 'vertical' && row + word.length <= GRID_ROWS) {
                    let isSpaceFree = true;
                    for (let i = 0; i < word.length; i++) {
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const checkRow = row + i + dr;
                                const checkCol = col + dc;
                                if (checkRow >= 0 && checkRow < GRID_ROWS && checkCol >= 0 && checkCol < GRID_COLS) {
                                    if (placementGrid[checkRow][checkCol]) { isSpaceFree = false; break; }
                                }
                            }
                            if (!isSpaceFree) break;
                        }
                        if (!isSpaceFree) break;
                    }
                    canPlace = isSpaceFree;
                }

                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        let r = direction === 'vertical' ? row + i : row;
                        let c = direction === 'horizontal' ? col + i : col;
                        gameState.currentGrid[r][c] = word[i];
                        placementGrid[r][c] = true;
                    }
                    placed = true;
                }
                attempts++;
            }
            if (!placed) console.warn(`Could not place word: ${word}`);
        });
    }

    function fillEmptyCells() {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (gameState.currentGrid[r][c] === '') {
                    gameState.currentGrid[r][c] = getRandomKoreanChar();
                }
            }
        }
    }

    function renderGrid() {
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.textContent = gameState.currentGrid[r][c];
                gridContainer.appendChild(cell);
            }
        }
    }

    function handleCorrectWord(selectedWord) {
        gameState.foundWords.add(selectedWord);
        gameState.selectedCells.forEach(cell => cell.classList.add('highlighted'));
        remainingWordsCountSpan.textContent = `${gameState.wordsToFind.length - gameState.foundWords.size}개`;

        if (gameState.foundWords.size === gameState.wordsToFind.length) {
            handleGameCompletion();
        } else {
            showMessage('정답입니다!', 'green');
        }
    }

    function handleGameCompletion() {
        attendanceState.dailyPlayCount++;
        if (attendanceState.dailyPlayCount >= GOALS.DAILY_TARGET && !attendanceState.dailyGoalMetToday) {
            attendanceState.dailyGoalMetToday = true;
            attendanceState.attendanceStreak++;
            attendanceState.absenceCount = 0;
        }
        updateAndSaveState();

        if (attendanceState.dailyPlayCount >= GOALS.DAILY_TARGET) {
            dailyGoalModal.style.display = 'flex';
        } else {
            const remainingPlays = Math.max(0, GOALS.DAILY_TARGET - attendanceState.dailyPlayCount);
            let progressMessage = `오늘 ${attendanceState.dailyPlayCount}판 완료!`;
            if (remainingPlays > 0) {
                progressMessage += `\n목표까지 ${remainingPlays}판 남았습니다.`;
            } else {
                progressMessage += `\n오늘 목표를 모두 달성하셨습니다!`;
            }

            setTimeout(() => {
                showMessage(progressMessage, 'blue');
                setTimeout(initializeGame, 5000);
            }, 1000);
        }
    }

    exitGameButton.addEventListener('click', () => {
        dailyGoalModal.style.display = 'none';
        document.getElementById('game-container').style.display = 'none';
        showMessage('오늘도 수고하셨습니다!', 'green');
    });

    function handleIncorrectWord() {
        if (gameState.selectedCells.length > 0) {
            showMessage('다시 시도해 보세요.', 'red');
        }
    }

    function checkSelectedWord() {
        if (gameState.selectedCells.length === 0) return;
        const selectedWord = gameState.selectedCells.map(cell => cell.textContent.trim()).join('');

        if (gameState.wordsToFind.includes(selectedWord) && !gameState.foundWords.has(selectedWord)) {
            handleCorrectWord(selectedWord);
        } else {
            handleIncorrectWord();
        }
    }

    function showMessage(msg, color) {
        messageArea.style.color = color;
        messageArea.innerHTML = msg.replace(/\n/g, '<br>');
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000);
    }

    // --- Unified Event Listeners ---
    function handleSelectionStart(target, event) {
        if (target.classList.contains('grid-cell')) {
            gameState.isSelecting = true;
            gameState.selectedCells = [target];
            target.classList.add('selected');
            if (event) event.preventDefault();
        }
    }

    function handleSelectionMove(target) {
        if (gameState.isSelecting && target && target.classList.contains('grid-cell') && !gameState.selectedCells.includes(target)) {
            gameState.selectedCells.push(target);
            target.classList.add('selected');
        }
    }

    function handleSelectionEnd() {
        if (gameState.isSelecting) {
            gameState.isSelecting = false;
            checkSelectedWord();
            document.querySelectorAll('.grid-cell.selected').forEach(cell => cell.classList.remove('selected'));
            gameState.selectedCells = [];
        }
    }

    gridContainer.addEventListener('mousedown', (e) => handleSelectionStart(e.target, e));
    gridContainer.addEventListener('mouseover', (e) => handleSelectionMove(e.target));
    gridContainer.addEventListener('mouseup', handleSelectionEnd);
    gridContainer.addEventListener('mouseleave', handleSelectionEnd); // Handle case where mouse leaves grid

    gridContainer.addEventListener('touchstart', (e) => handleSelectionStart(e.target, e));
    gridContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        handleSelectionMove(target);
    });
    gridContainer.addEventListener('touchend', handleSelectionEnd);

    // --- Modal and Initial Setup ---
    handleAttendance();

    if (motivationModal) {
        const startGame = () => {
            motivationModal.style.display = 'none';
            initializeGame();
        };

        motivationModal.style.display = 'flex';
        closeModalButton.onclick = startGame;
        startGameButton.onclick = startGame;
    } else {
        initializeGame();
    }
});