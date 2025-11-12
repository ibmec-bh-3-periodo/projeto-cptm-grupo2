import express, { Request, Response } from "express";
import { Usuario } from "./usuarios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Caminho absoluto para o arquivo JSON (garante que funciona em qualquer ambiente)
const caminhoUsuarios = path.join(__dirname, "usuarios.json");

// Função para carregar usuários
const carregarUsuarios = (): Usuario[] => {
  const data = fs.readFileSync(caminhoUsuarios, "utf-8");
  return JSON.parse(data);
};

// Função para salvar usuários
const salvarUsuarios = (usuarios: Usuario[]) => {
  fs.writeFileSync(caminhoUsuarios, JSON.stringify(usuarios, null, 2));
};

// 🔹 GET - Buscar dados de um usuário específico
router.get("/usuarios/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ erro: "ID inválido" });
  }

  const usuarios = carregarUsuarios();
  const usuario = usuarios.find(u => u.id === id);

  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  res.json(usuario);
});

// 🔹 PUT - Adicionar saldo a um usuário
router.put("/usuarios/:id/saldo", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { valor } = req.body;

  if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });
  if (typeof valor !== "number" || valor <= 0)
    return res.status(400).json({ erro: "O valor deve ser um número positivo" });

  const usuarios = carregarUsuarios();
  const usuario = usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

  usuario.saldo += valor;
  usuario.historico.push({
    data: new Date().toISOString(),
    descricao: `Recarga de saldo (+R$ ${valor.toFixed(2)})`,
    valor
  });

  salvarUsuarios(usuarios);

  res.json({
    mensagem: "Saldo adicionado com sucesso!",
    saldoAtual: usuario.saldo,
    historico: usuario.historico
  });
});

export default router;