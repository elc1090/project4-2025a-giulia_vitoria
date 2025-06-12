import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [loadingOAuth, setLoadingOAuth] = useState(false);
  const [erroOAuth, setErroOAuth] = useState("");

  // Função para login normal
  const handleLogin = (nome) => {
    setNomeUsuario(nome);
    setIsLoggedIn(true);
    localStorage.setItem("nomeUsuario", nome);
  };

  // Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setNomeUsuario("");
    localStorage.removeItem("nomeUsuario");
  };

  useEffect(() => {
    const savedNomeUsuario = localStorage.getItem("nomeUsuario");
    if (savedNomeUsuario) {
      setNomeUsuario(savedNomeUsuario);
      setIsLoggedIn(true);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username");
    const userId = urlParams.get("user_id");

    if (username && userId) {
      setNomeUsuario(username);
      setIsLoggedIn(true);
      localStorage.setItem("nomeUsuario", username);
      localStorage.setItem("user_id", userId);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const code = urlParams.get("code");
    if (code) {
      async function fetchGitHubUser() {
        setLoadingOAuth(true); // <<< usando
        setErroOAuth(""); // <<< limpando erro anterior
        try {
          const API_URL = process.env.REACT_APP_API_URL;
          const response = await fetch(`${API_URL}/github/callback?code=${code}`);
          const data = await response.json();
          if (response.ok && data.username) {
            setNomeUsuario(data.username);
            setIsLoggedIn(true);
            localStorage.setItem("nomeUsuario", data.username);
            localStorage.setItem("user_id", data.user_id);
            window.history.replaceState({}, document.title, '/');
          } else {
            setErroOAuth("Falha no login via GitHub"); // <<< usando
          }
        } catch (error) {
          setErroOAuth("Erro ao conectar ao servidor"); // <<< usando
        } finally {
          setLoadingOAuth(false); // <<< usando
        }
      }
      fetchGitHubUser();
    }
  }, []);

  if (loadingOAuth) {
    return <p>Autenticando via GitHub...</p>;
  }

  return (
    <>
      {erroOAuth && <p style={{ color: "red" }}>{erroOAuth}</p>}

      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} nomeUsuario={nomeUsuario} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
