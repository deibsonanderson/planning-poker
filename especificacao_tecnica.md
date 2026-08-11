# Especificação Técnica - Planning Poker Online

## 1. Visão Geral do Projeto
O Planning Poker Online é uma aplicação web para estimativa de tarefas em equipes ágeis, permitindo que usuários criem salas, entrem em salas existentes e votem em tempo real. O sistema é dividido em um frontend construído com HTML, CSS e JavaScript (Vanilla), e um backend em PHP fornecendo uma API para um banco de dados MySQL.

## 2. Arquitetura do Sistema
O projeto utiliza uma arquitetura cliente-servidor padrão:
*   **Frontend (Cliente):** Interface de usuário em Single Page Application (SPA) implementada em `public/index.php`. Consome endpoints da API via chamadas assíncronas (Fetch API/AJAX).
*   **Backend (Servidor):** Scripts PHP isolados na pasta `api/` que recebem e respondem requisições em formato JSON.
*   **Banco de Dados:** MySQL estruturado para armazenar Usuários, Salas, Participantes, Votos e Eventos.

## 3. Stack Tecnológica
*   **Backend:** PHP
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+), Fontes (Inter)
*   **Banco de Dados:** MySQL
*   **Servidor Web (Dev):** Apache (XAMPP)

## 4. Estrutura de Diretórios
*   `/api/`: Contém os scripts PHP (endpoints) da aplicação (ex: `login.php`, `create_room.php`, `vote.php`).
*   `/config/`: Configurações globais e de banco de dados (`database.php`).
*   `/public/`: Pasta pública raiz da aplicação web.
    *   `index.php`: Arquivo principal da interface do usuário.
    *   `/css/`: Folhas de estilo (ex: `style.css`).
    *   `/js/`: Scripts de lógica do cliente (ex: `app.js`).
*   `database.sql`: Script SQL para criação do esquema de banco de dados e tabelas.
*   `index.html`: Arquivo na raiz de redirecionamento para a pasta `/public/`.

## 5. Esquema de Banco de Dados (`planning_poker`)

A base de dados possui 5 tabelas principais, otimizadas com índices nos campos `room_id`:

### 5.1. `tb_poker_users`
Gerencia os usuários/jogadores do sistema.
*   `id` (INT, PK, Auto Increment): ID do usuário.
*   `name` (VARCHAR): Nome de exibição do usuário.
*   `created_at` (TIMESTAMP): Data e hora de criação.

### 5.2. `tb_poker_rooms`
Gerencia as salas (mesas) de votação.
*   `id` (INT, PK, Auto Increment)
*   `name` (VARCHAR): Nome ou título da sala.
*   `created_by` (INT): ID do usuário criador (Host).
*   `status` (ENUM): Estado atual da sala (`'voting'`, `'revealed'`).
*   `created_at` (TIMESTAMP)

### 5.3. `tb_poker_room_users`
Relação (N:N) vinculando usuários às salas em que estão online/participando.
*   `id` (INT, PK, Auto Increment)
*   `room_id` (INT)
*   `user_id` (INT)
*   `joined_at` (TIMESTAMP)

### 5.4. `tb_poker_votes`
Armazena os votos submetidos pelos participantes de uma sala.
*   `id` (INT, PK, Auto Increment)
*   `room_id` (INT)
*   `user_id` (INT)
*   `value` (VARCHAR): Valor do cartão votado (ex: '1', '2', '5', '13', '?').
*   `created_at` (TIMESTAMP)

### 5.5. `tb_poker_events`
Log de ações e eventos na sala. Usado para orquestração de mudanças de estado no frontend.
*   `id` (INT, PK, Auto Increment)
*   `room_id` (INT)
*   `type` (VARCHAR): Tipo do evento (ex: join, vote).
*   `payload` (TEXT): Dados adicionais serializados.
*   `created_at` (TIMESTAMP)

## 6. Endpoints da API

A comunicação principal é feita enviando payload JSON. Principais rotas em `/api/`:

*   **Usuários**
    *   `POST /login.php`: Recebe `{"name": "Nome"}`, verifica se usuário já existe (reutilizando-o) ou cria novo, retornando seu ID e inserindo-o na sessão (PHP Session).
*   **Salas (Lobby)**
    *   `GET /list_rooms.php`: Retorna as salas disponíveis para listagem no dashboard.
    *   `POST /create_room.php`: Cria uma nova sala vazia.
    *   `POST /delete_room.php`: Exclui a sala.
*   **Interações da Sala de Poker**
    *   `POST /join_room.php`: Registra a entrada do usuário na mesa de poker (`tb_poker_room_users`).
    *   `POST /vote.php`: Envia o valor de estimativa escolhido pelo jogador e insere em `tb_poker_votes`.
    *   `POST /reveal.php`: Host da sala altera o `status` para `revealed`, liberando as respostas para todos.
    *   `POST /reset.php`: Zera as rodadas (limpa votos) e volta status para `voting`.
    *   `POST /reset_participants.php`: Remove os participantes e zera a sala.
*   **Sincronização**
    *   `GET /poll.php` & `GET /poll_rooms.php`: Endpoints acionados via short/long polling pelo Javascript do frontend para atualizar a visualização da tela com eventos e interações dos demais jogadores (atualização de estado quase em tempo real).

## 7. Fluxo do Cliente (Interface - `public/index.php`)
1.  **View de Autenticação (`#view-login`)**: Tela inicial solicitando apenas um nome, sem senhas complexas, priorizando agilidade.
2.  **Dashboard (`#dashboard-view`)**: Apresenta a listagem das salas existentes na plataforma e um formulário para criação de novas.
3.  **Mesa / Sala (`#view-room`)**: O estado principal da SPA, onde ocorre o jogo:
    *   **Mesa**: Área central exibindo os lugares dos jogadores conectados e seus status de "votou" ou "pendente".
    *   **Deck**: Área inferior contendo as cartas elegíveis (Fibonacci). O jogador interage clicando numa carta.
    *   **Controles**: O sistema disponibiliza botões para "Revelar Cartas" ou iniciar "Nova Rodada", os quais se comunicam com a API assincronamente.

## 8. Segurança e Performance
*   O backend utiliza Prepared Statements do MySQLi (`$conn->prepare()`) para mitigar SQL Injection de entradas de usuário (ex: login e nomes de salas).
*   O frontend faz uso de atualizações parciais da DOM para otimizar performance.
*   Atualização contínua usando polling via AJAX.
