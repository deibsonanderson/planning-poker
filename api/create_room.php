<?php
session_start();
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado:['.$_SESSION['user_id'].']']);
    exit;
}

$room_name = isset($_POST['name']) ? trim($_POST['name']) : 'Sala de ' . $_SESSION['user_name'];
$room_name = mysqli_real_escape_string($conexao, $room_name);
$user_id = (int) $_SESSION['user_id']; // Forçando cast para int para segurança

$sql = "INSERT INTO tb_poker_rooms (name, created_by, status) VALUES ('$room_name', $user_id, 'voting')";
$query = mysqli_query($conexao, $sql);

if ($query) {
    $room_id = mysqli_insert_id($conexao);
    echo json_encode(['success' => true, 'room_id' => $room_id]);
} else {
    echo json_encode(['success' => false, 'error' => 'Erro ao criar sala']);
}
?>
