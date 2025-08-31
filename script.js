document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gridContainer = document.getElementById('grid-container');
    const messageArea = document.getElementById('message-area');
    const statusPopup = document.getElementById('status-popup');
    const absenceDisplay = document.getElementById('absence-display');
    const remainingDaysDisplay = document.getElementById('remaining-days-display');
    const dailyPlayCountDisplay = document.getElementById('daily-play-count-display');
    const remainingWordsCountSpan = document.getElementById('remaining-words-count');
    const motivationModal = document.getElementById('motivation-modal');
    const closeModalButton = document.querySelector('.close-button');
    const startGameButton = document.getElementById('start-game-button');

    // --- Constants ---
    const GRID_ROWS = 10;
    const GRID_COLS = 8;
    const WORDS_PER_PUZZLE = 8;
    const ALL_POSSIBLE_WORDS = [
        '행복', '기쁨', '사랑', '평화', '희망', '건강', '웃음', '감사', '용기', '지혜',
        '성장', '발전', '성공', '미래', '소망', '도전', '열정', '긍정', '자유', '평온',
        '신뢰', '배려', '나눔', '화합', '창조', '무궁화', '풍요', '순수', '진실', '정의',
        '아름다움', '따뜻함', '밝음', '새싹', '햇살', '무지개', '하늘', '바다', '선물', '축복',
        '소망', '환희', '영광', '승리', '진달래', '안정', '조화', '포용', '이해', '존중'
    ].filter(word => word.length >= 2);

    const PRAISE_MESSAGES = [
        "벌써 다 찾았어요!!",
        "집중력이 정말 높으시네요!",
        "남들보다 훨씬 빨라요~~",
        "머리가 엄청 좋으신거 같아요~!",
        "대단해요! 다음 문제도 기대되네요."
    ];

    const COLOR_PALETTES = [
        { bg: '#f0f8ff', h1: '#4a7c59', cell_bg: '#ffffff' },
        { bg: '#fff0f5', h1: '#8b0000', cell_bg: '#ffffff' },
        { bg: '#fffacd', h1: '#8b4513', cell_bg: '#ffffff' },
        { bg: '#e6e6fa', h1: '#4b0082', cell_bg: '#ffffff' }
    ];

    // --- Game State ---
    let currentGrid = [];
    let foundWords = new Set();
    let selectedCells = [];
    let isSelecting = false;
    let WORDS_TO_FIND = [];

    // --- Attendance State ---
    const LAST_PLAYED_DATE_KEY = 'lastPlayedDate';
    const DAILY_PLAY_COUNT_KEY = 'dailyPlayCount';
    const ATTENDANCE_STREAK_KEY = 'attendanceStreak';
    const ABSENCE_COUNT_KEY = 'absenceCount';
    const DAILY_GOAL_MET_TODAY_KEY = 'dailyGoalMetToday';
    const VOUCHER_GOAL_DAYS = 30;
    const DAILY_PLAY_TARGET = 10;
    const ABSENCE_GRACE_DAYS = 3;

    let dailyPlayCount = 0;
    let attendanceStreak = 0;
    let absenceCount = 0;
    let dailyGoalMetToday = false;

    // --- Main Logic ---

    function handleAttendance() {
        let lastPlayedDateStr = localStorage.getItem(LAST_PLAYED_DATE_KEY);
        attendanceStreak = parseInt(localStorage.getItem(ATTENDANCE_STREAK_KEY) || '0');
        absenceCount = parseInt(localStorage.getItem(ABSENCE_COUNT_KEY) || '0');
        dailyPlayCount = parseInt(localStorage.getItem(DAILY_PLAY_COUNT_KEY) || '0');
        dailyGoalMetToday = (localStorage.getItem(DAILY_GOAL_MET_TODAY_KEY) === 'true');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastPlayedDateStr) {
            const lastDate = new Date(lastPlayedDateStr);
            lastDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                if (dailyPlayCount < DAILY_PLAY_TARGET) {
                    absenceCount += diffDays;
                }

                if (absenceCount > ABSENCE_GRACE_DAYS) {
                    attendanceStreak = 0;
                    absenceCount = 0;
                }

                dailyPlayCount = 0;
                dailyGoalMetToday = false;
            }
        } else {
            dailyPlayCount = 0;
            attendanceStreak = 0;
            absenceCount = 0;
            dailyGoalMetToday = false;
        }

        updateAndSaveState();
    }

    function updateAndSaveState() {
        localStorage.setItem(LAST_PLAYED_DATE_KEY, new Date().toISOString());
        localStorage.setItem(DAILY_PLAY_COUNT_KEY, dailyPlayCount.toString());
        localStorage.setItem(ATTENDANCE_STREAK_KEY, attendanceStreak.toString());
        localStorage.setItem(ABSENCE_COUNT_KEY, absenceCount.toString());
        localStorage.setItem(DAILY_GOAL_MET_TODAY_KEY, dailyGoalMetToday.toString());

        absenceDisplay.textContent = absenceCount.toString();
        const remainingDays = Math.max(0, VOUCHER_GOAL_DAYS - attendanceStreak);
        remainingDaysDisplay.textContent = remainingDays.toString();
        dailyPlayCountDisplay.textContent = dailyPlayCount.toString();
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
        foundWords.clear();
        selectedCells = [];
        isSelecting = false;

        WORDS_TO_FIND = [];
        const shuffledWords = [...ALL_POSSIBLE_WORDS].sort(() => 0.5 - Math.random());
        for (let i = 0; i < WORDS_PER_PUZZLE; i++) {
            WORDS_TO_FIND.push(shuffledWords[i]);
        }

        const randomPalette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        document.body.style.backgroundColor = randomPalette.bg;
        document.querySelector('h1').style.color = randomPalette.h1;
        gridContainer.style.backgroundColor = '#ccc';

        currentGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(''));

        placeWordsInGrid();
        fillEmptyCells();
        renderGrid();

        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.style.backgroundColor = randomPalette.cell_bg;
        });

        remainingWordsCountSpan.textContent = `${WORDS_TO_FIND.length}개`;
    }

    function placeWordsInGrid() {
        let placementGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));

        WORDS_TO_FIND.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 500) {
                const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                const row = Math.floor(Math.random() * GRID_ROWS);
                const col = Math.floor(Math.random() * GRID_COLS);

                let canPlace = false;
                if (direction === 'horizontal') {
                    if (col + word.length <= GRID_COLS) {
                        let isSpaceFree = true;
                        for (let i = 0; i < word.length; i++) {
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    const checkRow = row + dr;
                                    const checkCol = col + i + dc;
                                    if (checkRow >= 0 && checkRow < GRID_ROWS && checkCol >= 0 && checkCol < GRID_COLS) {
                                        if (placementGrid[checkRow][checkCol]) {
                                            isSpaceFree = false;
                                            break;
                                        }
                                    }
                                }
                                if (!isSpaceFree) break;
                            }
                            if (!isSpaceFree) break;
                        }
                        canPlace = isSpaceFree;
                    }
                } else {
                    if (row + word.length <= GRID_ROWS) {
                        let isSpaceFree = true;
                        for (let i = 0; i < word.length; i++) {
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    const checkRow = row + i + dr;
                                    const checkCol = col + dc;
                                    if (checkRow >= 0 && checkRow < GRID_ROWS && checkCol >= 0 && checkCol < GRID_COLS) {
                                        if (placementGrid[checkRow][checkCol]) {
                                            isSpaceFree = false;
                                            break;
                                        }
                                    }
                                }
                                if (!isSpaceFree) break;
                            }
                            if (!isSpaceFree) break;
                        }
                        canPlace = isSpaceFree;
                    }
                }

                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        let r = direction === 'vertical' ? row + i : row;
                        let c = direction === 'horizontal' ? col + i : col;
                        currentGrid[r][c] = word[i];
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
                if (currentGrid[r][c] === '') {
                    currentGrid[r][c] = getRandomKoreanChar();
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
                cell.textContent = currentGrid[r][c];
                gridContainer.appendChild(cell);
            }
        }
    }

    function checkSelectedWord() {
        if (selectedCells.length === 0) return;
        const selectedWord = selectedCells.map(cell => cell.textContent).join('');

        if (WORDS_TO_FIND.includes(selectedWord) && !foundWords.has(selectedWord)) {
            foundWords.add(selectedWord);
            selectedCells.forEach(cell => cell.classList.add('highlighted'));
            remainingWordsCountSpan.textContent = `${WORDS_TO_FIND.length - foundWords.size}개`;
            showMessage('정답입니다!', 'green');

            if (foundWords.size === WORDS_TO_FIND.length) {
                dailyPlayCount++;
                if (dailyPlayCount >= DAILY_PLAY_TARGET && !dailyGoalMetToday) {
                    dailyGoalMetToday = true;
                    attendanceStreak++;
                    absenceCount = 0;
                    showMessage('축하합니다! 오늘 목표를 달성하셨습니다.', 'blue');
                }
                updateAndSaveState();

                const remainingPlays = Math.max(0, DAILY_PLAY_TARGET - dailyPlayCount);
                const praiseMessage = PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
                const progressMessage = `${praiseMessage}\n오늘 ${dailyPlayCount}판 완료! 목표까지 ${remainingPlays}판 남았습니다.`;
                
                setTimeout(() => {
                    showMessage(progressMessage, 'blue');
                    const messageDuration = Math.max(3000, progressMessage.length * 500);
                    setTimeout(initializeGame, messageDuration + 500); // Start next game after message disappears
                }, 1000);
            }
        } else {
            showMessage('다시 시도해 보세요.', 'red');
        }
    }

    function showMessage(msg, color) {
        messageArea.innerHTML = msg.replace(/\n/g, '<br>'); // Allow line breaks
        messageArea.style.color = color === 'green' ? '#28a745' : (color === 'blue' ? '#007bff' : '#dc3545');
        messageArea.style.display = 'block';
        
        const duration = Math.max(3000, msg.length * 500);

        setTimeout(() => {
            messageArea.style.display = 'none';
        }, duration);
    }

    // --- Event Listeners ---
    gridContainer.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('grid-cell')) {
            isSelecting = true;
            selectedCells = [e.target];
            e.target.classList.add('selected');
        }
    });

    gridContainer.addEventListener('mouseover', (e) => {
        if (isSelecting && e.target.classList.contains('grid-cell') && !selectedCells.includes(e.target)) {
            selectedCells.push(e.target);
            e.target.classList.add('selected');
        }
    });

    gridContainer.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            checkSelectedWord();
            document.querySelectorAll('.grid-cell.selected').forEach(cell => cell.classList.remove('selected'));
            selectedCells = [];
        }
    });

    gridContainer.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('grid-cell')) {
            isSelecting = true;
            selectedCells = [e.target];
            e.target.classList.add('selected');
            e.preventDefault();
        }
    });

    gridContainer.addEventListener('touchmove', (e) => {
        if (isSelecting) {
            e.preventDefault();
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.classList.contains('grid-cell') && !selectedCells.includes(target)) {
                selectedCells.push(target);
                target.classList.add('selected');
            }
        }
    });

    gridContainer.addEventListener('touchend', () => {
        if (isSelecting) {
            isSelecting = false;
            checkSelectedWord();
            document.querySelectorAll('.grid-cell.selected').forEach(cell => cell.classList.remove('selected'));
            selectedCells = [];
        }
    });

    // --- Modal and Initial Setup ---
    handleAttendance();

    if (motivationModal) {
        const startGame = () => {
            motivationModal.style.display = 'none';

            const statusDailyPlay = document.getElementById('status-daily-play');
            const statusRemainingDays = document.getElementById('status-remaining-days');
            
            let statusMessage = '';
            if (dailyPlayCount === 0) {
                statusMessage = '오늘의 첫 게임입니다! 화이팅!';
            } else {
                const remainingPlays = Math.max(0, DAILY_PLAY_TARGET - dailyPlayCount);
                statusMessage = `오늘 ${dailyPlayCount}판 완료!\n목표까지 ${remainingPlays}판 남았습니다.`;
            }

            statusPopup.innerHTML = statusMessage.replace(/\n/g, '<br>');
            statusPopup.style.display = 'block';
            
            const duration = Math.max(3000, statusMessage.length * 500);
            setTimeout(() => {
                statusPopup.style.display = 'none';
            }, duration);

            initializeGame();
        };

        motivationModal.style.display = 'flex';
        closeModalButton.onclick = startGame;
        startGameButton.onclick = startGame;
    } else {
        initializeGame();
    }
});
