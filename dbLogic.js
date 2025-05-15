let recipes = [];
let activeRecipes = [];
const activeFilters = { category: null, cook: null, prep: null, instr: false };

// synonyms map
const synonyms = {
  'chix':   'chicken',
  'stk':    'steak',
  'sub':    'sandwich',
  'ff':     'french fry'
};

function normalizeTerm(t) {
  t = t.toLowerCase().trim();
  if (synonyms[t]) t = synonyms[t];
  return t.replace(/[^a-z]/g,'');
}
function makeSearchRegex(q) {
  const n = normalizeTerm(q);
  const a = synonyms[n] || null;
  const parts = a && a !== n ? [n,a] : [n];
  return new RegExp(`\\b(?:${ parts.map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') })`,`i`);
}

document.addEventListener('DOMContentLoaded', ()=>{
  fetch('PCI_Recipes.json')
    .then(r=>r.json())
    .then(data=>{
      recipes = data;
      activeRecipes = [...recipes];
      buildFilters();
      renderRecipeList(activeRecipes);
      wireSearch();
      wireOutsideClicks();
    });
});

function buildFilters(){
  const ctr = document.getElementById('filterContainer');
  ctr.innerHTML = '';

  // helper to build a group
  function makeGroup(title, opts, keyName){
    const g = document.createElement('div');
    g.className = 'filter-group';

    const lbl = document.createElement('div');
    lbl.className = 'filter-label';
    lbl.textContent = title;
    g.append(lbl);

    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = 'Filter';
    g.append(btn);

    const menu = document.createElement('div');
    menu.className = 'filter-menu';
    opts.forEach(opt=>{
      const it = document.createElement('div');
      it.className = 'filter-menu-item';
      it.textContent = opt.label;
      it.addEventListener('click', ()=>{
        activeFilters[keyName] =
          activeFilters[keyName] === opt.key ? null : opt.key;
        btn.textContent = opt.label;
        menu.classList.remove('show');
        applyFilters();
      });
      menu.append(it);
    });
    g.append(menu);

    btn.addEventListener('click', ()=> menu.classList.toggle('show'));
    return g;
  }

  // Category options
  const cats = Array.from(
    new Set(recipes.map(r=>r.category).filter(Boolean))
  ).map(c=>({ label:c, key:c }));
  ctr.append( makeGroup('Category', cats, 'category') );

  // Cook time buckets
  const cooks = [
    { label:'Under 20 min', key:r=>r.cook_time!=null&&r.cook_time<20 },
    { label:'Under 40 min', key:r=>r.cook_time!=null&&r.cook_time<40 },
    { label:'Under 1h',      key:r=>r.cook_time!=null&&r.cook_time<60 },
    { label:'Under 1.5h',    key:r=>r.cook_time!=null&&r.cook_time<90 },
    { label:'3h+',           key:r=>r.cook_time!=null&&r.cook_time>=180 }
  ];
  ctr.append( makeGroup('Cook Time', cooks, 'cook') );

  // Prep time buckets
  const preps = [
    { label:'Under 10 min', key:r=>r.prep_time!=null&&r.prep_time<10 },
    { label:'Under 20 min', key:r=>r.prep_time!=null&&r.prep_time<20 },
    { label:'Under 30 min', key:r=>r.prep_time!=null&&r.prep_time<30 },
    { label:'Under 1h',      key:r=>r.prep_time!=null&&r.prep_time<60 }
  ];
  ctr.append( makeGroup('Prep Time', preps, 'prep') );

  // Instructions >100 words
  ctr.append( makeGroup('Instructions', [
    { label:'Over 100 words', key:true }
  ], 'instr') );
}

function applyFilters(){
  activeRecipes = recipes.filter(r=>{
    if (activeFilters.category && r.category !== activeFilters.category)
      return false;
    if (activeFilters.cook && !activeFilters.cook(r)) return false;
    if (activeFilters.prep && !activeFilters.prep(r)) return false;
    if (activeFilters.instr) {
      const len = (r.instructions||'').split(/\s+/).length;
      if (len <= 100) return false;
    }
    return true;
  });
  renderRecipeList(activeRecipes);
}

function wireSearch(){
  const inp  = document.getElementById('searchInput');
  const dd   = document.getElementById('searchDropdown');
  inp.addEventListener('input', ()=>{
    const q = inp.value.trim();
    dd.innerHTML = '';
    if (!q) return;
    const re = makeSearchRegex(q);
    recipes.filter(r=>re.test(r.name))
           .slice(0,10)
           .forEach(r=>{
      const item = document.createElement('div');
      item.className = 'search-dropdown-item';
      item.textContent = r.name;
      item.onclick = ()=> showDetail(r);
      dd.append(item);
    });
  });
}

function wireOutsideClicks(){
  document.addEventListener('click', e=>{
    // close any open filter menus
    document.querySelectorAll('.filter-menu.show')
      .forEach(m=> { if (!m.parentNode.contains(e.target)) m.classList.remove('show'); });
    // close search dropdown
    if (!document.getElementById('searchContainer').contains(e.target)) {
      document.getElementById('searchDropdown').innerHTML = '';
    }
  });
}

function renderRecipeList(list){
  const out = document.getElementById('listOfRecipes');
  out.innerHTML = '';
  list.forEach(r=>{
    const d = document.createElement('div');
    d.className = 'recipe-item';
    d.textContent = r.name;
    d.onclick = ()=> showDetail(r);
    out.append(d);
  });
}

function showDetail(r){
  const out = document.getElementById('listOfRecipes');
  out.innerHTML = '';
  const w = document.createElement('div');
  w.className = 'recipe-detail';

  const h = document.createElement('h2');
  h.textContent = r.name;
  w.append(h);

  const row = (k,v)=>{
    const p = document.createElement('p');
    p.innerHTML = `<strong>${k.replace(/_/g,' ')}:</strong> ${v}`;
    w.append(p);
  };

  // amount_Recipe_Makes
  if (r.amount_Recipe_Makes) {
    let txt = `${r.amount_Recipe_Makes.amount} ${r.amount_Recipe_Makes.unit}`;
    if (r.amount_Recipe_Makes.converted) {
      const c = r.amount_Recipe_Makes.converted;
      txt += ` (${c.amount} ${c.unit})`;
    }
    row('Amount makes', txt);
  } else row('Amount makes','N/A');

  row('Prep time',   r.prep_time   != null ? `${r.prep_time} min` : 'N/A');
  row('Cook time',   r.cook_time   != null ? `${r.cook_time} min` : 'N/A');
  row('Category',    r.category    || 'N/A');
  row('Instructions',
      r.instructions
        ? `<pre>${r.instructions}</pre>`
        : 'N/A'
  );

  // ingredients
  const ingr = r.ingredients || {};
  if (Object.keys(ingr).length) {
    const t = document.createElement('h3');
    t.textContent = 'Ingredients';
    t.style.marginTop = '12px';
    w.append(t);
    Object.entries(ingr).forEach(([k, v])=>{
      let txt = `${v.amount} ${v.unit}`;
      if (v.converted)
        txt += ` (${v.converted.amount} ${v.converted.unit})`;
      row(k, txt);
    });
  } else {
    row('Ingredients','N/A');
  }

  // back
  const btn = document.createElement('button');
  btn.textContent = '← Back';
  btn.onclick = ()=> applyFilters();
  w.append(btn);

  out.append(w);
}
