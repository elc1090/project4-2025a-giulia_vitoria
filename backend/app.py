from flask import Flask, redirect, url_for, session, request, jsonify
from flask_dance.contrib.github import make_github_blueprint, github
from flask_cors import CORS
from db import get_connection
from dotenv import load_dotenv
from urllib.parse import urlencode
import os
import bcrypt
import cohere
from functools import wraps

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("COHERE_API_KEY")
print("[DEBUG] COHERE_API_KEY =", api_key)

co = cohere.Client(api_key)


FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

CORS(app, supports_credentials=True, resources={r"/*": {"origins": FRONTEND_URL}})

github_bp = make_github_blueprint(
    client_id=os.environ.get("GITHUB_CLIENT_ID"),
    client_secret=os.environ.get("GITHUB_CLIENT_SECRET"),
)
app.register_blueprint(github_bp, url_prefix="/login")

co = cohere.Client("apikey")

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
    # Insere usuário GitHub com email fake e senha vazia
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
    pass

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
    pass

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

@app.route('/bookmarks', methods=['POST'])
def criar_bookmark():
    data = request.json
    titulo = data.get('titulo')
    url = data.get('url')
    descricao = data.get('descricao')
    user_id = data.get('user_id')
    folder_id = data.get('folder_id')

    if not titulo or not url or not user_id:
        return jsonify({'erro': 'Campos obrigatórios faltando'}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute('''
        INSERT INTO bookmarks (user_id, folder_id, titulo, url, descricao)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    ''', (user_id, folder_id, titulo, url, descricao))

    novo_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        'id': novo_id,
        'titulo': titulo,
        'url': url,
        'descricao': descricao,
        'folder_id': folder_id  
    }), 201

@app.route("/bookmarks/<int:id>", methods=["PUT"])
def atualizar_bookmark(id):
    data = request.get_json()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE bookmarks SET titulo = %s, url = %s, descricao = %s WHERE id = %s",
        (data["titulo"], data["url"], data.get("descricao"), id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"msg": "Atualizado com sucesso"})

@app.route("/bookmarks/<int:id>", methods=["DELETE"])
def deletar_bookmark(id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM bookmarks WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"msg": "Deletado com sucesso"})

@app.route('/folders', methods=['GET'])

def listar_folders():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'erro': 'user_id não fornecido'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, name FROM folders WHERE user_id = %s', (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    folders = [{'id': r[0], 'name': r[1]} for r in rows]

    return jsonify(folders)

@app.route('/folders', methods=['POST'])
def criar_folder():
    data = request.get_json()
    name = data.get('name')
    user_id = data.get('user_id')

    if not name or not user_id:
        return jsonify({'erro': 'Campos obrigatórios faltando'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO folders (user_id, name) VALUES (%s, %s) RETURNING id', (user_id, name))
    novo_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'id': novo_id}), 201

@app.route('/folders/<int:folder_id>', methods=['PUT'])
def atualizar_pasta(folder_id):
    data = request.get_json()
    novo_nome = data.get('name')
    if not novo_nome:
        return jsonify({'erro': 'Nome é obrigatório'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE folders SET name = %s WHERE id = %s", (novo_nome, folder_id))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'msg': 'Pasta atualizada com sucesso'})

@app.route('/folders/<int:folder_id>', methods=['DELETE'])
def deletar_pasta(folder_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM folders WHERE id = %s", (folder_id,))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'msg': 'Pasta deletada com sucesso'})

@app.route("/suggest_bookmark", methods=["POST"])
def suggest_bookmark():
    try:
        data = request.json
        descricao = data.get("descricao", [])
        if not descricao:
            return jsonify({"erro": "Nenhuma descrição fornecida"}), 400

        prompt = (
            "Com base nas seguintes descrições de favoritos:\n"
            + "\n".join(f"- {desc}" for desc in descricao)
            + "\nSugira um novo favorito relacionado, incluindo título e URL fictício:"
        )

        response = co.generate(
            prompt=prompt,
            max_tokens=100
        )

        suggestion = response.generations[0].text.strip()
        return jsonify({"suggestion": suggestion})

    except Exception as e:
        print("[ERRO] Sugestão falhou:", e)
        return jsonify({"erro": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
