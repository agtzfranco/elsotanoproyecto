<?php
session_start();
require 'config.php';
header('Content-Type: application/json');

$data     = json_decode(file_get_contents('php://input'), true);
$nombre   = trim($data['nombre'] ?? '');
$email    = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$telefono = trim($data['telefono'] ?? '');
$pass     = $data['password'] ?? '';

if (strlen($nombre) < 3)  { echo json_encode(['ok'=>false,'error'=>'El nombre debe tener al menos 3 caracteres.']); exit; }
if (!$email)              { echo json_encode(['ok'=>false,'error'=>'Correo electrónico no válido.']); exit; }
if (strlen($pass) < 6)    { echo json_encode(['ok'=>false,'error'=>'La contraseña debe tener al menos 6 caracteres.']); exit; }

$stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) { echo json_encode(['ok'=>false,'error'=>'Ya existe una cuenta con ese correo.']); exit; }

$hash = password_hash($pass, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, telefono, password_hash) VALUES (?,?,?,?)");
$stmt->execute([$nombre, $email, $telefono, $hash]);

$_SESSION['usuario_id']     = (int)$pdo->lastInsertId();
$_SESSION['usuario_nombre'] = $nombre;
$_SESSION['usuario_rol'] = 'cliente';
echo json_encode(['ok' => true, 'usuario' => ['id' => $_SESSION['usuario_id'], 'nombre' => $nombre]]);