<?php
include '../config/database.php';

header('Content-Type: application/json');
session_write_close();

$last_hash = isset($_GET['last_hash']) ? $_GET['last_hash'] : '';

$timeout = 20;
$start = time();

while (true) {
    if (connection_aborted()) break;

    $sql = "SELECT id, name, code, status, created_at FROM tb_poker_rooms ORDER BY created_at DESC LIMIT 5";
    $result = mysqli_query($conexao, $sql);
    
    $rooms = [];
    $rooms_data = '';
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $rooms[] = $row;
            $code_val = isset($row['code']) ? $row['code'] : '';
            $rooms_data .= $row['id'] . $row['name'] . $code_val . $row['status'] . $row['created_at'];
        }
    }
    
    $current_hash = md5($rooms_data);

    if ($last_hash === '' || $current_hash !== $last_hash) {
        echo json_encode(['changed' => true, 'hash' => $current_hash, 'rooms' => $rooms]);
        break;
    }

    if ((time() - $start) > $timeout) {
        echo json_encode(['changed' => false, 'hash' => $current_hash]);
        break;
    }

    usleep(500000); // 0.5s
}
?>
