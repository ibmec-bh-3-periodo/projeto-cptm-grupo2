// Mostrar/ocultar saldo
const valorSaldo = document.getElementById('valor-saldo');
const iconeOlho = document.getElementById('icone-olho');
const toggleBtn = document.getElementById('toggle-saldo');
const linkSaldo = document.getElementById('link-saldo');

let saldoVisivel = true;

toggleBtn.addEventListener('click', (event) => {
  event.stopPropagation(); // impede o clique de subir para o <section>
  saldoVisivel = !saldoVisivel;
  valorSaldo.textContent = saldoVisivel ? 'R$ 14,70' : '••••';
  iconeOlho.src = saldoVisivel ? 'assets/img/eye-off.svg' : 'assets/img/eye.svg';
});

// Tornar a section inteira um link
linkSaldo.addEventListener('click', () => {
  window.location.href = "tela-saldo.html";
});

// Mensagem de boas-vindas
let boasVindas = document.getElementsByClassName("boas-vindas")[0];
let nomeArmazenado = localStorage.getItem("nomePessoa");
boasVindas.innerText = `Para onde, ${nomeArmazenado}?`;

const mapa = document.getElementById("mapaHome");
const transicao = document.getElementById("mapa-transicao");

mapa.addEventListener("click", () => {
  transicao.style.opacity = "1";
  transicao.style.transform = "scale(1)";
  
  setTimeout(() => {
    window.location.href = "mapa.html";
  }, 850);
});

function abrirFaleConosco() {
  const url = "http://localhost:5001/fale-conosco";
  window.open(url, "_blank");
}