import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import henriqueRoutes from "./henrique";

const server = express();
server.use(express.json());
server.use(cors());
server.use("/", henriqueRoutes);

const ROOT = path.resolve(__dirname, ".."); // sobe 1 nível: do src/ para a raiz

// aceitar submit de <form> tradicional também
server.use(express.urlencoded({ extended: true }));

// tudo que está na raiz (index.html, cadastro.html, assets/...)
server.use(express.static(ROOT));

// página inicial = index.html da raiz
server.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

export interface HistoricoItem {
  data: string;        // Data da transação
  descricao: string;   // Texto explicando o que aconteceu
  valor: number;       // Valor positivo (crédito) ou negativo (débito)
}

export interface Favorito {
  idEstacao: number;   // ID da estação favorita
  nome: string;        // Nome da estação
  linha: string;       // Linha correspondente
}

export interface Usuario {
  id: number;                  // ID do usuário
  username: string;            // Nome de login
  email: string;               // E-mail do usuário
  password: string;            // Senha (ou hash)
  saldo: number;               // Saldo atual
  historico: HistoricoItem[];  // Transações
  favoritos: Favorito[];       // Estações favoritas
}

interface Login {
  id: number;
  nome: string;
  email: string;
  senha: string;
}

interface Estacao {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  vizinhos: string[];
}

const WHATSAPP_NUMBER = "5511997677030";

server.get("/fale-conosco", (req: Request, res: Response) => {
    const mensagem = encodeURIComponent("Olá! Gostaria de saber mais sobre os serviços.");
    const url = `https://wa.me/${5511997677030}?text=${mensagem}`;
    res.redirect(url);
});

const estacoesPath = path.join(__dirname, "estacoes.json");
const estacoes: Estacao[] = JSON.parse(fs.readFileSync(estacoesPath, "utf-8"));

//Servir o frontend (index.html, CSS, JS)
server.use(express.static(path.join(__dirname, "."))); // raiz do projeto

// ---------------- ROTAS EXISTENTES ----------------
function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buscarCaminho(origemId: string, destinoId: string): Estacao[] | null {
  const fila: string[][] = [[origemId]];
  const visitados = new Set<string>();

  while (fila.length > 0) {
    const caminho = fila.shift()!;
    const atual = caminho[caminho.length - 1];
    if (atual === destinoId) return caminho.map(id => estacoes.find(e => e.id === id)!);

    if (!visitados.has(atual)) {
      visitados.add(atual);
      const estacaoAtual = estacoes.find(e => e.id === atual);
      if (estacaoAtual) {
        for (const viz of estacaoAtual.vizinhos)
          if (!visitados.has(viz)) fila.push([...caminho, viz]);
      }
    }
  }
  return null;
}

server.get("/rota", (req: Request, res: Response) => {
  const origemNome = req.query.orig as string;
  const destinoNome = req.query.dest as string;

  if (!origemNome || !destinoNome)
    return res.status(400).json({ erro: "Parâmetros orig e dest são obrigatórios" });

  const origemEstacao = estacoes.find(
    e => normalizarTexto(e.nome) === normalizarTexto(origemNome) || e.id === origemNome
  );
  const destinoEstacao = estacoes.find(
    e => normalizarTexto(e.nome) === normalizarTexto(destinoNome) || e.id === destinoNome
  );

  if (!origemEstacao || !destinoEstacao)
    return res.status(404).json({ erro: "Estação de origem ou destino não encontrada" });

  const caminho = buscarCaminho(origemEstacao.id, destinoEstacao.id);
  if (!caminho) return res.status(404).json({ erro: "Nenhum trajeto encontrado" });

  res.json({
    origem: origemEstacao.nome,
    destino: destinoEstacao.nome,
    total_estacoes: caminho.length,
    trajeto: caminho
  });
});

//Garante que o index.html seja entregue no acesso raiz
server.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, ".." , "mapa.html"));
});

// Caminho absoluto para o arquivo usuarios.json
const usuariosFilePath = path.join(__dirname, 'usuarios.json');

// Função auxiliar para ler os usuários do arquivo
function carregarUsuarios() {
  try {
    const data = fs.readFileSync(usuariosFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler usuarios.json:', error);
    return [];
  }
}

// Função auxiliar para salvar os usuários de volta no arquivo
function salvarUsuarios(usuarios: any) {
  try {
    fs.writeFileSync(usuariosFilePath, JSON.stringify(usuarios, null, 2));
  } catch (error) {
    console.error('Erro ao salvar usuarios.json:', error);
  }
}

/**
 * ROTA POST /login
 * Autentica o usuário com base no arquivo usuarios.json
 */
server.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Informe username e password.' });
  }

  const usuarios = carregarUsuarios();

  // Procura usuário com o username e senha informados
  const usuarioEncontrado = usuarios.find(
    (u: any) => u.username === username && u.password === password
  );

  if (usuarioEncontrado) {
    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      usuario: {
        id: usuarioEncontrado.id,
        username: usuarioEncontrado.username,
        email: usuarioEncontrado.email,
        saldo: usuarioEncontrado.saldo,
      },
    });
  } else {
    return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
  }
});

/**
 * ROTA PUT /tela-saldo
 * - Recebe o userId e o valor da passagem
 * - Subtrai do saldo atual
 * - Atualiza o arquivo usuarios.json
 * - Retorna o novo saldo
 */

// pra isso tudo funcionar, talvez tenhamos que adicionar um valor pra cada passagem, mas nao tenho certeza
server.put('/tela-saldo', (req: Request, res: Response) => {
  const { userId, valorPassagem } = req.body;

  if (!userId || !valorPassagem) {
    return res.status(400).json({ message: 'Informe userId e valorPassagem.' });
  }

  const usuarios = carregarUsuarios();
  const usuario = usuarios.find((u: any) => u.id === userId);

  if (!usuario) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (usuario.saldo < valorPassagem) {
    return res.status(400).json({ message: 'Saldo insuficiente para gerar bilhete.' });
  }

  // Subtrai o valor da passagem
  usuario.saldo -= valorPassagem;

  // Adiciona uma entrada no histórico
  usuario.historico.push({
    data: new Date().toISOString(),
    descricao: 'Compra de bilhete',
    valor: -valorPassagem,
  });

  // Salva de volta no arquivo
  salvarUsuarios(usuarios);

  return res.status(200).json({
    message: 'Bilhete gerado com sucesso!',
    novoSaldo: usuario.saldo,
  });
});

server.get("/proximoId", (_req, res) => {
  const usuarios = carregarUsuarios(); // <- do arquivo
  const proximoId =
    usuarios.length === 0 ? 1 : Math.max(...usuarios.map((u: any) => Number(u.id) || 0)) + 1;

  return res.json({ proximoId });
});

server.post("/usuarios", (req, res) => {
  const { nome, email, senha } = req.body as { nome?: string; email?: string; senha?: string };

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "nome, email e senha são obrigatórios." });
  }

  const emailOk = typeof email === "string" && email.includes("@") && email.includes(".");
  if (!emailOk) {
    return res.status(400).json({ erro: "email inválido." });
  }

  if (String(senha).length < 6) {
    return res.status(400).json({ erro: "senha deve ter pelo menos 6 caracteres." });
  }

  // carrega do ARQUIVO
  const usuarios = carregarUsuarios();

  // checa duplicidade por email OU username (que será o 'nome')
  const jaExiste = usuarios.some(
    (u: any) =>
      (u.email && String(u.email).toLowerCase() === email.toLowerCase()) ||
      (u.username && String(u.username).toLowerCase() === nome.toLowerCase())
  );
  if (jaExiste) {
    return res.status(409).json({ erro: "email ou username já cadastrado." });
  }

  // calcula próximo id com segurança
  const proximoId =
    usuarios.length === 0 ? 1 : Math.max(...usuarios.map((u: any) => Number(u.id) || 0)) + 1;

  // monta o registro no formato esperado pelo /login
  const novoUsuario = {
    id: proximoId,
    username: nome,
    email,
    password: senha,
    saldo: 0,
    historico: [] as Array<{ data: string; descricao: string; valor: number }>,
    favoritos: [] as Array<{ idEstacao: number; nome: string; linha: string }>,
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  // nunca devolva senha
  const { password: _omit, ...usuarioSemSenha } = novoUsuario;
  return res.status(201).json(usuarioSemSenha);
});

server.listen(3000);
