const PRODUCTS=[
  {id:'adaudit',icon:'🛡️',name:'ADAudit Plus',desc:'AD auditing and alerting'},
  {id:'dataSecurity',icon:'🔐',name:'DataSecurity Plus',desc:'Data and file auditing'},
  {id:'eventlog',icon:'📜',name:'EventLog Analyzer',desc:'Log collection and reports'},
  {id:'log360',icon:'🧭',name:'Log360',desc:'Centralized security analytics'},
  {id:'ad360',icon:'🧩',name:'AD360',desc:'Identity platform suite'},
  {id:'admanager',icon:'👤',name:'ADManager Plus',desc:'AD management automation'},
  {id:'adselfservice',icon:'🔑',name:'ADSelfService Plus',desc:'Self-service identity controls'},
  {id:'m365manager',icon:'☁️',name:'M365 Manager Plus',desc:'M365 administration and reports'},
  {id:'recoverymanager',icon:'🧯',name:'RecoveryManager Plus',desc:'AD backup and restore'},
  {id:'exchangereporter',icon:'📧',name:'Exchange Reporter Plus',desc:'Exchange reporting'},
  {id:'sharepointmanager',icon:'📁',name:'SharePoint Manager Plus',desc:'Placeholder criteria pending user input'},
  {id:'log360cloud',icon:'🌐',name:'Log360 Cloud',desc:'Placeholder criteria pending official source'}
];

if(document.getElementById('details-form')){
  const form=document.getElementById('details-form');
  form.assessment_date.value=new Date().toISOString().split('T')[0];
  form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());sessionStorage.setItem('hctDraft',JSON.stringify(data));location.href='product-picker.html';});
}

if(document.getElementById('picker')){
  const draft=JSON.parse(sessionStorage.getItem('hctDraft')||'{}');
  if(!draft.customer_name){location.href='customer-details.html';}
  const set=new Set(PRODUCTS.map(p=>p.id));
  const picker=document.getElementById('picker');
  const draw=()=>{picker.innerHTML=PRODUCTS.map(p=>`<article class="pick-card ${set.has(p.id)?'active':''}" data-id="${p.id}"><div class="pick-name">${p.icon} ${p.name}</div><div class="muted">${p.desc}</div></article>`).join('');};
  draw();
  picker.addEventListener('click',e=>{const card=e.target.closest('.pick-card');if(!card)return;const id=card.dataset.id;set.has(id)?set.delete(id):set.add(id);draw();});
  document.getElementById('picker-continue').addEventListener('click',async()=>{if(!set.size)return;const payload={...draft,selected_components:[...set]};const created=await Api.createAssessment(payload);location.href=`assessment.html?id=${created.id}`;});
}
