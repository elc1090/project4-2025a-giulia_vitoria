import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    // Verifica se já tem um usuário salvo no localStorage
    const savedNomeUsuario = localStorage.getItem('nomeUsuario');
    if (savedNomeUsuario) {
      setNomeUsuario(savedNomeUsuario);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (nome) => {
    setNomeUsuario(nome);
    setIsLoggedIn(true);
    // Salva no localStorage
    localStorage.setItem('nomeUsuario', nome);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setNomeUsuario('');
    // Remove do localStorage
    localStorage.removeItem('nomeUsuario');
  };

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
