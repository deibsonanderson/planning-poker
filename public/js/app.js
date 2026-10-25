// Estado Global
const state = {
    userId: null,
    userName: null,
    roomId: null,
    roomCode: null,
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
const tableRoomName = document.getElementById('table-room-name');
const playersContainer = document.getElementById('players-container');
const deckContainer = document.getElementById('deck');
const btnReveal = document.getElementById('btn-reveal');
const btnReset = document.getElementById('btn-reset');

// --- Initialization ---
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramRoomId = urlParams.get('room_id');

    if (paramRoomId) {
        state.roomId = paramRoomId.trim();
        state.roomCode = paramRoomId.trim();
        const welcomeEl = document.getElementById('welcome-msg');
        if (welcomeEl) welcomeEl.textContent = 'Você foi convidado para uma sala!';
    }

    if (window.INITIAL_SESSION && window.INITIAL_SESSION.user_id) {
        state.userId = window.INITIAL_SESSION.user_id;
        state.userName = window.INITIAL_SESSION.name;

        if (loginForm) loginForm.classList.add('hidden');

        if (state.roomId) {
            joinRoom(state.roomId);
        } else {
            if (dashboardView) dashboardView.classList.remove('hidden');
            loadRooms();
        }
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

        rooms.slice(0, 3).forEach(room => {
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
            const roomCode = room.code || room.id;
            header.innerHTML = `
                    <span style="font-weight: 600; color: var(--text-primary);">${room.name}</span>
                    <span style="font-size: 0.8rem; opacity: 0.8;">#${roomCode} - ${statusText}</span>
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
            btnJoin.onclick = () => joinRoom(roomCode);

            const btnCopy = document.createElement('button');
            btnCopy.className = 'secondary';
            btnCopy.textContent = 'Copiar Link';
            btnCopy.style.flex = '1';
            btnCopy.style.padding = '0.5rem';
            btnCopy.style.fontSize = '0.85rem';
            btnCopy.onclick = (e) => {
                e.stopPropagation();
                const link = window.location.origin + window.location.pathname + '?room_id=' + roomCode;
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
                    await ajaxPost('../api/reset_participants.php', { room_id: roomCode });
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
                    await ajaxPost('../api/delete_room.php', { room_id: roomCode });
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
        const roomName = roomNameInput ? roomNameInput.value.trim() : '';
        if (!roomName) {
            alert('Por favor, preencha o nome da sala.');
            if (roomNameInput) roomNameInput.focus();
            return;
        }

        const data = await ajaxPost('../api/create_room.php', { name: roomName });

        if (data.success) {
            if (roomNameInput) roomNameInput.value = '';
            joinRoom(data.code || data.room_id);
        } else {
            alert(data.error || 'Erro ao criar sala');
        }
    } catch (e) {
        console.error(e);
    }
}

async function joinRoom(roomIdent) {
    try {
        const data = await ajaxPost('../api/join_room.php', { room_id: roomIdent });

        if (data.success) {
            state.roomId = data.room_id;
            state.roomCode = data.room_code || roomIdent;
            state.roomName = data.room_name;
            window.history.pushState({}, '', `?room_id=${state.roomCode}`);

            if (data.status) {
                state.roomStatus = data.status;
            }

            state.myVote = (data.my_vote !== undefined && data.my_vote !== null) ? data.my_vote : null;

            if (data.players && Array.isArray(data.players) && data.players.length > 0) {
                state.players = {};
                data.players.forEach(p => {
                    state.players[p.id] = {
                        name: p.name,
                        voted: p.voted,
                        value: p.value || null
                    };
                });
                if (!state.myVote && state.players[state.userId] && state.players[state.userId].value) {
                    state.myVote = state.players[state.userId].value;
                }
            } else {
                // Registra a si mesmo localmente na interface
                state.players[state.userId] = {
                    name: state.userName,
                    voted: !!state.myVote,
                    value: state.myVote
                };
            }

            if (state.myVote && state.players[state.userId]) {
                state.players[state.userId].voted = true;
                state.players[state.userId].value = state.myVote;
            }

            //if (roomsPollAbortController) roomsPollAbortController.abort();
            showRoom();
            poll(); // Inicia o long polling
        } else {
            alert(data.error || 'Erro ao entrar na sala');
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
    const displayCode = state.roomCode || state.roomId;
    const nameText = state.roomName ? state.roomName : `Sala #${displayCode}`;
    roomTitle.textContent = nameText;
    if (tableRoomName) {
        tableRoomName.textContent = nameText;
    }
    renderPlayers();
    renderDeck();
}

function getTablePosition(index, total) {
    // Table dimensions: width 500, height 200, border-radius 100
    // Straight middle section: from x = -150 to x = 150 (length 300)
    // Semicircles at ends: radius 100, centered at (-150, 0) and (150, 0)
    const offset = 65; // px outside the table edge
    const r = 100 + offset; // 165px
    const straightL = 300; // length of straight top / bottom segment
    const arcL = Math.PI * r; // length of semicircle arc (~518.36px)
    const totalPerimeter = (straightL * 2) + (arcL * 2); // ~1636.72px

    const step = totalPerimeter / total;
    const s = (index * step);

    const s1 = straightL / 2; // 150
    const s2 = s1 + arcL;      // 150 + arcL
    const s3 = s2 + straightL; // 450 + arcL
    const s4 = s3 + arcL;      // 450 + 2*arcL

    let x = 0;
    let y = r;

    if (s <= s1) {
        // Bottom straight line (right half)
        x = s;
        y = r;
    } else if (s <= s2) {
        // Right semicircular arc: from +PI/2 down to -PI/2
        const progress = (s - s1) / arcL;
        const angle = (Math.PI / 2) - (progress * Math.PI);
        x = 150 + (r * Math.cos(angle));
        y = r * Math.sin(angle);
    } else if (s <= s3) {
        // Top straight line: from +150 down to -150
        const dist = s - s2;
        x = 150 - dist;
        y = -r;
    } else if (s <= s4) {
        // Left semicircular arc: from -PI/2 down to -3PI/2
        const progress = (s - s3) / arcL;
        const angle = (-Math.PI / 2) - (progress * Math.PI);
        x = -150 + (r * Math.cos(angle));
        y = r * Math.sin(angle);
    } else {
        // Bottom straight line (left half): from -150 to 0
        const dist = s - s4;
        x = -150 + dist;
        y = r;
    }

    return { x: Math.round(x), y: Math.round(y) };
}

function renderPlayers() {
    playersContainer.innerHTML = '';

    const uids = Object.keys(state.players);
    const total = uids.length;
    if (total === 0) {
        updateButtons();
        return;
    }

    // Identifica o valor vencedor se a sala estiver revelada e não houver empate
    let winningValue = null;
    if (state.roomStatus === 'revealed') {
        const voteCounts = {};
        Object.values(state.players).forEach(p => {
            if (p.value !== null && p.value !== undefined) {
                voteCounts[p.value] = (voteCounts[p.value] || 0) + 1;
            }
        });

        let maxVotes = 0;
        Object.values(voteCounts).forEach(count => {
            if (count > maxVotes) maxVotes = count;
        });

        if (maxVotes > 0) {
            const topValues = Object.keys(voteCounts).filter(val => voteCounts[val] === maxVotes);
            // Apenas marca dourado se não houver empate
            if (topValues.length === 1) {
                winningValue = topValues[0];
            }
        }
    }

    // Current user stays at index 0 (bottom center), others follow clockwise
    const myIdStr = String(state.userId);
    const myIdx = uids.indexOf(myIdStr);
    let orderedUids = uids;
    if (myIdx > -1) {
        orderedUids = [...uids.slice(myIdx), ...uids.slice(0, myIdx)];
    }

    orderedUids.forEach((uid, index) => {
        const p = state.players[uid];
        const pos = getTablePosition(index, total);

        const spot = document.createElement('div');
        spot.className = 'player-spot animated';
        spot.style.left = `calc(50% + ${pos.x}px)`;
        spot.style.top = `calc(50% + ${pos.y}px)`;

        const isWinner = (state.roomStatus === 'revealed' && winningValue !== null && p.value != '?' && p.value != '☕' && p.value === winningValue);
        const card = document.createElement('div');
        card.className = `player-card ${p.voted ? 'voted' : ''} ${state.roomStatus === 'revealed' ? 'revealed' : ''} ${isWinner ? 'winner' : ''}`;

        if (state.roomStatus === 'revealed' && p.value) {
            card.textContent = (p.value === '?' ? '☕' : p.value);
        } else if (p.voted) {
            if (p.value) {
                card.textContent = p.value;
            } else if (parseInt(uid) === parseInt(state.userId) && state.myVote) {
                card.textContent = state.myVote;
            } else {
                card.textContent = '✓';
            }
        }

        const name = document.createElement('div');
        name.className = 'player-name';
        const isMe = (parseInt(uid) === parseInt(state.userId));
        name.textContent = (p.name || `User ${uid}`) + (isMe ? ' (Você)' : '');
        spot.dataset.userId = uid;

        if (!isMe) {
            spot.classList.add('other-player');
            spot.title = `Clique para arremessar algo em ${p.name}!`;

            const hint = document.createElement('span');
            hint.className = 'throw-hint';
            hint.textContent = '🎯 Arremessar';
            spot.appendChild(hint);

            spot.onclick = (e) => {
                e.stopPropagation();
                openThrowMenu(uid, p.name, spot);
            };
        }

        spot.appendChild(card);
        spot.appendChild(name);
        playersContainer.appendChild(spot);
    });

    updateButtons();
}

function renderDeck() {
    deckContainer.innerHTML = '';
    const values = ['PP', 'P', 'M', 'G', 'GG', '☕'];

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

        const isSelected = (state.myVote !== null && state.myVote !== undefined && String(state.myVote).trim() === String(val).trim());
        const btn = document.createElement('button');
        btn.className = `vote-btn ${isSelected ? 'selected' : ''}`;
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
            if (parseInt(data.user_id) === parseInt(state.userId) && data.value) {
                state.myVote = data.value;
                renderDeck();
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

        case 'throw_item':
            if (!isCatchingUp) {
                if (parseInt(data.sender_id) !== parseInt(state.userId)) {
                    playThrowAnimation(data);
                }
            }
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
    closeThrowMenu();
    if (pollXhr) {
        pollXhr.abort();
    }
    state.roomId = null;
    state.roomCode = null;
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

// --- Throw Objects Feature ---
const THROWABLE_ITEMS = {
    tomato: { emoji: '🍅', name: 'Tomate', splat: '🍅' },
    egg: { emoji: '🥚', name: 'Ovo', splat: '🍳' },
    airplane: { emoji: '✈️', name: 'Avião', splat: '💥' },
    target: { emoji: '🎯', name: 'Alvo', splat: '🎯' },
    heart: { emoji: '❤️', name: 'Coração', splat: '💖' },
    coffee: { emoji: '☕', name: 'Café', splat: '☕' },
    poop: { emoji: '💩', name: 'Cocô', splat: '💩' },
    bomb: { emoji: '💣', name: 'Bomba', splat: '💥' }
};

let audioCtx = null;
function playThrowSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        if (type === 'whoosh') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'splat') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'boom') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'pop') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch (e) {
        // Silencioso se áudio não for permitido
    }
}

let currentThrowMenu = null;

function closeThrowMenu() {
    if (currentThrowMenu) {
        currentThrowMenu.remove();
        currentThrowMenu = null;
    }
}

document.addEventListener('click', (e) => {
    if (currentThrowMenu && !currentThrowMenu.contains(e.target)) {
        closeThrowMenu();
    }
});

function openThrowMenu(targetUid, targetName, spotEl) {
    closeThrowMenu();

    const popover = document.createElement('div');
    popover.className = 'throw-popover';

    const rect = spotEl.getBoundingClientRect();
    const isTopHalf = rect.top < 180;

    popover.style.left = `${rect.left + rect.width / 2}px`;
    if (isTopHalf) {
        popover.classList.add('position-bottom');
        popover.style.top = `${rect.bottom + 12}px`;
    } else {
        popover.style.top = `${rect.top - 12}px`;
    }

    const title = document.createElement('div');
    title.className = 'throw-popover-title';
    title.textContent = `Arremessar em ${targetName}`;
    popover.appendChild(title);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'throw-popover-items';

    Object.keys(THROWABLE_ITEMS).forEach(itemKey => {
        const item = THROWABLE_ITEMS[itemKey];
        const btn = document.createElement('button');
        btn.className = 'throw-item-btn';
        btn.textContent = item.emoji;
        btn.title = item.name;
        btn.onclick = (e) => {
            e.stopPropagation();
            closeThrowMenu();
            throwItem(targetUid, itemKey, targetName);
        };
        itemsContainer.appendChild(btn);
    });

    popover.appendChild(itemsContainer);
    document.body.appendChild(popover);
    currentThrowMenu = popover;
}

async function throwItem(targetUid, itemKey, targetName) {
    if (!state.roomId) return;

    // Dispara animação imediatamente no remetente
    playThrowAnimation({
        sender_id: state.userId,
        sender_name: state.userName,
        target_id: targetUid,
        target_name: targetName || 'Participante',
        item: itemKey
    });

    try {
        await ajaxPost('../api/throw_item.php', {
            room_id: state.roomId,
            target_id: targetUid,
            item: itemKey
        });
    } catch (e) {
        console.error('Erro ao registrar arremesso:', e);
    }
}

function playThrowAnimation(data) {
    const itemKey = data.item || 'tomato';
    const itemData = THROWABLE_ITEMS[itemKey] || THROWABLE_ITEMS.tomato;

    const senderEl = document.querySelector(`.player-spot[data-user-id="${data.sender_id}"]`) ||
        document.querySelector('.deck-container') ||
        document.body;
    const targetEl = document.querySelector(`.player-spot[data-user-id="${data.target_id}"]`);

    if (!targetEl) return;

    const sRect = senderEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    const startX = sRect.left + sRect.width / 2;
    const startY = sRect.top + sRect.height / 2;
    const endX = tRect.left + tRect.width / 2;
    const endY = tRect.top + tRect.height / 2;

    const projectile = document.createElement('div');
    projectile.className = 'throw-projectile';
    projectile.textContent = itemData.emoji;
    projectile.style.left = '0px';
    projectile.style.top = '0px';
    document.body.appendChild(projectile);

    playThrowSound('whoosh');

    const duration = 600;
    const startTime = performance.now();
    const distance = Math.hypot(endX - startX, endY - startY);
    const arcHeight = Math.min(220, Math.max(80, distance * 0.35));

    function step(now) {
        const elapsed = now - startTime;
        const p = Math.min(Math.max(elapsed / duration, 0), 1);

        const currX = startX + (endX - startX) * p;
        const arcY = -Math.sin(p * Math.PI) * arcHeight;
        const currY = startY + (endY - startY) * p + arcY;

        let transform = '';
        if (itemKey === 'airplane') {
            const dx = endX - startX;
            const dy = (endY - startY) - Math.cos(p * Math.PI) * arcHeight;
            const angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 45;
            transform = `translate(${currX}px, ${currY}px) translate(-50%, -50%) rotate(${angle}deg) scale(${1 + Math.sin(p * Math.PI) * 0.3})`;
        } else {
            const rotation = p * 720;
            const scale = 1 + Math.sin(p * Math.PI) * 0.4;
            transform = `translate(${currX}px, ${currY}px) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
        }

        projectile.style.transform = transform;

        if (p < 1) {
            requestAnimationFrame(step);
        } else {
            projectile.remove();
            triggerSplatImpact(targetEl, itemKey, itemData);
            showThrowToast(data.sender_name, data.target_name, itemData);
        }
    }

    requestAnimationFrame(step);
}

function triggerSplatImpact(targetSpot, itemKey, itemData) {
    if (itemKey === 'bomb') {
        playThrowSound('boom');
    } else if (itemKey === 'heart' || itemKey === 'target') {
        playThrowSound('pop');
    } else {
        playThrowSound('splat');
    }

    targetSpot.classList.remove('splat-shake');
    void targetSpot.offsetWidth;
    targetSpot.classList.add('splat-shake');
    setTimeout(() => {
        targetSpot.classList.remove('splat-shake');
    }, 500);

    const card = targetSpot.querySelector('.player-card') || targetSpot;
    const splat = document.createElement('div');
    splat.className = 'splat-overlay';

    const badge = document.createElement('div');
    badge.className = 'splat-badge';
    badge.textContent = itemData.splat;
    splat.appendChild(badge);

    card.appendChild(splat);
    setTimeout(() => {
        splat.remove();
    }, 2800);

    if (itemKey === 'heart') {
        for (let i = 0; i < 5; i++) {
            const part = document.createElement('div');
            part.className = 'splat-particle';
            part.textContent = '💕';
            part.style.setProperty('--tx', `${(Math.random() - 0.5) * 80}px`);
            part.style.setProperty('--ty', `${-30 - Math.random() * 50}px`);
            card.appendChild(part);
            setTimeout(() => part.remove(), 800);
        }
    } else if (itemKey === 'bomb') {
        for (let i = 0; i < 6; i++) {
            const part = document.createElement('div');
            part.className = 'splat-particle';
            part.textContent = Math.random() > 0.5 ? '🔥' : '💨';
            part.style.setProperty('--tx', `${(Math.random() - 0.5) * 100}px`);
            part.style.setProperty('--ty', `${(Math.random() - 0.5) * 80}px`);
            card.appendChild(part);
            setTimeout(() => part.remove(), 800);
        }
    }
}

function showThrowToast(senderName, targetName, itemData) {
    const container = document.getElementById('throw-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'throw-toast';
    toast.innerHTML = `<strong>${senderName}</strong> arremessou <strong>${itemData.name}</strong> em <strong>${targetName}</strong>! ${itemData.emoji}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

// --- Event Listeners ---
document.getElementById('btn-login').addEventListener('click', () => {
    const name = document.getElementById('input-name').value;
    if (name) login(name);
});

document.getElementById('btn-back-rooms').addEventListener('click', leaveRoom);

document.getElementById('btn-create-room').addEventListener('click', createRoom);

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', logout);
}

btnReveal.addEventListener('click', revealVotes);
btnReset.addEventListener('click', resetRoom);

async function logout() {
    try {
        if (roomsPollXhr) {
            roomsPollXhr.abort();
            roomsPollXhr = null;
        }
        if (pollXhr) {
            pollXhr.abort();
            pollXhr = null;
        }

        await ajaxPost('../api/logout.php', {});
    } catch (e) {
        console.error('Erro ao deslogar:', e);
    } finally {
        state.userId = null;
        state.userName = null;
        state.roomId = null;
        state.roomCode = null;
        state.roomName = null;
        state.lastEventId = 0;
        state.players = {};
        state.myVote = null;
        state.roomStatus = 'voting';
        window.INITIAL_SESSION = null;

        window.history.pushState({}, '', window.location.pathname);

        if (viewRoom) viewRoom.classList.add('hidden');
        if (viewLogin) viewLogin.classList.remove('hidden');
        if (dashboardView) dashboardView.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');

        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) {
            welcomeMsg.textContent = 'Estime tarefas com sua equipe em tempo real.';
        }

        const inputName = document.getElementById('input-name');
        if (inputName) {
            inputName.value = '';
            inputName.focus();
        }
    }
}

// Boot
init();

