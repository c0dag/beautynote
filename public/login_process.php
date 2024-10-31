<?php
// Usuário e senha de exemplo
$usuario_valido = "ADMIN";
$senha_valida = "admin123";

// Obtém os dados do formulário
$username = $_POST['username'];
$password = $_POST['password'];

// Verifica se os dados estão corretos
if ($username === $usuario_valido && $password === $senha_valida) {
    // Redireciona para a página restrita do site
    header("Location: index.html");
    exit();
} else {
    header("Location: login.html?error=1");
    // exit();
}
?>
