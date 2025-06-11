import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LinkList from "../components/LinkList";

export default function Dashboard({ nomeUsuario, onLogout }) {
  const [links, setLinks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editingLink, setEditingLink] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);

  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editFolderData, setEditFolderData] = useState({ id: null, name: '' });

  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState(null);

  const user_id = localStorage.getItem("user_id");
  const API_URL = 'http://localhost:5000';

  async function handleCreateFolder(name) {
    if (typeof name !== "string" || !name.trim()) return;

    try {
      const res = await fetch(`${API_URL}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), user_id: parseInt(user_id) }),
      });

      if (!res.ok) throw new Error("Erro ao criar pasta");

      // Aguarda um breve momento e chama fetchFolders para garantir a atualização
      await fetchFolders(user_id);

    } catch (error) {
      console.error(error.message);
    }
  }

  async function fetchFolders(user_id) {
    const response = await fetch(`${API_URL}/folders?user_id=${user_id}`);
    const folders = await response.json();
    setFolders(folders);
  }

  const handleEditFolder = (folderId, newName) => {
    setFolders(prevFolders =>
      prevFolders.map(folder =>
        folder.id === folderId ? { ...folder, name: newName } : folder
      )
    );
  };

  const confirmEditFolder = async () => {
    if (!editFolderData.id || !editFolderData.name.trim()) return;

    try {
      const res = await fetch(`${API_URL}/folders/${editFolderData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: editFolderData.name })
      });

      if (!res.ok) throw new Error("Erro ao editar pasta");

      // Atualiza a lista de pastas localmente
      setFolders(prevFolders =>
        prevFolders.map(folder =>
          folder.id === editFolderData.id
            ? { ...folder, name: editFolderData.name }
            : folder
        )
      );

      setShowEditFolderModal(false);
    } catch (error) {
      console.error("Erro ao editar pasta:", error.message);
    }
  };

  const handleDeleteFolder = (folderId) => {
    setDeleteFolderId(folderId);
    setShowDeleteFolderModal(true);
  };

  const confirmDeleteFolder = () => {
    fetch(`${API_URL}/folders/${deleteFolderId}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        setFolders(prev => prev.filter(f => f.id !== deleteFolderId));
        if (selectedFolder === deleteFolderId) setSelectedFolder(null);
        setShowDeleteFolderModal(false);
      })
      .catch(err => console.error("Erro ao excluir pasta:", err));
  };

  useEffect(() => {
    if (!user_id) return;
    fetchFolders(user_id);
  }, [user_id]);

  useEffect(() => {
    if (!user_id) return;
    let url = `${API_URL}/bookmarks?user_id=${user_id}`;
    if (selectedFolder) url += `&folder_id=${selectedFolder}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const formattedLinks = data.map(link => ({
          id: link.id,
          title: link.titulo,
          url: link.url,
          description: link.descricao || "",
        }));
        setLinks(formattedLinks);
      })
      .catch(err => console.error("Erro ao carregar links:", err));
  }, [user_id, selectedFolder]);

  const filteredLinks = links.filter(link => 
    (link.title && link.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddLink = async (e) => {
    e.preventDefault();
    setErro("");
    setIsLoading(true);
    if (!newTitle || !newUrl) {
      alert("Título e URL são obrigatórios!");
      setIsLoading(false);
      return;
    }
    const newLinkData = {
      user_id: parseInt(user_id),
      titulo: newTitle,
      url: newUrl,
      descricao: newDescription,
      folder_id: selectedFolder
    };
    try {
      const res = await fetch(`${API_URL}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLinkData),
      });
      const result = await res.json();
      setLinks([{
        id: result.id,
        title: newTitle,
        url: newUrl,
        description: newDescription
      }, ...links]);
      setNewTitle("");
      setNewUrl("");
      setNewDescription("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  function handleEdit(link) {
    setEditingLink({ ...link, titulo: link.title, descricao: link.description });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    setErro("");
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/bookmarks/${editingLink.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editingLink.titulo,
          url: editingLink.url,
          descricao: editingLink.descricao,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar link");
      setLinks(links.map(l => (l.id === editingLink.id ? { ...l, title: editingLink.titulo, url: editingLink.url, description: editingLink.descricao } : l)));
      setEditingLink(null);
    } catch (error) {
      setErro(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id);
    await fetch(`${API_URL}/bookmarks/${id}`, { method: "DELETE" });
    setLinks(links.filter(link => link.id !== id));
    setFavorites(favorites.filter(fav => fav.id !== id));
    setDeletingId(null);
    setShowConfirm(false);
    setConfirmDeleteId(null);
  };

  const confirmDelete = (id) => {
    setConfirmDeleteId(id);
    setShowConfirm(true);
  };

  return (
    <div style={styles.container}>
      <Header onSearch={setSearchTerm} nomeUsuario={nomeUsuario} onLogout={onLogout} />
      <div style={styles.main}>
        <Sidebar
          favorites={favorites}
          onCreateFolder={handleCreateFolder}
          folders={folders}
          setSelectedFolder={setSelectedFolder}
          selectedFolder={selectedFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
        />
        <main style={styles.content}>
          <form onSubmit={handleAddLink} style={styles.form}>
            <input type="text" placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={styles.input} required />
            <input type="url" placeholder="URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={styles.input} required />
            <input type="text" placeholder="Descrição (opcional)" value={newDescription} onChange={e => setNewDescription(e.target.value)} style={styles.input} />
            {erro && <span style={styles.erro}>{erro}</span>}
            <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? "Adicionando..." : "Adicionar Link"}</button>
          </form>

          {editingLink && (
            <form onSubmit={salvarEdicao} style={styles.form}>
              <input type="text" value={editingLink.titulo} onChange={e => setEditingLink({ ...editingLink, titulo: e.target.value })} style={styles.input} required />
              <input type="url" value={editingLink.url} onChange={e => setEditingLink({ ...editingLink, url: e.target.value })} style={styles.input} required />
              <input type="text" value={editingLink.descricao || ""} onChange={e => setEditingLink({ ...editingLink, descricao: e.target.value })} style={styles.input} />
              {erro && <span style={styles.erro}>{erro}</span>}
              <button type="submit" style={styles.button} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</button>
              <button type="button" onClick={() => setEditingLink(null)} style={{ ...styles.button, backgroundColor: "gray" }}>Cancelar</button>
            </form>
          )}

          {showConfirm && (
            <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                <p>Tem certeza que deseja excluir este link?</p>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button onClick={() => handleDelete(confirmDeleteId)} style={{ ...styles.button, backgroundColor: "#2c3e50" }}>{deletingId === confirmDeleteId ? "Excluindo..." : "Sim, excluir"}</button>
                  <button onClick={() => { setShowConfirm(false); setConfirmDeleteId(null); }} style={{ ...styles.button, backgroundColor: "gray" }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showEditFolderModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                <h3>Editar Pasta</h3>
                <input type="text" value={editFolderData.name} onChange={(e) => setEditFolderData({ ...editFolderData, name: e.target.value })} style={styles.input} />
                <div style={{ marginTop: '10px' }}>
                  <button onClick={confirmEditFolder} style={styles.button}>Salvar</button>
                  <button onClick={() => setShowEditFolderModal(false)} style={{ ...styles.button, backgroundColor: "gray" }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showDeleteFolderModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                <p>Tem certeza que deseja excluir esta pasta?</p>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button onClick={confirmDeleteFolder} style={{ ...styles.button, backgroundColor: "#2c3e50" }}>Sim, excluir</button>
                  <button onClick={() => setShowDeleteFolderModal(false)} style={{ ...styles.button, backgroundColor: "gray" }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          <LinkList links={filteredLinks} onEdit={handleEdit} onDelete={confirmDelete} grid />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: { height: "100vh", display: "flex", flexDirection: "column" },
  main: { flex: 1, display: "flex" },
  content: { flex: 1, padding: "20px", background: "#e9ebee", overflowY: "auto" },
  form: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", alignItems: "center" },
  input: { flex: "1 1 150px", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", minWidth: "150px" },
  button: { padding: "10px 18px", backgroundColor: "#2c3e50", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  erro: { color: "red", fontSize: "13px", marginLeft: "10px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.3)", display: "flex", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", minWidth: "300px" },
};