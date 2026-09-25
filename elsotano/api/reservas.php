<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'No has iniciado sesión.','login'=>true]); exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("
        SELECT id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, estado
        FROM reservaciones WHERE usuario_id = ?
        ORDER BY fecha DESC, hora_inicio
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    echo json_encode(['reservas' => $stmt->fetchAll()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (($data['accion'] ?? '') === 'cancelar') {
    $stmt = $pdo->prepare("
        UPDATE reservaciones SET estado = 'cancelada'
        WHERE id = ? AND usuario_id = ? AND fecha >= CURDATE() AND estado != 'cancelada'
    ");
    $stmt->execute([(int)$data['id'], $_SESSION['usuario_id']]);
    echo json_encode(['ok' => $stmt->rowCount() > 0]);
    exit;
}
echo json_encode(['ok'=>false,'error'=>'Acción no válida.']);