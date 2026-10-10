/* Pop-up « Télécharger » : remplace l'ancienne page /beta.
   Tout lien portant data-download ouvre une carte qui monte du bas de l'écran. */
(function(){
  const APP_STORE = 'https://apps.apple.com/fr/app/remplacare/id6778571454';

  const css = `
  .dl-overlay{
    position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(21,38,58,0);visibility:hidden;
    transition:background .3s ease,visibility 0s linear .35s;
  }
  .dl-overlay.open{background:rgba(21,38,58,.55);visibility:visible;transition:background .3s ease}
  .dl-card{
    position:relative;width:100%;max-width:340px;background:#E4E8EC;border-radius:20px;
    padding:30px 24px 24px;text-align:center;box-shadow:0 18px 50px rgba(21,38,58,.35);
    transform:translateY(100vh);transition:transform .45s cubic-bezier(.2,.9,.3,1.1);
    font-family:'Jost',system-ui,sans-serif;
  }
  .dl-overlay.open .dl-card{transform:translateY(0)}
  .dl-card h2{
    font-family:'Fraunces',Georgia,serif;color:#1C324A;font-size:22px;font-weight:600;
    margin:0 0 6px;line-height:1.2;
  }
  .dl-card p{color:#5A6B7B;font-size:14px;margin:0 0 20px}
  .dl-close{
    position:absolute;top:10px;right:12px;width:32px;height:32px;border:0;background:none;
    font-size:24px;line-height:1;color:#5A6B7B;cursor:pointer;border-radius:50%;
  }
  .dl-close:hover{background:rgba(28,50,74,.08);color:#1C324A}
  .dl-btn{
    display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
    padding:14px 18px;border-radius:26px;font-weight:600;font-size:16px;text-decoration:none;
    border:0;cursor:pointer;font-family:inherit;transition:background .2s;
  }
  .dl-btn + .dl-btn{margin-top:12px}
  .dl-btn svg{width:22px;height:22px;flex-shrink:0;fill:currentColor}
  .dl-ios{background:#1C324A;color:#fff}
  .dl-ios:hover{background:#15263A}
  .dl-android{background:#4E7A67;color:#fff}
  .dl-android:hover{background:#3F6354}
  .dl-android[aria-disabled="true"]{background:#fff;color:#5A6B7B;cursor:default}
  .dl-soon{font-size:12px;font-weight:500;opacity:.8}
  @media (prefers-reduced-motion: reduce){
    .dl-overlay,.dl-card{transition:none}
  }`;

  const apple = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.66zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.05-.52 2.68-1.28z"/></svg>';
  const android = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22A11.4 11.4 0 0 0 12 8.15c-1.77 0-3.44.36-4.92.99L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48C3.3 11.16 1.2 14.3 1 18h22c-.2-3.7-2.3-6.84-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>';

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'dl-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="dl-card" role="dialog" aria-modal="true" aria-labelledby="dlTitle">' +
      '<button class="dl-close" type="button" aria-label="Fermer">×</button>' +
      '<h2 id="dlTitle">Télécharger RemplaCare</h2>' +
      '<p>Choisis ton téléphone</p>' +
      '<a class="dl-btn dl-ios" href="' + APP_STORE + '" target="_blank" rel="noopener">' + apple + 'iOS</a>' +
      '<a class="dl-btn dl-android" role="link" aria-disabled="true">' + android + 'Android <span class="dl-soon">· bientôt</span></a>' +
    '</div>';
  document.body.appendChild(overlay);

  const card = overlay.querySelector('.dl-card');
  let lastFocus = null;

  function open(){
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.dl-ios').focus({preventScroll:true});
  }
  function close(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(lastFocus) lastFocus.focus({preventScroll:true});
  }

  document.addEventListener('click', (e)=>{
    const trigger = e.target.closest('[data-download]');
    if(trigger){ e.preventDefault(); open(); }
  });
  overlay.addEventListener('click', (e)=>{
    if(!card.contains(e.target) || e.target.closest('.dl-close')) close();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
