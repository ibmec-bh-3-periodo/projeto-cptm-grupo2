import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const server = express();
server.use(express.json());

interface historico {
  data: Date;
  descricao: string;
  valor: number;
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

let usuarios: Login[] = [];
server.get("/proximoId", (req, res) => {
  if (usuarios.length === 0) {
    return res.json({ proximoId: 1 });
  }

  const ultimoUsuario = usuarios[usuarios.length - 1];
  const proximoId = ultimoUsuario.id + 1;

  return res.json({ proximoId });
});

server.post("/usuarios", (req, res) => {
  const { nome, email, senha } = req.body;

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

  const jaExiste = usuarios.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (jaExiste) {
    return res.status(409).json({ erro: "email já cadastrado." });
  }

  const ultimoUsuario = usuarios[usuarios.length - 1];
  const proximoId = ultimoUsuario ? ultimoUsuario.id + 1 : 1;

  const novoUsuario = { id: proximoId, nome, email, senha };
  usuarios.push(novoUsuario);

  const { senha: _omit, ...usuarioSemSenha } = novoUsuario;
  return res.status(201).json(usuarioSemSenha);
});

server.listen(3000);
