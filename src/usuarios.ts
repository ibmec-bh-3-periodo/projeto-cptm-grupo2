// usuarios.ts

export interface HistoricoItem {
    data: string;        // Data da transação
    descricao: string;   // Texto explicando o que aconteceu
    valor: number;       // Valor positivo (crédito) ou negativo (débito)
  }
  
  export interface Favorito {
    idEstacao: string;   // ID da estação favorita
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