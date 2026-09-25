<?php
session_start();
header('Content-Type: application/json');
if (!empty($_SESSION['usuario_id'])) {
    echo json_encode(['usuario' => [
        'id'     => $_SESSION['usuario_id'],
        'nombre' => $_SESSION['usuario_nombre'],
        'rol'    => $_SESSION['usuario_rol'] ?? 'cliente',
    ]]);
} else {
    echo json_encode(['usuario' => null]);
}