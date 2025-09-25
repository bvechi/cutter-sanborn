/* ui.js — modo “rápido” (1 campo: #q) + compatível com o modo antigo (autor/título) */
function el(id){ return document.getElementById(id); }
function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

export function setupUI({ index, Normalizer, Matcher }){
  // tenta layout “rápido” (um campo #q). Se não achar, volta ao layout antigo.
  const q = el('q');
  if (q) return wireQuick(index, Normalizer, Matcher);

  // ---- fallback: layout antigo (formBusca, autor/titulo) ----
  const form = el('formBusca');
  const autor = el('autor');
  const titulo = el('titulo');
  const entrada = el('entrada');
  const normalizada = el('normalizada');
  const explicacao = el('explicacao');
  const codigo = el('codigo');
  const chave = el('chave');
  const btnCopiar = el('btnCopiar');
  const vizinhos = el('vizinhos');

  const modos = form ? form.querySelectorAll('input[name="modo"]') : [];
  const getModo = ()=> (form?.querySelector('input[name="modo"]:checked')?.value || 'autor');

  function renderNeighbors(centerPos){
    const items = Matcher.getNeighbors(index, centerPos, 3);
    vizinhos.innerHTML = items.map(r =>
      `<div class="item"><div><span class="code">${r.code}</span></div><div>${escapeHtml(r.rawKey)}</div><div class="muted small">${r.normKey}</div></div>`
    ).join('');
  }

  function atualizar(){
    const modo = getModo();
    const raw = (modo === 'titulo' ? titulo?.value : autor?.value)?.trim() || '';
    if(!raw){
      [entrada, normalizada, explicacao, codigo, chave].forEach(n => n && (n.textContent = '—'));
      if(btnCopiar) btnCopiar.disabled = true;
      if(vizinhos) vizinhos.innerHTML = '';
      return;
    }
    const norm = (modo === 'titulo') ? Normalizer.fromTitle(raw) : Normalizer.fromAuthor(raw);
    if(entrada) entrada.textContent = raw;
    if(normalizada) normalizada.textContent = norm || '∅';

    const match = Matcher.findBest(norm, index);
    if(!match){
      if(codigo) codigo.textContent = '—';
      if(chave) chave.textContent = 'Sem correspondência';
      if(explicacao) explicacao.textContent = 'Nenhuma entrada <= chave normalizada.';
      if(btnCopiar) btnCopiar.disabled = true;
      if(vizinhos) vizinhos.innerHTML = '';
      return;
    }
    const { row, pos, match: type } = match;
    if(codigo) codigo.textContent = row.code;
    if(chave) chave.textContent = row.rawKey;
    if(explicacao) explicacao.textContent = (type === 'exact') ? 'Correspondência exata' : `Anterior imediato (maior ≤). Posição: ${pos+1} de ${index.length}`;
    if(btnCopiar) btnCopiar.disabled = false;
    if(vizinhos) renderNeighbors(pos);
  }

  el('btnBuscar')?.addEventListener('click', atualizar);
  el('btnLimpar')?.addEventListener('click', () => {
    [entrada, normalizada, explicacao, el('codigo'), el('chave')].forEach(n => n && (n.textContent = '—'));
    if(btnCopiar) btnCopiar.disabled = true;
    if(vizinhos) vizinhos.innerHTML = '';
  });
  autor?.addEventListener('input', ()=> getModo()==='autor' && atualizar());
  titulo?.addEventListener('input', ()=> getModo()==='titulo' && atualizar());
  modos.forEach(r => r.addEventListener('change', atualizar));
  el('btnCopiar')?.addEventListener('click', async ()=>{
    const text = String(el('codigo')?.textContent || '').trim();
    if(!text || text==='—') return;
    await navigator.clipboard.writeText(text);
    const b = el('btnCopiar'); const old = b.textContent; b.textContent = 'Copiado!'; setTimeout(()=> b.textContent = old, 900);
  });
}

// ---------- MODO RÁPIDO (1 input: #q, mantém seu layout do print) ----------
function wireQuick(index, Normalizer, Matcher){
  const q = el('q');
  const bestCode = el('bestCode');
  const bestKey = el('bestKey');
  const explain = el('explain');
  const results = el('results');
  const copyBtn = el('copyBtn');

  function decideMode(raw){
    if (/^t:\s*/i.test(raw)) return { mode:'title', value: raw.replace(/^t:\s*/i,'') };
    if (/,/.test(raw)) return { mode:'author', value: raw };
    // heurística: se começa com artigo (“o, a, the, el, le...”), tratamos como título
    const first = (raw.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-zà-ÿ]/gi,'');
    const arts = new Set(Normalizer.LEADING_ARTICLES || []);
    if (arts.has(first)) return { mode:'title', value: raw };
    return { mode:'author', value: raw };
  }

  function update(){
    const raw = q.value.trim();
    if(!raw){
      bestCode.textContent = '—';
      bestKey.textContent = 'Digite para ver o resultado…';
      explain.textContent = '';
      results.innerHTML = '';
      copyBtn.disabled = true;
      return;
    }

    const pick = decideMode(raw);
    const norm = (pick.mode === 'title')
      ? Normalizer.fromTitle(pick.value)
      : Normalizer.fromAuthor(pick.value);

    const match = Matcher.findBest(norm, index);
    if(!match){
      bestCode.textContent = '—';
      bestKey.textContent = 'Sem correspondência';
      explain.textContent = `Entrada normalizada: “${norm}”.`;
      results.innerHTML = '';
      copyBtn.disabled = true;
      return;
    }

    const { row, pos, match: type } = match;
    bestCode.textContent = row.code;
    bestKey.textContent = row.rawKey;
    explain.textContent = `Entrada normalizada: “${norm}”. Regra: ${type==='exact' ? 'exata' : 'anterior imediato (≤)'} • posição ${pos+1}/${index.length}`;
    copyBtn.disabled = false;

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
