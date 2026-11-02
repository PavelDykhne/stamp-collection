'use strict';
const collection = window.COLLECTION;
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = (min, max = min) => min === max ? `${min.toLocaleString('ru-RU')} ₽` : `${min.toLocaleString('ru-RU')}–${max.toLocaleString('ru-RU')} ₽`;
const sum = rows => rows.reduce((total, row) => [total[0] + row[5], total[1] + row[6]], [0, 0]);
const source = number => `https://rusphil.com/stamprus/marks/1961/#:~:text=${encodeURIComponent(number.split('/')[0].trim())}`;
const basisName = basis => ({mint:'MNH · условно до проверки клея',used:'CTO/U · гашёная',uncertain:'MNH или CTO/U · состояние неясно'}[basis]);
function catalogueText(row) {
  return row[8].variants.map(id => { const [mint,used] = collection.catalogue.entries[id]; return `${id}: MNH ${mint} ₽; CTO/U ${used} ₽`; }).join(' | ');
}
function renderRow(row) {
  const pricing = row[8];
  const catalogue = pricing.variants.map(id => {
    const [mint,used] = collection.catalogue.entries[id];
    return `<div class="catalogue-pair">${pricing.variants.length > 1 ? `<span class="variant-id">${esc(id)}</span>` : ''}<span>MNH: ${money(mint)}</span><span>CTO/U: ${money(used)}</span></div>`;
  }).join('');
  return `<tr><td><span class="stamp-name">${esc(row[1])}</span><span>${esc(row[2])}</span><span class="position">${esc(row[0])}</span></td><td><a class="catalog" href="${source(row[3])}" target="_blank" rel="noopener noreferrer" aria-label="Соловьёв ${esc(row[3])}: источник RusPhil">${esc(row[3])}</a></td><td class="condition">${esc(row[4])}${row[7]==='check' ? '<span class="check">Нужно уточнение</span>':''}</td><td class="catalogue-prices">${catalogue}</td><td class="price">${money(row[5],row[6])}<small class="price-basis">${esc(basisName(pricing.basis))}</small></td></tr>`;
}
let activeAlbum = collection.albums[0];
$('updated').textContent = `Обновлено ${collection.updated}`;
$('album-select').innerHTML = collection.albums.map(album => `<option value="${esc(album.id)}">${esc(album.title)}</option>`).join('');
function renderAlbum(album) {
  activeAlbum = album;
  const rows = album.pages.flatMap(page => page.rows), total = sum(rows);
  $('album-title').textContent = album.title;
  $('album-subtitle').textContent = album.subtitle;
  $('page-count').textContent = `${album.pages.length} страниц · ${album.pages.length} фото`;
  $('stats').innerHTML = [
    ['Обработано страниц', `${album.pages.length}`, ''],
    ['Марок на фотографиях', `${rows.length}`, `${new Set(rows.map(row => row[3])).size} разных`],
    ['Каталожный итог RusPhil', money(...total), ''],
    ['Источник цен', 'RusPhil', 'MNH / CTO/U']
  ].map(([label, value, sub]) => `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('');
  $('page-nav').innerHTML = album.pages.map((page, i) => `<a href="#${esc(album.id)}-${esc(page.id)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(page.title)}</a>`).join('');
  $('pages').innerHTML = album.pages.map((page, i) => {
    const subtotal = sum(page.rows);
    return `<article class="page" id="${esc(album.id)}-${esc(page.id)}"><header class="page-header"><div><p class="eyebrow">СТРАНИЦА ${String(i+1).padStart(2,'0')} / ${page.rows.length} МАРОК</p><h3>${esc(page.title)}</h3></div><span class="year">${esc(page.year)}</span></header><div class="page-body"><figure class="photo"><button type="button" data-photo="${i}" aria-label="Увеличить фото страницы ${i+1}"><img src="${esc(page.image)}" alt="Оригинальная фотография: ${esc(page.title)}" width="957" height="1280" loading="lazy"></button><figcaption><span>ИСХОДНАЯ ФОТОГРАФИЯ</span><span>Нажмите, чтобы увеличить ↗</span></figcaption></figure><div class="table-wrap"><table><caption class="sr-only">Результаты распознавания страницы ${i+1}</caption><thead><tr><th scope="col">Марка / положение</th><th scope="col">Соловьёв ↗</th><th scope="col">Состояние</th><th scope="col">RusPhil, руб.</th><th scope="col">К учёту</th></tr></thead><tbody>${page.rows.map(renderRow).join('')}</tbody></table></div></div><div class="valuation"><div class="value-top"><span>Каталожная оценка страницы<br><small>RusPhil · ${page.rows.length} марок · проверено 02.11.2026</small></span><strong>${money(...subtotal)}</strong></div><p>${esc(page.note)}</p><p class="followup">${esc(page.followup)}</p></div></article>`;
  }).join('');
}
$('album-select').addEventListener('change', event => renderAlbum(collection.albums.find(album => album.id === event.target.value)));
$('pages').addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (!button) return;
  const page = activeAlbum.pages[Number(button.dataset.photo)];
  $('viewer-image').src = page.image;
  $('viewer-image').alt = page.title;
  $('viewer-title').textContent = page.title;
  $('original-link').href = page.image;
  $('viewer').showModal();
});
$('close-viewer').addEventListener('click', () => $('viewer').close());
$('viewer').addEventListener('click', event => { if(event.target === $('viewer')) { const r = $('viewer').getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('viewer').close(); } });
$('export').addEventListener('click', () => {
  const fields = [['Альбом','Страница','Год','Положение','Марка','Номинал','Соловьёв','Состояние','Каталог от ₽','Каталог до ₽','Цены RusPhil MNH / CTO-U','Основание учёта','Источник','Проверено']];
  for (const page of activeAlbum.pages) for (const row of page.rows) fields.push([activeAlbum.title,page.title,page.year,...row.slice(0,7),catalogueText(row),basisName(row[8].basis),source(row[3]),collection.catalogue.checked]);
  const csv = '\uFEFF'+fields.map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download=`${activeAlbum.id}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
renderAlbum(activeAlbum);
