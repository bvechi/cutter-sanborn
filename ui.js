// ui.js — modo “rápido” (layout do seu print)
function el(id){ return document.getElementById(id); }
function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

export function setupUI({ index, Normalizer, Matcher }){
  const q        = el('q');
  const bestCode = el('bestCode');
  const bestKey  = el('bestKey');
  const explain  = el('explain');
  const results  = el('results');
  const copyBtn  = el('copyBtn');

  function decideMode(raw){
    if (/^t:\s*/i.test(raw)) return { mode:'title', value: raw.replace(/^t:\s*/i,'') };
    if (/,/.test(raw))       return { mode:'author', value: raw };
    const first = (raw.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-zà-ÿ]/gi,'');
    const arts = new Set(Normalizer.LEADING_ARTICLES || []);
    if (arts.has(first))     return { mode:'title', value: raw };
    return { mode:'author', value: raw };
  }

  function update(){
    const raw = q.value.trim();
    if(!raw){
      bestCode.textContent = '—';
      bestKey.textContent  = 'Digite para ver o resultado…';
      explain.textContent  = '';
      results.innerHTML    = '';
      copyBtn.disabled     = true;
      return;
    }
    const pick = decideMode(raw);
    const norm = (pick.mode === 'title')
      ? Normalizer.fromTitle(pick.value)
      : Normalizer.fromAuthor(pick.value);

    const match = Matcher.findBest(norm, index);
    if(!match){
      bestCode.textContent = '—';
      bestKey.textContent  = 'Sem correspondência';
      explain.textContent  = `Entrada normalizada: “${norm}”.`;
      results.innerHTML    = '';
      copyBtn.disabled     = true;
      return;
    }
    const { row, pos, match: type } = match;
    bestCode.textContent = row.code;
    bestKey.textContent  = row.rawKey;
    explain.textContent  = `Entrada normalizada: “${norm}”. Regra: ${type==='exact' ? 'exata' : 'anterior imediato (≤)'} • posição ${pos+1}/${index.length}`;
    copyBtn.disabled     = false;

    const around = Matcher.getNeighbors(index, pos, 3);
    results.innerHTML = around.map(r =>
      `<div class="item"><div><span class="code">${r.code}</span></div><div class="key">${escapeHtml(r.rawKey)}</div><div class="small">${r.normKey}</div></div>`
    ).join('');
  }

  q.addEventListener('input', update);
  copyBtn.addEventListener('click', async ()=>{
    const v = bestCode.textContent.trim();
    if(!v || v==='—') return;
    await navigator.clipboard.writeText(v);
    const old = copyBtn.textContent; copyBtn.textContent = 'Copiado!'; setTimeout(()=> copyBtn.textContent = 'Copiar cutter', 900);
  });
}
