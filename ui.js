/*
 * ui.js — Cutter App
 * Conecta a UI com o Normalizer e o Matcher.
 * Exporta setupUI({ index, Normalizer, Matcher })
 */

function el(id){ return document.getElementById(id); }

function renderNeighbors(container, index, centerPos, Matcher){
  const items = Matcher.getNeighbors(index, centerPos, 3);
  if(!items.length){ container.innerHTML = ''; return; }
  container.innerHTML = items.map(r => (
    `<div class="item"><div><span class="code">${r.code}</span></div><div>${escapeHtml(r.rawKey)}</div><div class="muted small">${r.normKey}</div></div>`
  )).join('');
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

export function setupUI({ index, Normalizer, Matcher }){
  // Campos
  const form = el('formBusca');
  const autor = el('autor');
  const titulo = el('titulo');
  const entrada = el('entrada');
  const normalizada = el('normalizada');
  const explicacao = el('explicacao');

  const btnBuscar = el('btnBuscar');
  const btnLimpar = el('btnLimpar');

  const codigo = el('codigo');
  const chave = el('chave');
  const btnCopiar = el('btnCopiar');
  const vizinhos = el('vizinhos');

  // Radios (modo autor/título)
  const modos = form.querySelectorAll('input[name="modo"]');
  function getModo(){
    const checked = form.querySelector('input[name="modo"]:checked');
    return checked ? checked.value : 'autor';
  }

  function getEntradaBruta(){
    return getModo() === 'titulo' ? titulo.value : autor.value;
  }

  function atualizar(){
    const modo = getModo();
    const raw = getEntradaBruta().trim();

    if(!raw){
      entrada.textContent = '—';
      normalizada.textContent = '—';
      explicacao.textContent = '—';
      codigo.textContent = '—';
      chave.textContent = '—';
      btnCopiar.disabled = true;
      vizinhos.innerHTML = '';
      return;
    }

    // Escolher pipeline
    const norm = (modo === 'titulo')
      ? Normalizer.fromTitle(raw)
      : Normalizer.fromAuthor(raw);

    // Mostrar entrada e normalização
    entrada.textContent = raw;
    normalizada.textContent = norm || '∅';

    // Buscar melhor correspondência
    const match = Matcher.findBest(norm, index);
    if(!match){
      codigo.textContent = '—';
      chave.textContent = 'Sem correspondência';
      explicacao.textContent = 'Nenhuma entrada <= chave normalizada. Verifique grafia/normalização.';
      btnCopiar.disabled = true;
      vizinhos.innerHTML = '';
      return;
    }

    const { row, pos, match: type } = match;
    codigo.textContent = row.code;
    codigo.removeAttribute('data-empty');
    chave.textContent = row.rawKey;
    explicacao.textContent = (type === 'exact')
      ? 'Correspondência exata'
      : `Anterior imediato (maior ≤). Posição: ${pos+1} de ${index.length}`;

    btnCopiar.disabled = false;
    renderNeighbors(vizinhos, index, pos, Matcher);
  }

  function limpar(){
    entrada.textContent = '—';
    normalizada.textContent = '—';
    explicacao.textContent = '—';
    codigo.textContent = '—';
    codigo.setAttribute('data-empty','');
    chave.textContent = '—';
    btnCopiar.disabled = true;
    vizinhos.innerHTML = '';
  }

  // Eventos
  btnBuscar.addEventListener('click', atualizar);
  btnLimpar.addEventListener('click', limpar);
  autor.addEventListener('input', () => { if(getModo()==='autor') atualizar(); });
  titulo.addEventListener('input', () => { if(getModo()==='titulo') atualizar(); });
  modos.forEach(r => r.addEventListener('change', atualizar));

  btnCopiar.addEventListener('click', async () => {
    const text = String(codigo.textContent || '').trim();
    if(!text || text === '—') return;
    try{
      await navigator.clipboard.writeText(text);
      const old = btnCopiar.textContent;
      btnCopiar.textContent = 'Copiado!';
      setTimeout(() => btnCopiar.textContent = old, 900);
    }catch(err){
      console.error(err);
      btnCopiar.textContent = 'Falhou';
      setTimeout(() => btnCopiar.textContent = 'Copiar', 900);
    }
  });
}
