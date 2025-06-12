import React, { useState } from "react";

function LoginForm({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setIsLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL;

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: senha }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login bem-sucedido:", data);

        localStorage.setItem("user_id", data.user_id);

        if (onLogin) onLogin(data.username);
      } else {
        setErro(data.erro || "Erro no login");
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      setErro("Erro ao conectar ao servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={styles.input}
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        style={styles.input}
      />
      {erro && <span style={styles.erro}>{erro}</span>}
      
      <button type="submit" style={styles.button} disabled={isLoading}>
        {isLoading ? <div style={styles.loader}></div> : "Entrar"}
      </button>

      <a
        href={`${process.env.REACT_APP_API_URL}/github`}
        style={{ ...styles.button, textAlign: "center", textDecoration: "none" }}
      >
        Entrar com GitHub
      </a>

    </form>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#2c3e50",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
    border: "none",
    transition: "background 0.3s",
    opacity: 1,
  },
  erro: {
    color: "red",
    fontSize: "14px",
  },
  loader: {
    width: "24px",
    height: "24px",
    border: "4px solid rgba(255, 255, 255, 0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto",
  }
};

export default LoginForm;