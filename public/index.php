<?php
// Start session for potential direct checks if needed, 
// though the JS handles the API calls.
session_start();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planning Poker Online</title>
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <!-- CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- VIEW: Login -->
    <div id="view-login" class="container auth-wrapper">
        <div class="auth-card glass animated">
            <h1>Planning Poker</h1>
            <p id="welcome-msg" style="color: var(--text-secondary); margin-bottom: 2rem;">Estime tarefas com sua equipe em tempo real.</p>
            
            <div id="login-form">
                <div class="form-group">
                    <label for="input-name">Seu Nome</label>
                    <input type="text" id="input-name" placeholder="Ex: João Silva" autocomplete="off" onkeypress="if(event.key === 'Enter') document.getElementById('btn-login').click()">
                </div>
                
                <button id="btn-login">Entrar</button>
            </div>
            
            <div id="dashboard-view" class="hidden" style="text-align: left; width: 100%;">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem; text-align: center;">Salas Disponíveis</h3>
                    <div id="rooms-list" class="rooms-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 400px; overflow-y: auto;">
                        <!-- Rooms injected by JS -->
                    </div>
                </div>
                <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">Ou se preferir, crie uma nova sala para convidar sua equipe.</p>
                    <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
                        <input type="text" id="input-room-name" placeholder="Nome da Sala (Opcional)" autocomplete="off" onkeypress="if(event.key === 'Enter') document.getElementById('btn-create-room').click()">
                    </div>
                    <button id="btn-create-room" class="secondary">Criar Nova Sala</button>
                </div>
            </div>
        </div>
    </div>

    <!-- VIEW: Room -->
    <div id="view-room" class="container hidden">
        <div class="room-header animated">
            <div>
                <button id="btn-back-rooms" class="secondary" style="margin-bottom: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">← Voltar para Salas</button>
                <h2 id="room-title">Sala #</h2>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">Convide outras pessoas compartilhando a URL desta página.</p>
            </div>
            <div class="table-controls">
                <button id="btn-reveal" class="secondary">Revelar Cartas</button>
                <button id="btn-reset" class="hidden">Nova Rodada</button>
            </div>
        </div>

        <div class="poker-table-wrapper animated">
            <div class="poker-table">
                <!-- Centro da mesa -->
                <div style="opacity: 0.1; font-weight: bold; font-size: 2rem;">POKER</div>
            </div>
            
            <div id="players-container" class="players-container">
                <!-- Spots dos jogadores serão inseridos aqui pelo JS -->
            </div>
        </div>

        <div class="deck-container animated">
            <h3 style="color: var(--text-secondary); font-size: 1rem;">Escolha sua carta</h3>
            <div id="deck" class="deck">
                <!-- Cartões de votação inseridos via JS -->
            </div>
        </div>
    </div>

    <!-- JS -->
    <script src="js/app.js"></script>
</body>
</html>
