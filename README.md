# Projeto: Aplicação Web de Compartilhamento de Links Favoritos

Uma aplicação fullstack que permite aos usuários cadastrados compartilhar, visualizar, editar e remover seus links favoritos. Os dados são armazenados no servidor e associados a usuários pré-definidos.

![image](https://github.com/user-attachments/assets/6a1438af-1460-4a0f-8f93-c1e66c952607)


## Acesso

- **Frontend:** https://front-bookmark.vercel.app
- Para acessar, você pode criar um novo usuário, ou fazer login com algum já existente
- Usuário para teste: vitoria@gmail.com, 1234

---

## Plataformas de Hospedagem

- **Frontend:** [Vercel](https://vercel.com/home)  
- **Backend:** [Render](https://render.com/)  
- **Banco de Dados:** [Neon.tech](https://www.neon.tech)

---

## Desenvolvedoras

- **Vitória Luiza Camara** – Sistemas de Informação / UFSM  
- **Giulia Rodrigues de Araújo** – Ciência da Computação / UFSM

---

## Sobre o Produto

Aplicação web com autenticação simplificada que oferece:

- CRUD para os links favoritos do usuário
- CRUD para as pastas do usuário  
- Interface intuitiva com foco em usabilidade
- IA que sugere links de acordo com os já existentes do usuário

---

## Desenvolvimento

Etapas principais do projeto:

1. Definição do tema e funcionalidades  
2. Estruturação do frontend em React.js  
3. Criação do backend em Python (Flask)  
4. Integração com banco de dados PostgreSQL (Neon.tech)  
5. Implementação do CRUD completo  
6. Login com usuários pré-cadastrados  
7. Deploy gratuito (Vercel + Render + Neon.tech)
8. Implementação de cadastro a partir de alguma plataforma (Google, GitHub, etc)
9. IA como serviço

---

## Tecnologias Utilizadas

- **Frontend:** React.js (HTML, CSS, JavaScript)  
- **Backend:** Python (Flask) + PostgreSQL  
- **Hospedagem:**  
  - Frontend: Vercel  
  - Backend: Render  
  - Banco de Dados: Neon.tech  

---
## Melhorias do trabalho III
- Atualizar a lista de folders ao criar um novo
- Implementar um spinner ao carregar a página

---

## Repositório FrontEnd

- Optamos por separar o front e o back em diferentes repositórios a fim de facilitar o deploy do projeto. 
- Repositório do [FrontEnd](https://github.com/iamvitoria/Front-Bookmark.git)

---
## Para rodar localmente 

**Backend**
- ls
- cd backend
- python3 -m venv venv
- venv\Scripts\activate
- pip install -r requirements.txt
- flas run

**Frontend**
- cd frontend
- npm install
- npm start
