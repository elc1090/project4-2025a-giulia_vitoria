import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');

  // Função para login normal
  const handleLogin = (nome) => {
    setNomeUsuario(nome);
    setIsLoggedIn(true);
    localStorage.setItem('nomeUsuario', nome);
  };

  // Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setNomeUsuario('');
    localStorage.removeItem('nomeUsuario');
  };

  useEffect(() => {
    // Tenta restaurar sessão
    const savedNomeUsuario = localStorage.getItem('nomeUsuario');
    if (savedNomeUsuario) {
      setNomeUsuario(savedNomeUsuario);
      setIsLoggedIn(true);
      return;
    }

    // Detecta retorno do OAuth do GitHub (exemplo: ?code=algumcodigo)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Trocar o código pelo token e dados do usuário via backend
      async function fetchGitHubUser() {
        try {
          const API_URL = process.env.REACT_APP_API_URL;
          const response = await fetch(`${API_URL}/github/callback?code=${code}`);
          const data = await response.json();
          if (response.ok && data.username) {
            handleLogin(data.username);
            // Limpa a URL para não ficar o ?code= na barra
            window.history.replaceState({}, document.title, '/');
          } else {
            console.error('Falha no login via GitHub');
          }
        } catch (error) {
          console.error('Erro no fetch GitHub callback:', error);
        }
      }
      fetchGitHubUser();
    }
  }, []);

  return (
    <>
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} nomeUsuario={nomeUsuario} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
