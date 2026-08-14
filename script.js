(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function globalUI(){const nav=$('#siteNav'),toggle=$('#navToggle');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('show',open)});nav.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('show');toggle.setAttribute('aria-expanded','false')}})}
$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());const progress=$('#scrollProgress'),top=$('#backToTop');let uiRaf=0;const paintScrollUI=()=>{uiRaf=0;if(progress){const h=document.documentElement.scrollHeight-innerHeight;progress.style.width=(h?scrollY/h*100:0)+'%'}if(top)top.classList.toggle('show',scrollY>420)};const onScroll=()=>{if(!uiRaf)uiRaf=requestAnimationFrame(paintScrollUI)};paintScrollUI();addEventListener('scroll',onScroll,{passive:true});top?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
const reveal=$$('.reveal');if(!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)reveal.forEach(x=>x.classList.add('show'));else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}}),{threshold:.1});reveal.forEach(x=>io.observe(x))}}
function projectScope(){const form=$('#projectForm');if(!form)return;const steps=$$('.scope-step'),progress=$('#scopeProgress');let current=0;const show=i=>{current=Math.max(0,Math.min(steps.length-1,i));steps.forEach((s,j)=>s.classList.toggle('active',j===current));if(progress)progress.textContent=String(current+1).padStart(2,'0')+' / 04';if(current===3)generateBrief();$('#scopeCard')?.scrollIntoView({behavior:'smooth',block:'nearest'})};
function validate(){const fields=[...steps[current].querySelectorAll('input,textarea,select')].filter(x=>x.required);for(const f of fields){if(f.type==='radio'){if(!steps[current].querySelector(`input[name="${f.name}"]:checked`)){f.reportValidity();return false}}else if(!f.checkValidity()){f.reportValidity();return false}}return true}
$$('.scope-next').forEach(b=>b.addEventListener('click',()=>{if(validate())show(current+1)}));$$('.scope-back').forEach(b=>b.addEventListener('click',()=>show(current-1)));
function generateBrief(){const data=new FormData(form),type=data.get('system_type')||'Not Sure',problem=(data.get('problem')||'').toLowerCase();let title='SYSTEM DISCOVERY',text='Begin with workflow discovery and architecture mapping before selecting the final technical approach.',tags=['Discovery','Architecture','Roadmap'];if(type==='Digital System'){title='CUSTOM DIGITAL SYSTEM';text='Recommended starting point: map users, workflows, data and permissions, then define a responsive platform or internal system architecture.';tags=['Platform','Dashboard','Data']}else if(type==='AI + Automation'){title='AUTOMATION WORKFLOW';text='Recommended starting point: identify repeatable hand-offs, information sources and decision points, then design the automation and human review layer.';tags=['Workflow','AI','Integration']}else if(type==='Connected Infrastructure'){title='CONNECTED CONTROL LAYER';text='Recommended starting point: audit devices, networking, access requirements and operational controls before defining the software and integration layer.';tags=['IoT','Control','Security']}
if(/whatsapp|message|lead|customer|booking|quote/.test(problem)&&!tags.includes('CRM'))tags.push('CRM / Messaging');if(/excel|spreadsheet|manual|capture|admin/.test(problem)&&!tags.includes('Automation'))tags.push('Automation');$('#briefTitle').textContent=title;$('#briefText').textContent=text;$('#briefTags').innerHTML=tags.map(t=>`<span>${t}</span>`).join('');$('#generatedBrief').value=`${title} | ${text} | Focus: ${tags.join(', ')}`}
form.addEventListener('submit',async e=>{e.preventDefault();if(!validate())return;const btn=$('#scopeSubmit'),status=$('#formStatus');btn.disabled=true;btn.textContent='TRANSMITTING...';status.textContent='';try{const res=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});if(!res.ok)throw Error();location.href='thank-you.html'}catch{status.textContent='Transmission failed. Please use email or WhatsApp, or try again.';btn.disabled=false;btn.textContent='Send Project Brief ↗'}})}
function lab(){const state={security:true,gate:false,garage:false,temp:22,lights:true,scene:'HOME'};const text=(id,v)=>{const e=$(id);if(e)e.textContent=v};const render=()=>{text('#securityStatus',state.security?'SECURE':'RELAXED');text('#securityBadge',state.security?'ARMED':'DISARMED');text('#gateStatus',state.gate?'OPEN':'CLOSED');text('#garageStatus',state.garage?'OPEN':'CLOSED');text('#tempValue',state.temp+'°');text('#lightBadge',state.lights?'ACTIVE':'STANDBY');$('#lightOrb')?.classList.toggle('off',!state.lights);text('#sceneBadge',state.scene);$$('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===state.scene))};$$('[data-lab]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.lab;if(a==='security')state.security=!state.security;if(a==='gate')state.gate=!state.gate;if(a==='garage')state.garage=!state.garage;if(a==='tempUp')state.temp=Math.min(28,state.temp+1);if(a==='tempDown')state.temp=Math.max(16,state.temp-1);if(a==='lights')state.lights=!state.lights;if(a==='refresh'){text('#energyValue',(3.3+Math.random()*3).toFixed(1)+' kWh');text('#waterValue',Math.round(68+Math.random()*22)+'%')}render()}));$$('[data-scene]').forEach(b=>b.addEventListener('click',()=>{state.scene=b.dataset.scene;if(state.scene==='AWAY'){state.security=true;state.lights=false}else if(state.scene==='NIGHT'){state.security=true;state.lights=true;state.temp=20}else if(state.scene==='FOCUS'){state.lights=true;state.temp=21}else{state.security=true;state.lights=true;state.temp=22}render()}));render()}
document.addEventListener('DOMContentLoaded',()=>{globalUI();projectScope();lab()})})();
/* SBM Cinematic Motion System v2: mobile-first, dependency-free 3-D scroll simulator */
(()=>{
  const q=(s,c=document)=>c.querySelector(s), qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(pointer:fine)');
  const mobile=matchMedia('(max-width: 860px)');
  const saveData=Boolean(navigator.connection?.saveData);
  const lowMemory=Number(navigator.deviceMemory||8)<=4;
  const lite=saveData || lowMemory;
  const activeDepth=new Set();
  let raf=0, pointerX=0, pointerY=0, lastScrollY=scrollY;

  function preparePortraits(){
    qa('.leader-photo').forEach(frame=>{
      const img=q('img',frame); if(!img||frame.dataset.depthReady)return;
      frame.dataset.depthReady='1';
      const bg=img.cloneNode(true); bg.alt=''; bg.setAttribute('aria-hidden','true'); bg.className='portrait-background';
      img.className='portrait-foreground';
      frame.insertBefore(bg,img);
    });
  }

  function sectionMasks(){
    const sections=qa('main > section');
    if(reduce.matches || !('IntersectionObserver' in window)){
      sections.forEach(s=>s.classList.add('section-active'));
      return;
    }
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting)entry.target.classList.add('section-active');
    }),{rootMargin:'-6% 0px -8%',threshold:.06});
    sections.forEach(s=>io.observe(s));
    q('main > section')?.classList.add('section-active');
  }

  function scroll3D(){
    if(reduce.matches)return;
    const targets=qa('.hero,.page-hero,.system-visual,.arch-map,.case-preview,.brand-preview,.leader-photo,.vision-band,.work-screen,.sbm-corporate-park');
    if(!targets.length)return;

    // Observe once; only visible/near-visible layers enter the animation loop.
    if('IntersectionObserver' in window){
      const depthIO=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){activeDepth.add(entry.target);entry.target.classList.add('depth-active')}
        else{activeDepth.delete(entry.target);entry.target.classList.remove('depth-active')}
      }),{rootMargin:'25% 0px 25%',threshold:0});
      targets.forEach(el=>depthIO.observe(el));
    }else targets.forEach(el=>activeDepth.add(el));

    const paint=()=>{
      raf=0;
      const vh=innerHeight||1;
      const currentY=scrollY;
      const velocity=Math.max(-28,Math.min(28,currentY-lastScrollY));
      lastScrollY=currentY;
      const intensity=mobile.matches ? .48 : (lite ? .68 : 1);
      const range=mobile.matches ? 12 : 22;

      document.documentElement.style.setProperty('--scroll-velocity',`${(velocity*.035).toFixed(3)}deg`);
      document.documentElement.style.setProperty('--scroll-page',`${Math.min(1,currentY/Math.max(1,document.documentElement.scrollHeight-vh)).toFixed(4)}`);

      activeDepth.forEach(el=>{
        const r=el.getBoundingClientRect();
        const p=Math.max(-1.15,Math.min(1.15,(r.top+r.height*.5-vh*.5)/vh));
        const y=Math.max(-range,Math.min(range,-p*range))*intensity;
        const x=pointerX*(mobile.matches?0:7)*intensity;
        const tilt=(p*(mobile.matches?1.15:1.8))*intensity;
        el.style.setProperty('--depth-y',`${y.toFixed(2)}px`);
        el.style.setProperty('--depth-y-inv',`${(-y).toFixed(2)}px`);
        el.style.setProperty('--depth-y-soft',`${(y*.45).toFixed(2)}px`);
        el.style.setProperty('--depth-y-inv-soft',`${(-y*.45).toFixed(2)}px`);
        el.style.setProperty('--depth-y-subtle',`${(y*.25).toFixed(2)}px`);
        el.style.setProperty('--depth-y-inv-subtle',`${(-y*.32).toFixed(2)}px`);
        el.style.setProperty('--depth-x',`${x.toFixed(2)}px`);
        el.style.setProperty('--depth-x-inv',`${(-x).toFixed(2)}px`);
        el.style.setProperty('--depth-r',`${tilt.toFixed(3)}deg`);
      });
    };
    const queue=()=>{if(!raf)raf=requestAnimationFrame(paint)};
    addEventListener('scroll',queue,{passive:true});
    addEventListener('resize',queue,{passive:true});
    queue();
  }

  function pointerDepth(){
    if(!fine.matches||reduce.matches||mobile.matches||lite)return;
    let pointerRaf=0;
    addEventListener('pointermove',e=>{
      pointerX=e.clientX/innerWidth-.5; pointerY=e.clientY/innerHeight-.5;
      if(pointerRaf)return;
      pointerRaf=requestAnimationFrame(()=>{
        pointerRaf=0;
        document.documentElement.style.setProperty('--pointer-x',`${(pointerX*7).toFixed(2)}px`);
        document.documentElement.style.setProperty('--pointer-y',`${(pointerY*7).toFixed(2)}px`);
      });
    },{passive:true});
    qa('.system-visual,.arch-map,.case-preview,.work-card,.leader-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        card.style.setProperty('--tilt-y',`${(x*4.2).toFixed(2)}deg`);
        card.style.setProperty('--tilt-x',`${(-y*3.6).toFixed(2)}deg`);
      },{passive:true});
      card.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-y','0deg');card.style.setProperty('--tilt-x','0deg')});
    });
  }

  function pageWipe(){
    const wipe=document.createElement('div'); wipe.className='sbm-page-wipe'; wipe.setAttribute('aria-hidden','true'); document.body.appendChild(wipe);
    if(reduce.matches || mobile.matches || lite)return;
    qa('a[href]').forEach(a=>a.addEventListener('click',e=>{
      if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
      let u; try{u=new URL(a.href,location.href)}catch{return}
      if(u.origin!==location.origin||(u.pathname===location.pathname&&u.hash))return;
      if(!/\.html$|\/$/.test(u.pathname))return;
      e.preventDefault(); document.body.classList.add('page-leaving');
      setTimeout(()=>{location.href=u.href},300);
    }));
  }

  function boot(){
    document.body.classList.add('motion-ready','scroll-3d');
    if(lite)document.body.classList.add('motion-lite');
    preparePortraits(); sectionMasks(); scroll3D(); pointerDepth(); pageWipe();
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();