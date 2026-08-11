<?php
include '../config/database.php';

header('Content-Type: application/json');
session_write_close(); // Importante para não bloquear outras requisições do mesmo usuário durante o poll

if (!isset($_GET['room_id']) || !isset($_GET['last_event_id'])) {
    echo json_encode([]);
    exit;
}

$room_id = intval($_GET['room_id']);
$last_event_id = intval($_GET['last_event_id']);

$timeout = 20; // Segura a requisição por até 20 segundos
$start = time();

while (true) {
    // Verifica se a conexão com o cliente ainda está ativa
    if (connection_aborted()) {
        break;
    }

    $sql = "
        SELECT id, type, payload, created_at 
        FROM tb_poker_events 
        WHERE room_id = $room_id 
        AND id > $last_event_id
        ORDER BY id ASC
    ";
    $result = mysqli_query($conexao, $sql);

    if ($result && mysqli_num_rows($result) > 0) {
        $events = array();
        while ($row = mysqli_fetch_assoc($result)) {
            // Decodifica o payload para enviar como JSON estruturado
            $row['payload'] = json_decode($row['payload'], true);
            $events[] = $row;
        }

        echo json_encode($events);
        break;
    }

    if ((time() - $start) > $timeout) {
        echo json_encode([]);
        break;
    }

    usleep(500000); // Aguarda 0.5 segundos (500.000 microssegundos) antes de checar novamente
}
?>
