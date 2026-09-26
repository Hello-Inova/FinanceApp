document.getElementById("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.getElementById("passwordMessage");
  const response = await fetch("/api/account/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senha_atual: document.getElementById("senhaAtual").value,
      nova_senha: document.getElementById("novaSenha").value,
      confirmar_senha: document.getElementById("confirmarSenha").value,
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    message.textContent = result.mensagem || "Não foi possível trocar a senha.";
    return;
  }
  message.textContent = "Senha alterada com sucesso.";
  window.location.href = "/home";
});
