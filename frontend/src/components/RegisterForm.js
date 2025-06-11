import React, { useState } from 'react';

function RegisterForm({ onRegister }) {
  const [isLoading, setIsLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setIsLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL;

      const response = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: nome,
          email: email,
          password: senha
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSucesso("Usuário cadastrado com sucesso!");
        setNome('');
        setEmail('');
        setSenha('');
        if (onRegister) onRegister(); 
      } else {
        setErro(data.erro || 'Erro desconhecido');
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} style={styles.form}>
      <input
        style={styles.input}
        type="text"
        placeholder="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
      />
      <input
        style={styles.input}
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
      />

      {erro && <span style={styles.erro}>{erro}</span>}
      {sucesso && <span style={styles.sucesso}>{sucesso}</span>}

      <button type="submit" style={styles.button} disabled={isLoading}>
        {isLoading ? <div style={styles.loader}></div> : "Cadastrar"}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px'
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#2c3e50',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.3s',
    opacity: 1,
  },
  erro: {
    color: "red",
    fontSize: "14px",
  },
  sucesso: {
    marginTop: "10px",
    textAlign: "center",
    fontSize: "14px",
    color: "#2c3e50",    
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

export default RegisterForm;