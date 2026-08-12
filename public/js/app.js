// Estado Global
const state = {
    userId: null,
    userName: null,
    roomId: null,
    roomName: null,
    lastEventId: 0,
    players: {},
    roomStatus: 'voting',
    myVote: null
};

// --- AJAX Helpers ---
function ajaxPost(url, dataObj) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error('Erro na requisição: ' + xhr.status));
                }
            }
        };

        const formData = new FormData();
        if (dataObj) {
            for (const key in dataObj) {
                formData.append(key, dataObj[key]);
            }
        }

        xhr.send(formData);
    });
}

// --- DOM Elements ---
const viewLogin = document.getElementById('view-login');
const viewRoom = document.getElementById('view-room');
const loginForm = document.getElementById('login-form');
const dashboardView = document.getElementById('dashboard-view');
const roomTitle = document.getElementById('room-title');
const playersContainer = document.getElementById('players-container');
const deckContainer = document.getElementById('deck');
const btnReveal = document.getElementById('btn-reveal');
const btnReset = document.getElementById('btn-reset');

// --- Initialization ---
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramRoomId = urlParams.get('room_id');

    if (paramRoomId) {
        state.roomId = parseInt(paramRoomId);
        document.getElementById('welcome-msg').textContent = 'Você foi convidado para uma sala!';
    }
}

// --- Autenticação ---
async function login(name) {
    try {
        const data = await ajaxPost('../api/login.php', { name });

        if (data.success) {
            state.userId = data.user_id;
            state.userName = data.name;

            loginForm.classList.add('hidden');

            if (state.roomId) {
                joinRoom(state.roomId);
            } else {
                if (dashboardView) dashboardView.classList.remove('hidden');
                loadRooms();
            }
        } else {
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
    }
}

let roomsPollXhr = null;
let lastRoomsHash = '';

function pollRooms() {
    if (state.roomId || !state.userId) return;

    roomsPollXhr = new XMLHttpRequest();
    roomsPollXhr.open('GET', `../api/poll_rooms.php?last_hash=${lastRoomsHash}`, true);
    roomsPollXhr.onreadystatechange = function () {
        if (roomsPollXhr.readyState === 4) {
            if (roomsPollXhr.status === 200) {
                try {
                    const data = JSON.parse(roomsPollXhr.responseText);
                    if (data.changed) {
                        lastRoomsHash = data.hash;
                        renderRoomsList(data.rooms);
                    }
                    if (!state.roomId && state.userId) {
                        pollRooms();
                    }
                } catch (err) {
                    console.error("Rooms poll parse error:", err);
                    if (!state.roomId && state.userId) setTimeout(pollRooms, 2000);
                }
            } else if (roomsPollXhr.status !== 0) {
                console.error("Rooms poll error, status:", roomsPollXhr.status);
                if (!state.roomId && state.userId) setTimeout(pollRooms, 2000);
            }
        }
    };
    roomsPollXhr.send();
}

function loadRooms() {
    lastRoomsHash = '';
    if (roomsPollXhr) roomsPollXhr.abort();
    pollRooms();
}

function renderRoomsList(rooms) {
    try {
        const list = document.getElementById('rooms-list');
        if (!list) return;

        list.innerHTML = '';

        if (rooms.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem; text-align: center; margin-top: 1rem;">Nenhuma sala encontrada. Crie uma nova!</p>';
            return;
        }

        rooms.forEach(room => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.gap = '0.5rem';
            item.style.padding = '0.75rem 1rem';
            item.style.border = '1px solid var(--border-color)';
            item.style.borderRadius = '8px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            let statusText = room.status === 'voting' ? 'Votando' : 'Revelado';
            header.innerHTML = `
                    <span style="font-weight: 600; color: var(--text-primary);">${room.name}</span>
                    <span style="font-size: 0.8rem; opacity: 0.8;">#${room.id} - ${statusText}</span>
                `;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '0.5rem';
            actions.style.marginTop = '0.5rem';

            const btnJoin = document.createElement('button');
            btnJoin.className = 'primary';
            btnJoin.textContent = 'Entrar';
            btnJoin.style.flex = '1';
            btnJoin.style.padding = '0.5rem';
            btnJoin.style.fontSize = '0.85rem';
            btnJoin.onclick = () => joinRoom(room.id);

            const btnCopy = document.createElement('button');
            btnCopy.className = 'secondary';
            btnCopy.textContent = 'Copiar Link';
            btnCopy.style.flex = '1';
            btnCopy.style.padding = '0.5rem';
            btnCopy.style.fontSize = '0.85rem';
            btnCopy.onclick = (e) => {
                e.stopPropagation();
                const link = window.location.origin + window.location.pathname + '?room_id=' + room.id;
                navigator.clipboard.writeText(link).then(() => {
                    btnCopy.textContent = 'Copiado!';
                    setTimeout(() => btnCopy.textContent = 'Copiar Link', 2000);
                });
            };

            const btnResetParts = document.createElement('button');
            btnResetParts.className = 'secondary';
            btnResetParts.textContent = 'Resetar';
            btnResetParts.style.flex = '1';
            btnResetParts.style.padding = '0.5rem';
            btnResetParts.style.fontSize = '0.85rem';
            btnResetParts.style.backgroundColor = '#fee2e2';
            btnResetParts.style.color = '#b91c1c';
            btnResetParts.style.borderColor = '#fca5a5';
            btnResetParts.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja remover todos os participantes desta sala?')) {
                    await ajaxPost('../api/reset_participants.php', { room_id: room.id });
                    loadRooms();
                }
            };

            const btnDelete = document.createElement('button');
            btnDelete.className = 'secondary';
            btnDelete.textContent = 'Excluir';
            btnDelete.style.flex = '1';
            btnDelete.style.padding = '0.5rem';
            btnDelete.style.fontSize = '0.85rem';
            btnDelete.style.backgroundColor = '#7f1d1d';
            btnDelete.style.color = '#fecaca';
            btnDelete.style.borderColor = '#991b1b';
            btnDelete.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir esta sala permanentemente?')) {
                    await ajaxPost('../api/delete_room.php', { room_id: room.id });
                    loadRooms();
                }
            };

            actions.appendChild(btnJoin);
            actions.appendChild(btnCopy);
            actions.appendChild(btnResetParts);
            actions.appendChild(btnDelete);

            item.appendChild(header);
            item.appendChild(actions);

            list.appendChild(item);
        });
    } catch (e) {
        console.error('Erro ao renderizar salas:', e);
    }
}

async function createRoom() {
    try {
        const roomNameInput = document.getElementById('input-room-name');
        let roomName = roomNameInput ? roomNameInput.value.trim() : '';
        if (!roomName) {
            roomName = `Sala de ${state.userName}`;
        }

        const data = await ajaxPost('../api/create_room.php', { name: roomName });

        if (data.success) {
            joinRoom(data.room_id);
        }
    } catch (e) {
        console.error(e);
    }
}

async function joinRoom(roomId) {
    try {
        const data = await ajaxPost('../api/join_room.php', { room_id: roomId });

        if (data.success) {
            state.roomId = roomId;
            state.roomName = data.room_name;
            window.history.pushState({}, '', `?room_id=${roomId}`);

            // Registra a si mesmo localmente na interface
            state.players[state.userId] = { name: state.userName, voted: false, value: null };

            //if (roomsPollAbortController) roomsPollAbortController.abort();
            showRoom();
            poll(); // Inicia o long polling
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Views ---
function updateButtons() {
    if (state.roomStatus === 'voting') {
        btnReveal.classList.remove('hidden');
        btnReset.classList.add('hidden');

        let hasVotes = false;
        Object.values(state.players).forEach(p => {
            if (p.voted) hasVotes = true;
        });

        btnReveal.disabled = !hasVotes;
        if (!hasVotes) {
            btnReveal.style.opacity = '0.5';
            btnReveal.style.cursor = 'not-allowed';
        } else {
            btnReveal.style.opacity = '1';
            btnReveal.style.cursor = 'pointer';
        }
    } else {
        btnReveal.classList.add('hidden');
        btnReset.classList.remove('hidden');
    }
}

function showRoom() {
    viewLogin.classList.add('hidden');
    viewRoom.classList.remove('hidden');
    roomTitle.textContent = state.roomName ? state.roomName : `Sala #${state.roomId}`;
    renderPlayers();
    renderDeck();
}

function renderPlayers() {
    playersContainer.innerHTML = '';

    Object.keys(state.players).forEach(uid => {
        const p = state.players[uid];

        const spot = document.createElement('div');
        spot.className = 'player-spot animated';

        const card = document.createElement('div');
        card.className = `player-card ${p.voted ? 'voted' : ''} ${state.roomStatus === 'revealed' ? 'revealed' : ''}`;

        if (state.roomStatus === 'revealed' && p.value) {
            card.textContent = p.value;
        } else if (p.voted) {
            if (p.value) {
                card.textContent = p.value;
            } else if (parseInt(uid) === state.userId && state.myVote) {
                card.textContent = state.myVote;
            } else {
                card.textContent = '✓';
            }
        }

        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = p.name + (parseInt(uid) === state.userId ? ' (Você)' : '');

        spot.appendChild(card);
        spot.appendChild(name);
        playersContainer.appendChild(spot);
    });

    updateButtons();
}

function renderDeck() {
    deckContainer.innerHTML = '';
    const values = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

    let voteCounts = {};
    let totalVotes = 0;
    let maxVotes = 0;

    if (state.roomStatus === 'revealed') {
        Object.values(state.players).forEach(p => {
            if (p.value !== null) {
                voteCounts[p.value] = (voteCounts[p.value] || 0) + 1;
                totalVotes++;
            }
        });

        Object.values(voteCounts).forEach(count => {
            if (count > maxVotes) maxVotes = count;
        });
    }

    values.forEach(val => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '8px';

        const btn = document.createElement('button');
        btn.className = `vote-btn ${state.myVote === val ? 'selected' : ''}`;
        btn.textContent = val;

        if (state.roomStatus === 'revealed') {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }

        btn.onclick = () => castVote(val);
        wrapper.appendChild(btn);

        if (state.roomStatus === 'revealed') {
            const count = voteCounts[val] || 0;

            const barContainer = document.createElement('div');
            barContainer.style.width = '100%';
            barContainer.style.height = '60px';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.alignItems = 'center';
            barContainer.style.gap = '4px';

            if (count > 0) {
                const label = document.createElement('span');
                label.textContent = count;
                label.style.fontSize = '0.85rem';
                label.style.fontWeight = 'bold';
                label.style.color = 'var(--text-secondary)';

                const bar = document.createElement('div');
                bar.style.width = '24px';
                const heightPercentage = Math.max(10, (count / maxVotes) * 100);
                bar.style.height = `${heightPercentage}%`;
                bar.style.backgroundColor = '#4f46e5';
                bar.style.borderRadius = '4px 4px 0 0';

                barContainer.appendChild(label);
                barContainer.appendChild(bar);
            }

            wrapper.appendChild(barContainer);
        }

        deckContainer.appendChild(wrapper);
    });
}

// --- Ações da Sala ---
async function castVote(value) {
    if (state.roomStatus === 'revealed') return;

    state.myVote = value;
    state.players[state.userId].voted = true;
    renderPlayers();
    renderDeck();

    try {
        await ajaxPost('../api/vote.php', { room_id: state.roomId, value });
    } catch (e) {
        console.error(e);
    }
}

async function revealVotes() {
    try {
        await ajaxPost('../api/reveal.php', { room_id: state.roomId });
    } catch (e) {
        console.error(e);
    }
}

async function resetRoom() {
    try {
        await ajaxPost('../api/reset.php', { room_id: state.roomId });
    } catch (e) {
        console.error(e);
    }
}

// --- Long Polling ---
let pollXhr = null;
function poll() {
    if (!state.roomId) return;

    if (pollXhr) {
        pollXhr.abort();
    }

    pollXhr = new XMLHttpRequest();
    pollXhr.open('GET', `../api/poll.php?room_id=${state.roomId}&last_event_id=${state.lastEventId}`, true);
    pollXhr.onreadystatechange = function () {
        if (pollXhr.readyState === 4) {
            if (pollXhr.status === 200) {
                try {
                    const events = JSON.parse(pollXhr.responseText);
                    if (events.length > 0) {
                        const isCatchingUp = (state.lastEventId === 0);
                        events.forEach(event => {
                            state.lastEventId = parseInt(event.id);
                            handleEvent(event, isCatchingUp);
                        });
                    }
                    if (state.roomId) poll();
                } catch (err) {
                    console.error("Poll parse error:", err);
                    if (state.roomId) setTimeout(poll, 2000);
                }
            } else if (pollXhr.status !== 0) {
                console.error("Poll error, status:", pollXhr.status);
                if (state.roomId) setTimeout(poll, 2000);
            }
        }
    };
    pollXhr.send();
}

function handleEvent(event, isCatchingUp = false) {
    const payload = event.payload; // Já decodificado no PHP (mas pode vir string dependendo da implementação)
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    switch (event.type) {
        case 'participants_reset':
            if (!isCatchingUp) {
                alert("Os participantes desta sala foram resetados.");
                leaveRoom();
            }
            break;

        case 'user_joined':
            if (data.user_id !== state.userId) {
                state.players[data.user_id] = { name: data.name, voted: false, value: null };
                renderPlayers();
            }
            break;

        case 'vote':
            if (state.players[data.user_id]) {
                state.players[data.user_id].voted = true;
                if (data.value) state.players[data.user_id].value = data.value;
                renderPlayers();
            } else {
                // Caso não tenha o nome do player (ele já tava na sala antes), idealmente buscaremos
                state.players[data.user_id] = { name: `User ${data.user_id}`, voted: true, value: data.value || null };
                renderPlayers();
            }
            break;

        case 'reveal':
            state.roomStatus = 'revealed';
            const votes = data.votes || {};

            Object.keys(votes).forEach(uid => {
                if (!state.players[uid]) {
                    state.players[uid] = { name: `User ${uid}`, voted: true };
                }
                state.players[uid].value = votes[uid];
            });

            renderPlayers();
            renderDeck();
            break;

        case 'reset':
            state.roomStatus = 'voting';
            state.myVote = null;

            Object.keys(state.players).forEach(uid => {
                state.players[uid].voted = false;
                state.players[uid].value = null;
            });

            renderPlayers();
            renderDeck();
            break;
    }
}

function leaveRoom() {
    if (pollXhr) {
        pollXhr.abort();
    }
    state.roomId = null;
    state.roomName = null;
    state.lastEventId = 0;
    state.players = {};
    state.myVote = null;
    state.roomStatus = 'voting';
    window.history.pushState({}, '', window.location.pathname);

    viewRoom.classList.add('hidden');
    viewLogin.classList.remove('hidden');

    if (state.userId) {
        dashboardView.classList.remove('hidden');
        loadRooms();
    } else {
        loginForm.classList.remove('hidden');
    }
}

// --- Event Listeners ---
document.getElementById('btn-login').addEventListener('click', () => {
    const name = document.getElementById('input-name').value;
    if (name) login(name);
});

document.getElementById('btn-back-rooms').addEventListener('click', leaveRoom);

document.getElementById('btn-create-room').addEventListener('click', createRoom);
btnReveal.addEventListener('click', revealVotes);
btnReset.addEventListener('click', resetRoom);

// Boot
init();
