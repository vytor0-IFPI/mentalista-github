// Camada de dados local (browser): persistência via localStorage.
// Roda inteiramente no lado do cliente (GitHub Pages / estático), com o
// mesmo modelo/semente dos outros projetos.
import bcrypt from "bcryptjs";
import seedData from "./data/seed-data.json" with { type: "json" };
import seedExtra from "./data/seed-extra.json" with { type: "json" };

const randomUUID = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export const COLLECTIONS = [
  "users",
  "courses",
  "modules",
  "lessons",
  "quizQuestions",
  "enrollments",
  "progress",
  "notes",
  "resources",
  "achievements",
  "userAchievements",
  "reviews",
  "cards",
];

const DATE_FIELDS = {
  users: ["createdAt", "firstLoginAt", "lastLoginAt", "welcomeSentAt", "completedCourseAt"],
  courses: ["createdAt"],
  enrollments: ["createdAt", "completedAt"],
  progress: ["completedAt"],
  reviews: ["nextReviewAt", "lastReviewedAt"],
  userAchievements: ["grantedAt"],
  notes: ["updatedAt"],
};

const PREFIX = "mjdb:";
const mem = {};

function storage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

let backend = null;
function getBackend() {
  if (backend) return backend;
  backend = {
    blobs: false,
    async read(col) {
      if (col in mem) return mem[col];
      const ls = storage();
      try {
        const raw = ls ? ls.getItem(PREFIX + col) : null;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        mem[col] = parsed;
        return parsed;
      } catch {
        return null;
      }
    },
    async write(col, obj) {
      mem[col] = obj;
      const ls = storage();
      if (ls) {
        try {
          ls.setItem(PREFIX + col, JSON.stringify(obj));
        } catch {
          /* quota/privado */
        }
      }
    },
  };
  return backend;
}

function revive(col, rows) {
  const fields = DATE_FIELDS[col];
  if (!fields || !Array.isArray(rows)) return rows;
  return rows.map((r) => {
    if (!r) return r;
    const d = { ...r };
    for (const f of fields) {
      if (typeof d[f] === "string") {
        const t = new Date(d[f]).getTime();
        if (!Number.isNaN(t)) d[f] = new Date(d[f]);
      }
    }
    return d;
  });
}

async function loadRaw(col) {
  const b = getBackend();
  const v = await b.read(col);
  if (v == null) return [];
  return revive(col, v);
}

async function saveRaw(col, rows) {
  await getBackend().write(col, rows);
}

const queues = {};
function enqueue(col, fn) {
  const prev = queues[col] || Promise.resolve();
  const run = prev.then(fn, fn);
  queues[col] = run.catch(() => null);
  return run;
}

function stripUndefined(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

function cloneDeep(v) {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(cloneDeep);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = cloneDeep(v[k]);
    return o;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Operações internas (sem garantir seed — usadas pelo próprio seed)
// ---------------------------------------------------------------------------
function _createAll(col, items) {
  return enqueue(col, async () => {
    const rows = await loadRaw(col);
    const added = [];
    for (const item of items) {
      const rec = { id: item.id || randomUUID(), ...stripUndefined(item) };
      rows.push(rec);
      added.push(rec);
    }
    await saveRaw(col, rows);
    return added;
  });
}

async function _clear(col) {
  return enqueue(col, async () => {
    await saveRaw(col, []);
    return [];
  });
}

// ---------------------------------------------------------------------------
// API pública usada pelas funções
// ---------------------------------------------------------------------------
let readyPromise = null;
let seedingPromise = null;

export function ensureReady() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init() {
  const rows = await loadRaw("courses");
  if (rows && rows.length) return;
  if (!seedingPromise) {
    seedingPromise = runSeed()
      .catch((e) => {
        seedingPromise = null;
        throw e;
      })
      .then(() => null);
  }
  await seedingPromise;
  if (getBackend().blobs) await waitForSeedVisible();
}

async function waitForSeedVisible() {
  const b = getBackend();
  for (let i = 0; i < 12; i++) {
    const v = await b.read("courses");
    if (v && v.length) return;
    await new Promise((r) => setTimeout(r, 700));
  }
}

export async function all(col) {
  await ensureReady();
  return cloneDeep(await loadRaw(col));
}

export async function getById(col, id) {
  const rows = await all(col);
  return rows.find((r) => r.id === id) || null;
}

export async function findOne(col, pred) {
  const rows = await all(col);
  return rows.find(pred) || null;
}

export async function filter(col, pred) {
  const rows = await all(col);
  return rows.filter(pred);
}

export async function count(col, pred) {
  const rows = await all(col);
  return pred ? rows.filter(pred).length : rows.length;
}

export async function create(col, data) {
  await ensureReady();
  const [rec] = await _createAll(col, [data]);
  return cloneDeep(rec);
}

export async function createMany(col, items, uniques = null) {
  await ensureReady();
  return enqueue(col, async () => {
    const rows = await loadRaw(col);
    const added = [];
    for (const item of items) {
      if (uniques && uniques.length) {
        const exists = rows.some((r) => uniques.every((k) => r[k] === item[k]));
        if (exists) continue;
      }
      const rec = { id: item.id || randomUUID(), ...stripUndefined(item) };
      rows.push(rec);
      added.push(rec);
    }
    await saveRaw(col, rows);
    return cloneDeep(added);
  });
}

export async function update(col, id, patch) {
  const rows = await all(col);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const merged = { ...rows[idx], ...stripUndefined(patch) };
  await saveRaw(col, rows.map((r, i) => (i === idx ? merged : r)));
  return cloneDeep(merged);
}

export async function updateOne(col, pred, patch) {
  const rows = await loadRaw(col);
  const idx = rows.findIndex(pred);
  if (idx === -1) return null;
  const merged = { ...rows[idx], ...stripUndefined(patch) };
  rows[idx] = merged;
  await saveRaw(col, rows);
  return cloneDeep(merged);
}

export async function updateMany(col, pred, patch) {
  const rows = await loadRaw(col);
  let changed = 0;
  for (let i = 0; i < rows.length; i++) {
    if (pred(rows[i])) {
      rows[i] = { ...rows[i], ...stripUndefined(patch) };
      changed += 1;
    }
  }
  if (changed) await saveRaw(col, rows);
  return changed;
}

export async function upsert(col, pred, createData, updateData) {
  const existing = await findOne(col, pred);
  if (existing) return update(col, existing.id, updateData);
  return create(col, createData);
}

export async function removeOne(col, pred) {
  const rows = await loadRaw(col);
  const idx = rows.findIndex(pred);
  if (idx === -1) return null;
  const removed = rows[idx];
  rows.splice(idx, 1);
  await saveRaw(col, rows);
  return cloneDeep(removed);
}

export async function removeMany(col, pred) {
  const rows = await loadRaw(col);
  const kept = rows.filter((r) => !pred(r));
  if (kept.length !== rows.length) await saveRaw(col, kept);
  return rows.length - kept.length;
}

export function uid() {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
const QUIZ_BANK = {
  "capitulo-01": [
    { question: "Na série, Patrick Jane parecia ler mentes. Qual é a explicação real?", options: ["Hipnose instantânea", "Observação de milhares de pistas cruzadas em segundos", "Ele era realmente vidente", "Telepatia com o culpado"], correctIndex: 1, explanation: "Jane usa observação treinada + psicologia — o guia traduz isso em técnicas verificáveis." },
    { question: "O que um leitor a frio real faz?", options: ["Advinha com 100% de certeza", "Trabalha com probabilidades, observação e calibração pela reação", "Usa poderes psíquicos", "Decora o perfil de todas as pessoas"], correctIndex: 1, explanation: "Ninguém adivinha com certeza; o poder está em calibrar rápido com o feedback da pessoa." },
    { question: "Qual compromisso ético acompanha estas técnicas?", options: ["Usar para vencer discussões sempre", "Nunca contar que são técnicas", "Usar com consentimento e para entender/ajudar", "Fingir que são poderes"], correctIndex: 2, explanation: "Técnica sem ética é fraude; com entendimento e cuidado, é ofício." },
  ],
  "capitulo-02": [
    { question: "O que significa \"no underdog\" para Jane?", options: ["Sempre ser o azarão", "Nunca se colocar em posição de fraqueza: entrar sem medo", "Apostar contra si mesmo", "Evitar confrontar pessoas"], correctIndex: 1, explanation: "Ele entra sem medo de perder, o que gera calma e controle." },
    { question: "Por que Jane parece \"inofensivo\"?", options: ["Porque é fraco", "Para as pessoas baixarem a guarda e entregarem informação", "Porque evita protagonismo na série", "Por timidez"], correctIndex: 1, explanation: "A fachada inofensiva é uma arma: ninguém o vê como ameaça." },
    { question: "Qual é o primeiro reflexo mental antes de uma conversa importante?", options: ["Planejar a resposta perfeita", "Repetir: \"eu não preciso dessa aprovação, estou aqui para observar\"", "Preparar uma piada", "Estudar o resumo da novela"], correctIndex: 1, explanation: "Acalma o sistema e alarga a atenção — base de tudo." },
  ],
  "capitulo-03": [
    { question: "Qual a diferença entre enxergar e observar?", options: ["Nenhuma", "Observar é varredura ativa, buscando e cruzando pistas", "Enxergar é mais rápido", "Observar é olhar por mais tempo"], correctIndex: 1, explanation: "Enxergar é passivo; observar é uma varredura consciente em camadas." },
    { question: "A \"regra dos 5 segundos\" consiste em:", options: ["Responder rápido a ataques", "Coletar dezenas de pistas varrendo rosto, roupas, mãos e calçado", "Pular conclusões rápido", "Correr pela sala"], correctIndex: 1, explanation: "É a varredura em camadas: rosto, pescoço, roupas, mãos, calçado, objetos." },
    { question: "Uma marca de sol no dedo anelar (sem anel) sugere:", options: ["Uso recente de aliança (separação, perda ou troca)", "Dermatite", "Ocupação manual", "Nada relevante"], correctIndex: 0, explanation: "A palidez no meio do dedo aponta um anel usado até pouco tempo." },
    { question: "Antes de \"saber\" algo de alguém, o ideal é juntar:", options: ["1 pista forte", "3+ pistas independentes para a mesma direção", "Qualquer palpite", "A opinião de um amigo"], correctIndex: 1, explanation: "Três pistas independentes reduzem o erro e dão confiança ao palpite." },
  ],
  "capitulo-04": [
    { question: "O efeito Forer/Barnum descreve:", options: ["Memória fotográfica", "Aceitação de descrições genéricas como \"feitas para mim\"", "O poder da intuição", "Dedução lógica"], correctIndex: 1, explanation: "Frases vagas e elogiosas parecem precisas para quase todo mundo." },
    { question: "O que é um \"boat statement\"?", options: ["Uma mentira elaborada", "Frase vaga que a pessoa ancora com os próprios detalhes", "Um chute certeiro", "Uma técnica de respiração"], correctIndex: 1, explanation: "Você lança o barco; a pessoa constrói o porto e entrega os detalhes." },
    { question: "O que fazer quando a pessoa corrige sua leitura (bait)?", options: ["Insistir no erro", "Usar a correção como informação de graça", "Pedir desculpas e desistir", "Mudar de assunto"], correctIndex: 1, explanation: "A correção revela o que importa — o \"erro\" é a técnica." },
    { question: "Quais são as 4 regras de ouro da leitura a frio?", options: ["Falar rápido, alto, direto e repetir", "Macro, dois caminhos, reação, positivo", "Adivinhar, gritar, insistir, vencer", "Perguntar, julgar, acusar, encerrar"], correctIndex: 1, explanation: "Comece macro, use dois caminhos, julgue pela reação e volte ao positivo." },
  ],
  "capitulo-05": [
    { question: "Um gesto isolado (ex. braços cruzados) prova algo?", options: ["Sim, sempre", "Não — só vale no conjunto e na mudança", "Prova mentira", "Prova frio na sala"], correctIndex: 1, explanation: "Gestos só importam em conjunto e no antes/depois de um tema." },
    { question: "O que são microexpressões?", options: ["Expressões exageradas", "Expressões faciais universais de frações de segundo", "Piscadas rápidas", "Sorrisos sociais"], correctIndex: 1, explanation: "Ekman mapeou 7 emoções básicas que aparecem por frações de segundo." },
    { question: "Qual zona de leitura é considerada a mais \"honesta\"?", options: ["O rosto", "Os pés", "As mãos", "O cabelo"], correctIndex: 1, explanation: "Os pés são pouco ensaiados e apontam o desejo real de sair ou ficar." },
    { question: "O sorriso genuíno (Duchenne) envolve:", options: ["Somente a boca", "Rugas nos cantos externos dos olhos + contorno dos olhos", "Sobrancelhas levantadas", "Nariz enrugado"], correctIndex: 1, explanation: "O olho participa: rugas nas laterais e formato do contorno dos olhos." },
  ],
  "capitulo-06": [
    { question: "O que é a \"baseline\"?", options: ["O tom de voz", "O comportamento normal da pessoa ao dizer a verdade", "Uma pergunta de controle", "O suspeito principal"], correctIndex: 1, explanation: "Sem baseline, todo julgamento de desvio é chute." },
    { question: "No teste do desvio, o objetivo é:", options: ["Aumentar a pressão", "Comparar o desconforto do tema vigiado com temas neutros", "Fazer a pessoa chorar", "Provar a mentira"], correctIndex: 1, explanation: "O estresse que some e volta marca os temas protegidos." },
    { question: "Por que o silêncio faz pessoas confessarem?", options: ["Porque são fracas", "Porque o vazio incomoda e elas preenchem com um detalhe extra", "Porque esquecem do assunto", "Porque perdem a paciência"], correctIndex: 1, explanation: "O vazio gera desconforto e o preenchimento extra entrega informação." },
  ],
  "capitulo-07": [
    { question: "O que é rapport?", options: ["Uma técnica de memória", "O clima de confiança e sintonia que favorece abertura", "Uma expressão facial", "Um tipo de perguntar"], correctIndex: 1, explanation: "Com rapport, a pessoa quer te ajudar a acertar." },
    { question: "O espelhamento consiste em:", options: ["Copiar tudo imediatamente", "Adotar discretamente postura, tom e ritmo do outro", "Falar com a mesma voz", "Gesticular igual o tempo todo"], correctIndex: 1, explanation: "Espelhe poucos traços, com atraso, e teste a liderança do vínculo." },
    { question: "Por que repetir as palavras exatas da pessoa funciona?", options: ["Porque isso mostra que você prestou atenção no mapa dela", "É técnica de leitura labial", "Porque ela repete de volta", "É pura educação"], correctIndex: 0, explanation: "O reflexo linguístico valida o mundo da pessoa e abre espaço." },
  ],
  "capitulo-08": [
    { question: "O palácio da memória usa:", options: ["Repetição exaustiva", "Associação de itens a lugares de um percurso conhecido", "Fotos com legendas", "Mapas impressos"], correctIndex: 1, explanation: "O método de locus liga cada item a um ponto fixo com imagem absurda." },
    { question: "Qual imagem memoriza melhor?", options: ["A comum e simples", "A absurda, exagerada e estranha", "A curta", "A número"], correctIndex: 1, explanation: "Nós lembramos do que é estranho, não do que é normal." },
    { question: "Para lembrar nomes, qual step é decisivo?", options: ["Aumentar o volume da voz", "Oferecer a repetição + ligar o nome a uma peculiaridade do rosto", "Usar sobrenome sempre", "Perguntar duas vezes"], correctIndex: 1, explanation: "Repetição, vínculo visual estranho e reforço espaçado." },
  ],
  "capitulo-09": [
    { question: "\"Transe conversacional\" significa:", options: ["Dormência", "Foco absorvido e concentração guiada", "Hipnose teatral", "Desmaio"], correctIndex: 1, explanation: "É aquele foco total de quem se perde num filme — a atenção fica lá dentro." },
    { question: "Uma pressuposição é:", options: ["Uma dúvida", "Afirmar algo como fato antes do pedido", "Uma pergunta retórica", "Um chute"], correctIndex: 1, explanation: "\"Quer contar agora ou prefere que eu descubra?\" — nas duas, a informação vem." },
    { question: "No \"yes-set\", o objetivo é:", options: ["Fazer a pessoa dizer não", "Encadear 3 afirmações inegáveis antes do pedido", "Falar mais alto", "Trocar de assunto"], correctIndex: 1, explanation: "Uma sequência de \"sims\" abre a porta para o próximo sim." },
  ],
  "capitulo-10": [
    { question: "Os 6 princípios de Cialdini adaptados incluem:", options: ["Reciprocidade, compromisso, prova social, autoridade, afinidade e escassez", "Medo, chu, dinheiro, logo, fama", "Poder, força, ruído, pressa", "Sorte, destino, mística, fé"], correctIndex: 0, explanation: "É o pacote clássico da influência, adaptado ao jogo do mentalista." },
    { question: "Por que dar antes de pedir funciona?", options: ["Porque a pessoa fica em dívida (reciprocidade)", "Porque esquece o pedido", "Por puro hábito", "Por ser educado"], correctIndex: 0, explanation: "O cérebro humano sente a dívida e tende a retribuir." },
    { question: "O que é enquadramento (framing)?", options: ["Uma moldura de foto", "A forma como você apresenta a mensagem muda a recepção", "Um termo de marketing digital", "Uma técnica de vídeo"], correctIndex: 1, explanation: "\"Me ajuda a fechar\" versus \"você precisa colaborar\": mesmo pedido, efeitos opostos." },
  ],
  "capitulo-11": [
    { question: "Na fase 1 do protocolo Jane (clima), a meta é:", options: ["Ameaçar sutilmente", "Transformar \"interrogado\" em \"convidado\"", "Falar sobre o clima", "Servir café"], correctIndex: 1, explanation: "O clima muda a régua da conversa: de julgamento para troca." },
    { question: "Perguntas abertas servem para:", options: ["Fazer a pessoa produzir conteúdo", "Confirmar ou negar", "Cortar assunto", "Testar atenção"], correctIndex: 0, explanation: "Abertas mapeiam; fechadas pinam. O ritmo das duas desmonta roteiros." },
    { question: "O \"silêncio que confessa\" funciona porque:", options: ["A pessoa tem medo", "O vazio incomoda e ela completa com um detalhe extra", "É falta de assunto", "O tempo passa devagar"], correctIndex: 1, explanation: "Quem quebra o silêncio primeiro perde; quem completa o vazio, entrega." },
  ],
  "capitulo-12": [
    { question: "Por que a calma é tática?", options: ["Porque ninguém gosta de gente nervosa", "Com o corpo lento, a atenção fica larga e você vê o cenário inteiro", "Porque dá tempo de fugir", "Por simpatia"], correctIndex: 1, explanation: "Acelerado = visão estreita; lento = visão ampla." },
    { question: "Qual respiração de resgate é sugerida?", options: ["Inspirar 4s, segurar 2s, soltar 6s", "Soltar tudo de uma vez", "Prender o ar", "Respirar rápido"], correctIndex: 0, explanation: "Aumenta o tempo expiratório e reduz o pulso." },
    { question: "O destacamento tático é:", options: ["Frieza extrema", "Observar a si mesmo como observaríamos os outros", "Ignorar emoções", "Maltratar a própria voz"], correctIndex: 1, explanation: "Nomeie o estado: \"estou ficando irritado\" reduz o poder dele." },
  ],
  "capitulo-13": [
    { question: "Para que servem as personas?", options: ["Para mentir", "Para controlar como você é visto e assim controlar o que lhe contam", "Para disfarçar crimes", "Para decorar"], correctIndex: 1, explanation: "Persona é selecionar e amplificar uma parte real sua — não inventar." },
    { question: "Qual persona \"abaixa a guarda\" das pessoas?", options: ["O especialista", "O inofensivo excêntrico", "O gerente", "O líder"], correctIndex: 1, explanation: "Parecer inofensivo faz as pessoas relaxarem e confiarem." },
    { question: "Quando a persona vira armadilha?", options: ["Quando é ensaiada com moderação", "Quando depende de mentiras sustentáveis e contradições", "Quando é usada no trabalho", "Quando é silenciosa"], correctIndex: 1, explanation: "Persona-fantasma: contradições e roteiro que uma hora estoura." },
  ],
  "capitulo-14": [
    { question: "Antes de uma conversa importante, o que se faz primeiro?", options: ["Falar bem alto", "Scan do ambiente: quem, onde, energia", "Ligar para amigos", "Preparar perguntas difíceis"], correctIndex: 1, explanation: "O scan define onde você se posiciona e quem vigiar." },
    { question: "No cenário de trabalho, quem você deve observar?", options: ["Quem fala mais alto", "Quem os outros olham quando falam (o decisor real)", "Quem chega atrasado", "O relógio"], correctIndex: 1, explanation: "A atenção do grupo revela o verdadeiro comando." },
    { question: "Como fechar bem qualquer interação nova?", options: ["Sair correndo", "Fixar o nome + 1 detalhe pessoal da pessoa", "Entregar cartão", "Não dizer nada"], correctIndex: 1, explanation: "A âncora de nome e detalhe é o rapport que abre a próxima vez." },
  ],
  "capitulo-15": [
    { question: "O plano de 30 dias começa com:", options: ["Quizzes", "Alimentar o olho: diário do observador + varredura + foto", "Leitura a frio completa", "Persuasão"], correctIndex: 1, explanation: "Primeiro o músculo da observação; o resto se apoia nele." },
    { question: "A rotina mínima de manutenção sugerida é:", options: ["8 horas por dia", "10 minutos: 5 observações + 1 palácio de memória + 1 microexpressão", "Só o fim de semana", "1 hora por mês"], correctIndex: 1, explanation: "Consistência pequena diária vence intensidade esparsa." },
    { question: "O que sustenta todo o treino?", options: ["Vencer amigos", "Treinar em contexto real, com respeito e ética", "Guardar as técnicas em segredo", "Competir"], correctIndex: 1, explanation: "Proibido usar leitura fria em quem não pediu." },
  ],
  "capitulo-16": [
    { question: "Qual limite é inegociável?", options: ["Nenhum", "Consentimento: não usar técnicas em quem não pediu", "Usar contra rivais", "Ler mentes em segredo"], correctIndex: 1, explanation: "\"Posso te contar o que percebi?\" é cortesia que transforma tudo." },
    { question: "O que diferencia o mentalista do vigarista?", options: ["O sorriso", "A técnica com ética e a verdade sobre a natureza dela", "A roupa", "O vocabulário"], correctIndex: 1, explanation: "Inofensivo em método, honesto sobre mistérios, sem dano." },
    { question: "Para que servem as técnicas no fim das contas?", options: ["Para triunfar sobre os outros", "Para entender e ajudar — fazer o outro se sentir visto e valioso", "Para impressionar a plateia", "Para controlar"], correctIndex: 1, explanation: "O melhor mentalista transforma o olhar afiado em gentileza calibrada." },
  ],
  "capitulo-17": [
    { question: "O que é \"rainbow ruse\"?", options: ["Uma marca de lápis", "Apresentar um espectro de possibilidades para garantir acerto percebido", "Uma técnica de cor", "Um jogo de cores"], correctIndex: 1, explanation: "O arco-íris cobre os extremos; qualquer estado \"bate\"." },
    { question: "O que é \"embedded command\"?", options: ["Um vírus de computador", "Comando instalado dentro de uma frase por pausa e entonação", "Um atalho do teclado", "Uma senha"], correctIndex: 1, explanation: "O texto é ouvido, o comando é recebido." },
    { question: "O efeito Barnum/Forer:", options: ["Descreve a memória", "Tendência de aceitar descrições genéricas como feitas para mim", "Uma técnica de respiração", "Um método de prova"], correctIndex: 1, explanation: "É o motor por trás do \"horóscopo\" e das leituras genéricas." },
  ],
  "capitulo-18": [
    { question: "Quem mapeou as microexpressões?", options: ["Freud", "Paul Ekman", "Sherlock Holmes", "Carlos Jung"], correctIndex: 1, explanation: "Ekman & Friesen: as 7 emoções universais de fração de segundo." },
    { question: "Qual livro é referência clássica de leitura a frio?", options: ["A Origem das Espécies", "The Full Facts Book of Cold Reading (Ian Rowland)", "O Príncipe", "A Arte da Guerra"], correctIndex: 1, explanation: "Ian Rowland é a referência técnica do cold reading." },
    { question: "Os 6 princípios de persuasão são de:", options: ["Robert Cialdini", "Paul Ekman", "Bertram Forer", "Derren Brown"], correctIndex: 0, explanation: "Influence: The Psychology of Persuasion." },
  ],
};

const MAIN_COURSE_QUIZ_ROUTE = {
  "observacao-nivel-detetive": "capitulo-03",
  "leitura-a-frio": "capitulo-04",
  "linguagem-corporal": "capitulo-05",
  "detector-de-mentiras": "capitulo-06",
};

const EXTRA_CARDS = {
  "licao-43": [{ front: "O que é o palácio da memória?", back: "Associar cada item que quero lembrar a um ponto físico de um percurso conhecido." }],
  "licao-26": [{ front: "Quantas emoções universais Ekman mapeou?", back: "Sete: felicidade, tristeza, medo, raiva, nojo, surpresa e desprezo." }],
  "licao-08": [{ front: "Como funciona a varredura dos 5 segundos?", back: "Rosto, pescoço, roupas, mãos, calçado e objetos — sempre na mesma ordem, buscando pistas." }],
  "licao-33": [{ front: "Qual o método das 3 perguntas?", back: "Positiva real (baseline), positiva falsa (P1, comparar estresse) e vigorosa (P2, contra-teste)." }],
  "licao-63": [{ front: "O que é o \"jogo dos 3 passos\"?", back: "Antecipar a reação (passo 1), aí o gesto do outro (passo 2), e escolher minha resposta (passo 3)." }],
};

async function runSeed() {
  const users = [];
  const courses = [];
  const modules = [];
  const lessons = [];
  const quizQuestions = [];
  const enrollments = [];
  const progress = [];
  const resources = [];
  const cards = [];

  const main = seedData;
  const extra = seedExtra;

  const lessonPool = new Map();
  const mainCourseId = uid();
  courses.push({
    id: mainCourseId,
    slug: main.course.slug,
    title: main.course.title,
    tagline: main.course.tagline,
    description: main.course.description,
    level: main.course.level,
    durationMinutes: main.course.durationMinutes,
    coverGradient: "",
    coverImage: "",
    accent: "#b08d3e",
    category: "Completo",
    free: true,
    featured: true,
    order: 1,
    published: true,
    createdAt: new Date(),
  });

  const lessonIdsBySlug = new Map();
  let lessonTotal = 0;

  for (const [orderIndex, m] of main.modules.entries()) {
    const mod = {
      id: uid(),
      courseId: mainCourseId,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      order: orderIndex + 1,
    };
    modules.push(mod);

    for (const l of m.lessons) {
      const src = l;
      lessonTotal += 1;
      const lesson = {
        id: uid(),
        moduleId: mod.id,
        slug: l.slug,
        title: src.title,
        summary: src.summary,
        durationMin: src.durationMin,
        kind: src.kind,
        order: l.order,
        blocks: src.blocks,
        videoUrl: "",
        audioUrl: "",
      };
      lessons.push(lesson);
      lessonIdsBySlug.set(lesson.slug, lesson.id);
      lessonPool.set(lesson.slug, {
        title: src.title,
        summary: src.summary,
        durationMin: src.durationMin,
        kind: src.kind,
        blocks: src.blocks,
      });
    }

    const questions = QUIZ_BANK[m.slug];
    if (questions && questions.length) {
      lessonTotal += 1;
      const quizId = uid();
      lessons.push({
        id: quizId,
        moduleId: mod.id,
        slug: `quiz-${m.slug}`,
        title: `Quiz — ${m.title.replace(/^\d+\.\s*/, "")}`,
        summary: "Teste seu aprendizado do módulo.",
        durationMin: 4,
        kind: "quiz",
        order: m.lessons.length + 1,
        blocks: [],
        videoUrl: "",
        audioUrl: "",
      });
      lessonIdsBySlug.set(`quiz-${m.slug}`, quizId);
      questions.forEach((q, i) => {
        quizQuestions.push({
          id: uid(),
          lessonId: quizId,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          order: i + 1,
        });
        cards.push({
          id: uid(),
          lessonId: quizId,
          front: q.question,
          back: `A alternativa certa é "${q.options[q.correctIndex]}". ${q.explanation}`,
          order: i + 1,
        });
      });
    }
  }

  const courseIdBySlug = new Map([[main.course.slug, mainCourseId]]);

  for (const c of extra.courses) {
    const courseId = uid();
    courseIdBySlug.set(c.slug, courseId);
    courses.push({
      id: courseId,
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      level: c.level,
      durationMinutes: c.durationMinutes,
      coverGradient: c.coverGradient,
      coverImage: "",
      accent: c.accent,
      category: c.category,
      free: c.free,
      featured: c.featured,
      order: c.order,
      published: true,
      createdAt: new Date(),
    });

    c.modules.forEach((m, mi) => {
      const mod = {
        id: uid(),
        courseId,
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        order: mi + 1,
      };
      modules.push(mod);

      for (const l of m.lessons) {
        const src = l.ref ? lessonPool.get(l.ref) : l;
        lessonTotal += 1;
        lessons.push({
          id: uid(),
          moduleId: mod.id,
          slug: l.slug ?? l.ref,
          title: src.title,
          summary: src.summary,
          durationMin: src.durationMin,
          kind: src.kind,
          order: l.order,
          blocks: src.blocks,
          videoUrl: "",
          audioUrl: "",
        });
      }

      const questions = QUIZ_BANK[m.quiz ?? MAIN_COURSE_QUIZ_ROUTE[c.slug]];
      if (questions && questions.length) {
        lessonTotal += 1;
        const quizId = uid();
        lessons.push({
          id: quizId,
          moduleId: mod.id,
          slug: `quiz-${m.slug}`,
          title: `Quiz — ${m.title.replace(/^\d+\.\s*/, "")}`,
          summary: "Teste seu aprendizado do módulo.",
          durationMin: 4,
          kind: "quiz",
          order: m.lessons.length + 1,
          blocks: [],
          videoUrl: "",
          audioUrl: "",
        });
        questions.forEach((q, i) => {
          quizQuestions.push({
            id: uid(),
            lessonId: quizId,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            order: i + 1,
          });
          cards.push({
            id: uid(),
            lessonId: quizId,
            front: q.question,
            back: `A alternativa certa é "${q.options[q.correctIndex]}". ${q.explanation}`,
            order: i + 1,
          });
        });
      }
    });
  }

  for (const r of extra.resources) {
    const data = {
      title: r.title,
      type: r.type,
      url: r.url ?? "",
      content: r.content ?? "",
      order: r.order ?? 0,
    };
    if (r.courseSlug) data.courseId = courseIdBySlug.get(r.courseSlug);
    if (r.lessonSlug) data.lessonId = lessonIdsBySlug.get(r.lessonSlug);
    resources.push({ id: uid(), ...data });
  }

  const achievements = extra.achievements.map((a) => ({
    id: uid(),
    slug: a.slug,
    title: a.title,
    description: a.description,
    icon: a.icon ?? "🏅",
    condition: a.condition ?? "",
  }));

  for (const [lessonSlug, list] of Object.entries(EXTRA_CARDS)) {
    const lessonId = lessonIdsBySlug.get(lessonSlug);
    if (!lessonId) continue;
    list.forEach((card, i) => {
      cards.push({ id: uid(), lessonId, front: card.front, back: card.back, order: i + 1 });
    });
  }

  const demoPasswordHash = await bcrypt.hash("mentalista123", 10);
  const now = new Date();
  const demo = {
    id: uid(),
    name: "Aluno Demo",
    email: "demo@mentalistas.com",
    passwordHash: demoPasswordHash,
    provider: "password",
    image: "",
    avatarImage: "",
    role: "student",
    createdAt: now,
    firstLoginAt: null,
    lastLoginAt: null,
    welcomeSentAt: null,
    completedCourseAt: null,
  };
  users.push(demo);

  for (const c of courses) {
    enrollments.push({ id: uid(), userId: demo.id, courseId: c.id, createdAt: now, completedAt: null });
  }

  let goal = 0;
  for (const l of lessons) {
    if (l.kind !== "lesson" || goal >= 6) continue;
    progress.push({
      id: uid(),
      userId: demo.id,
      lessonId: l.id,
      score: 0,
      completedAt: new Date(now.getTime() - (5 - goal) * 24 * 60 * 60 * 1000),
    });
    goal += 1;
  }

  const userAchievements = achievements
    .filter((a) => ["first-lesson", "five-lessons", "streak-3"].includes(a.slug))
    .map((a) => ({ id: uid(), userId: demo.id, achievementId: a.id, grantedAt: new Date() }));

  await _clear("users");
  await _clear("courses");
  await _clear("modules");
  await _clear("lessons");
  await _clear("quizQuestions");
  await _clear("enrollments");
  await _clear("progress");
  await _clear("notes");
  await _clear("resources");
  await _clear("achievements");
  await _clear("userAchievements");
  await _clear("reviews");
  await _clear("cards");

  await _createAll("users", users);
  await _createAll("courses", courses);
  await _createAll("modules", modules);
  await _createAll("lessons", lessons);
  await _createAll("quizQuestions", quizQuestions);
  await _createAll("enrollments", enrollments);
  await _createAll("progress", progress);
  await _createAll("resources", resources);
  await _createAll("achievements", achievements);
  await _createAll("userAchievements", userAchievements);
  await _createAll("cards", cards);

  // eslint-disable-next-line no-console
  console.log(`[store] seed ok: ${courses.length} cursos, ${lessonTotal} lições, ${cards.length} cards, ${achievements.length} conquistas`);
}