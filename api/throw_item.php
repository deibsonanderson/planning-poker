<?php
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado']);
    exit;
}

if (!isset($_POST['room_id']) || !isset($_POST['target_id']) || !isset($_POST['item'])) {
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

$sender_id = (int)$_SESSION['user_id'];
$sender_name = $_SESSION['user_name'];
$target_id = (int)$_POST['target_id'];
$item = trim($_POST['item']);

// Validar itens permitidos
$allowed_items = ['tomato', 'egg', 'airplane', 'target', 'heart', 'coffee', 'poop', 'bomb'];
if (!in_array($item, $allowed_items)) {
    $item = 'tomato';
}

// Obter o nome do participante alvo
$target_name = 'Jogador';
$res_t = mysqli_query($conexao, "SELECT name FROM tb_poker_users WHERE id = $target_id LIMIT 1");
if ($res_t && $row_t = mysqli_fetch_assoc($res_t)) {
    $target_name = $row_t['name'];
}

$payload = json_encode([
    'sender_id' => $sender_id,
    'sender_name' => $sender_name,
    'target_id' => $target_id,
    'target_name' => $target_name,
    'item' => $item
]);

$type = 'throw_item';
$type_escaped = mysqli_real_escape_string($conexao, $type);
$payload_escaped = mysqli_real_escape_string($conexao, $payload);

$sql_event = "INSERT INTO tb_poker_events (room_id, type, payload) VALUES ($room_id, '$type_escaped', '$payload_escaped')";
$query_event = mysqli_query($conexao, $sql_event);

if ($query_event) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Erro ao registrar arremesso']);
}
?>
