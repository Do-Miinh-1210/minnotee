/* EMF vector preview for Word imports. No OLE execution, network or rasterisation.
 * Record layouts follow Microsoft's MS-EMF specification. Original bytes are
 * retained separately by the DOCX importer, including records not rendered. */
(()=>{'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],I=()=>[1,0,0,1,0,0];
function render(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength),U=o=>v.getUint32(o,true),N=o=>v.getInt32(o,true),F=o=>v.getFloat32(o,true),H=o=>v.getInt16(o,true);
 if(b.length<88||U(0)!==1||U(40)!==0x464d4520)throw Error('EMF không hợp lệ');
 const bounds=[N(8),N(12),N(16),N(20)],w=Math.max(1,bounds[2]-bounds[0]+1),h=Math.max(1,bounds[3]-bounds[1]+1),out=[],objects=new Map(),stack=[],unsupported=new Set();let path='',pathMode=false,records=0;
 let s={world:I(),win:[0,0],view:[0,0],we:[1,1],ve:[1,1],mode:1,pen:{color:'#000000',width:1,style:0},brush:{color:'#ffffff'},font:{height:16,name:'Arial',weight:400},text:'#000000',bg:'#ffffff',bk:1,align:0,point:[0,0],fillRule:1};
 const color=n=>'#'+[n&255,(n>>>8)&255,(n>>>16)&255].map(x=>x.toString(16).padStart(2,'0')).join('');
 const matrix=()=>mul([s.mode===1?1:s.ve[0]/s.we[0],0,0,s.mode===1?1:s.ve[1]/s.we[1],s.view[0]-(s.mode===1?1:s.ve[0]/s.we[0])*s.win[0],s.view[1]-(s.mode===1?1:s.ve[1]/s.we[1])*s.win[1]],s.world);
 const point=(x,y)=>{const m=matrix();return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];},fmt=n=>Number.isFinite(n)?+n.toFixed(4):0,xy=p=>p.map(fmt).join(' ');
 const scale=()=>{const m=matrix();return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]));};
 function draw(d,fill=false,stroke=true){if(!d)return;const p=s.pen,st=p&&stroke?p.color:'none',width=p?(p.cosmetic?1:Math.max(.35,Math.abs(p.width)*scale())):1,dash=p?[[],[5,3],[1,2],[5,2,1,2],[5,2,1,2,1,2]][p.style&15]||[]:[];out.push('<path d="'+d+'" fill="'+(fill&&s.brush?s.brush.color:'none')+'" stroke="'+st+'" stroke-width="'+fmt(width)+'" stroke-linecap="round" stroke-linejoin="round" fill-rule="'+(s.fillRule===2?'nonzero':'evenodd')+'"'+(dash.length?' stroke-dasharray="'+dash.map(x=>fmt(x*Math.max(.5,width))).join(' ')+'"':'')+'/>');}
 const stock=id=>id===5?{kind:'brush',color:'none'}:id<=4?{kind:'brush',color:['#fff','#ccc','#888','#444','#000'][id]}:id===8?{kind:'pen',color:'none',width:1,style:5}:id<=7?{kind:'pen',color:id===6?'#fff':'#000',width:1,style:0}:null;
 function select(id){const o=id&0x80000000?stock(id&0x7fffffff):objects.get(id);if(o)s[o.kind]={...o};}
 for(let p=0;p+8<=b.length;){const t=U(p),size=U(p+4);if(size<8||size%4||p+size>b.length||++records>100000)throw Error('Bản ghi EMF bị lỗi');const end=p+size;const req=n=>{if(size<n)throw Error('Bản ghi EMF thiếu dữ liệu');};
  if(t===14)break;
  if([2,3,4,5,6,85,86,87,88,89].includes(t)){
   req(28);const short=t>=85,n=U(p+24),step=short?4:8;if(n>100000||28+n*step>size)throw Error('Quá nhiều điểm EMF');const pts=[];for(let i=0;i<n;i++)pts.push(point(short?H(p+28+i*step):N(p+28+i*step),short?H(p+30+i*step):N(p+32+i*step)));
   const bez=[2,5,85,88].includes(t),to=[5,6,88,89].includes(t);let d=to?'':'M'+xy(pts[0]||[0,0]);if(to&&!path)d='M'+xy(point(...s.point));
   for(let i=to?0:1;i<pts.length;){if(bez&&i+2<pts.length){d+=' C'+pts.slice(i,i+3).map(xy).join(' ');i+=3;}else{d+=' L'+xy(pts[i]);i++;}}
   const polygon=[3,86].includes(t);if(polygon)d+=' Z';if(pathMode)path+=d;else draw(d,polygon);if(n)s.point=short?[H(p+28+(n-1)*step),H(p+30+(n-1)*step)]:[N(p+28+(n-1)*step),N(p+32+(n-1)*step)];
  }else switch(t){
   case 1:break;
   case 9:req(16);s.we=[N(p+8)||1,N(p+12)||1];break;
   case 10:req(16);s.win=[N(p+8),N(p+12)];break;
   case 11:req(16);s.ve=[N(p+8)||1,N(p+12)||1];break;
   case 12:req(16);s.view=[N(p+8),N(p+12)];break;
   case 13:break; // SETBRUSHORGEX is not a viewport translation.
   case 17:req(12);s.mode=U(p+8);break;
   case 18:req(12);s.bk=U(p+8);break;
   case 19:req(12);s.fillRule=U(p+8);break;
   case 22:req(12);s.align=U(p+8);break;
   case 24:req(12);s.text=color(U(p+8));break;
   case 25:req(12);s.bg=color(U(p+8));break;
   case 27:case 54:{req(16);const next=[N(p+8),N(p+12)],d=(t===27?'M':'L')+xy(point(...next));if(pathMode)path+=d;else if(t===54)draw('M'+xy(point(...s.point))+d);s.point=next;break;}
   case 33:stack.push(structuredClone(s));break;
   case 34:{req(12);const n=N(p+8),idx=n<0?stack.length+n:n-1;if(idx>=0&&idx<stack.length){s=stack[idx];stack.length=idx;}break;}
   case 35:case 36:{req(t===35?32:36);const m=Array.from({length:6},(_,i)=>F(p+8+i*4));if(!m.every(Number.isFinite))throw Error('Biến đổi EMF không hợp lệ');const mode=t===35?4:U(p+32);s.world=mode===1?I():mode===2?mul(s.world,m):mode===3?mul(m,s.world):m;break;}
   case 37:req(12);select(U(p+8));break;
   case 38:req(28);objects.set(U(p+8),{kind:'pen',style:U(p+12),width:N(p+16),cosmetic:N(p+16)===0,color:color(U(p+24))});break;
   case 39:req(24);objects.set(U(p+8),{kind:'brush',color:U(p+12)===1?'none':color(U(p+16))});break;
   case 40:req(12);objects.delete(U(p+8));break;
   case 42:case 43:{req(24);const a=point(N(p+8),N(p+12)),c=point(N(p+16),N(p+20));if(t===43)draw('M'+xy(a)+' L'+xy([c[0],a[1]])+' L'+xy(c)+' L'+xy([a[0],c[1]])+' Z',true);else{const rx=Math.abs(c[0]-a[0])/2,ry=Math.abs(c[1]-a[1])/2,mx=(c[0]+a[0])/2,my=(c[1]+a[1])/2;draw(`M${fmt(mx-rx)} ${fmt(my)} a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(2*rx)} 0 a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(-2*rx)} 0`,true);}break;}
   case 59:path='';pathMode=true;break;
   case 60:pathMode=false;break;
   case 61:path+=' Z';break;
   case 62:case 63:case 64:draw(path,t!==64,t!==62);path='';pathMode=false;break;
   case 68:path='';pathMode=false;break;
   case 82:{req(104);const name=new TextDecoder('utf-16le').decode(b.subarray(p+40,p+104)).split('\0')[0];objects.set(U(p+8),{kind:'font',height:N(p+12)||16,weight:N(p+28),italic:b[p+32]!==0,name,escape:N(p+20)});break;}
   case 90:case 91:{req(32);const groups=U(p+24),total=U(p+28);if(groups>10000||total>100000||32+groups*4+total*4>size)throw Error('Đa giác EMF quá lớn');let cursor=p+32+groups*4,d='';for(let j=0;j<groups;j++){const n=U(p+32+j*4);for(let k=0;k<n;k++){if(cursor+4>end)throw Error('Đa giác EMF thiếu điểm');d+=(k?' L':'M')+xy(point(H(cursor),H(cursor+2)));cursor+=4;}if(t===91)d+=' Z';}if(pathMode)path+=d;else draw(d,t===91);break;}
   case 83:case 84:{req(76);const n=U(p+44),off=U(p+48),flags=U(p+52),dx=U(p+72),bytes=t===84?2:1;if(n>20000||off+n*bytes>size)throw Error('Chữ EMF không hợp lệ');if(flags&16){unsupported.add('glyph-index');break;}let text=new TextDecoder(t===84?'utf-16le':'windows-1252').decode(b.subarray(p+off,p+off+n*bytes));if(/symbol/i.test(s.font.name))text=[...text].map(c=>globalThis.NBWmf?.symbolChar(c.charCodeAt(0)&255)||c).join('');const cp=(s.align&1)===1;let x=cp?s.point[0]:N(p+36),y=cp?s.point[1]:N(p+40),font=s.font,height=Math.abs(font.height);const lengths=[];if(dx&&dx+n*4*(flags&8192?2:1)<=size)for(let i=0;i<n;i++)lengths.push(N(p+dx+i*4*(flags&8192?2:1)));const total=lengths.reduce((a,b)=>a+b,0);if(cp)s.point=[s.point[0]+total,s.point[1]];   /* TA_UPDATECP: vẽ tại vị trí hiện tại rồi dời vị trí */if((s.align&6)===6)x-=total/2;else if(s.align&2)x-=total;if((s.align&24)!==24)y+=(s.align&8)?-height*.2:height*.8;let positions=[],at=x;for(let i=0;i<n;i++){positions.push(fmt(at));at+=lengths[i]||0;}out.push('<text transform="matrix('+matrix().map(fmt).join(' ')+')" x="'+(lengths.length?positions.join(' '):fmt(x))+'" y="'+fmt(y)+'" fill="'+s.text+'" font-family="'+esc(font.name)+'" font-size="'+height+'" font-weight="'+font.weight+'"'+(font.italic?' font-style="italic"':'')+'>'+esc(text)+'</text>');break;}
   case 95:req(52);objects.set(U(p+8),{kind:'pen',style:U(p+28),width:U(p+32),cosmetic:!(U(p+28)&0x10000),color:color(U(p+40))});break;
   // State/raster operations without bitmap data in common Word graph exports.
   case 20:case 21:case 28:case 30:case 58:case 70:case 75:case 76:case 94:case 98:case 115:break;
   default:unsupported.add(t);
  }
  p=end;
 }
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds[0]} ${bounds[1]} ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Hình vector EMF" style="max-width:100%;height:auto">${out.join('')}</svg>`,unsupported:[...unsupported],records,width:w,height:h};
}
const api={render,toSvg(input){try{return render(input).svg;}catch{return null;}}};if(typeof window!=='undefined')window.NBEmf=api;if(typeof module!=='undefined')module.exports=api;
})();
