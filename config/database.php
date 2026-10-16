<?php
// Omitir mensagens de Deprecated, Warnings e Notices que quebram o JSON (especialmente do PHP 5.6)
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_WARNING & ~E_NOTICE);
ini_set('display_errors', 0);
date_default_timezone_set('America/Sao_Paulo');

$host = 'localhost';
$user = 'root';
$password = ''; // Padrão XAMPP
$database = 'planning_poker';

mysqli_report(MYSQLI_REPORT_OFF);
$conexao = mysqli_connect($host, $user, $password, $database);

if (!$conexao) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Falha na conexão com o banco de dados. Verifique se o banco "planning_poker" foi criado.']);
    exit;
}

mysqli_set_charset($conexao, "utf8");

// Session start para manter o user_id logado simplificadamente
session_start();
?>
