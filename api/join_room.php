<?php
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['room_id'])) {
    echo json_encode(['success' => false, 'error' => 'ID da sala é obrigatório']);
    exit;
}

$room_id = intval($data['room_id']);
$user_id = $_SESSION['user_id'];
$user_name = $_SESSION['user_name'];

// Verifica se a sala existe
$res = mysqli_query($conexao, "SELECT id, name FROM tb_poker_rooms WHERE id = $room_id");
if (mysqli_num_rows($res) === 0) {
    echo json_encode(['success' => false, 'error' => 'Sala não encontrada']);
    exit;
}
$room = mysqli_fetch_assoc($res);
$room_name = $room['name'];

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

echo json_encode(['success' => true, 'room_name' => $room_name]);
?>
