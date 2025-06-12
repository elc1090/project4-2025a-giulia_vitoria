import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function GitHubCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Exemplo: pegar o token ou dados do query params
    const params = new URLSearchParams(location.search);
    const token = params.get("token"); // depende do que seu backend envia

    if (token) {
      // Salva o token no localStorage ou onde preferir
      localStorage.setItem("token", token);
      // Pode também salvar username, user_id, etc, conforme retorno do backend

      // Redireciona para dashboard
      navigate("/dashboard");
    } else {
      // Caso não tenha token, redireciona para login (ou outra página)
      navigate("/login");
    }
  }, [location, navigate]);

  return <p>Autenticando com GitHub...</p>;
}

export default GitHubCallback;
