(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const slides = [...document.querySelectorAll('.slide')];
  const stage = $('stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['COVER', '01 · RECALCULATING', '02 · FAMILIAR CORNER', '03 · TURN LEFT', '04 · PLOT TWIST', '05 · SCENIC ROUTE', '06 · YOUR MAP', '07 · ARRIVED', 'THE END'];
  let index = 0;
  let transitionUntil = 0, numberFrame = 0, toastTimer = 0, pointer = null, wheelTotal = 0, wheelTime = 0, wheelConsumed = false;
  function notify(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
  }
  function numberAnimation() {
    cancelAnimationFrame(numberFrame);
    const numbers = [...slides[index].querySelectorAll('[data-value]')];
    const start = performance.now();
    const render = t => {
      const p = reduced.matches ? 1 : Math.min(1, (t - start) / 1250);
      const eased = 1 - (1 - p) ** 3;
      numbers.forEach(el => { el.textContent = (Number(el.dataset.value) * eased).toFixed(Number(el.dataset.decimals || 0)); });
      if (p < 1) numberFrame = requestAnimationFrame(render);
    };
    numberFrame = requestAnimationFrame(render);
  }
  function go(next, initial = false) {
    next = Math.max(0, Math.min(slides.length - 1, next));
    if (!initial && next === index) return;
    index = next;
    transitionUntil = initial ? 0 : performance.now() + (reduced.matches ? 150 : 700);
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index); s.classList.toggle('past', i < index);
      s.inert = i !== index; s.setAttribute('aria-hidden', String(i !== index));
    });
    $('page-status').textContent = `${names[index]} · ${String(index + 1).padStart(2, '0')} / 09`;
    $('next').disabled = index === slides.length - 1;
    numberAnimation();
  }
  $('next').addEventListener('click', () => go(index + 1));
  $('replay').addEventListener('click', () => go(0));
  reduced.addEventListener('change', () => { if (reduced.matches) numberAnimation(); });
  stage.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || e.target.closest('button,a,input')) return;
    pointer = {id:e.pointerId, x:e.clientX, y:e.clientY, moved:false};
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    if (Math.abs(e.clientY-pointer.y)>10 || Math.abs(e.clientX-pointer.x)>10) {
      pointer.moved = true;
    }
  });
  function finishPointer(e, cancelled = false) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dy = e.clientY - pointer.y, dx = e.clientX - pointer.x;
    pointer = null;
    if (!cancelled && Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)*1.25 && performance.now() > transitionUntil) go(index + (dy < 0 ? 1 : -1));
  }
  stage.addEventListener('pointerup', e => finishPointer(e));
  stage.addEventListener('pointercancel', e => finishPointer(e, true));
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const t = performance.now();
    // Consume the entire gesture, including trackpad momentum, after one turn.
    if (t - wheelTime > 350) { wheelTotal = 0; wheelConsumed = false; }
    wheelTime = t;
    if (wheelConsumed || t < transitionUntil) { wheelConsumed = true; return; }
    wheelTotal += e.deltaY;
    if (Math.abs(wheelTotal) > 55) {
      wheelConsumed = true;
      go(index + (wheelTotal > 0 ? 1 : -1));
    }
  }, {passive:false});
  document.addEventListener('keydown', e => {
    if ($('share-dialog').open || e.target.matches('input,textarea,button')) return;
    if (e.key==='ArrowUp'||e.key==='PageDown') { e.preventDefault(); go(index+1); }
    if (e.key==='ArrowDown'||e.key==='PageUp') { e.preventDefault(); go(index-1); }
    if (e.key==='Home') go(0);
  });
  const dialog=$('share-dialog');
  const shareURL=() => { const u=new URL(location.href); u.hash=''; u.search=''; return u.href; };
  function openShare() { $('share-url').value=shareURL(); $('native-share').hidden=!navigator.share; dialog.showModal(); }
  $('share').addEventListener('click',openShare); $('end-share').addEventListener('click',openShare);
  dialog.addEventListener('click',e=> {if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('copy-link').addEventListener('click',async()=>{
    try { await navigator.clipboard.writeText(shareURL()); $('copy-link').textContent='Copied ✓'; setTimeout(()=>$('copy-link').textContent='Copy link',1800); }
    catch { $('share-url').focus(); $('share-url').select(); $('copy-link').textContent='Select & copy the link'; }
  });
  $('native-share').addEventListener('click',async()=> {try{await navigator.share({title:'Your off route — Every detour counted',text:'The map had a plan. Your turns told a different story.',url:shareURL()});}catch(e){if(e.name!=='AbortError')notify('Copy the link to share this story.');}});
  $('fullscreen').addEventListener('click',async()=> {
    try {if(document.fullscreenElement)await document.exitFullscreen();else if(document.querySelector('.story').requestFullscreen)await document.querySelector('.story').requestFullscreen();else notify('For an app-like view, use Add to Home Screen in your browser.');}
    catch { notify('For an app-like view, use Add to Home Screen in your browser.'); }
  });
  document.addEventListener('fullscreenchange',()=> $('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  function fitPhone() {
    const view = window.visualViewport;
    const width = view ? view.width : innerWidth;
    const height = view ? view.height : innerHeight;
    const scale = Math.min(1, (width - 16) / 414, (height - 16) / 886);
    document.querySelector('.story').style.setProperty('--device-scale', scale);
  }
  addEventListener('resize', fitPhone);
  window.visualViewport?.addEventListener('resize', fitPhone);
  fitPhone();
  go(0,true);
})();
