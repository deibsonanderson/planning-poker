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

// Apenas para simplificar: qualquer um na sala pode revelar, mas idealmente seria o criador.
mysqli_query($conexao, "UPDATE tb_poker_rooms SET status = 'revealed' WHERE id = $room_id");

// Busca todos os votos para enviar no payload do evento de reveal
$res = mysqli_query($conexao, "SELECT user_id, value FROM tb_poker_votes WHERE room_id = $room_id");
$votes = [];
if ($res) {
    while ($row = mysqli_fetch_assoc($res)) {
        $votes[$row['user_id']] = $row['value'];
    }
}

$payload = json_encode(['votes' => $votes]);
$type = 'reveal';
$type_escaped = mysqli_real_escape_string($conexao, $type);
$payload_escaped = mysqli_real_escape_string($conexao, $payload);

$sql_event = "INSERT INTO tb_poker_events (room_id, type, payload) VALUES ($room_id, '$type_escaped', '$payload_escaped')";
$query_event = mysqli_query($conexao, $sql_event);

if ($query_event) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Erro ao revelar votos']);
}
?>
