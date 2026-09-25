<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

if (empty($_SESSION['usuario_id']) || ($_SESSION['usuario_rol'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Solo el personal puede entrar aquí.']);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $_GET['accion'] ?? ($data['accion'] ?? '');

switch ($accion) {
    case 'reservas':
        $stmt = $pdo->query("
            SELECT id, servicio, fecha, hora_inicio, hora_fin, duracion_horas,
                   nombre, telefono, email, mensaje, estado
            FROM reservaciones
        ");
        echo json_encode(['reservas' => $stmt->fetchAll()]);
        break;

    case 'confirmar':
    case 'cancelar':
        $estado = $accion === 'confirmar' ? 'confirmada' : 'cancelada';
        $stmt = $pdo->prepare("UPDATE reservaciones SET estado = ? WHERE id = ?");
        $stmt->execute([$estado, (int)$data['id']]);
        echo json_encode(['ok' => $stmt->rowCount() > 0]);
        break;

    case 'bloquear':
        $fecha   = $data['fecha'] ?? '';
        $horaNum = (int)($data['hora'] ?? 11);
        $dur     = max(1, (int)($data['duracion'] ?? 1));
        $motivo  = trim($data['motivo'] ?? '') ?: 'Bloqueo del staff';
        if (!$fecha) { echo json_encode(['ok'=>false,'error'=>'Falta la fecha.']); exit; }
        if ($horaNum < 11 || $horaNum + $dur > 23) { echo json_encode(['ok'=>false,'error'=>'Fuera del horario 11:00–23:00.']); exit; }
        $stmt = $pdo->prepare("
            INSERT INTO reservaciones (servicio, fecha, hora_inicio, hora_fin, duracion_horas, nombre, telefono, email, mensaje, estado)
            VALUES ('bloqueo', ?, ?, ?, ?, ?, 'BLOQUEO', '', '', ?, 'confirmada')
        ");
        $stmt->execute([$fecha, sprintf('%02d:00:00',$horaNum), sprintf('%02d:00:00',$horaNum+$dur), $dur, $motivo]);
        echo json_encode(['ok' => true]);
        break;

    default:
        echo json_encode(['ok' => false, 'error' => 'Acción no válida.']);
}