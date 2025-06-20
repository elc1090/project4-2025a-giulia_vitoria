from flask import Flask, redirect, url_for, session, request, jsonify
from flask_dance.contrib.github import make_github_blueprint, github
from flask_cors import CORS
from db import get_connection
from dotenv import load_dotenv
from urllib.parse import urlencode
import os
import re
import bcrypt
import cohere
from functools import wraps

load_dotenv()
print("[DEBUG] CHAVE =", os.getenv("COHERE_API_KEY"))

app = Flask(__name__)
app.secret_key = "dev"

co = cohere.Client(os.getenv("COHERE_API_KEY"))

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

CORS(app, supports_credentials=True, resources={r"/*": {"origins": FRONTEND_URL}})

github_bp = make_github_blueprint(
    client_id=os.environ.get("GITHUB_CLIENT_ID"),
    client_secret=os.environ.get("GITHUB_CLIENT_SECRET"),
)
app.register_blueprint(github_bp, url_prefix="/login")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route("/github")
def github_login():
    if not github.authorized:
        return redirect(url_for("github.login"))

    resp = github.get("/user")
    if not resp.ok:
        return jsonify(error="Falha ao obter dados do GitHub"), 500

    github_info = resp.json()
    username = github_info["login"]

    user_id = find_or_create_github_user(username)
    session["github_user"] = username
    session["user_id"] = user_id

    query = urlencode({"username": username, "user_id": user_id})
    return redirect(f"{FRONTEND_URL}/dashboard?{query}")

def find_or_create_github_user(username):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    user = cur.fetchone()
    if user:
        cur.close()
        conn.close()
        return user[0]
    cur.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
        (username, f"{username}@github.com", ""),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return new_id

@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"msg": "Logout efetuado"})

@app.route("/bem-vindo")
@login_required
def bem_vindo():
    return f"<h1>Olá, {session.get('github_user', 'usuário')}! Login com GitHub feito com sucesso.</h1>"

@app.route('/folders', methods=['OPTIONS'])
@app.route('/bookmarks', methods=['OPTIONS'])
def options():
    return '', 204

@app.route("/test-db")
def test_db():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"status": "Conexão bem-sucedida", "resultado": result})
    except Exception as e:
        return jsonify({"status": "Erro na conexão", "erro": str(e)}), 500

def create_user(username, email, password):
    conn = get_connection()
    if not conn:
        return False, "Erro na conexão com o banco"

    try:
        cur = conn.cursor()
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

        cur.execute("""
            INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)
        """, (username, email, hashed_password.decode('utf-8')))
        conn.commit()
        cur.close()
        return True, "Usuário criado com sucesso"
    except Exception as e:
        conn.rollback()
        return False, str(e)
    finally:
        conn.close()

@app.route("/usuarios", methods=["POST"])
def cadastrar_usuario():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"erro": "Dados incompletos"}), 400

    success, msg = create_user(username, email, password)

    if success:
        return jsonify({"msg": msg}), 201
    else:
        return jsonify({"erro": msg}), 400

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, email, password_hash FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if user is None:
        return jsonify({"erro": "Usuário não encontrado"}), 401
    stored_hash = user[3]
    if stored_hash and bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
        session["user_id"] = user[0]
        session["username"] = user[1]
        return jsonify({
            "msg": "Login bem-sucedido",
            "user_id": user[0],
            "username": user[1]
        })
    return jsonify({"erro": "Credenciais inválidas"}), 401

@app.route("/bookmarks", methods=["GET"])
def listar_bookmarks():
    user_id = request.args.get("user_id")
    folder_id = request.args.get("folder_id")

    if not user_id:
        return jsonify({"erro": "user_id não fornecido"}), 400

    conn = get_connection()
    cur = conn.cursor()

    if folder_id:
        cur.execute(
            "SELECT id, titulo, url, descricao, criado_em FROM bookmarks WHERE user_id = %s AND folder_id = %s ORDER BY criado_em DESC",
            (user_id, folder_id)
        )
    else:
        cur.execute(
            "SELECT id, titulo, url, descricao, criado_em FROM bookmarks WHERE user_id = %s ORDER BY criado_em DESC",
            (user_id,)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    bookmarks = [
        {"id": r[0], "titulo": r[1], "url": r[2], "descricao": r[3], "criado_em": r[4].isoformat()}
        for r in rows
    ]
    return jsonify(bookmarks)

@app.route("/suggest_bookmark", methods=["POST"])
def suggest_bookmark():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"erro": "user_id não fornecido"}), 400

        # Buscar descrições
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT descricao FROM bookmarks WHERE user_id = %s AND descricao IS NOT NULL", (user_id,))
        descricoes = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()

        if not descricoes:
            return jsonify({"erro": "Nenhuma descrição encontrada"}), 400

        # Prompt direto
        prompt = (
            "Based on the following bookmark descriptions, generate only **one** new related bookmark "
            "and return it in this exact format:\n"
            "Title;URL;Description (in a single line, separated by semicolons)\n\n"
            "Example:\nAmazon;https://www.amazon.com;E-commerce\n\n"
            "⚠️ Output only one line in that format. Do not add explanations, extra text, or repeat the input.\n\n"
            + "\n".join(f"- {desc}" for desc in descricoes)
        )



        # Geração da resposta
        response = co.generate(prompt=prompt, max_tokens=100, model="command-r-plus")
        texto = response.generations[0].text.strip()
        print("[DEBUG] IA retorno:\n", texto)

        # Captura apenas a primeira linha que contém dois ';'
        linha_valida = next((l.strip() for l in texto.splitlines() if l.count(";") == 2), None)

        if not linha_valida:
            return jsonify({"erro": "Formato da sugestão inválido"}), 500

        partes = linha_valida.split(";")
        titulo = partes[0].strip()
        url = partes[1].strip()
        descricao = partes[2].strip()


        # Inserção
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO bookmarks (user_id, titulo, url, descricao) VALUES (%s, %s, %s, %s) RETURNING id",
            (user_id, titulo, url, descricao)
        )
        novo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "id": novo_id,
            "title": titulo,
            "url": url,
            "description": descricao
        }), 201

    except Exception as e:
        print("[ERRO] Sugestão falhou:", e)
        return jsonify({"erro": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)