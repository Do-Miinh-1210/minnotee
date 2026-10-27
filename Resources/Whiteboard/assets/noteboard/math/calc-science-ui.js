/* Additional calculator modes; all selectors and styles are scoped to NoteBoard Calc. */
window.NBCalcAdvanced={create(api){'use strict';
 const K=window.NBCalcScience,doc=document,el=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const modes=[['complex','2','Số phức','a+bi, r∠θ, liên hợp, môđun'],['base','3','Hệ cơ số','DEC · HEX · BIN · OCT, logic 32 bit'],['matrix','4','Ma trận','MatA–D, đến 4×4, định thức, nghịch đảo'],['vector','5','Véc-tơ','VctA–D, tích vô hướng, có hướng, góc'],['stats','6','Thống kê','Một biến, tần số, 7 dạng hồi quy'],['dist','7','Phân phối','Chuẩn, nhị thức và Poisson'],['ineq','A','Bất phương trình','Bậc 2–4, bảng dấu và tập nghiệm'],['verify','B','Kiểm tra','So sánh biểu thức, chuỗi bất đẳng thức'],['ratio','C','Tỉ lệ','a:b = c:d, tìm một ẩn']];
 const extras={convert:'Đổi đơn vị',dms:'Độ–phút–giây',factor:'Phân tích thừa số nguyên tố',product:'Tích ∏'};
 const names=Object.fromEntries(modes.map(r=>[r[0],r[2]]));Object.assign(names,extras);
 let cache={inputs:{},matrices:{},vectors:{}},mode='',fields={},last=null,exact=true,activeInput=null;
 try{const d=JSON.parse(localStorage.getItem('noteboard-calc-science-v1')||'null');if(d&&typeof d==='object')for(const key of ['inputs','matrices','vectors'])if(d[key]&&typeof d[key]==='object'&&!Array.isArray(d[key]))cache[key]=d[key];}catch{}
 const save=()=>{try{localStorage.setItem('noteboard-calc-science-v1',JSON.stringify(cache));}catch{}};
 const panel=el('div',undefined,'nbc-panel nbc-science');panel.hidden=true;panel.dataset.panel='science';panel.id='nbcScience';
 const style=el('style');style.textContent=`
 #calculator .nbc-science{font:14px/1.45 system-ui,sans-serif;max-height:360px;overflow:auto;padding:10px;color:#173b36}
 #calculator .nbc-science h3{font-size:16px;margin:0 0 6px}
 #calculator .nbc-science label{display:flex;flex-direction:column;gap:4px;min-width:0;margin:7px 0;font-size:12px}
 #calculator .nbc-science input,#calculator .nbc-science textarea,#calculator .nbc-science select{box-sizing:border-box;width:100%;min-width:0;min-height:36px;border:1px solid #91b1a7;border-radius:6px;background:#fff;color:#173b36;padding:6px;font:15px system-ui}
 #calculator .nbc-science textarea{min-height:100px;resize:vertical;font:14px monospace;white-space:pre}
 #calculator .nbc-science .sci-row{display:flex;gap:7px;flex-wrap:wrap}#calculator .nbc-science .sci-row>label{flex:1;min-width:65px}
 #calculator .nbc-science .sci-grid{display:grid;gap:5px}#calculator .nbc-science .sci-grid label{margin:2px 0}
 #calculator .nbc-science button{border:1px solid #9bbdb0;border-radius:6px;background:#f5fcf8;color:#144e43;min-height:34px;padding:5px 9px;cursor:pointer;font:13px system-ui}
 #calculator .nbc-science .sci-tools{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
 #calculator .nbc-science .sci-output{padding:9px;margin-top:8px;border-top:1px solid #91b1a7;overflow:auto;font-size:17px;white-space:pre-wrap;overflow-wrap:anywhere}
 #calculator .nbc-science .sci-output table{border-collapse:collapse;width:100%;font-size:14px}#calculator .nbc-science td,#calculator .nbc-science th{padding:5px;text-align:left;border-bottom:1px solid #cfddd7}
 #calculator .nbc-science .sci-help{font-size:12px;color:#526c60;margin:5px 0}#calculator .nbc-science .error{color:#a22020}
 #calculator .nbc-science .sci-calc{background:#146b59;color:white;font-weight:700}
 @media(max-width:500px){#calculator .nbc-science{max-height:38dvh}#calculator .nbc-science input,#calculator .nbc-science select{font-size:16px;min-height:40px}}
 `;
 doc.head.append(style);doc.querySelector('#calculator .nbc-lcd').append(panel);
 const supports=m=>Object.hasOwn(names,m),angle=()=>api.angle(),num=s=>api.evaluate(String(s)),n=k=>num(fields[k].value),str=k=>fields[k].value;
 const memory=()=>cache.inputs[mode]||(cache.inputs[mode]={});
 function invalidate(){last=null;panel.querySelector('.sci-output')?.replaceChildren();}
 function field(key,label,value='',type='input',parent=panel){
  const lab=el('label',label),input=el(type);input.id='nbcSci-'+key;input.setAttribute('aria-label',label);input.autocomplete='off';input.spellcheck=false;
  if(type==='input')input.inputMode='text';
  const raw=memory()[key];input.value=typeof raw==='string'?raw.slice(0,30000):String(value);fields[key]=input;
  input.addEventListener('focus',()=>{activeInput=input;});input.addEventListener('input',()=>{memory()[key]=input.value;invalidate();save();});lab.append(input);parent.append(lab);return input;
 }
 function choice(key,label,items,value,change,parent=panel){const lab=el('label',label),select=el('select');select.id='nbcSci-'+key;select.setAttribute('aria-label',label);for(const [v,t] of items){const o=el('option',t);o.value=v;select.append(o);}select.value=items.some(i=>i[0]===memory()[key])?memory()[key]:value;fields[key]=select;select.onchange=()=>{memory()[key]=select.value;invalidate();save();change?.();};lab.append(select);parent.append(lab);return select;}
 function btn(text,fn,parent=panel,cls){const b=el('button',text,cls);b.type='button';b.onmousedown=e=>e.preventDefault();b.onclick=()=>{try{fn();}catch(e){error(e);}};parent.append(b);return b;}
 function help(text){panel.append(el('p',text,'sci-help'));}
 function insert(text){let input=activeInput;if(!input||!panel.contains(input)||!['INPUT','TEXTAREA'].includes(input.tagName))input=fields.expr;if(!input)return;input.setRangeText(text,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
 function tools(items){const row=el('div',undefined,'sci-tools');for(const [label,text] of items)btn(label,()=>insert(text??label),row);panel.append(row);}
 const group=()=>{const row=el('div',undefined,'sci-row');panel.append(row);return row;};
 const describe=v=>{
  if(typeof v==='number')return api.format(v,exact);
  if(v.kind==='complex'){
   const eps=1e-13*Math.max(Math.abs(v.re),Math.abs(v.im)),re=Math.abs(v.re)<eps?0:v.re,im=Math.abs(v.im)<eps?0:v.im;
   if(fields.form?.value==='polar'){const r=Math.hypot(re,im),a=Math.atan2(im,re)*(angle()==='RAD'?1:angle()==='GRAD'?200/Math.PI:180/Math.PI);return api.format(r,exact)+' ∠ '+api.format(a,exact);}
   return im===0?api.format(re,exact):(re?api.format(re,exact)+(im<0?' − ':' + '):im<0?'−':'')+(Math.abs(im)===1?'':api.format(Math.abs(im),exact))+'i';
  }
  if(v.kind==='matrix')return v.rows.map(r=>'[ '+r.map(x=>api.format(x,exact)).join(' ; ')+' ]').join('\n');
  if(v.kind==='vector')return '( '+v.values.map(x=>api.format(x,exact)).join(' ; ')+' )';
  return String(v);
 };
 function output(){let out=panel.querySelector('.sci-output');if(!out){out=el('div',undefined,'sci-output');out.id='nbcSciOut';out.setAttribute('aria-live','polite');panel.append(out);}return out;}
 function error(e){last=null;const out=output();out.classList.add('error');out.textContent=e.message||String(e);}
 function showResult(){const out=output();out.classList.remove('error');out.replaceChildren();if(!last)return;if(last.value!==undefined)out.textContent=describe(last.value);else if(last.entries){const table=el('table');for(const [label,v] of last.entries){const tr=el('tr');tr.append(el('th',label),el('td',v===null?'Không xác định':typeof v==='number'?api.format(v,exact):String(v)));table.append(tr);}out.append(table);}else out.textContent=last.text;}
 const readStored=(type)=>{const out={};for(const [key,value] of Object.entries(cache[type==='matrix'?'matrices':'vectors']))if(/^(Mat|Vct)[A-D]$/.test(key)){try{out[key]=type==='matrix'?K.M(value):K.V(value);}catch{}}return out;};
 function matrixEditor(vector){
  const store=vector?'vectors':'matrices',prefix=vector?'Vct':'Mat',row=group();
  choice('slot','Bộ nhớ',Array.from('ABCD',v=>[prefix+v,prefix+v]),prefix+'A',rebuild,row);
  choice('rows',vector?'Số chiều':'Số hàng',(vector?[2,3]:[1,2,3,4]).map(v=>[String(v),String(v)]),'2',rebuild,row);
  if(!vector)choice('cols','Số cột',[1,2,3,4].map(v=>[String(v),String(v)]),'2',rebuild,row);
  const grid=el('div',undefined,'sci-grid');panel.append(grid);
  function rebuild(){grid.replaceChildren();const slot=str('slot'),a=cache[store][slot],r=+str('rows'),c=vector?1:+str('cols');grid.style.gridTemplateColumns='repeat('+(vector?r:c)+',minmax(0,1fr))';for(let i=0;i<r;i++)for(let j=0;j<c;j++){const key='cell'+i+'_'+j;delete memory()[key];field(key,vector?'v'+(i+1):'a'+(i+1)+(j+1),vector?a?.[i]??0:a?.[i]?.[j]??0,'input',grid);}invalidate();}
  fields.slot.onchange=()=>{memory().slot=str('slot');const old=cache[store][str('slot')];if(old){fields.rows.value=String(old.length);memory().rows=fields.rows.value;if(!vector){fields.cols.value=String(old[0].length);memory().cols=fields.cols.value;}}rebuild();save();};
  rebuild();btn('Lưu '+prefix+'A–D',()=>{const r=+str('rows'),c=vector?1:+str('cols'),values=Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>n('cell'+i+'_'+j)));cache[store][str('slot')]=vector?K.V(values.flat()).values:K.M(values).rows;save();invalidate();output().textContent='Đã lưu '+str('slot');});
  help('Nhập các ô rồi bấm Lưu. Biểu thức dùng bộ nhớ đã lưu; OPTN chèn tên và phép tính.');
  field('expr','Biểu thức',prefix+'A');
  tools(vector?[[prefix+'A'],[prefix+'B'],[prefix+'C'],[prefix+'D'],['VctAns'],['Dot','Dot('],['Cross','Cross('],['Angle','Angle('],['Abs','Abs('],['UnitV','UnitV(']]:[[prefix+'A'],[prefix+'B'],[prefix+'C'],[prefix+'D'],['MatAns'],['Det','Det('],['Trn','Trn('],['⁻¹','^(-1)'],['Identity','Identity('],['Abs','Abs(']]);
 }
 function show(m){
  if(!supports(m)){panel.hidden=true;return;}mode=m;fields={};last=null;activeInput=null;panel.hidden=false;panel.replaceChildren(el('h3',names[m]));
  if(m==='complex'){
   field('expr','Biểu thức số phức','(1+i)^4+(1-i)^2');choice('form','Hiển thị',[['rect','a + bi'],['polar','r ∠ θ']],'rect',()=>{if(last)showResult();});
   tools([['i'],['∠'],['Conjg','Conjg('],['Abs','Abs('],['Arg','Arg('],['ReP','ReP('],['ImP','ImP(']]);help('Ví dụ: 2*(sqrt(3)+i), 5∠30. Góc theo DEG / RAD / GRAD đang chọn.');
  }else if(m==='base'){
   choice('base','Hệ nhập',[['10','DEC'],['16','HEX'],['2','BIN'],['8','OCT']],'10');field('expr','Biểu thức nguyên','10+5');tools(['A','B','C','D','E','F',' and ',' or ',' xor ',' xnor ','not(','neg('].map(x=>[x]));help('32 bit có dấu. Có thể trộn d10 + h10 + b10 + o10. Chia lấy phần nguyên.');
  }else if(m==='matrix'||m==='vector')matrixEditor(m==='vector');
  else if(m==='stats'){
   choice('model','Kiểu thống kê',[['single','1 biến'],['linear','y = a + bx'],['quadratic','y = a + bx + cx²'],['log','y = a + b ln(x)'],['exp','y = a e^(bx)'],['ab','y = a b^x'],['power','y = a x^b'],['inverse','y = a + b/x']],'single');
   field('data','Dữ liệu (mỗi dòng một mẫu)','1\n2\n3','textarea');help('1 biến: x; tần số. Hồi quy: x; y; tần số. Tần số có thể bỏ trống (mặc định 1). Dán cột từ Excel bằng dấu tab; số thập phân dùng dấu chấm.');
  }else if(m==='dist'){
   choice('kind','Phân phối',[['normalPD','Normal PD'],['normalCD','Normal CD'],['inverseNormal','Inverse Normal'],['binomialPD','Binomial PD'],['binomialCD','Binomial CD'],['poissonPD','Poisson PD'],['poissonCD','Poisson CD']],'normalPD',()=>show(m));
   const type=str('kind'),r=group();
   if(type==='normalCD'){field('lower','Cận dưới','-1','input',r);field('upper','Cận trên','1','input',r);}
   else if(type==='inverseNormal')field('area','Xác suất bên trái','0.975','input',r);
   else field('x',type.startsWith('normal')?'x':'x (hoặc danh sách: 0;1;2)','0','input',r);
   const r2=group();if(type.startsWith('normal')||type==='inverseNormal'){field('sigma','σ > 0','1','input',r2);field('mu','μ','0','input',r2);}
   else if(type.startsWith('binomial')){field('n','Số lần N','10','input',r2);field('p','Xác suất p','0.5','input',r2);}else field('lambda','λ','3','input',r2);
   help('CD nhị thức/Poisson trả P(X ≤ x). Normal CD trả xác suất giữa hai cận.');
  }else if(m==='ineq'){
   choice('degree','Bậc',[['2','2'],['3','3'],['4','4']],'2',()=>show(m));choice('sign','So sánh với 0',[['<','< 0'],['<=','≤ 0'],['>','> 0'],['>=','≥ 0']],'<');const r=group();for(let i=0;i<=+str('degree');i++)field('coef'+i,'Hệ số '+String.fromCharCode(97+i),i===0?'1':i===+str('degree')?'-1':'0','input',r);
  }else if(m==='verify'){field('expr','Biểu thức so sánh','1/2 < 2/3 <= 1');tools([['='],['≠'],['<'],['≤'],['>'],['≥']]);help('So sánh số thực có xét sai số dấu phẩy động; không phải chứng minh đồng nhất đại số.');}
  else if(m==='ratio'){help('a : b = c : d. Nhập x vào đúng một ô cần tìm.');const r=group();['a','b','c','d'].forEach((key,i)=>field(key,key,['1','2','3','x'][i],'input',r));}
  else if(m==='convert'){
   choice('group','Đại lượng',[['length','Độ dài'],['area','Diện tích'],['volume','Thể tích'],['mass','Khối lượng'],['speed','Vận tốc'],['pressure','Áp suất'],['energy','Năng lượng'],['power','Công suất'],['temperature','Nhiệt độ'],['angle','Góc']],'length',()=>show(m));field('value','Giá trị','1');const r=group(),options=Object.keys(K.units[str('group')]).map(x=>[x,x]);choice('from','Từ',options,options[0][0],null,r);choice('to','Sang',options,options[1][0],null,r);
  }else if(m==='dms'){
   const r=group();field('d','Độ (dấu âm ở đây)','12','input',r);field('m','Phút','30','input',r);field('s','Giây','0','input',r);help('Bấm = để đổi sang độ thập phân. Nhập độ thập phân ở ô Độ, phút và giây bằng 0 để đổi ngược.');
  }else if(m==='factor')field('value','Số nguyên 2–9 999 999 999','360');
  else if(m==='product'){field('expr','Tích các giá trị f(x)','x');const r=group();field('lower','x bắt đầu','1','input',r);field('upper','x kết thúc','5','input',r);help('Cận là số nguyên, tối đa 10 000 thừa số.');}
  btn('Tính =',calculate,panel,'sci-calc');output();panel.scrollTop=0;
  activeInput=fields.expr||panel.querySelector('input,textarea');activeInput?.focus({preventScroll:true});
 }
 function calculate(){try{
  let result={title:names[mode],source:'',graph:null};
  if(['complex','matrix','vector'].includes(mode)){
   const vars={...api.state.vars,Ans:api.state.ans,...readStored(mode),...(memory().answer?{[mode==='matrix'?'MatAns':mode==='vector'?'VctAns':'Ans']:memory().answer}:{})};
   result.source=str('expr');result.value=K.expression(result.source,{vars,angle:angle(),real:num});memory().answer=result.value;
   if(result.value.kind==='complex')result.graph=['('+result.value.re+','+result.value.im+')'];
   if(result.value.kind==='vector')result.graph=['Vector(('+result.value.values.map(()=>0).join(',')+'),('+result.value.values.join(',')+'))'];
  }else if(mode==='base'){result.source=str('expr');const r=K.baseN(result.source,+str('base'));result.entries=[['DEC',r.dec],['HEX',r.hex],['BIN',r.bin],['OCT',r.oct]];}
  else if(mode==='stats'){
   const rows=str('data').trim().split(/\n/).filter(x=>x.trim()).map(line=>line.trim().split(/[;\t]+/).map(num)),model=str('model'),r=K.statistics(rows,model);
   result.source='Dữ liệu: '+str('data');const labels={sumX:'Σx',sumX2:'Σx²',meanX:'x̄',varianceX:'σx²',sigmaX:'σx',sX:'sx',minX:'min(x)',maxX:'max(x)',median:'Trung vị',meanY:'ȳ',sumY:'Σy',sumY2:'Σy²',sumXY:'Σxy',sigmaY:'σy',sY:'sy'};result.entries=Object.entries(r).map(([k,v])=>[labels[k]||k,v]);
   if(model!=='single'){const A='('+r.a+')',B='('+r.b+')',f={linear:A+'+'+B+'*x',quadratic:A+'+'+B+'*x+('+r.c+')*x^2',log:A+'+'+B+'*ln(x)',exp:A+'*exp('+B+'*x)',ab:A+'*'+B+'^x',power:A+'*x^'+B,inverse:A+'+'+B+'/x'}[model];result.graph=[...rows.map(r=>'('+r[0]+','+r[1]+')'),'f(x)='+f];result.entries.push(['Hàm hồi quy',f]);}
  }else if(mode==='dist'){
   const type=str('kind'),p={};for(const k of Object.keys(fields))if(k!=='kind'&&k!=='x')p[k]=n(k);
   const xs=fields.x?str('x').split(';').map(num):[0];if(xs.length>1000)throw Error('Tối đa 1000 giá trị x');
   result.source=type+' · '+Object.entries(fields).filter(([k])=>k!=='kind').map(([k,v])=>k+'='+v.value).join('; ');
   const values=xs.map(x=>K.distribution(type,{...p,x}));if(values.length===1)result.value=values[0];else result.entries=xs.map((x,i)=>['x = '+x,values[i]]);
   if(type.startsWith('normal'))result.graph=['f(x)=exp(-((x-('+p.mu+'))/('+p.sigma+'))^2/2)/(('+p.sigma+')*sqrt(2*pi))'];
  }else if(mode==='ineq'){
   const c=Array.from({length:+str('degree')+1},(_,i)=>n('coef'+i)),op=str('sign'),pieces=K.inequality(c,op,api.roots),format=x=>x===Infinity?'+∞':x===-Infinity?'−∞':api.format(x,exact);
   const poly=c.map((v,i)=>'('+v+')'+(c.length-1-i?'*x^'+(c.length-1-i):'')).join('+');result.source=poly+' '+op+' 0';result.text=pieces.length?pieces.map(p=>p.l===p.u?'{'+format(p.l)+'}':(p.lc?'[':'(')+format(p.l)+'; '+format(p.u)+(p.uc?']':')')).join(' ∪ '):'∅ (vô nghiệm)';result.graph=['f(x)='+poly];
  }else if(mode==='verify'){result.source=str('expr');result.text=K.verify(result.source,num)?'Đúng (True)':'Sai (False)';}
  else if(mode==='ratio'){const raw=['a','b','c','d'].map(str);result.source=raw[0]+':'+raw[1]+' = '+raw[2]+':'+raw[3];result.value=K.ratio(raw.map(v=>v.trim().toLowerCase()==='x'?null:num(v)));}
  else if(mode==='convert'){result.source=str('value')+' '+str('from')+' → '+str('to');result.value=K.convert(n('value'),str('group'),str('from'),str('to'));}
  else if(mode==='dms'){const v=K.dms(n('d'),n('m'),n('s'));result.source=str('d')+'° '+str('m')+'′ '+str('s')+'″';result.entries=[['Độ thập phân',v],['Độ–phút–giây',K.toDMS(v)]];}
  else if(mode==='factor'){result.source=str('value');result.text=K.factors(n('value')).map(([p,k])=>String(p)+(k>1?'^'+k:'')).join(' × ');}
  else if(mode==='product'){const a=n('lower'),b=n('upper');if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||b<a||b-a>=10000)throw Error('Cận nguyên tăng dần, tối đa 10 000 thừa số');let v=1;for(let x=a;x<=b;x++){v*=api.evaluate(str('expr'),{X:x});if(!Number.isFinite(v))throw Error('Tích vượt phạm vi số');}result.source='∏ ['+a+'…'+b+'] '+str('expr');result.value=v;}
  last=result;if(typeof result.value==='number'){api.state.ans=result.value;api.save();}save();showResult();return result;
 }catch(e){error(e);return null;}}
 function text(){if(!last&&!calculate())return null;const val=last.value!==undefined?describe(last.value):last.entries?last.entries.map(([k,v])=>k+' = '+(typeof v==='number'?api.format(v,exact):v??'Không xác định')).join('\n'):last.text;return last.title+'\n'+last.source+'\n⇒ '+val;}
 function command(c){if(!supports(api.state.mode))return false;
  if(c==='exe'){calculate();return true;}if(c==='sd'){exact=!exact;showResult();return true;}
  if(c==='fns'){panel.querySelector('.sci-tools')?.scrollIntoView({block:'nearest'});return true;}
  if(c==='ac'){const input=activeInput;if(input&&panel.contains(input)){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}else invalidate();return true;}
  return false;
 }
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();calculate();}if(e.key==='Escape')api.hide();});
 return {modes,names,supports,show,calculate,command,text,insert,get activeInput(){return activeInput;},get result(){return last;},graph(){if(!last&&!calculate())return null;return last.graph;},refresh:showResult};
}};
