<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$pass  = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT id, nombre, rol, password_hash FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'])) {
    echo json_encode(['ok' => false, 'error' => 'Correo o contraseña incorrectos.']);
    exit;
}

session_regenerate_id(true);
$_SESSION['usuario_id']     = (int)$user['id'];
$_SESSION['usuario_nombre'] = $user['nombre'];
$_SESSION['usuario_rol']    = $user['rol'];
echo json_encode(['ok' => true, 'usuario' => ['id' => $user['id'], 'nombre' => $user['nombre'], 'rol' => $user['rol']]]);