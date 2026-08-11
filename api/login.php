<?php
include '../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || empty(trim($data['name']))) {
    echo json_encode(['success' => false, 'error' => 'Nome é obrigatório']);
    exit;
}

$name = trim($data['name']);

// Verifica se o usuário já existe
$name_escaped = mysqli_real_escape_string($conexao, $name);
$sql_check = "SELECT id, name FROM tb_poker_users WHERE name = '$name_escaped' LIMIT 1";
$query_check = mysqli_query($conexao, $sql_check);

if ($query_check === false) {
    echo json_encode(['success' => false, 'error' => 'Erro interno no banco de dados. Detalhes: ' . mysqli_error($conexao)]);
    exit;
}

if (mysqli_num_rows($query_check) > 0) {
    // Usuário já existe, reutiliza o registro
    $row = mysqli_fetch_assoc($query_check);
    $user_id = $row['id'];
    
    $_SESSION['user_id'] = $user_id;
    $_SESSION['user_name'] = $row['name'];
    
    echo json_encode(['success' => true, 'user_id' => $user_id, 'name' => $row['name']]);
} else {
    // Usuário não existe, cria um novo
    $sql_insert = "INSERT INTO tb_poker_users (name) VALUES ('$name_escaped')";
    $query_insert = mysqli_query($conexao, $sql_insert);

    if ($query_insert === false) {
        echo json_encode(['success' => false, 'error' => 'Erro interno no banco de dados. Detalhes: ' . mysqli_error($conexao)]);
        exit;
    }

    $user_id = mysqli_insert_id($conexao);
    $_SESSION['user_id'] = $user_id;
    $_SESSION['user_name'] = $name;
    
    echo json_encode(['success' => true, 'user_id' => $user_id, 'name' => $name]);
}
?>
