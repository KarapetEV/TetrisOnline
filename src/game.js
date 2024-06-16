export class Game {
    constructor() {
        this.canvas = document.getElementById('tetrisCanvas');
        this.context = this.canvas.getContext('2d');
        this.rows = 20; // Количество строк
        this.columns = 10; // Количество столбцов
        this.board = []; // Игровое поле
        this.initBoard();
        this.lastUpdateTime = Date.now();
        this.updateInterval = 500; // Интервал обновления в миллисекундах (0,5 секунды)
        this.animationFrameId = null;
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.isGameOver = false;
    }

    initBoard() {
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.columns; c++) {
                this.board[r][c] = ''; // Пустая ячейка
            }
        }
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

    start() {
        this.draw();
        this.spawnNewPiece();
        this.update();
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

        // Генерация случайной фигуры
        const shapeKeys = Object.keys(SHAPES);
        const randomShapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        const shape = SHAPES[randomShapeKey];
        const color = COLORS[randomShapeKey];
        this.currentPiece = new Piece(shape, color);
        this.currentPiece.x = Math.floor(this.columns / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = -1; // Убедитесь, что фигура появляется в самом верху стакана
    }

    draw() {
        // Очистка канваса
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        // Отрисовка игрового поля
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                if (this.board[r][c] === '') {
                    this.context.fillStyle = 'white'; // Цвет пустой ячейки
                } else {
                    this.context.fillStyle = this.board[r][c]; // Цвет заполненной ячейки
                }
                this.context.fillRect(c * 20, r * 20, 20, 20); // Размер ячейки 20x20
                this.context.strokeRect(c * 20, r * 20, 20, 20); // Граница ячейки
            }
        }
    
        // Отрисовка текущей фигуры (пример)
        if (this.currentPiece) {
            this.context.fillStyle = this.currentPiece.color;
            // Для каждой ячейки фигуры
            for (let r = 0; r < this.currentPiece.shape.length; r++) {
                for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                    if (this.currentPiece.shape[r][c]) {
                        this.context.fillRect((this.currentPiece.x + c) * 20, (this.currentPiece.y + r) * 20, 20, 20);
                    }
                }
            }
        }
    }

    update() {
        if (this.isGameOver) return; // Прекращаем обновление, если игра завершена
        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        if (deltaTime > this.updateInterval) {
            if (this.currentPiece) {
                if (!this.checkCollision(0, 1)) {
                    this.currentPiece.y++;
                } else {
                    this.freezePiece();
                }
            }
            this.lastUpdateTime = now;
        }

        this.draw();
        this.animationFrameId = requestAnimationFrame(this.update.bind(this));
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
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId); // Отменяем анимационный кадр
        }
        // Здесь можно добавить дополнительную логику для обработки конца игры
    }
}

class Piece {
    constructor(shape, color) {
        this.shape = shape; // Форма фигуры в виде двумерного массива
        this.color = color; // Цвет фигуры
        this.x = 0; // Начальная позиция по горизонтали
        this.y = 0; // Начальная позиция по вертикали
    }

    // Методы для управления фигурой (вращение, перемещение)...
}
