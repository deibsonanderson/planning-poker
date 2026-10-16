<?php
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado']);
    exit;
}

if (!isset($_POST['room_id']) || !isset($_POST['value'])) {
    echo json_encode(['success' => false, 'error' => 'Dados incompletos']);
    exit;
}

$raw_room = trim($_POST['room_id']);
if (is_numeric($raw_room) && strlen($raw_room) < 10) {
    $room_id = intval($raw_room);
} else {
    $raw_room_esc = mysqli_real_escape_string($conexao, $raw_room);
    $r = mysqli_query($conexao, "SELECT id FROM tb_poker_rooms WHERE code = '$raw_room_esc' OR id = '$raw_room_esc'");
    $room_id = ($row = mysqli_fetch_assoc($r)) ? intval($row['id']) : intval($raw_room);
}
$user_id = $_SESSION['user_id'];
$value = mysqli_real_escape_string($conexao, $_POST['value']);

// Remove voto anterior (se existir na rodada)
mysqli_query($conexao, "DELETE FROM tb_poker_votes WHERE room_id = $room_id AND user_id = $user_id");

// Insere o novo voto
$sql_insert = "INSERT INTO tb_poker_votes (room_id, user_id, value) VALUES ($room_id, $user_id, '$value')";
$query_insert = mysqli_query($conexao, $sql_insert);

if ($query_insert) {
    // Insere evento de voto para notificar outros com o valor do voto
    $payload = json_encode(['user_id' => $user_id, 'value' => $value]);
    $type = 'vote';
    $type_escaped = mysqli_real_escape_string($conexao, $type);
    $payload_escaped = mysqli_real_escape_string($conexao, $payload);

    mysqli_query($conexao, "INSERT INTO tb_poker_events (room_id, type, payload) VALUES ($room_id, '$type_escaped', '$payload_escaped')");

    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Erro ao registrar voto']);
}
?>
