(function () {
  const previewId = 'wanderlog-istanbul-preview-2026';
  const oldHome = home;
  const oldTab = renderTab;
  const oldCard = placeCard;
  const oldRating = placeRating;
  const oldPersist = persist;
  const oldExportKml = exportKml;

  function isPreview(x) { return x?.id === previewId; }
  function primary(x, date) {
    return x.places.filter(p => p.date === date && p.listId !== 'extra').sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  }
  function extras(x, date) {
    return x.places.filter(p => p.date === date && p.listId === 'extra').sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  }
  function renumber(x) {
    if (!isPreview(x)) return;
    let n = 0;
    for (const date of days(x)) for (const p of [...primary(x,date),...extras(x,date)]) p.sequence = ++n;
  }
  persist = function () {
    trips.forEach(renumber);
    oldPersist();
  };
  exportKml = function () {
    const x=trip();
    if (!isPreview(x)) return oldExportKml();
    const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const rows=[['Location','Place','Day','Number','Kind','Note']];
    rows.push([[x.hotel.name,x.hotel.address].join(', '),x.hotel.name,'Hotel','','Hotel','']);
    for (const p of x.places.slice().sort((a,b)=>(a.sequence??0)-(b.sequence??0))) {
      rows.push([[p.name,p.address||x.destination].join(', '),p.name,p.date,p.sequence,p.listId==='extra'?'Extra':'Main',p.note||'']);
    }
    saveFile('rahlati-istanbul-2026.csv','text/csv;charset=utf-8','\ufeff'+rows.map(row=>row.map(csv).join(',')).join('\r\n'));
    modal(lang==='ar'?'تصدير كل الأماكن إلى Google My Maps':'Export all places to Google My Maps',`<p>${lang==='ar'?'تم تنزيل CSV يضم كل الأماكن. في Google My Maps أنشئ خريطة واستورد الملف، واختَر عمود Location للموقع، ثم استخدم Day لتلوين الأيام. راجع نتائج الأماكن التي بلا عنوان محدد.':'The CSV includes every place. In Google My Maps import it using Location for positions and Day for colors. Verify places without exact addresses.'}</p><a class="btn primary full" href="https://www.google.com/mymaps" target="_blank" rel="noopener">Google My Maps ↗</a>`,null);
  };
  placeRating = function (p) {
    if (p.ratingSource === 'wanderlog-snapshot' && p.rating) return `<span class="place-rating">★ ${Number(p.rating).toFixed(1)} <small>${lang === 'ar' ? 'Wanderlog / Google · 29 سبتمبر' : 'Wanderlog / Google · Sep 29'}</small></span>`;
    return oldRating(p);
  };
  placeCard = function (p, ordered) {
    let html = oldCard(p, ordered);
    if (p.sequence) html = html.replace('<h3>', `<h3><span class="stop-number" style="background:${colorForDay(trip(),p.date)}">${p.sequence}</span> `);
    if (p.listId === 'extra') html = html.replace('class="place-card ', 'class="place-card extra-place ');
    return html;
  };
  home = function () {
    const banner = `<section class="container preview-entry"><div><span class="eyebrow">${lang === 'ar' ? 'خطة إسطنبول' : 'Istanbul plan'}</span><h2>${lang === 'ar' ? 'برنامج الأيام التسعة جاهز' : 'Your nine-day plan is ready'}</h2><p>${lang === 'ar' ? 'انطلاق 10:00 من فندق Akgün، أوقات الزيارة، أماكن إضافية حسب المنطقة، وروابط Google Maps.' : 'Start at 10:00 from Akgün with visit times, nearby extras and Google Maps links.'}</p></div><button class="btn primary" data-action="importPreview">${lang === 'ar' ? 'افتح خطة الرحلة' : 'Open the trip plan'} ↗</button></section>`;
    return oldHome() + banner;
  };

  function dayTitle(x,d) {
    const v = x.dayPlans?.[d];
    return lang === 'ar' ? v?.areaAr : v?.areaEn;
  }
  function schedule(x) {
    const dates=days(x),d=dates[day],main=primary(x,d),alternate=extras(x,d),info=x.dayPlans?.[d];
    const route=routeGroups(main).map((_,i)=>`<button class="btn primary" data-action="previewRoute" data-date="${d}" data-part="${i}">${lang === 'ar' ? 'مسار الأماكن الأساسية' : 'Main route'}${main.length>4?' '+(i+1):''} · Google Maps ↗</button>`).join('');
    return `<div class="day-navigator"><button class="day-step" data-action="previousDay" ${day===0?'disabled':''} aria-label="${lang==='ar'?'اليوم السابق':'Previous day'}" title="${lang==='ar'?'اليوم السابق':'Previous day'}">${lang==='ar'?'›':'‹'}</button><div class="day-tabs">${dates.map((v,i)=>`<button class="day-tab ${day===i?'active':''}" data-day="${i}">${shortDay(v)}</button>`).join('')}</div><button class="day-step" data-action="nextDay" ${day>=dates.length-1?'disabled':''} aria-label="${lang==='ar'?'اليوم التالي':'Next day'}" title="${lang==='ar'?'اليوم التالي':'Next day'}">${lang==='ar'?'‹':'›'}</button></div><section class="preview-day-heading"><span class="preview-day-dot" style="background:${colorForDay(x,d)}"></span><div><small>${t('day')} ${day+1} · ${fmt(d)}</small><h2>${esc(dayTitle(x,d) || (lang === 'ar' ? 'بانتظار إكمال التخطيط' : 'Planning in progress'))}</h2><p>${esc(lang === 'ar' ? info?.introAr || 'سأرتّب أماكن هذا اليوم بعد مراجعة أول يومين.' : info?.introEn || 'This day follows after reviewing the first two days.')}</p></div></section><div class="action-bar preview-toolbar">${route}<button class="btn" data-action="addPlace">+ ${t('addPlace')}</button></div>${main.length ? `<section class="panel preview-stops"><h3>${lang === 'ar' ? 'المسار الأساسي' : 'Main route'}</h3><div class="hotel-start">⌂ ${t('hotelFirst')}: <strong>${esc(x.hotel.name)}</strong> · 10:00</div>${main.map((p,i)=>`<div class="preview-stop">${placeCard(p,true)}<p class="preview-stop-note">${esc(p.note || '')}</p>${i<main.length-1?`<div class="preview-transfer">${lang === 'ar' ? 'انتقال واستراحة حتى الموعد التالي' : 'Travel and rest before the next stop'} · ${esc(main[i+1].time || '')}</div>`:''}</div>`).join('')}</section>` : `<div class="empty"><p>${lang === 'ar' ? 'لسه ما وزّعت أماكن هذا اليوم.' : 'No places scheduled yet.'}</p></div>`}${alternate.length?`<details class="panel preview-extras" ${alternate.length<=4?'open':''}><summary>${lang === 'ar' ? 'أماكن إضافية قريبة' : 'Extra nearby places'} <small>${alternate.length}</small></summary><p class="muted">${lang === 'ar' ? 'بدائل قريبة من مسار اليوم، بدون وقت إلزامي. تقدر تنقل أي واحد للمسار الأساسي.' : 'Nearby options with no fixed time. Move any place into your main route.'}</p>${alternate.map(p=>`<div class="preview-extra-item">${placeCard(p,false)}<button class="tiny" data-action="promoteExtra" data-id="${esc(p.id)}">+ ${lang==='ar'?'انقله للمسار الأساسي':'Add to main route'}</button></div>`).join('')}</details>`:''}`;
  }
  function mapPanel(x) {
    const dates=days(x),list=x.places.filter(p=>mapFilter==='all'||p.date===mapFilter).sort((a,b)=>a.sequence-b.sequence);
    const routes=(mapFilter==='all'?dates:[mapFilter]).map(d=>{const stops=primary(x,d),groups=routeGroups(stops);return stops.length?`<div class="google-day"><strong>${t('day')} ${dates.indexOf(d)+1} · ${esc(dayTitle(x,d)||'')}</strong><div class="google-route-buttons">${groups.map((_,i)=>`<button class="btn" data-action="previewRoute" data-date="${d}" data-part="${i}">${lang==='ar'?'افتح المسار':'Open route'} ${i+1} ↗</button>`).join('')}</div></div>`:''}).join('');
    return `<div class="section-title"><h2>${t('mapView')}</h2><button class="btn" data-action="exportKml">↓ ${t('exportGoogle')}</button></div><label class="field">${t('day')}<select id="mapFilter"><option value="all" ${mapFilter==='all'?'selected':''}>${t('categoryAll')}</option>${dates.map((d,i)=>`<option value="${d}" ${mapFilter===d?'selected':''}>${t('day')} ${i+1} · ${fmt(d)}</option>`).join('')}</select></label><section class="google-map-card"><h3>Google Maps</h3><p>${lang==='ar'?'اضغط مسار اليوم للملاحة على الطرق، أو افتح أي مكان برابط موقعه المحدد.':'Open a day route for road navigation or tap a place for its exact map link.'}</p><button class="btn primary google-open" data-action="openMap">${lang==='ar'?'افتح خريطة إسطنبول':'Open Istanbul map'} ↗</button></section><section class="google-routes"><h3>${lang==='ar'?'مسارات الأيام':'Day routes'}</h3>${routes||`<p class="muted">${lang==='ar'?'ما في أماكن مجدولة بعد.':'No scheduled stops yet.'}</p>`}</section><section class="google-places"><h3>${lang==='ar'?'كل الأماكن بالأرقام':'All numbered places'}</h3>${list.map(p=>`<button class="google-place" data-action="placeMap" data-id="${esc(p.id)}"><span class="google-number" style="background:${colorForDay(x,p.date)}">${p.sequence}</span><span><strong>${esc(p.name)}</strong><small>${p.listId==='extra'?(lang==='ar'?'إضافي · ':'Extra · '):p.time?esc(p.time)+' · ':''}${esc(p.address||'')}</small><small>${placeRating(p)}</small></span><span>↗</span></button>`).join('')}</section>`;
  }
  renderTab = function (x) {
    if (isPreview(x) && tab === 'itinerary') return schedule(x);
    if (isPreview(x) && tab === 'mapView') return mapPanel(x);
    return oldTab(x);
  };

  async function importPreview() {
    try {
      let x=trips.find(isPreview);
      if (!x) {
        const response=await fetch('./istanbul-preview.json?v=45');
        if (!response.ok) throw Error('Unable to load trip');
        const seed=await response.json();
        if (!Array.isArray(seed.places) || days(seed).length!==9) throw Error('Invalid trip data');
        x=seed;trips.unshift(x);
      } else if (Number(x.previewVersion||1)<2) {
        const response=await fetch('./istanbul-preview.json?v=45');
        if (!response.ok) throw Error('Unable to load trip');
        const seed=await response.json();
        if (!Array.isArray(seed.places) || seed.places.length!==128) throw Error('Invalid trip data');
        const existing=new Set(x.places.map(p=>p.id));
        for (const p of seed.places) if (!existing.has(p.id) && !/^w\d\d$/.test(p.id)) x.places.push(p);
        x.dayPlans={...seed.dayPlans,...x.dayPlans};
        x.title=seed.title;x.notes=seed.notes;x.previewVersion=2;
      }
      current=x.id;tab='overview';day=0;mapFilter='all';persist();render();
      if (location.search.includes('plan=istanbul-preview')) history.replaceState(null,'',location.pathname);
    } catch (error) { alert(lang==='ar'?'تعذّر فتح الخطة، حاول تحديث الصفحة.':'Could not open the plan. Try refreshing.'); }
  }
  document.addEventListener('click', e=>{
    const b=e.target.closest('[data-action]');
    if (!b) return;
    if (b.dataset.action==='importPreview') importPreview();
    if (b.dataset.action==='previewRoute') {
      const x=trip(),stops=primary(x,b.dataset.date),groups=routeGroups(stops),url=googleDirections(groups[Number(b.dataset.part)||0]||[]);
      if (url) openExternal(url);
    }
    if (b.dataset.action==='promoteExtra') {
      const x=trip(),p=x?.places.find(v=>v.id===b.dataset.id);
      if (!isPreview(x)||!p) return;
      p.listId='';p.order=primary(x,p.date).length;p.time='';
      persist();render();
    }
  });
  if (new URLSearchParams(location.search).get('plan')==='istanbul-preview' || isPreview(trip()) && Number(trip().previewVersion||1)<2) importPreview();
  else if (!trip()) render();
})();
