'use strict';
const collection = window.COLLECTION;
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = (min, max = min, currency = 'RUB') => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Не оценено';
  const amount = value => value.toLocaleString('ru-RU',{maximumFractionDigits:2});
  return `${amount(min)}${min===max?'':`–${amount(max)}`} ${currency==='RUB'?'₽':currency}`;
};
const priced = row => Number.isFinite(row[5]) && Number.isFinite(row[6]);
const sum = rows => rows.filter(priced).reduce((total,row) => [total[0]+row[5],total[1]+row[6]],[0,0]).map(value=>Math.round(value*100)/100);
const config = album => album.catalogue || {...collection.catalogue,numberLabel:'Соловьёв',mintLabel:'MNH',usedLabel:'CTO/U'};
const source = (row,album) => row[8].url || `${config(album).url}#:~:text=${encodeURIComponent(row[3].split('/')[0].trim())}`;
const sourceName = (row,album) => row[8].sourceName || (!album.catalogue?'RusPhil':row[8].url.includes('ibchen.com')?'Scott 2013':'Каталог / определитель');
const basisName = (basis,album) => {
  if (!album.catalogue) return {mint:'MNH · условно до проверки клея',used:'CTO/U · гашёная',uncertain:'MNH или CTO/U · состояние неясно'}[basis];
  return {mint:'Unused · оборот требует проверки',used:'Used · гашёная',uncertain:'Used–Unused · состояние неясно'}[basis];
};
const pairs = (row,album) => album.catalogue
  ? (Number.isFinite(row[8].mint) && Number.isFinite(row[8].used) ? [{id:'',mint:row[8].mint,used:row[8].used}] : [])
  : row[8].variants.map(id=>({id,mint:collection.catalogue.entries[id][0],used:collection.catalogue.entries[id][1]}));
function catalogueText(row,album) {
  const cat = config(album), p = row[8];
  const values = pairs(row,album).map(({id,mint,used})=>`${id?`${id}: `:''}${p.mintLabel||cat.mintLabel} ${money(mint,mint,cat.currency)}; ${cat.usedLabel} ${money(used,used,cat.currency)}`).join(' | ');
  return `${sourceName(row,album)} · ${p.referenceOnly?'Только справочно: ':''}${values || 'Цена не найдена'}${p.reason?` · ${p.reason}`:''}`;
}
function renderRow(row,album) {
  const cat = config(album), p = row[8], url = source(row,album), entries = pairs(row,album);
  const catalogue = entries.map(({id,mint,used}) => `<div class="catalogue-pair">${entries.length>1?`<span class="variant-id">${esc(id)}</span>`:''}<span>${esc(p.mintLabel||cat.mintLabel)}: <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${money(mint,mint,cat.currency)}</a></span><span>${esc(cat.usedLabel)}: <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${money(used,used,cat.currency)}</a></span></div>`).join('');
  const ref = `${album.catalogue&&entries.length?`<small class="source-note">${esc(sourceName(row,album))}</small>`:''}${p.referenceOnly?'<small class="reference-note">Справочно для оригинала / указанного варианта</small>':''}`;
  return `<tr><td><span class="stamp-name">${esc(row[1])}</span><span>${esc(row[2])}</span><span class="position">${esc(row[0])}</span></td><td><a class="catalog" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(cat.numberLabel)} ${esc(row[3])}: ${esc(sourceName(row,album))}">${esc(row[3])}</a>${p.identityUrl?`<a class="identity-link" href="${esc(p.identityUrl)}" target="_blank" rel="noopener noreferrer">Сверить выпуск ↗</a>`:''}</td><td class="condition">${esc(row[4])}${row[7]==='check'?'<span class="check">Нужно уточнение</span>':''}${p.detail?`<small class="row-note">${esc(p.detail)}</small>`:''}</td><td class="catalogue-prices">${catalogue||'<span class="unpriced">Цена не найдена</span>'}${ref}</td><td class="price ${priced(row)?'':'unpriced'}">${money(row[5],row[6],cat.currency)}<small class="price-basis">${esc(priced(row)?basisName(p.basis,album):p.reason||'Цена не подтверждена')}</small></td></tr>`;
}
let activeAlbum = collection.albums[0];
$('updated').textContent = `Обновлено ${collection.updated}`;
$('album-select').innerHTML = collection.albums.map(album=>`<option value="${esc(album.id)}">${esc(album.title)}</option>`).join('');
$('accessory').innerHTML = (collection.accessories||[]).map(item=>`<div class="accessory-heading"><div><p class="eyebrow">СТОИМОСТЬ ХРАНЕНИЯ · ОТДЕЛЬНО ОТ МАРОК</p><h2>${esc(item.title)}</h2><span>${esc(item.description)}</span></div><div class="accessory-value"><strong>${money(item.min,item.max,item.currency)}</strong><small>Предварительный ориентир</small></div></div><p>${esc(item.note)}</p>${item.sources.map(s=>`<p class="accessory-source"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a> · ${esc(s.note)}</p>`).join('')}`).join('');
function renderAlbum(album) {
  if (!album) return;
  activeAlbum = album;
  const rows = album.pages.flatMap(page=>page.rows), total = sum(rows), count = rows.filter(priced).length, cat = config(album);
  $('album-title').textContent = album.title;
  $('album-subtitle').textContent = album.subtitle;
  const pageWord = {one:'страница',few:'страницы',many:'страниц',other:'страницы'}[new Intl.PluralRules('ru-RU').select(album.pages.length)];
  $('page-count').textContent = `${album.pages.length} ${pageWord} · ${album.pages.length} фото`;
  $('edition-countries').textContent = album.countries||'СССР';
  $('edition-period').textContent = album.period||'1961—1985';
  $('top-source').textContent = `Каталожная оценка · ${cat.name}`;
  $('stats').innerHTML = [
    ['Обработано страниц',`${album.pages.length}`,''],
    ['Марок на фотографиях',`${rows.length}`,album.catalogue?'включая повторы':`${new Set(rows.map(row=>row[3])).size} разных`],
    [count<rows.length?'Частичный каталожный итог':`Каталожный итог ${cat.name}`,count?money(...total,cat.currency):'Не определён',count<rows.length?`оценено ${count} из ${rows.length}`:''],
    ['Источник цен',cat.name,album.catalogue?'Scott 2013 / онлайн · USD':'MNH / CTO/U']
  ].map(([label,value,sub])=>`<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</div>`).join('');
  $('page-nav').innerHTML = album.pages.map((page,i)=>`<a href="#${esc(album.id)}-${esc(page.id)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(page.title)}</a>`).join('');
  $('pages').innerHTML = album.pages.map((page,i)=>{
    const subtotal=sum(page.rows), n=page.rows.filter(priced).length;
    const coverage=`оценено ${n} из ${page.rows.length}`;
    const pageSources=album.catalogue?[...new Set(page.rows.filter(priced).map(row=>sourceName(row,album)))].join(' + ')||cat.name:cat.name;
    return `<article class="page" id="${esc(album.id)}-${esc(page.id)}"><header class="page-header"><div><p class="eyebrow">СТРАНИЦА ${String(i+1).padStart(2,'0')} / ${page.rows.length} МАРОК</p><h3>${esc(page.title)}</h3></div><span class="year">${esc(page.year)}</span></header><div class="page-body"><figure class="photo"><button type="button" data-photo="${i}" aria-label="Увеличить фото страницы ${i+1}"><img src="${esc(page.image)}" alt="Оригинальная фотография: ${esc(page.title)}" width="957" height="1280" loading="lazy"></button><figcaption><span>ИСХОДНАЯ ФОТОГРАФИЯ</span><span>Нажмите, чтобы увеличить ↗</span></figcaption></figure><div class="table-wrap"><table><caption class="sr-only">Результаты распознавания страницы ${i+1}</caption><thead><tr><th scope="col">Марка / положение</th><th scope="col">${esc(cat.numberLabel)} ↗</th><th scope="col">Состояние</th><th scope="col">${esc(cat.priceLabel||cat.name)}, ${cat.currency==='RUB'?'руб.':'USD'}</th><th scope="col">К учёту</th></tr></thead><tbody>${page.rows.map(row=>renderRow(row,album)).join('')}</tbody></table></div></div><div class="valuation"><div class="value-top"><span>${n<page.rows.length?'Частичная каталожная оценка страницы':'Каталожная оценка страницы'}<br><small>${esc(pageSources)} · ${album.catalogue?coverage:`${page.rows.length} марок`} · проверено 02.11.2026</small></span><strong>${n?money(...subtotal,cat.currency):'Не определена'}</strong></div><p>${esc(page.note)}</p>${page.followup?`<p class="followup">${esc(page.followup)}</p>`:''}</div></article>`;
  }).join('');
  $('method-ussr').hidden = Boolean(album.catalogue);
  $('method-foreign').hidden = !album.catalogue;
}
$('album-select').addEventListener('change',event=>renderAlbum(collection.albums.find(album=>album.id===event.target.value)));
$('pages').addEventListener('click',event=>{
  const button=event.target.closest('[data-photo]');
  if (!button) return;
  const page=activeAlbum.pages[Number(button.dataset.photo)];
  $('viewer-image').src=page.image;
  $('viewer-image').alt=page.title;
  $('viewer-title').textContent=page.title;
  $('original-link').href=page.image;
  $('viewer').showModal();
});
$('close-viewer').addEventListener('click',()=>$('viewer').close());
$('viewer').addEventListener('click',event=>{if(event.target===$('viewer')){const r=$('viewer').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('viewer').close();}});
$('export').addEventListener('click',()=>{
  const cat=config(activeAlbum);
  const fields=[['Альбом','Страница','Год','Положение','Марка','Номинал',cat.numberLabel,'Состояние','Каталог от','Каталог до','Валюта','Цены каталога','Основание учёта / причина исключения','Источник','Каталог / издание','Проверено']];
  for(const page of activeAlbum.pages)for(const row of page.rows)fields.push([activeAlbum.title,page.title,page.year,...row.slice(0,5),row[5]??'',row[6]??'',cat.currency,catalogueText(row,activeAlbum),priced(row)?basisName(row[8].basis,activeAlbum):row[8].reason,source(row,activeAlbum),sourceName(row,activeAlbum),cat.checked]);
  const csv='\uFEFF'+fields.map(row=>row.map(cell=>`"${String(cell??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`${activeAlbum.id}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
renderAlbum(activeAlbum);
