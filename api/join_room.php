<?php
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado']);
    exit;
}

if (!isset($_POST['room_id']) && !isset($_GET['room_id'])) {
    echo json_encode(['success' => false, 'error' => 'ID da sala é obrigatório']);
    exit;
}else{
   $_aux = isset($_POST['room_id'])?$_POST['room_id']:$_GET['room_id'];
}

$room_param = mysqli_real_escape_string($conexao, trim($_aux));
$user_id = $_SESSION['user_id'];
$user_name = $_SESSION['user_name'];

// Verifica se a sala existe (por code ou por id)
$res = mysqli_query($conexao, "SELECT id, name, code, status FROM tb_poker_rooms WHERE code = '$room_param' OR id = '$room_param'");
if (!$res || mysqli_num_rows($res) === 0) {
    echo json_encode(['success' => false, 'error' => 'Sala não encontrada']);
    exit;
}
$room = mysqli_fetch_assoc($res);
$room_id = (int)$room['id'];
$room_name = $room['name'];
$room_code = !empty($room['code']) ? $room['code'] : (string)$room['id'];
$room_status = !empty($room['status']) ? $room['status'] : 'voting';

// Verifica se já está na sala
$res = mysqli_query($conexao, "SELECT id FROM tb_poker_room_users WHERE room_id = $room_id AND user_id = $user_id");
if (mysqli_num_rows($res) === 0) {
    mysqli_query($conexao, "INSERT INTO tb_poker_room_users (room_id, user_id) VALUES ($room_id, $user_id)");

    // Registra o evento de entrada do usuário
    $payload = json_encode(['user_id' => $user_id, 'name' => $user_name]);
    $type = 'user_joined';
    $payload_escaped = mysqli_real_escape_string($conexao, $payload);
    $type_escaped = mysqli_real_escape_string($conexao, $type);
    
    mysqli_query($conexao, "INSERT INTO tb_poker_events (room_id, type, payload) VALUES ($room_id, '$type_escaped', '$payload_escaped')");
}

// Carrega os participantes e votos atuais para o estado inicial
$users_in_room = [];
$res_users = mysqli_query($conexao, "
    SELECT u.id, u.name, v.value as vote_val 
    FROM tb_poker_room_users ru 
    JOIN tb_users u ON ru.user_id = u.id 
    LEFT JOIN tb_poker_votes v ON (v.room_id = $room_id AND v.user_id = u.id)
    WHERE ru.room_id = $room_id
");
if ($res_users) {
    while ($u_row = mysqli_fetch_assoc($res_users)) {
        $users_in_room[] = [
            'id' => (int)$u_row['id'],
            'name' => $u_row['name'],
            'voted' => !is_null($u_row['vote_val']),
            'value' => ($room_status === 'revealed') ? $u_row['vote_val'] : null
        ];
    }
}

echo json_encode([
    'success' => true,
    'room_id' => $room_id,
    'room_code' => $room_code,
    'room_name' => $room_name,
    'status' => $room_status,
    'players' => $users_in_room
]);
?>
