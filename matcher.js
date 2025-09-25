/*
 * matcher.js — Cutter App
 * Responsável por indexar a tabela Cutter–Sanborn e localizar o melhor pareamento
 * (correspondência exata ou "anterior imediato" — maior chave <= consulta).
 *
 * API pública:
 *   buildIndex(rows: Array<{key:string, code:string}>, Normalizer): IndexedRow[]
 *   findBest(normQuery: string, index: IndexedRow[]): MatchResult | null
 *   locatePosition(normQuery: string, index: IndexedRow[]): number  // posição do melhor <= (ou -1)
 *   getNeighbors(index: IndexedRow[], pos: number, radius = 3): IndexedRow[]
 *
 * Tipos:
 *   type IndexedRow = { rawKey: string, code: string, normKey: string }
 *   type MatchResult = { row: IndexedRow, pos: number, match: 'exact' | 'preceding' }
 */

/** Compara strings de forma estável e previsível */
export function compare(a, b){
  return a.localeCompare(b);
}

/** Valida linha do dataset */
function isValidRow(row){
  return row && typeof row.key === 'string' && typeof row.code === 'string';
}

/**
 * Constrói índice ordenado por normKey.
 * Normalizer: módulo com fromAuthor() que aplicamos à key da tabela para obter a normKey.
 */
export function buildIndex(rows, Normalizer){
  if(!Array.isArray(rows)) throw new Error('Dataset inválido: esperado array de {key, code}');
  const out = [];
  for(const r of rows){
    if(!isValidRow(r)) continue;
    const normKey = Normalizer.fromAuthor(r.key); // a tabela é composta por cabeçalhos (autores/títulos) padronizados
    if(!normKey) continue;
    out.push({ rawKey: r.key, code: r.code, normKey });
  }
  out.sort((a,b) => compare(a.normKey, b.normKey));
  return out;
}

/** Busca binária para encontrar a posição do MAIOR elemento <= normQuery */
export function locatePosition(normQuery, index){
  if(!normQuery || !index || index.length === 0) return -1;
  let lo = 0, hi = index.length - 1, best = -1;
  while(lo <= hi){
    const mid = (lo + hi) >> 1;
    const cmp = compare(index[mid].normKey, normQuery);
    if(cmp === 0){ return mid; }
    if(cmp < 0){ best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best; // -1 se todos são > normQuery
}

/** Encontra o melhor pareamento (exato, senão anterior imediato) */
export function findBest(normQuery, index){
  const pos = locatePosition(normQuery, index);
  if(pos === -1) return null;
  const row = index[pos];
  const match = (row.normKey === normQuery) ? 'exact' : 'preceding';
  return { row, pos, match };
}

/** Retorna vizinhos próximos à posição (inclui a própria posição) */
export function getNeighbors(index, pos, radius = 3){
  if(!index || index.length === 0 || pos < 0) return [];
  const start = Math.max(0, pos - radius);
  const end = Math.min(index.length - 1, pos + radius);
  return index.slice(start, end + 1);
}
