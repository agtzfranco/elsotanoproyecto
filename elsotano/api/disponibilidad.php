<?php
require 'config.php';
header('Content-Type: application/json');

$servicio = $_GET['servicio'] ?? '';
$fecha    = $_GET['fecha'] ?? '';

if (!$servicio || !$fecha) {
    echo json_encode(['error' => 'Faltan servicio o fecha']);
    exit;
}

// Reservas ocupadas del día (incluye bloqueos del staff)
$stmt = $pdo->prepare("
    SELECT hora_inicio, hora_fin
    FROM reservaciones
    WHERE fecha = ? AND estado != 'cancelada'
      AND (servicio = ? OR servicio = 'bloqueo')
");
$stmt->execute([$fecha, $servicio]);
$reservas = $stmt->fetchAll();

// Generar horarios de 11:00 a 22:00
$slots = [];
for ($hora = 11; $hora < 23; $hora++) {
    $inicioSlot = $hora;
    $finSlot    = $hora + 1;
    $ocupado    = false;

    foreach ($reservas as $r) {
        $rInicio = (int)substr($r['hora_inicio'], 0, 2);
        $rFin    = (int)substr($r['hora_fin'], 0, 2);
        if ($inicioSlot < $rFin && $finSlot > $rInicio) {
            $ocupado = true;
            break;
        }
    }

    $slots[] = [
        'hora'    => sprintf('%02d:00', $hora),
        'ocupado' => $ocupado
    ];
}

echo json_encode([
    'servicio' => $servicio,
    'fecha'    => $fecha,
    'slots'    => $slots
]);