/*
 * normalizer.js — Cutter App
 * Responsável por transformar uma entrada (autor ou título)
 * em uma CHAVE NORMALIZADA adequada para pareamento na tabela Cutter–Sanborn.
 *
 * Regras aplicadas (de acordo com Cutter/Cutter–Sanborn e literatura correlata):
 * - Remoção de acentos/diacríticos
 * - Remoção de pontuação e símbolos
 * - Tratamento de abreviações iniciais: St./Ste. → Saint/Sainte; Mc/M' → Mac
 * - Conversão de dígitos arábicos para palavras (ex.: 1984 → one nine eight four)
 * - Remoção de artigo inicial (somente modo TÍTULO)
 * - Colapsar espaços, minúsculas, juntar e TRUNCAR a 13 caracteres
 *
 * API pública:
 *   fromAuthor(input: string): string
 *   fromTitle(input: string):  string
 *   surnameFromAuthor(input: string): string (utilidade)
 *   titleWithoutArticle(input: string):  string (utilidade)
 *   MAX_LEN (const)
 */

export const MAX_LEN = 13;

/** Artigos iniciais a remover no modo TÍTULO */
export const LEADING_ARTICLES = [
  // PT-BR
  'o','a','os','as','um','uma','uns','umas',
  // EN
  'the','a','an',
  // ES
  'el','la','los','las','un','una','unos','unas',
  // FR/IT
  'le','la','les','l','il','lo','i','gli','un','una'
];

/** Remove diacríticos (acentos) usando Unicode normalization */
export function removeDiacritics(str){
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');
}

/** Converte todos os dígitos para palavras (inglês simples) */
export function digitsToWords(str){
  const map = { '0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine' };
  return (str || '').replace(/\d/g, d => map[d]).replace(/\s+/g,' ');
}

/** Trata abreviações iniciais comuns: St./Ste. → Saint/Sainte; Mc/M' → Mac */
export function normalizeSaintMac(s){
  if(!s) return s;
  // início da palavra: St., St, Ste., Ste → Saint/Sainte
  s = s.replace(/^\bste?\.?\b/i, m => (m.toLowerCase().startsWith('ste') ? 'sainte' : 'saint'));
  // início da palavra: Mc… ou M'… → Mac…
  s = s.replace(/^m(c|')/i, 'mac');
  return s;
}

/** Remove pontuação e símbolos, preservando letras e espaços */
export function stripPunctuation(str){
  return (str || '').replace(/[\p{P}\p{S}]/gu,' ');
}

/** Colapsa espaços múltiplos e aparas nas bordas */
export function collapse(str){
  return (str || '').replace(/\s+/g,' ').trim();
}

/** Extrai sobrenome do primeiro autor a partir de "Sobrenome, Prenome" ou forma livre */
export function surnameFromAuthor(raw){
  if(!raw) return '';
  const s = String(raw);
  if(s.includes(',')){
    return s.split(',')[0].trim();
  }
  const w = s.trim().split(/\s+/)[0];
  return w || s.trim();
}

/** Remove artigo inicial do título (The/Um/El/Le etc.) */
export function titleWithoutArticle(title){
  if(!title) return '';
  let t = String(title).trim();
  // remove aspas simples/duplas iniciais
  t = t.replace(/^[\'"“”‘’]+/, '');
  const m = t.match(/^(\S+)(\s+)(.*)$/);
  if(!m) return t;
  const first = m[1].toLowerCase().replace(/[^\p{L}]/gu,'');
  if(LEADING_ARTICLES.includes(first)) return m[3];
  return t;
}

/** Pipeline base de normalização */
function normalizeBase(base){
  let s = removeDiacritics(base);
  s = digitsToWords(s);
  s = normalizeSaintMac(s);
  s = stripPunctuation(s);
  s = collapse(s).toLowerCase();
  // junta e trunca
  s = s.replace(/\s+/g,'');
  if(s.length > MAX_LEN) s = s.slice(0, MAX_LEN);
  return s;
}

/** Entrada a partir de AUTOR */
export function fromAuthor(input){
  const base = surnameFromAuthor(input || '');
  return normalizeBase(base);
}

/** Entrada a partir de TÍTULO (remove artigo inicial antes) */
export function fromTitle(input){
  const base = titleWithoutArticle(input || '');
  return normalizeBase(base);
}
