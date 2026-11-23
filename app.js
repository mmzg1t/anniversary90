(() => {
  'use strict';
  const data = window.ANNIVERSARY_CONTENT;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  // 保留现场栏目与轮播内容，收到照片后在 content.js 中开启。
  $('#moments').hidden = data.site.showMoments !== true;
  $('.nav-inner a[href="#moments"]').hidden = data.site.showMoments !== true;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const phone = window.matchMedia('(max-width: 600px)');
  const state = { pages: { inscription:0, profile:0, historyEarly:0, historyLate:0 }, viewerItems:[], viewerIndex:0, zoom:1, panX:0, panY:0 };
  const historyEarly = [...data.history['55'].items,...data.history['60'].items];
  const historyLate = [...data.history['70'].items,...data.history['80'].items];
  const status = message => { $('#page-status').textContent = message; };
  const photoIcon = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="9" y="11" width="46" height="42"/><circle cx="22" cy="24" r="5"/><path d="m10 46 14-14 10 10 8-8 13 13"/></svg>';
  const portraitIcon = '<svg viewBox="0 0 90 110" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="45" cy="33" r="19"/><path d="M12 100V91c0-21 14-32 33-32s33 11 33 32v9M32 62l13 18 13-18M45 80v20"/></svg>';
  function placeholder(label, portrait=false) {
    return `<div class="media-placeholder${portrait?' portrait-placeholder':''}" role="img" aria-label="${escape(label)}，待替换">${portrait?portraitIcon:photoIcon}</div>`;
  }
  function inscriptionArt(item) {
    if(item.image) return `<img class="provided-inscription" src="${escape(item.image)}" alt="${escape(item.title)}" loading="lazy">`;
    return `<div class="inscription-visual" role="img" aria-label="${escape(item.title)}，题词版式示意"><span class="inscription-note">${escape(item.note)}</span><div class="inscription-main">${item.lines.map(line=>`<span>${escape(line)}</span>`).join('')}</div><span class="inscription-seal" aria-hidden="true">九<br>秩</span></div>`;
  }
  function coverArt(item) {
    if(item.image) return `<img class="provided-cover" src="${escape(item.image)}" alt="${escape(item.title)}" loading="lazy">`;
    return `<div class="cover-art ${escape(item.variant)}" role="img" aria-label="${escape(item.title)}封面复刻示意"><span class="cover-top">${escape(item.year)}</span><span class="cover-title">${escape(item.title)}</span><span class="cover-subtitle">MATHEMATICS BULLETIN</span><span class="cover-issue">${escape(item.issue)}</span><span class="cover-publisher">中国数学会<br>北京师范大学</span></div>`;
  }
  function inscriptionInkPreview(item) {
    if (!item.image || !(item.width > 0 && item.height > 0)) return inscriptionArt(item);
    // Insets describe the visible area in the carousel. The lightbox uses the full scan.
    const [left, top, right, bottom] = item.previewInset;
    const x = Math.round(item.width * left / 100);
    const y = Math.round(item.height * top / 100);
    const width = item.width - x - Math.round(item.width * right / 100);
    const height = item.height - y - Math.round(item.height * bottom / 100);
    const filterId = 'ink-' + escape(item.id);
    const blur = Math.max(8, Math.min(24, Math.round(item.width * .018)));
    return `<div class="inscription-ink-mount">
      <svg class="inscription-ink-preview" role="img" aria-label="${escape(item.title)}"
           width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}"
           style="--ink-ratio: ${width / height}">
        <defs>
          <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
            <!-- Estimate the local paper brightness to lift ink from uneven scans. -->
            <feColorMatrix in="SourceGraphic" type="matrix" result="brightness" values="
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              .2126 .7152 .0722 0 0"/>
            <feGaussianBlur in="brightness" stdDeviation="${blur}" edgeMode="duplicate" result="paper"/>
            <feComposite in="paper" in2="brightness" operator="arithmetic" k2="1" k3="-1"/>
            <feComponentTransfer result="ink">
              <feFuncA type="linear" slope="3.2" intercept="-.13"/>
            </feComponentTransfer>
            <feFlood flood-color="#000"/>
            <feComposite in2="ink" operator="in"/>
          </filter>
        </defs>
        <image href="${escape(item.image)}" width="${item.width}" height="${item.height}" filter="url(#${filterId})"/>
      </svg>
    </div>`;
  }
  function exhibitCard(item, group, index) {
    const art = item.previewInset ? inscriptionInkPreview(item) : inscriptionArt(item);
    return `<figure class="exhibit-card${item.directPhoto ? ' direct-photo' : ''}"><button class="exhibit-button" data-gallery="${group}" data-index="${index}" aria-label="放大查看：${escape(item.title)}"><div class="exhibit-frame">${art}</div></button><figcaption class="inscription-caption">${escape(item.caption||item.author||'')}</figcaption></figure>`;
  }
  const galleries = {
    inscription: { items:data.inscriptions, size:()=>phone.matches?1:2, target:'#inscription-grid', label:'题词寄语', card:(item,i)=>exhibitCard(item,'inscriptions',i) },
    profile: { items:data.profiles, size:()=>1, target:'#profile', label:'历任主编及顾问', card:profileCard },
    historyEarly: { items:historyEarly, size:()=>phone.matches?1:2, target:'#historyEarly-grid', label:'55周年 · 60周年', adaptive:true, counter:true, card:(item,i)=>exhibitCard(item,'historyEarly',i) },
    historyLate: { items:historyLate, size:()=>phone.matches?1:2, target:'#historyLate-grid', label:'70周年 · 80周年', adaptive:true, counter:true, card:(item,i)=>exhibitCard(item,'historyLate',i) },
  };
  function profilePortrait(person) {
    const image = person.image
      ? `<img src="${escape(person.image)}" alt="${escape(person.name)}" loading="lazy">`
      : placeholder(person.name || '主编肖像', true);
    const frameClass = person.closeCrop ? 'profile-image profile-image-close' : 'profile-image';
    return `<div class="${frameClass}">${image}</div>`;
  }

  function profileCard(p) {
    const portraits = p.portraits || [{ image:p.image, name:p.imageAlt||p.name }];
    if (portraits.length > 1 && portraits.every(person => person.description)) {
      return `<div class="profile-pair">
        <h3 class="profile-group-title">${escape(p.groupTitle || p.name)}</h3>
        <div class="profile-people">
          ${portraits.map(person => `
            <div class="profile-person">
              ${profilePortrait(person)}
              <div class="profile-copy">
                <h4>${escape(person.name)}<span class="profile-period">${escape(p.period)}</span></h4>
                <p class="profile-bio">${escape(person.description)}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }
    return `<div class="profile-portraits">${portraits.map(profilePortrait).join('')}</div><div class="profile-copy"><h3>${escape(p.name)}<span class="profile-period">${escape(p.period)}</span></h3><p class="profile-bio">${escape(p.description)}</p>${p.detail?`<p class="profile-detail">${escape(p.detail)}</p>`:''}</div>`;
  }
  function galleryPages(key) {
    const g=galleries[key],pages=[];
    for(let i=0;i<g.items.length;) {
      let count=g.size();
      if(g.adaptive) {
        const portrait=item=>item&&item.width/item.height<.95;
        count=!phone.matches&&portrait(g.items[i])&&portrait(g.items[i+1])&&g.items[i].id.split('-')[1]===g.items[i+1].id.split('-')[1]?2:1;
      }
      pages.push(g.items.slice(i,i+count).map((item,j)=>({item,index:i+j})));i+=count;
    }
    return pages;
  }
  function pageCount(key) { return galleryPages(key).length; }
  function renderGallery(key) {
    const g=galleries[key], pages=galleryPages(key), count=pages.length;
    state.pages[key]=Math.min(state.pages[key],Math.max(0,count-1));
    const current=pages[state.pages[key]]||[];
    $(g.target).innerHTML=current.map(({item,index})=>g.card(item,index)).join('');
    $(g.target).classList.toggle('single-item',current.length===1);
    $(g.target).classList.toggle('wide-item', Boolean(g.adaptive && current.length === 1
      && current[0].item.width / current[0].item.height >= .95));
    $(g.target).setAttribute('aria-label',`${g.label}，第${state.pages[key]+1}组，共${count}组`);
    const dots=$(`#${key}-dots`);
    if(g.counter) {
      dots.textContent=`${state.pages[key]+1} / ${count}`;
      dots.setAttribute('aria-label',`${g.label}，第${state.pages[key]+1}组，共${count}组`);
    } else {
      if(dots.children.length!==count) dots.innerHTML=Array.from({length:count},(_,i)=>`<button data-carousel="${key}" data-slide="${i}" aria-label="${g.label}第${i+1}组" aria-controls="${g.target.slice(1)}"></button>`).join('');
      [...dots.children].forEach((button,i)=>button.setAttribute('aria-current',String(i===state.pages[key])));
    }
    for(const direction of ['prev','next']) {
      const button=$(`#${key}-${direction}`);
      button.disabled=count<=1;
      button.hidden=count<=1;
    }
    $(`#${key}-carousel`).hidden=count===0;
  }
  function goToPage(key,index) {
    const count=pageCount(key);
    if(!count) return;
    state.pages[key]=(index+count)%count;
    renderGallery(key);
    status(`${galleries[key].label}，第${state.pages[key]+1}组，共${count}组`);
  }

  const dialog = $('#lightbox');
  const stage = $('#lightbox-stage');
  const surface = $('#zoom-surface');
  function applyTransform() {
    surface.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
    $('#zoom-reset').textContent = `${Math.round(state.zoom * 100)}%`;
    stage.classList.toggle('zoomed', state.zoom > 1);
    $('#zoom-out').disabled = state.zoom <= 1;
    $('#zoom-in').disabled = state.zoom >= 3;
  }
  function resetZoom() { state.zoom = 1; state.panX = state.panY = 0; applyTransform(); }
  function zoomBy(amount) {
    state.zoom = Math.max(1, Math.min(3, Math.round((state.zoom + amount) * 100) / 100));
    if (state.zoom === 1) state.panX = state.panY = 0;
    applyTransform();
  }
  function renderViewer() {
    const item = state.viewerItems[state.viewerIndex];
    if (!item) return;
    $('#lightbox-title').textContent = item.title;
    $('#lightbox-category').textContent = item.id?.startsWith('history-')?'岁月留珍':{ inscription: '题词典藏', cover: '封面流年', photo: '光影九秩' }[item.type];
    surface.innerHTML = item.type === 'inscription' ? inscriptionArt(item) : item.type === 'cover' ? coverArt(item) : item.image ? `<img src="${escape(item.image)}" alt="${escape(item.alt || item.title)}" draggable="false">` : placeholder('活动照片');
    $('#lightbox-counter').textContent = `${state.viewerIndex + 1} / ${state.viewerItems.length}`;
    $('#lightbox-caption').textContent = item.type === 'photo' ? `${item.subtitle}${item.demo ? ' · 图片待替换' : ''}` : `${item.author || item.subtitle || ''}${item.demo ? ' · 当前为版式示意' : ''}`;
    $('#lightbox-prev').disabled = state.viewerItems.length <= 1;
    $('#lightbox-next').disabled = state.viewerItems.length <= 1;
    resetZoom();
  }
  let previousFocus;
  function openViewer(group, index) {
    state.viewerItems = group === 'inscriptions' ? data.inscriptions : group === 'covers' ? data.covers : group === 'historyEarly' ? historyEarly : group === 'historyLate' ? historyLate : data.events[group];
    state.viewerIndex = Math.max(0, Math.min(index, state.viewerItems.length - 1));
    previousFocus = document.activeElement;
    renderViewer(); dialog.showModal(); document.body.style.overflow = 'hidden'; $('#lightbox-close').focus();
  }
  function stepViewer(delta) { state.viewerIndex = (state.viewerIndex + delta + state.viewerItems.length) % state.viewerItems.length; renderViewer(); }
  $('#lightbox-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; previousFocus?.focus({ preventScroll: true }); });
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepViewer(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepViewer(1); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(.25); }
    if (event.key === '-') { event.preventDefault(); zoomBy(-.25); }
    if (event.key === '0') resetZoom();
  });
  $('#lightbox-prev').addEventListener('click', () => stepViewer(-1));
  $('#lightbox-next').addEventListener('click', () => stepViewer(1));
  $('#zoom-in').addEventListener('click', () => zoomBy(.25));
  $('#zoom-out').addEventListener('click', () => zoomBy(-.25));
  $('#zoom-reset').addEventListener('click', resetZoom);
  stage.addEventListener('dblclick', () => state.zoom > 1 ? resetZoom() : zoomBy(.75));
  let drag = null;
  stage.addEventListener('pointerdown', event => { if (state.zoom <= 1) return; drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY, pointer: event.pointerId }; stage.setPointerCapture(event.pointerId); stage.classList.add('dragging'); });
  stage.addEventListener('pointermove', event => { if (!drag || event.pointerId !== drag.pointer) return; const maxX = stage.clientWidth * (state.zoom - 1) / 2; const maxY = stage.clientHeight * (state.zoom - 1) / 2; state.panX = Math.max(-maxX, Math.min(maxX, drag.panX + event.clientX - drag.x)); state.panY = Math.max(-maxY, Math.min(maxY, drag.panY + event.clientY - drag.y)); applyTransform(); });
  const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);


  document.addEventListener('click', event => {
    const imageButton=event.target.closest('[data-gallery]');
    if(imageButton) openViewer(imageButton.dataset.gallery,Number(imageButton.dataset.index));
    const dot=event.target.closest('[data-carousel][data-slide]');
    if(dot) goToPage(dot.dataset.carousel,Number(dot.dataset.slide));
  });
  for(const key of Object.keys(galleries)) {
    $(`#${key}-prev`).addEventListener('click',()=>goToPage(key,state.pages[key]-1));
    $(`#${key}-next`).addEventListener('click',()=>goToPage(key,state.pages[key]+1));
    const carousel=$(`#${key}-carousel`);
    carousel.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      goToPage(key,state.pages[key]+(event.key==='ArrowRight'?1:-1));
    });
    let swipe=null, suppressClick=false;
    carousel.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch' && event.isPrimary) {
        suppressClick=false;
        swipe={id:event.pointerId,x:event.clientX,y:event.clientY};
      }
    });
    carousel.addEventListener('pointerup',event=>{
      if(!swipe || swipe.id!==event.pointerId) return;
      const dx=event.clientX-swipe.x, dy=event.clientY-swipe.y;
      swipe=null;
      if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.3) {
        suppressClick=true;
        goToPage(key,state.pages[key]+(dx<0?1:-1));
      }
    });
    carousel.addEventListener('pointercancel',()=>{swipe=null;});
    carousel.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
    renderGallery(key);
  }
  // 封面和两条照片带共享拖动、滑块与键盘控制。
  function bindHorizontalGallery(gallery, scrollbar, itemCount) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let maxScroll = 0, cardStep = 1, targetScroll = 0, motionFrame = 0, syncFrame = 0;
    let fromSliderMotion = false, sliderHeld = false, stripDrag = null, suppressClick = false;
    const clampScroll = value => Math.max(0, Math.min(maxScroll, value));
    function syncScroll() {
      syncFrame = 0;
      // 拖动滑块期间保留手指位置，避免滚动事件反向拉扯滑块。
      if(!sliderHeld && !(motionFrame && fromSliderMotion)) scrollbar.value = maxScroll > 0 ? gallery.scrollLeft / maxScroll * 10000 : 0;
      const first = Math.min(itemCount, Math.floor((gallery.scrollLeft + 1) / cardStep) + 1);
      scrollbar.setAttribute('aria-valuetext', `第${first}张起，共${itemCount}张`);
    }
    function stopMotion() {
      cancelAnimationFrame(motionFrame); motionFrame = 0;
      targetScroll = gallery.scrollLeft;
      syncScroll();
    }
    function moveTo(left, fromSlider = false) {
      fromSliderMotion = fromSlider;
      targetScroll = clampScroll(left);
      if(reducedMotion.matches) {
        stopMotion(); gallery.scrollLeft = clampScroll(left); syncScroll(); return;
      }
      if(motionFrame) return;
      let previous = performance.now(), position = gallery.scrollLeft;
      function tick(now) {
        const elapsed = Math.min(40, now - previous); previous = now;
        const distance = targetScroll - position;
        if(Math.abs(distance) < .5) {
          gallery.scrollLeft = targetScroll; motionFrame = 0; syncScroll(); return;
        }
        position += distance * (1 - Math.exp(-elapsed / 65));
        gallery.scrollLeft = position;
        motionFrame = requestAnimationFrame(tick);
      }
      motionFrame = requestAnimationFrame(tick);
    }
    function measure() {
      stopMotion();
      maxScroll = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
      const card = gallery.querySelector('.strip-card');
      cardStep = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(gallery).columnGap) : 1;
      scrollbar.disabled = maxScroll <= 0;
      scrollbar.style.setProperty('--cover-thumb-width', `${Math.max(phone.matches ? 56 : 96, scrollbar.clientWidth * gallery.clientWidth / Math.max(1,gallery.scrollWidth))}px`);
      syncScroll();
    }
    scrollbar.addEventListener('pointerdown', () => { stopMotion(); sliderHeld = true; });
    const releaseSlider = () => { sliderHeld = false; syncScroll(); };
    window.addEventListener('pointerup', releaseSlider);
    window.addEventListener('pointercancel', releaseSlider);
    scrollbar.addEventListener('input', () => moveTo(Number(scrollbar.value) / 10000 * maxScroll, true));
    gallery.addEventListener('scroll', () => {
      if(!syncFrame) syncFrame = requestAnimationFrame(syncScroll);
    }, {passive:true});
    gallery.addEventListener('wheel', stopMotion, {passive:true});
    gallery.addEventListener('dragstart', event => event.preventDefault());
    gallery.addEventListener('pointerdown', event => {
      stopMotion();
      if(event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressClick = false;
      stripDrag = {id:event.pointerId,x:event.clientX,left:gallery.scrollLeft,lastX:event.clientX,lastTime:performance.now(),velocity:0,moved:false};
    });
    gallery.addEventListener('pointermove', event => {
      if(!stripDrag || stripDrag.id !== event.pointerId) return;
      const dx = event.clientX - stripDrag.x;
      if(!stripDrag.moved && Math.abs(dx) < 6) return;
      if(!stripDrag.moved) {
        stripDrag.moved = true; gallery.setPointerCapture(event.pointerId);
        gallery.classList.add('is-dragging');
      }
      event.preventDefault();
      const now = performance.now(), dt = Math.max(8, now - stripDrag.lastTime);
      stripDrag.velocity = .5 * stripDrag.velocity + .5 * (stripDrag.lastX - event.clientX) / dt;
      stripDrag.lastX = event.clientX; stripDrag.lastTime = now;
      gallery.scrollLeft = clampScroll(stripDrag.left - dx);
    });
    function endDrag(event) {
      if(!stripDrag || stripDrag.id !== event.pointerId) return;
      const drag = stripDrag; stripDrag = null;
      gallery.classList.remove('is-dragging');
      if(gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
      if(drag.moved) {
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
        if(event.type === 'pointerup' && performance.now() - drag.lastTime < 90)
          moveTo(gallery.scrollLeft + Math.max(-2,Math.min(2,drag.velocity)) * 130);
      }
    }
    gallery.addEventListener('pointerup', endDrag);
    gallery.addEventListener('pointercancel', endDrag);
    window.addEventListener('pointerup', endDrag);
    gallery.addEventListener('click', event => {
      if(suppressClick) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    new ResizeObserver(measure).observe(gallery);
    gallery.addEventListener('keydown', event => {
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const start = motionFrame ? targetScroll : gallery.scrollLeft;
      moveTo(event.key === 'Home' ? 0 : event.key === 'End' ? maxScroll : start + (event.key === 'ArrowRight' ? cardStep : -cardStep));
    });
    measure();
  }

  const coverGallery = $('#cover-gallery');
  coverGallery.innerHTML = data.covers.map((item, index) =>
    `<figure class="cover-card strip-card"><button class="cover-button" data-gallery="covers" data-index="${index}" aria-label="放大查看：${escape(item.title)}">${coverArt(item).replace('loading="lazy"', 'loading="eager" decoding="async" draggable="false"')}</button></figure>`
  ).join('');
  bindHorizontalGallery(coverGallery, $('#cover-scrollbar'), data.covers.length);

  for(const [group, items] of Object.entries(data.events)) {
    const gallery = $(`#${group}-gallery`);
    gallery.innerHTML = items.map((item, index) =>
      `<figure class="strip-card photo-card"><button type="button" data-gallery="${group}" data-index="${index}" aria-label="放大查看：${escape(item.title)}"><img src="${escape(item.thumbnail)}" alt="${escape(item.alt)}" loading="lazy" decoding="async" draggable="false"></button></figure>`
    ).join('');
    bindHorizontalGallery(gallery, $(`#${group}-scrollbar`), items.length);
  }
  phone.addEventListener('change',()=>{
    for(const key of ['inscription','historyEarly','historyLate']) {
      const firstIndex=Number($(galleries[key].target).querySelector('[data-index]')?.dataset.index||0);
      state.pages[key]=Math.max(0,galleryPages(key).findIndex(items=>items.some(entry=>entry.index===firstIndex)));
      renderGallery(key);
    }
  });
  const sections=$$('main > section:not([hidden])'), navLinks=$$('.nav-inner a');
  let ticking=false;
  function updateScroll() {
    const offset=$('.section-nav').offsetHeight+120;
    let current=sections[0].id;
    for(const section of sections) if(section.getBoundingClientRect().top<=offset) current=section.id;
    navLinks.forEach(link=>{
      const selected=link.hash===`#${current}`;
      link.classList.toggle('active',selected);
      if(selected) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
    });
    ticking=false;
  }
  window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true;}},{passive:true});
  $('#hero-description').replaceChildren(...data.site.intro.split(/\n\s*\n/).map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  $('#report-title').textContent = data.report.title;
  const reportSubtitle = $('#report-subtitle');
  reportSubtitle.textContent = data.report.subtitle || '';
  reportSubtitle.hidden = !data.report.subtitle;
  $('#report-summary').textContent = data.report.summary;
  const reportCover = $('#report-cover');
  reportCover.width = data.report.cover.width;
  reportCover.height = data.report.cover.height;
  reportCover.src = data.report.cover.image;
  updateScroll();
})();

