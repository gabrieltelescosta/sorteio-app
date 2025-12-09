/* ============================================
   SISTEMA DE SORTEIO - LÓGICA PRINCIPAL
   ============================================ */

// ============================================
// GERENCIAMENTO DE DADOS (LocalStorage)
// ============================================

const STORAGE_KEYS = {
    PARTICIPANTES: 'sorteio_participantes',
    PREFERIDO: 'sorteio_preferido',
    CONFIGURACOES: 'sorteio_configuracoes',
    ULTIMO_GANHADOR: 'sorteio_ultimo_ganhador'
};

const CONFIG_PADRAO = {
    tempoAnimacao: 4000,      // 4 segundos
    velocidadeInicial: 50,    // ms entre trocas
    permitirRepetir: true     // permitir mesmo ganhador
};

// Funções de acesso ao LocalStorage
function getParticipantes() {
    const data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTES);
    return data ? JSON.parse(data) : [];
}

function setParticipantes(participantes) {
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTES, JSON.stringify(participantes));
}

function getPreferido() {
    return localStorage.getItem(STORAGE_KEYS.PREFERIDO);
}

function setPreferido(id) {
    if (id === null || id === '') {
        localStorage.removeItem(STORAGE_KEYS.PREFERIDO);
    } else {
        localStorage.setItem(STORAGE_KEYS.PREFERIDO, id);
    }
}

function getConfiguracoes() {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIGURACOES);
    return data ? { ...CONFIG_PADRAO, ...JSON.parse(data) } : { ...CONFIG_PADRAO };
}

function setConfiguracoes(config) {
    localStorage.setItem(STORAGE_KEYS.CONFIGURACOES, JSON.stringify(config));
}

function getUltimoGanhador() {
    return localStorage.getItem(STORAGE_KEYS.ULTIMO_GANHADOR);
}

function setUltimoGanhador(id) {
    localStorage.setItem(STORAGE_KEYS.ULTIMO_GANHADOR, id);
}

// ============================================
// FUNÇÕES DE CADASTRO
// ============================================

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function adicionarParticipante(nome) {
    nome = nome.trim();
    
    if (!nome) {
        mostrarMensagem('Por favor, digite um nome válido.', 'warning');
        return false;
    }
    
    const participantes = getParticipantes();
    
    // Verificar duplicado
    const duplicado = participantes.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (duplicado) {
        mostrarMensagem(`"${nome}" já está cadastrado.`, 'warning');
        return false;
    }
    
    const novoParticipante = {
        id: gerarId(),
        nome: nome
    };
    
    participantes.push(novoParticipante);
    setParticipantes(participantes);
    
    return true;
}

function adicionarParticipantesEmLote(texto) {
    const nomes = texto.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    if (nomes.length === 0) {
        mostrarMensagem('Por favor, digite pelo menos um nome válido.', 'warning');
        return 0;
    }
    
    let adicionados = 0;
    let duplicados = [];
    
    for (const nome of nomes) {
        if (adicionarParticipanteSilencioso(nome)) {
            adicionados++;
        } else {
            duplicados.push(nome);
        }
    }
    
    if (adicionados > 0 && duplicados.length > 0) {
        mostrarMensagem(`${adicionados} adicionado(s). Duplicados ignorados: ${duplicados.join(', ')}`, 'warning');
    } else if (adicionados > 0) {
        mostrarMensagem(`${adicionados} participante(s) adicionado(s) com sucesso!`, 'info');
    } else if (duplicados.length > 0) {
        mostrarMensagem('Todos os nomes já estão cadastrados.', 'warning');
    }
    
    return adicionados;
}

function adicionarParticipanteSilencioso(nome) {
    nome = nome.trim();
    
    if (!nome) {
        return false;
    }
    
    const participantes = getParticipantes();
    
    // Verificar duplicado
    const duplicado = participantes.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (duplicado) {
        return false;
    }
    
    const novoParticipante = {
        id: gerarId(),
        nome: nome
    };
    
    participantes.push(novoParticipante);
    setParticipantes(participantes);
    
    return true;
}

function removerParticipante(id) {
    let participantes = getParticipantes();
    participantes = participantes.filter(p => p.id !== id);
    setParticipantes(participantes);
    
    // Se o participante removido era o preferido, limpar preferência
    if (getPreferido() === id) {
        setPreferido(null);
    }
    
    // Se era o último ganhador, limpar
    if (getUltimoGanhador() === id) {
        localStorage.removeItem(STORAGE_KEYS.ULTIMO_GANHADOR);
    }
}

function limparTodos() {
    if (confirm('Tem certeza que deseja remover todos os participantes?')) {
        setParticipantes([]);
        setPreferido(null);
        localStorage.removeItem(STORAGE_KEYS.ULTIMO_GANHADOR);
        return true;
    }
    return false;
}

// ============================================
// FUNÇÕES DE PREFERÊNCIA
// ============================================

function selecionarPreferido(id) {
    const participantes = getParticipantes();
    const existe = participantes.find(p => p.id === id);
    
    if (id && !existe) {
        setPreferido(null);
        return;
    }
    
    setPreferido(id);
}

function obterNomePreferido() {
    const prefId = getPreferido();
    if (!prefId) return null;
    
    const participantes = getParticipantes();
    const preferido = participantes.find(p => p.id === prefId);
    return preferido ? preferido.nome : null;
}

// ============================================
// SISTEMA DE ÁUDIO (Web Audio API)
// ============================================

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playTickSound() {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800 + Math.random() * 400; // Frequência variável
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
        // Silenciosamente ignora erros de áudio
    }
}

function playWinSound() {
    try {
        const ctx = getAudioContext();
        const notas = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (acorde de Dó maior)
        
        notas.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = ctx.currentTime + (index * 0.1);
            const duration = 0.4;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
        
        // Segunda parte: fanfarra final
        setTimeout(() => {
            const finalNotas = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
            finalNotas.forEach((freq, index) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'triangle';
                
                const startTime = ctx.currentTime + (index * 0.05);
                const duration = 0.6;
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            });
        }, 400);
    } catch (e) {
        // Silenciosamente ignora erros de áudio
    }
}

// ============================================
// FUNÇÕES DE SORTEIO
// ============================================

let sorteioEmAndamento = false;

function sortearVencedor() {
    const participantes = getParticipantes();
    const prefId = getPreferido();
    const config = getConfiguracoes();
    const ultimoGanhador = getUltimoGanhador();
    
    // Se há preferido, ele ganha
    if (prefId) {
        const preferido = participantes.find(p => p.id === prefId);
        if (preferido) {
            return preferido;
        }
    }
    
    // Filtrar participantes elegíveis
    let elegiveis = [...participantes];
    
    // Se não permite repetir e há último ganhador
    if (!config.permitirRepetir && ultimoGanhador && participantes.length > 1) {
        elegiveis = elegiveis.filter(p => p.id !== ultimoGanhador);
    }
    
    // Sortear aleatoriamente
    const indice = Math.floor(Math.random() * elegiveis.length);
    return elegiveis[indice];
}

function iniciarSorteio(callback) {
    if (sorteioEmAndamento) return;
    
    const participantes = getParticipantes();
    
    if (participantes.length < 2) {
        mostrarMensagem('É necessário ter pelo menos 2 participantes para sortear.', 'warning');
        return;
    }
    
    sorteioEmAndamento = true;
    const vencedor = sortearVencedor();
    
    animarRoleta(vencedor, () => {
        setUltimoGanhador(vencedor.id);
        sorteioEmAndamento = false;
        if (callback) callback(vencedor);
    });
}

function animarRoleta(vencedor, callback) {
    const config = getConfiguracoes();
    const participantes = getParticipantes();
    const roletaLista = document.getElementById('roleta-lista');
    
    if (!roletaLista) return;
    
    // Criar lista expandida para animação (repetir nomes várias vezes)
    const repeticoes = 10;
    let itens = [];
    for (let i = 0; i < repeticoes; i++) {
        itens = itens.concat([...participantes]);
    }
    
    // Adicionar o vencedor no final para garantir que pare nele
    itens.push(vencedor);
    
    // Renderizar itens na roleta
    roletaLista.innerHTML = itens.map(p => 
        `<div class="roleta-item">${p.nome}</div>`
    ).join('');
    
    const alturaItem = 60; // altura de cada item em px
    const totalItens = itens.length;
    const posicaoFinal = (totalItens - 1) * alturaItem - 70; // centralizar o último item
    
    // Animação com easing
    const tempoTotal = config.tempoAnimacao;
    const inicio = performance.now();
    let ultimoItemIndex = -1;
    
    function easeOutQuint(t) {
        return 1 - Math.pow(1 - t, 5);
    }
    
    function animar(tempoAtual) {
        const progresso = Math.min((tempoAtual - inicio) / tempoTotal, 1);
        const progressoEased = easeOutQuint(progresso);
        const posicaoAtual = progressoEased * posicaoFinal;
        
        // Calcular qual item está no centro para tocar o som
        const itemAtualIndex = Math.floor(posicaoAtual / alturaItem);
        if (itemAtualIndex !== ultimoItemIndex && itemAtualIndex < totalItens) {
            playTickSound();
            ultimoItemIndex = itemAtualIndex;
        }
        
        roletaLista.style.transform = `translateY(-${posicaoAtual}px)`;
        
        if (progresso < 1) {
            requestAnimationFrame(animar);
        } else {
            // Animação concluída
            setTimeout(() => {
                if (callback) callback();
            }, 300);
        }
    }
    
    requestAnimationFrame(animar);
}

function criarConfetes() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const cores = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];
    const numConfetes = 100;
    
    for (let i = 0; i < numConfetes; i++) {
        const confete = document.createElement('div');
        confete.className = 'confetti';
        confete.style.left = Math.random() * 100 + '%';
        confete.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
        confete.style.animationDelay = Math.random() * 2 + 's';
        confete.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        // Formas variadas
        if (Math.random() > 0.5) {
            confete.style.borderRadius = '50%';
        }
        
        container.appendChild(confete);
    }
    
    // Remover confetes após a animação
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

function exibirVencedor(vencedor) {
    const resultadoContainer = document.getElementById('resultado-container');
    const resultadoNome = document.getElementById('resultado-nome');
    
    if (resultadoContainer && resultadoNome) {
        resultadoNome.textContent = vencedor.nome;
        resultadoContainer.classList.add('show');
        criarConfetes();
        playWinSound();
    }
}

// ============================================
// FUNÇÕES DE UI
// ============================================

function mostrarMensagem(texto, tipo = 'info') {
    // Remover mensagem anterior se existir
    const msgAnterior = document.querySelector('.alert');
    if (msgAnterior) {
        msgAnterior.remove();
    }
    
    const msg = document.createElement('div');
    msg.className = `alert alert-${tipo}`;
    msg.textContent = texto;
    
    const card = document.querySelector('.card');
    if (card) {
        card.insertBefore(msg, card.firstChild);
        
        setTimeout(() => {
            msg.remove();
        }, 3000);
    }
}

function renderizarListaParticipantes() {
    const lista = document.getElementById('lista-participantes');
    const contador = document.getElementById('contador');
    
    if (!lista) return;
    
    const participantes = getParticipantes();
    
    if (participantes.length === 0) {
        lista.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icon">👥</div>
                <p>Nenhum participante cadastrado</p>
            </div>
        `;
    } else {
        lista.innerHTML = participantes.map((p, index) => `
            <li class="participante-item" data-id="${p.id}">
                <div>
                    <span class="participante-numero">${index + 1}.</span>
                    <span class="participante-nome">${p.nome}</span>
                </div>
                <button class="btn btn-danger btn-icon" onclick="handleRemover('${p.id}')">
                    ✕
                </button>
            </li>
        `).join('');
    }
    
    if (contador) {
        contador.innerHTML = `Total: <strong>${participantes.length}</strong> participante${participantes.length !== 1 ? 's' : ''}`;
    }
}

function renderizarListaPreferencia() {
    const lista = document.getElementById('preferencia-lista');
    
    if (!lista) return;
    
    const participantes = getParticipantes();
    const prefId = getPreferido();
    
    if (participantes.length === 0) {
        lista.innerHTML = `
            <div class="lista-vazia">
                <div class="lista-vazia-icon">👥</div>
                <p>Nenhum participante cadastrado</p>
                <a href="index.html" class="btn btn-primary mt-20">Cadastrar Participantes</a>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="preferencia-item">
            <input type="radio" 
                   name="preferido" 
                   id="pref-none" 
                   value="" 
                   class="preferencia-input"
                   ${!prefId ? 'checked' : ''}
                   onchange="handlePreferenciaChange('')">
            <label for="pref-none" class="preferencia-label">
                <span class="preferencia-radio"></span>
                <span class="preferencia-nome">🎲 Nenhum (sorteio totalmente aleatório)</span>
            </label>
        </div>
    `;
    
    html += participantes.map(p => `
        <div class="preferencia-item">
            <input type="radio" 
                   name="preferido" 
                   id="pref-${p.id}" 
                   value="${p.id}" 
                   class="preferencia-input"
                   ${prefId === p.id ? 'checked' : ''}
                   onchange="handlePreferenciaChange('${p.id}')">
            <label for="pref-${p.id}" class="preferencia-label">
                <span class="preferencia-radio"></span>
                <span class="preferencia-nome">${p.nome}</span>
                ${prefId === p.id ? '<span class="preferencia-badge">★ PREFERIDO</span>' : ''}
            </label>
        </div>
    `).join('');
    
    lista.innerHTML = html;
}

function renderizarPaginaSorteio() {
    const participantes = getParticipantes();
    const btnSortear = document.getElementById('btn-sortear');
    const resultadoContainer = document.getElementById('resultado-container');
    
    // Verificar se há participantes suficientes
    if (participantes.length < 2) {
        if (btnSortear) {
            btnSortear.disabled = true;
        }
        mostrarMensagem('É necessário ter pelo menos 2 participantes para sortear.', 'warning');
    } else {
        if (btnSortear) {
            btnSortear.disabled = false;
        }
    }
    
    // Esconder resultado anterior
    if (resultadoContainer) {
        resultadoContainer.classList.remove('show');
    }
    
    // Carregar configurações
    carregarConfiguracoes();
}

function carregarConfiguracoes() {
    const config = getConfiguracoes();
    
    const tempoInput = document.getElementById('config-tempo');
    const tempoValue = document.getElementById('config-tempo-value');
    const repetirInput = document.getElementById('config-repetir');
    
    if (tempoInput) {
        tempoInput.value = config.tempoAnimacao / 1000;
        if (tempoValue) {
            tempoValue.textContent = (config.tempoAnimacao / 1000) + 's';
        }
    }
    
    if (repetirInput) {
        repetirInput.checked = config.permitirRepetir;
    }
}

function salvarConfiguracoes() {
    const tempoInput = document.getElementById('config-tempo');
    const repetirInput = document.getElementById('config-repetir');
    
    const config = getConfiguracoes();
    
    if (tempoInput) {
        config.tempoAnimacao = parseFloat(tempoInput.value) * 1000;
    }
    
    if (repetirInput) {
        config.permitirRepetir = repetirInput.checked;
    }
    
    setConfiguracoes(config);
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleAdicionar(event) {
    event.preventDefault();
    
    const input = document.getElementById('input-nome');
    if (!input) return;
    
    const texto = input.value.trim();
    
    if (!texto) {
        mostrarMensagem('Por favor, digite pelo menos um nome.', 'warning');
        return;
    }
    
    // Verificar se contém vírgula (cadastro em lote)
    if (texto.includes(',')) {
        const adicionados = adicionarParticipantesEmLote(texto);
        if (adicionados > 0) {
            input.value = '';
            input.focus();
            renderizarListaParticipantes();
        }
    } else {
        if (adicionarParticipante(texto)) {
            input.value = '';
            input.focus();
            renderizarListaParticipantes();
        }
    }
}

function handleRemover(id) {
    removerParticipante(id);
    renderizarListaParticipantes();
}

function handleLimparTodos() {
    if (limparTodos()) {
        renderizarListaParticipantes();
    }
}

function handlePreferenciaChange(id) {
    selecionarPreferido(id || null);
    renderizarListaPreferencia();
}

function handleSortear() {
    const btnSortear = document.getElementById('btn-sortear');
    const resultadoContainer = document.getElementById('resultado-container');
    
    if (btnSortear) {
        btnSortear.disabled = true;
        btnSortear.textContent = 'Sorteando...';
    }
    
    if (resultadoContainer) {
        resultadoContainer.classList.remove('show');
    }
    
    iniciarSorteio((vencedor) => {
        exibirVencedor(vencedor);
        
        if (btnSortear) {
            btnSortear.disabled = false;
            btnSortear.textContent = '🎰 Sortear Novamente';
        }
    });
}

function handleConfigToggle() {
    const panel = document.getElementById('config-panel');
    if (panel) {
        panel.classList.toggle('show');
    }
}

function handleTempoChange(value) {
    const valueDisplay = document.getElementById('config-tempo-value');
    if (valueDisplay) {
        valueDisplay.textContent = value + 's';
    }
    salvarConfiguracoes();
}

function handleRepetirChange() {
    salvarConfiguracoes();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const pagina = detectarPagina();
    
    switch (pagina) {
        case 'cadastro':
            initCadastro();
            break;
        case 'configuracao':
            initConfiguracao();
            break;
        case 'sorteio':
            initSorteio();
            break;
    }
    
    // Verificar integridade dos dados
    verificarIntegridade();
});

function detectarPagina() {
    const path = window.location.pathname;
    
    if (path.includes('configuracao')) {
        return 'configuracao';
    } else if (path.includes('sorteio')) {
        return 'sorteio';
    } else {
        return 'cadastro';
    }
}

function initCadastro() {
    renderizarListaParticipantes();
    
    // Event listeners
    const form = document.getElementById('form-adicionar');
    if (form) {
        form.addEventListener('submit', handleAdicionar);
    }
    
    const btnLimpar = document.getElementById('btn-limpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', handleLimparTodos);
    }
}

function initConfiguracao() {
    renderizarListaPreferencia();
}

function initSorteio() {
    renderizarPaginaSorteio();
    
    const btnSortear = document.getElementById('btn-sortear');
    if (btnSortear) {
        btnSortear.addEventListener('click', handleSortear);
    }
    
    const configToggle = document.getElementById('config-toggle');
    if (configToggle) {
        configToggle.addEventListener('click', handleConfigToggle);
    }
    
    const tempoInput = document.getElementById('config-tempo');
    if (tempoInput) {
        tempoInput.addEventListener('input', (e) => handleTempoChange(e.target.value));
    }
    
    const repetirInput = document.getElementById('config-repetir');
    if (repetirInput) {
        repetirInput.addEventListener('change', handleRepetirChange);
    }
}

function verificarIntegridade() {
    // Verificar se o preferido ainda existe na lista
    const prefId = getPreferido();
    if (prefId) {
        const participantes = getParticipantes();
        const existe = participantes.find(p => p.id === prefId);
        if (!existe) {
            setPreferido(null);
        }
    }
    
    // Verificar se o último ganhador ainda existe
    const ultimoId = getUltimoGanhador();
    if (ultimoId) {
        const participantes = getParticipantes();
        const existe = participantes.find(p => p.id === ultimoId);
        if (!existe) {
            localStorage.removeItem(STORAGE_KEYS.ULTIMO_GANHADOR);
        }
    }
}

