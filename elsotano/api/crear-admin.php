<?php
require 'config.php';
$nombre = 'Staff El Sótano';
$email  = 'admin@elsotano.com';     // cámbialo al que quieras
$pass   = 'CambiaEstaClave123';     // cámbiala (mín. 6 caracteres)

$hash = password_hash($pass, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, telefono, password_hash, rol) VALUES (?,?,?,?, 'admin')");
$stmt->execute([$nombre, $email, '', $hash]);
echo '✔ Admin creado (id ' . $pdo->lastInsertId() . '). BORRA ESTE ARCHIVO AHORA.';