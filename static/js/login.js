document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('password').value;
  const errorMessage = document.getElementById('error-message');

  errorMessage.style.display = 'none';

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: senha
      })
    });

    const resultado = await response.json();

    if (resultado.success) {
      window.location.href = "/home";
    } else {
      errorMessage.style.display = "block";
    }

  } catch (erro) {
    console.error("Erro:", erro);
    errorMessage.style.display = "block";
  }
});