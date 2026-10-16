<?php
include '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Não autenticado']);
    exit;
}

$sql = "SELECT id, name, code, status, created_at FROM tb_poker_rooms ORDER BY created_at DESC LIMIT 3";
$result = mysqli_query($conexao, $sql);
$rooms = [];
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $rooms[] = $row;
    }
}

echo json_encode(['success' => true, 'rooms' => $rooms]);
?>
