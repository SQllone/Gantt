
// Загрузка библиотеки Google Charts
google.charts.load('current', {'packages':['gantt']});
google.charts.setOnLoadCallback(drawChart);

// Инициализация данных диаграммы
let chartData = loadChartData() || [
    ['ID задачи', 'Имя задачи', 'Дата начала', 'Дата окончания', 'Длительность', 'Процент выполнения', 'Зависимости'],
];

// Функция для сохранения данных диаграммы в localStorage
function saveChartData() {
    localStorage.setItem('ganttChartData', JSON.stringify(chartData));
}

// Функция для загрузки данных диаграммы из localStorage
function loadChartData() {
    const data = localStorage.getItem('ganttChartData');
    return data ? JSON.parse(data) : null;
}

// Функция для отрисовки диаграммы Ганта
function drawChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'ID задачи');
    data.addColumn('string', 'Имя задачи');
    data.addColumn('date', 'Дата начала');
    data.addColumn('date', 'Дата окончания');
    data.addColumn('number', 'Длительность');
    data.addColumn('number', 'Процент выполнения');
    data.addColumn('string', 'Зависимости');

    const formattedChartData = chartData.slice(1).map(task => [
        task[0], task[1], new Date(task[2]), new Date(task[3]), task[4], task[5], task[6]
    ]);

    data.addRows(formattedChartData);

    const options = {
        height: 400,
        gantt: {
            trackHeight: 30,
            criticalPathEnabled: false,
            labelStyle: {
                fontName: 'Arial',
                fontSize: 12,
                color: '#000',
            },
            barCornerRadius: 5,
            shadowEnabled: true,
            palette: [
                {
                    "color": "#5f6bc4",
                    "dark": "#1c4587",
                    "light": "#7d89e0"
                }
            ]
        }
    };

    const chart = new google.visualization.Gantt(document.getElementById('chart_div'));
    chart.draw(data, options);

    
    
    // Добавление слушателя событий для клика
    google.visualization.events.addListener(chart, 'select', () => {
        const selection = chart.getSelection();
        if (selection.length > 0) {
            const row = selection[0].row;
            if (row !== null && row !== undefined) {
                const task = chartData[row + 1]; // +1 для учета заголовка
                if (task) {
                    document.getElementById('taskId').value = task[0];
                    document.getElementById('taskName').value = task[1];
                    document.getElementById('startDate').value = formatDateInput(new Date(task[2]));
                    document.getElementById('endDate').value = formatDateInput(new Date(task[3]));
                    document.getElementById('percentComplete').value = task[5];
                    document.getElementById('dependencies').value = task[6];
                }
            }
        }
    });

}

// Функция форматирования даты для ввода в формате yyyy-mm-dd
function formatDateInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Добавление или обновление задачи в данных диаграммы
document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const taskName = document.getElementById('taskName').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const percentComplete = parseInt(document.getElementById('percentComplete').value);
    const dependencies = document.getElementById('dependencies').value || null;

    // Проверка на корректность введенных данных
    if (!taskId || !taskName || !startDate || !endDate || isNaN(percentComplete)) {
        alert('Пожалуйста, заполните все поля корректно.');
        return;
    }

    // Проверка на существование задачи с таким же ID
    const existingTaskIndex = chartData.findIndex(task => task[0] === taskId);
    if (existingTaskIndex !== -1) {
        chartData[existingTaskIndex] = [taskId, taskName, startDate, endDate, null, percentComplete, dependencies];
    } else {
        chartData.push([taskId, taskName, startDate, endDate, null, percentComplete, dependencies]);
    }

    drawChart();
    saveChartData();

    document.getElementById('taskForm').reset();
    updateTaskIdField();
});

// Удаление задачи из данных диаграммы
document.getElementById('deleteTask').addEventListener('click', () => {
    const taskId = document.getElementById('taskId').value;

    const taskIndex = chartData.findIndex(task => task[0] === taskId);
    if (taskIndex !== -1) {
        chartData.splice(taskIndex, 1);

        // Обновление зависимостей задач и ID задач
        chartData.forEach((task, index) => {
            if (task[6] === taskId) {
                task[6] = null;
            }
            if (index > 0) {
                task[0] = (index).toString();
            }
        });

        // Обновление зависимостей с учетом новых ID
        chartData.forEach(task => {
            if (task[6]) {
                task[6] = task[6].split(',').map(depId => {
                    const depTask = chartData.find(t => t[0] === depId);
                    return depTask ? depTask[0] : null;
                }).filter(dep => dep !== null).join(',');
            }
        });

        drawChart();
        saveChartData();
        document.getElementById('taskForm').reset();
        updateTaskIdField();
    }
});

// Сохранение данных диаграммы в файл JSON
document.getElementById('saveChart').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chartData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "gantt_chart_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    document.body.removeChild(downloadAnchorNode); // Удаляем элемент после скачивания
});

// Импорт данных диаграммы из файла JSON
document.getElementById('importChart').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const importedData = JSON.parse(event.target.result);
            chartData = importedData;
            drawChart();
            saveChartData();
        };
        reader.readAsText(file);
    }
});

// Функция обновления поля ID задачи для следующей задачи
function updateTaskIdField() {
    const maxId = Math.max(0, ...chartData.slice(1).map(task => parseInt(task[0])));
    document.getElementById('taskId').value = (maxId + 1).toString();
}

// Инициализация поля ID    
updateTaskIdField();
drawChart();
