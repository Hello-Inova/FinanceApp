document.getElementById("resetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = document.getElementById("newPassword");
  const confirmation = document.getElementById("confirmPassword");
  const message = document.getElementById("resetMessage");
  const submit = document.getElementById("resetSubmit");
  if (password.value !== confirmation.value) {
    message.textContent = "As senhas não coincidem.";
    message.className = "auth-message error";
    return;
  }
  submit.disabled = true;
  try {
    const response = await fetch("/api/public/password-reset/confirm", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        token: form.dataset.token,
        nova_senha: password.value,
        confirmar_senha: confirmation.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.mensagem || "Não foi possível redefinir a senha.");
    message.textContent = "Senha redefinida. Redirecionando para o login…";
    message.className = "auth-message success";
    form.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    setTimeout(() => { window.location.href = "/"; }, 1500);
  } catch (error) {
    message.textContent = error.message;
    message.className = "auth-message error";
    submit.disabled = false;
  }
});
