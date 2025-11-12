import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import henriqueRoutes from "./henrique.js";

const server = express();
server.use(express.json());
server.use(cors());
server.use(express.urlencoded({ extended: true }));

// Caminho raiz do projeto
const ROOT = path.resolve(__dirname, "..");

// Servir os arquivos estáticos (HTML, CSS, JS, imagens, etc.)
server.use(express.static(ROOT));

// Importa rotas adicionais (se houver)
server.use("/", henriqueRoutes);

// ---------------------- INTERFACES ----------------------
export interface HistoricoItem {
  data: string;
  descricao: string;
  valor: number;
}

export interface Favorito {
  idEstacao: number;
  nome: string;
  linha: string;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  password: string;
  saldo: number;
  historico: HistoricoItem[];
  favoritos: Favorito[];
}

// ---------------------- UTILITÁRIOS ----------------------
const usuariosFilePath = path.join(__dirname, "usuarios.json");

function carregarUsuarios() {
  try {
    const data = fs.readFileSync(usuariosFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao ler usuarios.json:", error);
    return [];
  }
}

function salvarUsuarios(usuarios: any) {
  try {
    fs.writeFileSync(usuariosFilePath, JSON.stringify(usuarios, null, 2));
  } catch (error) {
    console.error("Erro ao salvar usuarios.json:", error);
  }
}

// ---------------------- ROTAS ----------------------

// Rota para redirecionar para o WhatsApp
const WHATSAPP_NUMBER = "5511997677030";

server.get("/fale-conosco", (req: Request, res: Response) => {
    const mensagem = encodeURIComponent("Olá! Gostaria de saber mais sobre os serviços.");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
    res.redirect(url);
});

// Página inicial (index.html)
server.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// Login
server.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Informe username e password." });
  }

  const usuarios = carregarUsuarios();
  const usuarioEncontrado = usuarios.find(
    (u: any) =>
      (u.username === username || u.email === username) &&
      u.password === password
  );

  if (usuarioEncontrado) {
    console.log("✅ Login bem-sucedido:", username);
    return res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: {
        id: usuarioEncontrado.id,
        username: usuarioEncontrado.username,
        email: usuarioEncontrado.email,
        saldo: usuarioEncontrado.saldo,
      },
    });
  } else {
    console.warn("❌ Falha no login:", username);
    return res.status(401).json({ message: "Usuário ou senha incorretos." });
  }
});

// Atualiza saldo após compra
server.put("/tela-saldo", (req: Request, res: Response) => {
  const { userId, valorPassagem } = req.body;

  if (!userId || !valorPassagem) {
    return res.status(400).json({ message: "Informe userId e valorPassagem." });
  }

  const usuarios = carregarUsuarios();
  const usuario = usuarios.find((u: any) => u.id === userId);

  if (!usuario) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  if (usuario.saldo < valorPassagem) {
    return res.status(400).json({ message: "Saldo insuficiente para gerar bilhete." });
  }

  usuario.saldo -= valorPassagem;
  usuario.historico.push({
    data: new Date().toISOString(),
    descricao: "Compra de bilhete",
    valor: -valorPassagem,
  });

  salvarUsuarios(usuarios);

  return res.status(200).json({
    message: "Bilhete gerado com sucesso!",
    novoSaldo: usuario.saldo,
  });
});

// Cadastro de usuários
server.post("/usuarios", (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "nome, email e senha são obrigatórios." });
  }

  const usuarios = carregarUsuarios();
  const existe = usuarios.some(
    (u: any) => u.email === email || u.username === nome
  );

  if (existe) {
    return res.status(409).json({ erro: "email ou username já cadastrado." });
  }

  const proximoId =
    usuarios.length === 0 ? 1 : Math.max(...usuarios.map((u: any) => u.id)) + 1;

  const novoUsuario = {
    id: proximoId,
    username: nome,
    email,
    password: senha,
    saldo: 0,
    historico: [],
    favoritos: [],
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  return res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
});

// ✅ Retorna um usuário pelo ID (para a tela-saldo carregar)
server.get("/usuarios/:id", (req, res) => {
  const usuarios = carregarUsuarios();
  const id = Number(req.params.id);
  const usuario = usuarios.find((u: any) => u.id === id);
  if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
  return res.json(usuario);
});

// ✅ Atualiza o saldo do usuário (quando clica em "Adicionar saldo")
server.put("/usuarios/:id/saldo", (req, res) => {
  const id = Number(req.params.id);
  const { valor } = req.body;

  if (!valor || valor <= 0) {
    return res.status(400).json({ message: "Valor inválido." });
  }

  const usuarios = carregarUsuarios();
  const usuario = usuarios.find((u: any) => u.id === id);
  if (!usuario) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  usuario.saldo += Number(valor);
  usuario.historico.push({
    data: new Date().toISOString(),
    descricao: "Adição de saldo",
    valor: Number(valor),
  });

  salvarUsuarios(usuarios);
  return res.status(200).json({ message: "Saldo atualizado!", saldoAtual: usuario.saldo });
});

server.get("/usuarios/:id", (req, res) => {
  const usuarios = carregarUsuarios();
  const id = Number(req.params.id);
  const usuario = usuarios.find((u: any) => u.id === id);
  if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
  return res.json(usuario);
});
 // ---------------------- ROTA DE GERAÇÃO DE TRAJETO ----------------------
import estacoes from "./estacoes.json" with { type: "json" };;

// Função para normalizar texto (sem acento e minúsculo)
function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Algoritmo simples de busca (BFS) para encontrar o caminho entre duas estações
function buscarCaminho(origemId: string, destinoId: string) {
  const visitados = new Set<string>();
  const fila: string[][] = [[origemId]];

  while (fila.length > 0) {
    const caminho = fila.shift()!;
    const ultima = caminho[caminho.length - 1];

    if (ultima === destinoId) return caminho;

    const estacaoAtual = estacoes.find(e => e.id === ultima);
    if (!estacaoAtual) continue;

    for (const vizinho of estacaoAtual.vizinhos) {
      if (!visitados.has(vizinho)) {
        visitados.add(vizinho);
        fila.push([...caminho, vizinho]);
      }
    }
  }

  return null;
}

// Endpoint para gerar rota
server.get("/rota", (req: Request, res: Response) => {
  const origemNome = req.query.orig as string;
  const destinoNome = req.query.dest as string;

  if (!origemNome || !destinoNome) {
    return res.status(400).json({ erro: "Parâmetros orig e dest são obrigatórios" });
  }

  const origemEstacao = estacoes.find(
    e => normalizarTexto(e.nome) === normalizarTexto(origemNome) || e.id === origemNome
  );
  const destinoEstacao = estacoes.find(
    e => normalizarTexto(e.nome) === normalizarTexto(destinoNome) || e.id === destinoNome
  );

  if (!origemEstacao || !destinoEstacao) {
    return res.status(404).json({ erro: "Estação de origem ou destino não encontrada" });
  }

  const caminhoIds = buscarCaminho(origemEstacao.id, destinoEstacao.id);
  if (!caminhoIds) {
    return res.status(404).json({ erro: "Nenhum trajeto encontrado" });
  }

  // monta array com coordenadas para o mapa
  const trajeto = caminhoIds
    .map(id => estacoes.find(e => e.id === id))
    .filter(Boolean)
    .map(e => ({ id: e!.id, nome: e!.nome, lat: e!.lat, lng: e!.lng }));

  return res.json({
    origem: origemEstacao.nome,
    destino: destinoEstacao.nome,
    total_estacoes: trajeto.length,
    trajeto
  });
});


// ---------------------- INICIAR SERVIDOR ----------------------
const PORT = 5501;
server.listen(PORT, () => {
  console.log(`🚆 Servidor rodando em http://localhost:${PORT}`);
});
