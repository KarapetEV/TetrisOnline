export class Game {
    constructor(opponentId, socket) {
        this.opponentId = opponentId;
        this.socket = socket;
        this.canvas = document.getElementById('playerCanvas');
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        // Добавляем канвас и контекст соперника
        this.opponentCanvas = document.getElementById('opponentCanvas');
        this.opponentContext = this.opponentCanvas.getContext('2d', { willReadFrequently: true });
        // Добавляем канвас и контекст для фона
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.backgroundContext = backgroundCanvas.getContext('2d', { willReadFrequently: true });

        this.rows = 20; // Количество строк
        this.columns = 10; // Количество столбцов
        this.board = []; // Игровое поле
        this.initBoard();
        this.lastUpdateTime = Date.now();
        this.updateInterval = 750; // Интервал обновления в миллисекундах (0,5 секунды)
        this.animationFrameId = null;
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.isGameOver = false;
        this.needsRedraw = true; // Флаг, указывающий на необходимость перерисовки
        this.cellSize = 25;
        this.nextPiece = null; // Следующая фигура
    }

    initBoard() {
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.columns; c++) {
                this.board[r][c] = ''; // Пустая ячейка
            }
        }
    }

    
    start() {
        this.draw();
        this.spawnNewPiece();
        this.update();
    }

    handleKeyPress(event) {
        if (!this.currentPiece) return;

        const handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];

        if (handledKeys.includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }

        switch (event.key) {
            case 'ArrowLeft':
                // Логика перемещения фигуры влево
                if (!this.checkCollision(-1, 0)) {
                    this.currentPiece.x--;
                }
                break;
            case 'ArrowRight':
                // Логика перемещения фигуры вправо
                if (!this.checkCollision(1, 0)) {
                    this.currentPiece.x++;
                }
                break;
            case 'ArrowUp':
                // Логика вращения фигуры
                let newShape = this.rotatePiece(this.currentPiece.shape);
                if (!this.checkCollision(0, 0, newShape)) {
                    this.currentPiece.shape = newShape;
                }
                break;
            case 'ArrowDown':
                // Ускорение падения фигуры
                if (!this.checkCollision(0, 1)) {
                    this.currentPiece.y++;
                }
                break;
            case ' ':
                // Резкое падение фигуры
                this.dropPiece();
                break;
        }

        this.draw();
    }

    dropPiece() {
        // Псевдокод для резкого падения фигуры
        while (!this.checkCollision(0, 1)) {
            this.currentPiece.y++;
        }

        this.freezePiece();
    }

    checkCollision(x, y, candidate = null) {
        const shape = candidate || this.currentPiece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                // Если в ячейке нет блока, пропускаем ее
                if (!shape[r][c]) continue;
    
                const newX = this.currentPiece.x + c + x;
                const newY = this.currentPiece.y + r + y;
    
                // Проверка выхода за границы стакана
                if (newX < 0 || newX >= this.columns || newY >= this.rows) {
                    return true;
                }
    
                // Пропускаем проверку newY < 0, так как это позволяет фигуре "входить" в стакан сверху
                if (newY < 0) continue;
    
                // Проверка столкновения с уже уложенными фигурами
                if (this.board[newY][newX] !== '') {
                    return true;
                }
            }
        }
        return false;
    }

    rotatePiece(candidate) {
        // Создаем копию фигуры для вращения
        let newShape = candidate.map(row => row.slice());
        // Вращение (пример для 90 градусов по часовой стрелке)
        for (let y = 0; y < candidate.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [newShape[x][y], newShape[y][x]] = [newShape[y][x], newShape[x][y]];
            }
        }
        newShape.forEach(row => row.reverse());
        return newShape;
    }

    spawnNewPiece() {
        const SHAPES = {
            I: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            O: [
                [0, 0, 0, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 0, 0, 0]
            ],
            S: [
                [0, 0, 0, 0],
                [0, 0, 1, 1],
                [0, 1, 1, 0],
                [0, 0, 0, 0]
            ],
            Z: [
                [0, 0, 0, 0],
                [0, 1, 1, 0],
                [0, 0, 1, 1],
                [0, 0, 0, 0]
            ],
            L: [
                [0, 0, 0, 0],
                [0, 1, 1, 1],
                [0, 1, 0, 0],
                [0, 0, 0, 0]
            ],
            J: [
                [0, 0, 0, 0],
                [0, 1, 1, 1],
                [0, 0, 0, 1],
                [0, 0, 0, 0]
            ],
            T: [
                [0, 0, 0, 0],
                [0, 1, 1, 1],
                [0, 0, 1, 0],
                [0, 0, 0, 0]
            ],
        };
        
        const COLORS = {
            I: 'cyan',
            O: 'yellow',
            S: 'green',
            Z: 'red',
            L: 'orange',
            J: 'blue',
            T: 'purple'
        };

        // Если следующая фигура уже существует, используем её как текущую
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
            this.currentPiece.x = Math.floor(this.columns / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
            this.currentPiece.y = -1; // Убедитесь, что фигура появляется в самом верху стакана
        } else {
            // Генерация случайной фигуры для текущего хода
            let randomShapeKey = Object.keys(SHAPES)[Math.floor(Math.random() * Object.keys(SHAPES).length)];
            let shape = SHAPES[randomShapeKey];
            let rotations = Math.floor(Math.random() * 4);
            shape = this.rotatePieceMultipleTimes(shape, rotations);
            const color = '#2E6C6A'; // Цвет всех фигур
            this.currentPiece = new Piece(shape, color);
            this.currentPiece.x = Math.floor(this.columns / 2) - Math.floor(shape[0].length / 2);
            this.currentPiece.y = -1;
        }

        // Генерация следующей фигуры
        let nextRandomShapeKey = Object.keys(SHAPES)[Math.floor(Math.random() * Object.keys(SHAPES).length)];
        let nextShape = SHAPES[nextRandomShapeKey];
        let nextRotations = Math.floor(Math.random() * 4);
        nextShape = this.rotatePieceMultipleTimes(nextShape, nextRotations);
        this.nextPiece = new Piece(nextShape, '#2E6C6A'); // Установка цвета для следующей фигуры
    }

    rotatePieceMultipleTimes(shape, times) {
        let rotatedShape = shape;
        for (let i = 0; i < times; i++) {
            rotatedShape = this.rotatePiece(rotatedShape);
        }
        return rotatedShape;
    }

    drawNextPiece(context, nextPiece, offsetX, offsetY) {
        const panelWidth = 4 * this.cellSize; // Ширина панели, достаточная для отображения фигуры
        const nextPieceBlockSize = 4 * this.cellSize; // Высота блока для следующей фигуры
    
        // Очищаем область для следующей фигуры
        context.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Полупрозрачный фон
        context.fillRect(offsetX, offsetY, panelWidth, nextPieceBlockSize);
    
        if (nextPiece) {
            // Вычисляем смещение для центрирования следующей фигуры в блоке
            const pieceOffsetX = offsetX + (panelWidth - nextPiece.shape[0].length * this.cellSize) / 2;
            const pieceOffsetY = offsetY + (nextPieceBlockSize - nextPiece.shape.length * this.cellSize) / 2;
    
            // Отрисовка следующей фигуры
            context.fillStyle = nextPiece.color;
            for (let r = 0; r < nextPiece.shape.length; r++) {
                for (let c = 0; c < nextPiece.shape[r].length; c++) {
                    if (nextPiece.shape[r][c]) {
                        this.drawRoundedRect(
                            context,
                            pieceOffsetX + c * this.cellSize,
                            pieceOffsetY + r * this.cellSize,
                            this.cellSize,
                            this.cellSize,
                            3,
                            nextPiece.color,
                            '#87CEEB'
                        );
                    }
                }
            }
        }
    }

    draw() {
        // Очистка канваса
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        // Отрисовка игрового поля
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                let fillColor = 'rgba(0, 0, 0, 0.7)'; // Цвет пустой ячейки
                if (this.board[r][c] !== '') {
                    fillColor = this.board[r][c]; // Цвет заполненной ячейки
                }
                this.drawRoundedRect(this.context, c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize, 3, fillColor, '#87CEEB'); // Размер ячейки 25x25
            }
        }
    
        // Отрисовка текущей фигуры (пример)
        if (this.currentPiece) {
            this.context.fillStyle = this.currentPiece.color;
            // Для каждой ячейки фигуры
            for (let r = 0; r < this.currentPiece.shape.length; r++) {
                for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                    if (this.currentPiece.shape[r][c]) {
                        // Используем новую функцию для отрисовки блока с закругленными углами
                        this.drawRoundedRect(this.context, (this.currentPiece.x + c) * this.cellSize, (this.currentPiece.y + r) * this.cellSize, this.cellSize, this.cellSize, 3, this.currentPiece.color, 'rgba(0, 0, 0, 0.9)');
                    }
                }
            }
        }

        // Отрисовка боковой панели
        const panelX = this.columns * this.cellSize; // X-координата начала панели
        const panelWidth = 4 * this.cellSize; // Ширина панели, достаточная для отображения фигуры
        const panelHeight = this.rows * this.cellSize; // Высота панели, равная высоте стакана

        // Отрисовка фона панели
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Полупрозрачный фон
        this.context.fillRect(panelX, 0, panelWidth, panelHeight);

        // Отрисовка верхнего блока для следующей фигуры
        const nextPieceBlockSize = 4 * this.cellSize; // Высота блока для следующей фигуры
        this.context.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Фон блока для следующей фигуры
        this.context.fillRect(panelX, 0, panelWidth, nextPieceBlockSize);

        // Отрисовка нижнего блока (пока пустого)
        this.context.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Фон нижнего блока
        this.context.fillRect(panelX, nextPieceBlockSize, panelWidth, panelHeight - nextPieceBlockSize);

        // Отрисовка следующей фигуры
        this.drawNextPiece(this.context, this.nextPiece, panelX, 0);

        // Отрисовка границы стакана
        this.drawBorder(this.context);

        // Отрисовка границы боковой панели
        this.context.strokeStyle = '#87CEEB'; // Цвет границы
        this.context.lineWidth = 2; // Толщина линии
        this.context.strokeRect(panelX, 0, panelWidth, panelHeight); // Рисуем прямоугольник вокруг панели
    }

    // Функция для отрисовки фона стакана на отдельном канвасе
    drawBackground() {
        // Очистка канваса
        this.backgroundContext.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);

        // Отрисовка фона стакана
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                let fillColor = 'rgba(0, 0, 0, 0.7)'; // Цвет пустой ячейки
                if (this.board[r][c] !== '') {
                    fillColor = this.board[r][c]; // Цвет заполненной ячейки
                }
                this.drawRoundedRect(this.backgroundContext, c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize, 3, fillColor, '#87CEEB'); // Размер ячейки 25x25
            }
        }
    }

    drawBorder(context) {
        // Устанавливаем цвет границы стакана
        context.strokeStyle = '#87CEEB';
        // Устанавливаем толщину линии для границы
        context.lineWidth = 2;
        // Рисуем прямоугольник вокруг стакана
        // Предполагаем, что отступ от краев канваса составляет 1 размер ячейки, отсюда и -2 и +4 в расчетах
        context.strokeRect(1, 1, this.columns * this.cellSize - 2, this.rows * this.cellSize - 2);
    }

    drawRoundedRect(context, x, y, width, height, radius, fillColor, strokeColor) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + width, y, x + width, y + height, radius);
        context.arcTo(x + width, y + height, x, y + height, radius);
        context.arcTo(x, y + height, x, y, radius);
        context.arcTo(x, y, x + width, y, radius);
        context.closePath();
        context.fillStyle = fillColor;
        context.fill();
        context.strokeStyle = strokeColor;
        context.lineWidth = 0.2;
        context.stroke();
    }

    update() {
        if (this.isGameOver) return; // Прекращаем обновление, если игра завершена
        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        let stateChanged = false; // Флаг, указывающий на изменение состояния игры

        if (deltaTime > this.updateInterval) {
            if (this.currentPiece) {
                if (!this.checkCollision(0, 1)) {
                    this.currentPiece.y++;
                    this.needsRedraw = true; // Требуется перерисовка, так как фигура двигалась
                    stateChanged = true; // Состояние игры изменилось
                } else {
                    this.freezePiece();
                    this.needsRedraw = true; // Требуется перерисовка, так как фигура двигалась
                    // Не устанавливаем stateChanged, так как freezePiece уже вызывает sendGameState
                }
            }
            this.lastUpdateTime = now;
        }

        if (this.needsRedraw) {
            this.draw();
            this.needsRedraw = false; // Сброс флага после перерисовки
        }

        // Отправляем состояние игры, если произошли значимые изменения
        if (stateChanged) {
            this.sendGameState(false);
        }

        this.animationFrameId = setTimeout(this.update.bind(this), 0);
    }

    // Функция для обновления фона на отдельном канвасе при изменении фигуры
    updateBackground() {
        // Очистка канваса
        this.backgroundContext.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);

        // Обновление только соответствующей части фона на отдельном канвасе
        for (let r = 0; r < this.board.length; r++) {
            for (let c = 0; c < this.board[r].length; c++) {
                let fillColor = 'rgba(0, 0, 0, 0.7)'; // Цвет пустой ячейки
                if (this.board[r][c] !== '') {
                    fillColor = this.board[r][c]; // Цвет заполненной ячейки
                }
                this.drawRoundedRect(this.backgroundContext, c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize, 3, fillColor, '#87CEEB'); // Размер ячейки 25x25
            }
        }

        // Обновление фигуры на фоне (если необходимо)
        if (this.currentPiece) {
            this.backgroundContext.fillStyle = this.currentPiece.color;
            for (let r = 0; r < this.currentPiece.shape.length; r++) {
                for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                    if (this.currentPiece.shape[r][c]) {
                        this.drawRoundedRect(this.backgroundContext, (this.currentPiece.x + c) * this.cellSize, (this.currentPiece.y + r) * this.cellSize, this.cellSize, this.cellSize, 3, this.currentPiece.color, 'rgba(0, 0, 0, 0.9)');
                    }
                }
            }
        }
    }

    freezePiece() {
        for (let r = 0; r < this.currentPiece.shape.length; r++) {
            for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                // Пропускаем пустые ячейки фигуры
                if (!this.currentPiece.shape[r][c]) continue;
                // Проверяем, не выходит ли фигура за пределы стакана
                if (this.currentPiece.y + r <= 0) {
                    this.gameOver();
                    return; // Важно прекратить выполнение функции здесь
                }
    
                // Добавляем фигуру на игровое поле
                this.board[this.currentPiece.y + r][this.currentPiece.x + c] = this.currentPiece.color;
            }
        }
    
        // Проверка на заполненные линии и их удаление
        this.checkLines();

        // Отправляем обновленное состояние игры на сервер
        this.sendGameState(false);

        // Генерация новой фигуры
        this.spawnNewPiece();
    }

    checkLines() {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== '')) {
                // Удаляем заполненную линию
                this.board.splice(r, 1);
                // Добавляем новую пустую линию в начало массива
                this.board.unshift(new Array(this.columns).fill(''));
                // После удаления строки нужно проверить ту же строку еще раз, так как она сдвинулась вниз
                r++;
            }
        }
    }

    gameOver() {
        console.log("Game Over");
        this.isGameOver = true;
        this.sendGameState(true);

        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId); // Отменяем анимационный кадр
        }
    }

    // Генерация события завершения игры
    endGame() {
        // Генерация пользовательского события "gameEnd"
        const event = new CustomEvent("gameEnd");
        document.dispatchEvent(event);
    }

    // Функция остановки игры
    stop() {
        console.log(`Останавливаем игру!!!`)
        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId); // Отменяем анимационный кадр
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.opponentContext.clearRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);
    }

    drawOpponentField(gameState) {
        // Очистите канвас соперника
        this.opponentContext.clearRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);
    
        // Перебираем массив gameState и отрисовываем каждый блок
        for (let r = 0; r < gameState.boardState.length; r++) {
            for (let c = 0; c < gameState.boardState[r].length; c++) {
                let fillColor = 'rgba(0, 0, 0, 0.7)'; // Цвет пустой ячейки
                // Если ячейка не пустая, отрисовываем блок
                if (gameState.boardState[r][c] !== '') {
                    fillColor = gameState.boardState[r][c];
                }
                this.drawRoundedRect(
                    this.opponentContext,
                    c * this.cellSize, // X координата блока
                    r * this.cellSize, // Y координата блока
                    this.cellSize,     // Ширина блока
                    this.cellSize,     // Высота блока
                    3, // Радиус закругления
                    fillColor, // Цвет заполненной ячейки
                    '#87CEEB' // Цвет границы блока
                );
            }
        }
        
        // Отрисовка боковой панели соперника
        const panelX = this.columns * this.cellSize; // X-координата начала панели
        const panelWidth = 4 * this.cellSize; // Ширина панели
        const panelHeight = this.rows * this.cellSize; // Высота панели

        // Отрисовка фона панели
        this.opponentContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.opponentContext.fillRect(panelX, 0, panelWidth, panelHeight);

        // Отрисовка верхнего блока для следующей фигуры
        const nextPieceBlockSize = 4 * this.cellSize;
        this.opponentContext.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.opponentContext.fillRect(panelX, 0, panelWidth, nextPieceBlockSize);

        // Отрисовка нижнего блока
        this.opponentContext.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.opponentContext.fillRect(panelX, nextPieceBlockSize, panelWidth, panelHeight - nextPieceBlockSize);

        // Отрисовка следующей фигуры соперника
        if (gameState.nextPiece) {
            this.drawNextPiece(this.opponentContext, gameState.nextPiece, panelX, 0);
        }

        // Отрисовка границы стакана соперника
        this.drawBorder(this.opponentContext);

        // Отрисовка границы боковой панели соперника
        this.opponentContext.strokeStyle = '#87CEEB';
        this.opponentContext.lineWidth = 2;
        this.opponentContext.strokeRect(panelX, 0, panelWidth, panelHeight);
    }

    sendGameState(isGameOver) {
        const gameState = this.getGameState(); // Получаем текущее состояние игры

        const myId = localStorage.getItem('userId');
        const playerOneId = localStorage.getItem('player_one_id');
        const gameStartTime = localStorage.getItem('game_startTime');

        this.socket.emit('gameStateUpdate', { myId: myId, opponentId: this.opponentId, gameState: gameState, 
            isGameOver: isGameOver, playerOneId: playerOneId, gameStartTime: gameStartTime });

        // Удаляем данные из localStorage после отправки
        localStorage.removeItem('player_one_id');
        localStorage.removeItem('game_startTime');
    }

    getGameState() {
        // Создаем копию игрового поля
        const state = this.board.map(row => row.slice());
    
        // Если есть текущая падающая фигура, добавляем её в состояние
        if (this.currentPiece) {
            for (let r = 0; r < this.currentPiece.shape.length; r++) {
                for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                    if (this.currentPiece.shape[r][c]) {
                        // Проверяем, чтобы не выйти за пределы доски
                        if (this.currentPiece.y + r >= 0) {
                            state[this.currentPiece.y + r][this.currentPiece.x + c] = this.currentPiece.color;
                        }
                    }
                }
            }
        }

        // Добавляем информацию о следующей фигуре
        const nextPieceState = {
            shape: this.nextPiece.shape,
            color: this.nextPiece.color
        };
    
        return {
            boardState: state,
            nextPiece: nextPieceState
        };
    }
}

class Piece {
    constructor(shape, color) {
        this.shape = shape; // Форма фигуры в виде двумерного массива
        this.color = color; // Цвет фигуры
        this.x = 0; // Начальная позиция по горизонтали
        this.y = 0; // Начальная позиция по вертикали
    }
}
