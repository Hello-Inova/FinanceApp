document.getElementById("recoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("recoveryEmail");
  const message = document.getElementById("recoveryMessage");
  const submit = document.getElementById("recoverySubmit");
  submit.disabled = true;
  message.className = "auth-message";
  try {
    const response = await fetch("/api/public/password-reset/request", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email: email.value.trim()})
    });
    const result = await response.json();
    message.textContent = result.mensagem || "Verifique sua caixa de entrada.";
    message.className = "auth-message success";
    email.value = "";
  } catch (_error) {
    message.textContent = "Não foi possível concluir a solicitação. Tente novamente.";
    message.className = "auth-message error";
  } finally {
    submit.disabled = false;
  }
});
