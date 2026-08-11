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

mysqli_query($conexao, "DELETE FROM tb_poker_room_users WHERE room_id = $room_id");
mysqli_query($conexao, "DELETE FROM tb_poker_votes WHERE room_id = $room_id");
mysqli_query($conexao, "DELETE FROM tb_poker_events WHERE room_id = $room_id");
mysqli_query($conexao, "UPDATE tb_poker_rooms SET status = 'voting' WHERE id = $room_id");

// Broadcast event so active clients reload or clear state
$type = 'participants_reset';
$payload = json_encode(['message' => 'participantes resetados']);
$type_escaped = mysqli_real_escape_string($conexao, $type);
$payload_escaped = mysqli_real_escape_string($conexao, $payload);

mysqli_query($conexao, "INSERT INTO tb_poker_events (room_id, type, payload) VALUES ($room_id, '$type_escaped', '$payload_escaped')");

echo json_encode(['success' => true]);
?>
