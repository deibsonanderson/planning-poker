<?php
session_start();
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado:['.$_SESSION['user_id'].']']);
    exit;
}

if (!isset($_POST['name']) || empty(trim($_POST['name']))) {
    echo json_encode(['success' => false, 'error' => 'O nome da sala é obrigatório']);
    exit;
}

$room_name = mysqli_real_escape_string($conexao, trim($_POST['name']));
$user_id = (int) $_SESSION['user_id']; // Forçando cast para int para segurança

// Gera o identificador único de 20 caracteres:
// ano(4) + mes(2) + dia(2) + hora(2) + minuto(2) + segundo(2) + milisegundo(3) + 3 caracteres aleatórios(3)
// Exemplo: 20261016090950999123
$microtime = microtime(true);
$milli = floor(($microtime - floor($microtime)) * 1000);
if ($milli > 999) $milli = 999;
$milliPart = sprintf('%03d', (int)$milli);
$datePart = date('YmdHis', (int)$microtime);
$randomPart = sprintf('%03d', mt_rand(0, 999));
$code = $datePart . $milliPart . $randomPart;

$sql = "INSERT INTO tb_poker_rooms (name, created_by, status, code) VALUES ('$room_name', $user_id, 'voting', '$code')";
$query = mysqli_query($conexao, $sql);

if ($query) {
    $room_id = mysqli_insert_id($conexao);
    echo json_encode(['success' => true, 'room_id' => $room_id, 'code' => $code]);
} else {
    echo json_encode(['success' => false, 'error' => 'Erro ao criar sala']);
}
?>
