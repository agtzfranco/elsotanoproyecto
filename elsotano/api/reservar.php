<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Debes iniciar sesión para reservar.', 'login' => true]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
foreach (['servicio', 'fecha', 'hora'] as $campo) {
    if (empty($data[$campo])) {
        echo json_encode(['ok' => false, 'error' => "Falta el campo: $campo"]);
        exit;
    }
}

$servicio = $data['servicio'];
$fecha    = $data['fecha'];
$hora     = $data['hora'];
$duracion = (int)($data['duracion'] ?? 1);

$horaNum    = (int)substr($hora, 0, 2);
$horaFinNum = $horaNum + $duracion;
if ($horaNum < 11 || $horaFinNum > 23) {
    echo json_encode(['ok' => false, 'error' => 'El horario debe estar entre 11:00 y 23:00.']);
    exit;
}
$horaInicio = sprintf('%02d:00:00', $horaNum);
$horaFin    = sprintf('%02d:00:00', $horaFinNum);

// Datos del usuario con sesión
$stmt = $pdo->prepare("SELECT nombre, email, telefono FROM usuarios WHERE id = ?");
$stmt->execute([$_SESSION['usuario_id']]);
$u = $stmt->fetch();

// Detectar choque de horarios (incluye bloqueos del staff)
$stmt = $pdo->prepare("
    SELECT COUNT(*) FROM reservaciones
    WHERE fecha = ? AND estado != 'cancelada'
      AND (servicio = ? OR servicio = 'bloqueo')
      AND hora_inicio < ? AND hora_fin > ?
");
$stmt->execute([$fecha, $servicio, $horaFin, $horaInicio]);
if ($stmt->fetchColumn() > 0) {
    echo json_encode(['ok' => false, 'error' => 'Ese horario ya fue reservado o está bloqueado. Elige otro.']);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO reservaciones (usuario_id, servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'pendiente')
");
$stmt->execute([
    $_SESSION['usuario_id'], $servicio, $fecha, $horaInicio, $horaFin,
    $duracion, $u['nombre'], $u['telefono'], $u['email'], $data['mensaje'] ?? ''
]);

echo json_encode(['ok' => true, 'mensaje' => '¡Reserva registrada! Te contactaremos para confirmarla.']);