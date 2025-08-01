// Configuração da aplicação
const CONFIG = {
    // IMPORTANTE: Substitua pela URL do seu Google Apps Script
    API_URL: 'https://script.google.com/macros/s/AKfycbyikMXYDzk6K_SMr3u1EDvpA0pHA09gsqALaZtZF9lQD8WSpaxVGQ5DveHmXiXiFCsw/exec',
    
    // Configurações locais
    STORAGE_KEY: 'bombeiroUser',
    DATE_FORMAT: 'pt-BR'
};

// Estado global da aplicação
let currentUser = null;
let userRecords = [];

// Elementos DOM principais
const elements = {
    // Screens
    loginScreen: document.getElementById('loginScreen'),
    appScreen: document.getElementById('appScreen'),
    loading: document.getElementById('loading'),
    
    // Login
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),
    
    // Header
    userName: document.getElementById('userName'),
    userPG: document.getElementById('userPG'),
    logoutBtn: document.getElementById('logoutBtn'),
    
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
    checkAutoLogin();
});

function initializeApp() {
    // Configurar data padrão para hoje
    const today = new Date().toISOString().split('T')[0];
    elements.recordDate.value = today;
    
    // Configurar filtro de mês para o mês atual
    const currentMonth = new Date().toISOString().slice(0, 7);
    elements.filterMonth.value = currentMonth;
    
    console.log('Aplicação inicializada');
}

function setupEventListeners() {
    // Login
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            showSection(section);
        });
    });
    
    // Hours Form
    elements.hoursForm.addEventListener('submit', handleAddHours);
    elements.hoursValue.addEventListener('input', formatHoursInput);
    
    // History
    elements.refreshHistory.addEventListener('click', loadUserData);
    elements.applyFilter.addEventListener('click', applyHistoryFilter);
    elements.clearFilter.addEventListener('click', clearHistoryFilter);
    
    console.log('Event listeners configurados');
}

// Autenticação
function checkAutoLogin() {
    const savedUser = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
            loadUserData();
        } catch (error) {
            console.error('Erro ao carregar usuário salvo:', error);
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Por favor, preencha todos os campos.');
        return;
    }
    
    showLoading(true);
    hideError();
    
    try {
        const response = await callAPI('login', { email, password });
        
        if (response.status === 'success') {
            currentUser = response.userData;
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(currentUser));
            showApp();
            await loadUserData();
            showToast('Login realizado com sucesso!', 'success');
        } else {
            showError(response.message || 'Erro no login');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError('Erro de conexão. Tente novamente.');
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    currentUser = null;
    userRecords = [];
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    
    // Reset forms
    elements.loginForm.reset();
    elements.hoursForm.reset();
    hideError();
    hideFormMessage();
    
    // Show login screen
    elements.appScreen.classList.remove('active');
    elements.loginScreen.classList.add('active');
    
    showToast('Logout realizado com sucesso!', 'success');
}

// Interface
function showApp() {
    elements.loginScreen.classList.remove('active');
    elements.appScreen.classList.add('active');
    
    // Update user info
    elements.userName.textContent = currentUser.name;
    elements.userPG.textContent = currentUser.pg;
    
    // Show dashboard by default
    showSection('dashboard');
}

function showSection(sectionName) {
    // Update navigation
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Update content
    elements.contentSections.forEach(section => {
        section.classList.toggle('active', section.id === sectionName);
    });
    
    // Load data if needed
    if (sectionName === 'history') {
        displayHistory();
    }
}

function showLoading(show) {
    elements.loading.classList.toggle('show', show);
}

function showError(message) {
    elements.loginError.textContent = message;
    elements.loginError.classList.add('show');
}

function hideError() {
    elements.loginError.classList.remove('show');
}

function showFormMessage(message, type = 'success') {
    elements.formMessage.textContent = message;
    elements.formMessage.className = `form-message ${type} show`;
    
    setTimeout(() => {
        hideFormMessage();
    }, 5000);
}

function hideFormMessage() {
    elements.formMessage.classList.remove('show');
}

function showToast(message, type = 'success') {
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

// Data Management
async function loadUserData() {
    if (!currentUser) return;
    
    showLoading(true);
    
    try {
        const response = await callAPI('getUserData', { 
            userId: currentUser.numBombeiro 
        });
        
        if (response.status === 'success') {
            userRecords = response.records || [];
            updateDashboard(response.balance);
            displayRecentActivity();
        } else {
            console.error('Erro ao carregar dados:', response.message);
            showToast('Erro ao carregar dados do usuário', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro de conexão ao carregar dados', 'error');
    } finally {
        showLoading(false);
    }
}

function updateDashboard(balance) {
    // Update balance
    const balanceValue = parseFloat(balance.toString().replace(',', '.')) || 0;
    elements.currentBalance.textContent = formatHours(balanceValue);
    elements.currentBalance.classList.toggle('negative', balanceValue < 0);
    
    // Update monthly summary
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = userRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear;
    });
    
    elements.monthRecords.textContent = monthlyRecords.length;
    
    // Last record
    if (userRecords.length > 0) {
        const lastRecordDate = new Date(userRecords[0].date);
        elements.lastRecord.textContent = formatDate(lastRecordDate);
    } else {
        elements.lastRecord.textContent = '-';
    }
}

function displayRecentActivity() {
    const recentRecords = userRecords.slice(0, 5);
    
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

// Hours Form
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
            numBombeiro: currentUser.numBombeiro,
            date: date,
            hours: hours,
            reason: reason
        });
        
        if (response.status === 'success') {
            showFormMessage('Registro adicionado com sucesso!', 'success');
            elements.hoursForm.reset();
            elements.recordDate.value = new Date().toISOString().split('T')[0];
            
            // Reload data
            await loadUserData();
            
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

// History
function displayHistory(filteredRecords = null) {
    const records = filteredRecords || userRecords;
    
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
    const filterMonth = elements.filterMonth.value;
    
    if (!filterMonth) {
        displayHistory();
        return;
    }
    
    const [year, month] = filterMonth.split('-').map(Number);
    
    const filteredRecords = userRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year && 
               recordDate.getMonth() === (month - 1);
    });
    
    displayHistory(filteredRecords);
    showToast(`Filtro aplicado: ${filteredRecords.length} registros encontrados`, 'success');
}

function clearHistoryFilter() {
    elements.filterMonth.value = '';
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
        currentUser = {
            numBombeiro: '123456-7',
            name: 'João Silva (TESTE)',
            email: 'teste@bombeiros.gov',
            pg: '3º Sargento'
        };
        
        userRecords = [
            { date: '2025-01-30', hours: '2,5', reason: 'Apoio em ocorrência de incêndio' },
            { date: '2025-01-28', hours: '-1,0', reason: 'Saída antecipada por motivo médico' },
            { date: '2025-01-25', hours: '3,0', reason: 'Treinamento extra de salvamento' }
        ];
        
        showApp();
        updateDashboard('4,5');
        displayRecentActivity();
        
        console.log('Modo de teste ativado. Use testMode() no console para ativar.');
    };
}

