// Configuração da aplicação
const CONFIG = {
    // IMPORTANTE: Substitua pela URL do seu Google Apps Script
    API_URL: 'https://script.google.com/macros/s/AKfycbyu-fMeIlTnbYTRLMUge3BLzDsVJOWsoWyTcSv96Uhs4rMaEeL3kw9-6jo9wgFggRVGVQ/exec',
    
    // Configurações locais
    DATE_FORMAT: 'pt-BR'
};

// Estado global da aplicação
let allMilitares = [];
let allRecords = [];
let currentMilitar = null;
let filteredMilitares = [];

// Elementos DOM principais
const elements = {
    // Screens
    selectionScreen: document.getElementById('selectionScreen'),
    appScreen: document.getElementById('appScreen'),
    loading: document.getElementById('loading'),
    
    // Selection Screen
    dashboardBtn: document.getElementById('dashboardBtn'),
    militaryListBtn: document.getElementById('militaryListBtn'),
    generalDashboard: document.getElementById('generalDashboard'),
    militaryList: document.getElementById('militaryList'),
    
    // Dashboard Elements
    totalMilitares: document.getElementById('totalMilitares'),
    saldoTotal: document.getElementById('saldoTotal'),
    registrosMes: document.getElementById('registrosMes'),
    militaresTable: document.getElementById('militaresTable'),
    
    // Military Selection
    searchMilitary: document.getElementById('searchMilitary'),
    militaryCards: document.getElementById('militaryCards'),
    
    // App Screen
    userName: document.getElementById('userName'),
    userPG: document.getElementById('userPG'),
    backBtn: document.getElementById('backBtn'),
    
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    contentSections: document.querySelectorAll('.content-section'),
    
    // Dashboard
    currentBalance: document.getElementById('currentBalance'),
    monthRecords: document.getElementById('monthRecords'),
    lastRecord: document.getElementById('lastRecord'),
    recentRecords: document.getElementById('recentRecords'),
    
    // Add Hours Form
    hoursForm: document.getElementById('hoursForm'),
    recordDate: document.getElementById('recordDate'),
    hoursValue: document.getElementById('hoursValue'),
    reason: document.getElementById('reason'),
    formMessage: document.getElementById('formMessage'),
    
    // History
    refreshHistory: document.getElementById('refreshHistory'),
    filterMonth: document.getElementById('filterMonth'),
    applyFilter: document.getElementById('applyFilter'),
    clearFilter: document.getElementById('clearFilter'),
    historyRecords: document.getElementById('historyRecords'),
    
    // Toast
    toast: document.getElementById('toast')
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    // Configurar data padrão para hoje
    const today = new Date().toISOString().split('T')[0];
    if (elements.recordDate) {
        elements.recordDate.value = today;
    }
    
    // Configurar filtro de mês para o mês atual
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (elements.filterMonth) {
        elements.filterMonth.value = currentMonth;
    }
    
    console.log('Aplicação inicializada');
}

function setupEventListeners() {
    // Selection Screen Navigation
    elements.dashboardBtn.addEventListener('click', () => showSelectionContent('dashboard'));
    elements.militaryListBtn.addEventListener('click', () => showSelectionContent('military'));
    
    // Back button
    elements.backBtn.addEventListener('click', backToSelection);
    
    // Search
    elements.searchMilitary.addEventListener('input', filterMilitares);
    
    // Navigation (if exists)
    if (elements.navBtns) {
        elements.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                showSection(section);
            });
        });
    }
    
    // Hours Form (if exists)
    if (elements.hoursForm) {
        elements.hoursForm.addEventListener('submit', handleAddHours);
        elements.hoursValue.addEventListener('input', formatHoursInput);
    }
    
    // History (if exists)
    if (elements.refreshHistory) {
        elements.refreshHistory.addEventListener('click', () => loadMilitarData(currentMilitar));
        elements.applyFilter.addEventListener('click', applyHistoryFilter);
        elements.clearFilter.addEventListener('click', clearHistoryFilter);
    }
    
    console.log('Event listeners configurados');
}

// Data Loading
async function loadInitialData() {
    showLoading(true);
    
    try {
        // Carregar militares
        const militaresResponse = await callAPI('getMilitares', {});
        if (militaresResponse.status === 'success') {
            allMilitares = militaresResponse.militares || [];
            displayMilitaryCards();
        }
        
        // Carregar todos os registros para o dashboard
        const recordsResponse = await callAPI('getAllRecords', {});
        if (recordsResponse.status === 'success') {
            allRecords = recordsResponse.records || [];
            updateGeneralDashboard();
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    } finally {
        showLoading(false);
    }
}

// Selection Screen Functions
function showSelectionContent(type) {
    // Update navigation
    elements.dashboardBtn.classList.toggle('active', type === 'dashboard');
    elements.militaryListBtn.classList.toggle('active', type === 'military');
    
    // Update content
    elements.generalDashboard.classList.toggle('active', type === 'dashboard');
    elements.militaryList.classList.toggle('active', type === 'military');
    
    if (type === 'dashboard') {
        updateGeneralDashboard();
    }
}

function updateGeneralDashboard() {
    // Total de militares ativos
    const activeMilitares = allMilitares.filter(m => m.ativo.toUpperCase() === 'SIM');
    elements.totalMilitares.textContent = activeMilitares.length;
    
    // Calcular saldo total e registros do mês
    let totalBalance = 0;
    let monthRecords = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const militarBalances = {};
    
    allRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const hours = parseFloat(record.hours.toString().replace(',', '.')) || 0;
        
        // Saldo total
        totalBalance += hours;
        
        // Registros do mês
        if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
            monthRecords++;
        }
        
        // Saldo por militar
        if (!militarBalances[record.numBombeiro]) {
            militarBalances[record.numBombeiro] = 0;
        }
        militarBalances[record.numBombeiro] += hours;
    });
    
    // Atualizar elementos
    elements.saldoTotal.textContent = formatHours(totalBalance);
    elements.saldoTotal.classList.toggle('negative', totalBalance < 0);
    elements.registrosMes.textContent = monthRecords;
    
    // Criar tabela de militares
    createMilitaresTable(militarBalances);
}

function createMilitaresTable(balances) {
    const activeMilitares = allMilitares.filter(m => m.ativo.toUpperCase() === 'SIM');
    
    let tableHTML = `
        <div class="table-header">
            <div>Militar</div>
            <div>PG</div>
            <div>Saldo</div>
            <div>Registros</div>
        </div>
    `;
    
    activeMilitares.forEach(militar => {
        const balance = balances[militar.numBombeiro] || 0;
        const recordCount = allRecords.filter(r => r.numBombeiro === militar.numBombeiro).length;
        
        tableHTML += `
            <div class="table-row">
                <div class="militar-info">
                    <div class="militar-name">${militar.nome}</div>
                    <div class="militar-details">${militar.numBombeiro}</div>
                </div>
                <div>${militar.pg}</div>
                <div class="saldo-value ${balance < 0 ? 'negative' : ''}">${formatHours(balance)}</div>
                <div>${recordCount}</div>
            </div>
        `;
    });
    
    elements.militaresTable.innerHTML = tableHTML;
}

function displayMilitaryCards() {
    filteredMilitares = allMilitares.filter(m => m.ativo.toUpperCase() === 'SIM');
    renderMilitaryCards();
}

function renderMilitaryCards() {
    if (filteredMilitares.length === 0) {
        elements.militaryCards.innerHTML = `
            <div class="no-results">
                <p>Nenhum militar encontrado</p>
            </div>
        `;
        return;
    }
    
    elements.militaryCards.innerHTML = filteredMilitares.map(militar => `
        <div class="military-card" onclick="selectMilitar('${militar.numBombeiro}')">
            <div class="military-card-header">
                <i class="fas fa-user-circle"></i>
                <div class="military-info">
                    <h3>${militar.nome}</h3>
                    <p>${militar.pg}</p>
                </div>
            </div>
            <div class="military-card-footer">
                <span class="military-number">${militar.numBombeiro}</span>
                <span class="military-status ${militar.ativo.toUpperCase() === 'SIM' ? 'active' : 'inactive'}">
                    ${militar.ativo.toUpperCase() === 'SIM' ? 'Ativo' : 'Inativo'}
                </span>
            </div>
        </div>
    `).join('');
}

function filterMilitares() {
    const searchTerm = elements.searchMilitary.value.toLowerCase();
    
    filteredMilitares = allMilitares.filter(militar => {
        return militar.ativo.toUpperCase() === 'SIM' && (
            militar.nome.toLowerCase().includes(searchTerm) ||
            militar.numBombeiro.toLowerCase().includes(searchTerm) ||
            militar.pg.toLowerCase().includes(searchTerm)
        );
    });
    
    renderMilitaryCards();
}

function selectMilitar(numBombeiro) {
    currentMilitar = allMilitares.find(m => m.numBombeiro === numBombeiro);
    if (currentMilitar) {
        showMilitarApp();
        loadMilitarData(currentMilitar);
    }
}

function showMilitarApp() {
    elements.selectionScreen.classList.remove('active');
    elements.appScreen.classList.add('active');
    
    // Update header
    elements.userName.textContent = currentMilitar.nome;
    elements.userPG.textContent = currentMilitar.pg;
    
    // Show dashboard by default
    showSection('dashboard');
}

function backToSelection() {
    currentMilitar = null;
    elements.appScreen.classList.remove('active');
    elements.selectionScreen.classList.add('active');
    
    // Reset forms
    if (elements.hoursForm) {
        elements.hoursForm.reset();
        elements.recordDate.value = new Date().toISOString().split('T')[0];
    }
    hideFormMessage();
}

// Militar Data Management
async function loadMilitarData(militar) {
    if (!militar) return;
    
    showLoading(true);
    
    try {
        const response = await callAPI('getUserData', { 
            numBombeiro: militar.numBombeiro 
        });
        
        if (response.status === 'success') {
            const militarRecords = response.records || [];
            updateMilitarDashboard(response.balance, militarRecords);
            displayRecentActivity(militarRecords);
        } else {
            console.error('Erro ao carregar dados do militar:', response.message);
            showToast('Erro ao carregar dados do militar', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar dados do militar:', error);
        showToast('Erro de conexão ao carregar dados', 'error');
    } finally {
        showLoading(false);
    }
}

function updateMilitarDashboard(balance, records) {
    // Update balance
    const balanceValue = parseFloat(balance.toString().replace(',', '.')) || 0;
    if (elements.currentBalance) {
        elements.currentBalance.textContent = formatHours(balanceValue);
        elements.currentBalance.classList.toggle('negative', balanceValue < 0);
    }
    
    // Update monthly summary
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear;
    });
    
    if (elements.monthRecords) {
        elements.monthRecords.textContent = monthlyRecords.length;
    }
    
    // Last record
    if (elements.lastRecord) {
        if (records.length > 0) {
            const lastRecordDate = new Date(records[0].date);
            elements.lastRecord.textContent = formatDate(lastRecordDate);
        } else {
            elements.lastRecord.textContent = '-';
        }
    }
}

function displayRecentActivity(records) {
    if (!elements.recentRecords) return;
    
    const recentRecords = records.slice(0, 5);
    
    if (recentRecords.length === 0) {
        elements.recentRecords.innerHTML = `
            <div class="record-item">
                <div class="record-info">
                    <p>Nenhum registro encontrado</p>
                </div>
            </div>
        `;
        return;
    }
    
    elements.recentRecords.innerHTML = recentRecords.map(record => {
        const hours = parseFloat(record.hours.toString().replace(',', '.'));
        const isNegative = hours < 0;
        
        return `
            <div class="record-item">
                <div class="record-info">
                    <h4>${formatDate(new Date(record.date))}</h4>
                    <p>${record.reason}</p>
                </div>
                <div class="record-hours ${isNegative ? 'negative' : ''}">
                    ${formatHours(hours)}
                </div>
            </div>
        `;
    }).join('');
}

// Interface Functions
function showSection(sectionName) {
    // Update navigation
    if (elements.navBtns) {
        elements.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
    }
    
    // Update content
    if (elements.contentSections) {
        elements.contentSections.forEach(section => {
            section.classList.toggle('active', section.id === sectionName);
        });
    }
    
    // Load data if needed
    if (sectionName === 'history' && currentMilitar) {
        displayHistory();
    }
}

function showLoading(show) {
    elements.loading.classList.toggle('show', show);
}

function showFormMessage(message, type = 'success') {
    if (!elements.formMessage) return;
    
    elements.formMessage.textContent = message;
    elements.formMessage.className = `form-message ${type} show`;
    
    setTimeout(() => {
        hideFormMessage();
    }, 5000);
}

function hideFormMessage() {
    if (elements.formMessage) {
        elements.formMessage.classList.remove('show');
    }
}

function showToast(message, type = 'success') {
    if (!elements.toast) return;
    
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// API Communication
async function callAPI(action, payload) {
    const requestData = {
        action: action,
        payload: payload
    };
    
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Hours Form Functions
function formatHoursInput(event) {
    let value = event.target.value;
    
    // Remove caracteres inválidos, mantendo apenas números, vírgula e sinal de menos
    value = value.replace(/[^0-9,-]/g, '');
    
    // Garantir apenas uma vírgula
    const parts = value.split(',');
    if (parts.length > 2) {
        value = parts[0] + ',' + parts.slice(1).join('');
    }
    
    event.target.value = value;
}

async function handleAddHours(event) {
    event.preventDefault();
    
    const date = elements.recordDate.value;
    const hours = elements.hoursValue.value.trim();
    const reason = elements.reason.value.trim();
    
    // Validação
    if (!date || !hours || !reason) {
        showFormMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    // Validar formato de horas
    if (!validateHoursFormat(hours)) {
        showFormMessage('Formato de horas inválido. Use vírgula para decimais (ex: 2,5 ou -1,0)', 'error');
        return;
    }
    
    // Validar data (não pode ser futura)
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
        showFormMessage('A data não pode ser futura.', 'error');
        return;
    }
    
    showLoading(true);
    hideFormMessage();
    
    try {
        const response = await callAPI('addHours', {
            numBombeiro: currentMilitar.numBombeiro,
            date: date,
            hours: hours,
            reason: reason
        });
        
        if (response.status === 'success') {
            showFormMessage('Registro adicionado com sucesso!', 'success');
            elements.hoursForm.reset();
            elements.recordDate.value = new Date().toISOString().split('T')[0];
            
            // Reload data
            await loadMilitarData(currentMilitar);
            await loadInitialData(); // Atualizar dashboard geral
            
            showToast('Registro salvo com sucesso!', 'success');
        } else {
            showFormMessage(response.message || 'Erro ao salvar registro', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar horas:', error);
        showFormMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
        showLoading(false);
    }
}

function validateHoursFormat(hours) {
    // Aceita formatos como: 2,5 / -1,0 / 3 / -2
    const regex = /^-?\d+([,]\d{1,2})?$/;
    return regex.test(hours);
}

// History Functions
function displayHistory(filteredRecords = null) {
    if (!elements.historyRecords || !currentMilitar) return;
    
    // Get records for current militar
    const militarRecords = allRecords.filter(r => r.numBombeiro === currentMilitar.numBombeiro);
    const records = filteredRecords || militarRecords;
    
    if (records.length === 0) {
        elements.historyRecords.innerHTML = `
            <div class="record-item">
                <div class="record-info">
                    <p>Nenhum registro encontrado</p>
                </div>
            </div>
        `;
        return;
    }
    
    elements.historyRecords.innerHTML = records.map(record => {
        const hours = parseFloat(record.hours.toString().replace(',', '.'));
        const isNegative = hours < 0;
        
        return `
            <div class="record-item">
                <div class="record-info">
                    <h4>${formatDate(new Date(record.date))}</h4>
                    <p>${record.reason}</p>
                </div>
                <div class="record-hours ${isNegative ? 'negative' : ''}">
                    ${formatHours(hours)}
                </div>
            </div>
        `;
    }).join('');
}

function applyHistoryFilter() {
    if (!elements.filterMonth || !currentMilitar) return;
    
    const filterMonth = elements.filterMonth.value;
    
    if (!filterMonth) {
        displayHistory();
        return;
    }
    
    const [year, month] = filterMonth.split('-').map(Number);
    const militarRecords = allRecords.filter(r => r.numBombeiro === currentMilitar.numBombeiro);
    
    const filteredRecords = militarRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year && 
               recordDate.getMonth() === (month - 1);
    });
    
    displayHistory(filteredRecords);
    showToast(`Filtro aplicado: ${filteredRecords.length} registros encontrados`, 'success');
}

function clearHistoryFilter() {
    if (elements.filterMonth) {
        elements.filterMonth.value = '';
    }
    displayHistory();
    showToast('Filtro removido', 'success');
}

// Utility Functions
function formatHours(hours) {
    const absHours = Math.abs(hours);
    const sign = hours < 0 ? '-' : '+';
    return `${sign}${absHours.toFixed(2).replace('.', ',')}`;
}

function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Error Handling
window.addEventListener('error', function(event) {
    console.error('Erro global:', event.error);
    showToast('Ocorreu um erro inesperado', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise rejeitada:', event.reason);
    showToast('Erro de conexão', 'error');
});

// Configuração para desenvolvimento/teste
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Modo de desenvolvimento detectado');
    
    // Função para teste sem backend
    window.testMode = function() {
        allMilitares = [
            { numBombeiro: '123456-7', nome: 'João Silva', pg: '3º Sargento', ativo: 'SIM' },
            { numBombeiro: '234567-8', nome: 'Maria Santos', pg: 'Cabo', ativo: 'SIM' },
            { numBombeiro: '345678-9', nome: 'Pedro Costa', pg: 'Soldado', ativo: 'SIM' }
        ];
        
        allRecords = [
            { numBombeiro: '123456-7', date: '2025-01-30', hours: '2,5', reason: 'Apoio em ocorrência de incêndio' },
            { numBombeiro: '123456-7', date: '2025-01-28', hours: '-1,0', reason: 'Saída antecipada por motivo médico' },
            { numBombeiro: '234567-8', date: '2025-01-25', hours: '3,0', reason: 'Treinamento extra de salvamento' }
        ];
        
        displayMilitaryCards();
        updateGeneralDashboard();
        
        console.log('Modo de teste ativado. Use testMode() no console para ativar.');
    };
}

