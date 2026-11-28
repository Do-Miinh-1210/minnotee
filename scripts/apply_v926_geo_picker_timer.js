/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
// MinNote v0.0.9.26:
// 1. Merge Geometry Parameters (Tham số mới + Bảng tham số & Ràng buộc) into
//    the Dựng hình (Geometry) popover and remove the standalone f= toolbar button.
// 2. Replace the Countdown Timer bicep mascot (💪) with the signature MinNote Pi logo dial.
// 3. Redesign Random Student Picker (Gọi tên ngẫu nhiên) with 4 distinct calling methods:
//    Vòng quay may mắn (wheel), Lật thẻ bí ẩn (cards), Quét lưới (radar), Bốc thăm bi (capsule).

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

function replaceRange(label, startMarker, endMarker, replacement) {
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`[${label}] Start marker not found: ${startMarker}`);
  const endIdx = src.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) throw new Error(`[${label}] End marker not found: ${endMarker}`);
  src = src.slice(0, startIdx) + replacement + src.slice(endIdx);
  console.log(`[OK] Patched ${label} (start=${startIdx}, oldLen=${endIdx - startIdx}, newLen=${replacement.length})`);
}

// ============================================================================
// 1. MERGE THAM SỐ INTO DỰNG HÌNH POPOVER & REMOVE STANDALONE f= TOOLBAR BUTTON
// ============================================================================
const geoMergedCode = `/*__MN_GEO_PARAMS_V926_MERGED__*/geo:()=>Pt("geo")&&h.jsx(si,{align:"right",open:_t==="geo",setOpen:ne=>xt(ne?"geo":""),columns:5,bySection:!0,button:h.jsxs(zt,{title:n.geoTip,on:on("geo"),onClick:()=>Zf("geo","geo"),children:[h.jsx(oe.geometry,{}),h.jsx(oe.chevron,{})]}),children:l2.filter(([ne])=>ne!=="marks").map(([ne,de],Ke)=>{const _isVi=n.geoSections&&n.geoSections.construct==="Dựng hình";const lt=(ze,Ft)=>h.jsxs("div",{className:"menu-section",children:[h.jsx("div",{className:"menu-heading",children:n.geoSections[ze]}),Ft.map(Wt=>h.jsxs("button",{className:l.k==="geo"&&l.t===Wt?"checked":"",title:n.geoHints[Wt],onClick:()=>mn({k:"geo",t:Wt}),children:[h.jsxs("span",{className:"tool-label",children:[x9[Wt](),n.geoTools[Wt]]}),!e.mobile&&Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)&&h.jsx("kbd",{children:Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)})]},Wt)),ze==="construct"&&h.jsxs(D.Fragment,{children:[h.jsxs("button",{className:"mn-geo-param-btn",title:_isVi?"Tạo tham số hình học mới (a = 2 cm, α = 60°)":"New geometric parameter (a = 2 cm, α = 60°)",onClick:()=>{xt(""),window.MinNoteGeoParams&&window.MinNoteGeoParams.onToolbarClick()},children:[h.jsxs("span",{className:"tool-label",children:[h.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[h.jsx("path",{d:"M5 17c1.2 0 2-.9 2.4-2.5L9.2 7h3.3"}),h.jsx("path",{d:"M6.4 10.5h4.2"}),h.jsx("path",{d:"M14.5 11.5h5.5"}),h.jsx("path",{d:"M14.5 15.5h5.5"})]}),_isVi?"Tham số mới (a, α)":"New parameter (a, α)"]}),!e.mobile&&h.jsx("kbd",{children:"Alt+P"})]},"mn-param-new"),h.jsxs("button",{className:"mn-geo-param-btn",title:_isVi?"Mở bảng quản lý tham số, ràng buộc độ dài/góc & dựng hình 2D/3D":"Open Parameters, Constraints & 2D/3D Builder",onClick:()=>{xt(""),window.MinNoteGeoParams&&window.MinNoteGeoParams.open("params")},children:[h.jsxs("span",{className:"tool-label",children:[h.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[h.jsx("line",{x1:4,y1:7,x2:20,y2:7}),h.jsx("circle",{cx:9,cy:7,r:2.1,fill:"currentColor"}),h.jsx("line",{x1:4,y1:12,x2:20,y2:12}),h.jsx("circle",{cx:15,cy:12,r:2.1,fill:"currentColor"}),h.jsx("line",{x1:4,y1:17,x2:20,y2:17}),h.jsx("circle",{cx:11,cy:17,r:2.1,fill:"currentColor"})]}),_isVi?"Bảng tham số & Ràng buộc":"Parameters & Constraints"]}),!e.mobile&&h.jsx("kbd",{children:"Alt+Shift+P"})]},"mn-param-panel")]})]},ze),Ie=l2.find(([ze])=>ze==="marks");return Ke===0?h.jsxs(D.Fragment,{children:[h.jsxs("div",{className:"menu-stack",children:[ec,lt(...Ie)]}),lt(ne,de)]},"first"):lt(ne,de)})})`;

const geoMarker = src.includes("/*__MN_GEO_PARAMS_V926_MERGED__*/")
  ? "/*__MN_GEO_PARAMS_V926_MERGED__*/geo:()=>"
  : "/*__MN_GEO_PARAMS_V71_TOOLS__*/geo:()=>";
replaceRange("Geo+Params Merge", geoMarker, ',graph:()=>Pt("graph")', geoMergedCode);

// ============================================================================
// 2. COUNTDOWN TIMER -> COMPACT STUDIO PI TIMER (vse + kse)
// ============================================================================
const piDialCode = `function vse({strength:e,left:t,state:n}){const o=2*Math.PI*46,s=Math.max(0,Math.min(1,t)),i=-Math.PI/2+2*Math.PI*s,r=50+46*Math.cos(i),a=50+46*Math.sin(i);return h.jsxs("svg",{className:\`bicep mn-pi-dial is-\${n}\`,viewBox:"-6 -6 112 112","aria-hidden":"true",children:[h.jsx("circle",{className:"mn-pi-disk",cx:"50",cy:"50",r:"40.5"}),h.jsx("circle",{className:"bicep-track",cx:"50",cy:"50",r:"46"}),h.jsx("circle",{className:"bicep-ring",cx:"50",cy:"50",r:"46",strokeDasharray:o,strokeDashoffset:o*(1-s),transform:"rotate(-90 50 50)"}),n==="running"&&s>0.01&&h.jsx("circle",{className:"mn-pi-orb",cx:r,cy:a,r:"4.2"}),h.jsx("g",{className:"bicep-arm mn-pi-mascot",children:h.jsx("image",{href:"./assets/minnote-pi-logo.png",x:"21",y:"21",width:"58",height:"58",preserveAspectRatio:"xMidYMid meet"})}),h.jsxs("g",{className:"bicep-stars",children:[h.jsx("path",{d:"M12 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"}),h.jsx("path",{d:"M88 78 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z"}),h.jsx("path",{d:"M90 10 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z"})]})]})}`;

replaceRange("Timer Pi Logo Dial", "function vse({strength:e,left:t,state:n}){", "function kse({onClose:e,keepRunning:t}){", piDialCode);

const compactTimerCode = `function kse({onClose:e,keepRunning:t}){
  const n=tt().classroom,o=tt().timer,isVi=o.start==="Bắt đầu";
  const [s,i]=D.useState(()=>bd().timerSeconds??Qte);
  const [r,a]=D.useState(s);
  const [l,c]=D.useState(null);
  const [u,p]=D.useState(!1);
  const [d,m]=D.useState(!1);
  const [g,v]=D.useState(null);
  const [y,k]=D.useState("");
  const [w,x]=LH();
  const S=D.useRef(Math.ceil(r)),j=D.useRef(w);
  j.current=w;
  D.useEffect(()=>{
    if(l===null)return;
    t==null||t(!0);
    const $=setInterval(()=>{
      const B=Math.max(0,(l-Date.now())/1e3);
      a(B);
      const F=Math.ceil(B);
      F!==S.current&&(S.current=F,F>0&&F<=3&&j.current&&yse());
      B<=0&&(c(null),p(!0),j.current&&gse());
    },100);
    return()=>{clearInterval($),t==null||t(!1)};
  },[l]);
  const T=l!==null;
  const C=$=>{i($),a($),p(!1),S.current=$,ht({timerSeconds:$})};
  const _=()=>{const $=OL(y);$&&C($),k("")};
  const E=()=>{r<=0||(w&&t1(660,0,.08,.06),p(!1),c(Date.now()+r*1e3))};
  const P=()=>{a(Math.max(0,((l??0)-Date.now())/1e3)),c(null)};
  const L=()=>{w&&t1(660,0,.08,.06),p(!1),a(s),S.current=Math.ceil(s),c(Date.now()+s*1e3)};
  const O=()=>{c(null),p(!1),a(s),S.current=Math.ceil(s)};
  const addMin=()=>{
    const extra=60;
    const nextTotal=Math.min(ZR,s+extra);
    i(nextTotal);
    if(T&&l!==null){const rem=Math.max(0,(l-Date.now())/1e3)+extra;a(rem),S.current=Math.ceil(rem),c(Date.now()+rem*1e3)}
    else{const rem=Math.min(ZR,r+extra);a(rem),S.current=Math.ceil(rem)}
    p(!1);
    if(w)t1(740,0,.06,.05);
  };
  const G=s>0?1-r/s:0;
  const leftFrac=u?0:Math.max(0,Math.min(1,r/Math.max(1,s)));
  const isWarn=T&&!u&&leftFrac<=.25&&r>10;
  const isLast=T&&r<=10;
  const Z=u?o.mottoDone:!T&&r===s?o.mottoReady:G<.5?o.mottoStart:G<.8?o.mottoMid:o.mottoEnd;
  const X=u?"done":T?"running":"idle";
  const z=!T&&r===s&&!u;
  const statusTag=u?(isVi?"Hết giờ":"Done"):isLast?(isVi?"Sắp hết!":"Final 10s"):T?(isVi?"Đang chạy":"Running"):r<s?(isVi?"Tạm dừng":"Paused"):(isVi?"Sẵn sàng":"Ready");
  const mainTitle=T?o.pause:u?o.again:r<s?o.resume:o.start;
  return h.jsxs(NH,{
    className:\`class-timer mn-tm-v2\${u?" is-done":""}\${T?" is-running":""}\${isWarn?" is-warn":""}\${isLast?" is-last":""}\`,
    icon:h.jsx("img",{className:"mn-tm-head-pi",src:"./assets/minnote-pi-logo.png",alt:"π"}),
    title:n.timerTitle,
    big:d,
    onBig:()=>m(!d),
    tools:h.jsxs(h.Fragment,{children:[
      h.jsx("span",{className:"mn-tm-pill",children:statusTag}),
      h.jsx($H,{on:w,onToggle:x})
    ]}),
    onClose:()=>{c(null),e()},
    children:[
      h.jsxs("div",{className:"mn-tm-deck",children:[
        h.jsx(vse,{strength:u?1:G,left:leftFrac,state:X}),
        h.jsxs("div",{className:"mn-tm-mid",children:[
          z&&g!==null
            ?h.jsx("input",{className:"timer-digits timer-input mn-tm-digits",value:g,inputMode:"decimal",autoFocus:!0,"aria-label":o.typeTime,onChange:$=>v($.target.value),onBlur:()=>{const $=OL(g);$&&C($),v(null)},onKeyDown:$=>{$.key==="Enter"&&$.currentTarget.blur(),$.key==="Escape"&&v(null)}})
            :h.jsx("button",{className:"timer-digits mn-tm-digits",disabled:!z,title:z?o.typeTime:void 0,onClick:()=>v(zL(s)),children:zL(r)}),
          h.jsxs("div",{className:"mn-tm-subrow",children:[
            h.jsx("span",{className:"timer-motto mn-tm-motto",children:Z}),
            !z&&!u&&h.jsx("button",{type:"button",className:"mn-tm-plus",title:isVi?"Cộng thêm 1 phút":"Add 1 minute",onClick:addMin,children:isVi?"+1p":"+1m"})
          ]})
        ]}),
        h.jsxs("div",{className:"mn-tm-ctrls",children:[
          h.jsxs("button",{type:"button",className:"class-main mn-tm-play",title:mainTitle,"aria-label":mainTitle,onClick:T?P:u?L:E,children:[
            h.jsx("svg",{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true",children:
              T?h.jsx("path",{d:"M5.5 4.2h3v11.6h-3zM11.5 4.2h3v11.6h-3z"})
              :u?h.jsx("path",{d:"M10 3.5a6.5 6.5 0 1 0 6.2 8.4l-1.9-.6A4.5 4.5 0 1 1 10 5.5v2.2l3.8-3.1L10 1.5z"})
              :h.jsx("path",{d:"M6.2 4.1l10.2 5.9-10.2 5.9z"})
            }),
            h.jsx("span",{className:"mn-tm-play-lbl",children:mainTitle})
          ]}),
          h.jsxs("button",{type:"button",className:"mn-tm-rst",disabled:z,title:o.reset,"aria-label":o.reset,onClick:O,children:[
            h.jsx("svg",{viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:h.jsx("path",{d:"M4.5 10a5.5 5.5 0 1 1 1.6 3.9M4.5 10V5.8M4.5 10h4.2"})}),
            h.jsx("span",{className:"mn-tm-rst-lbl",children:o.reset})
          ]})
        ]})
      ]}),
      h.jsx("div",{className:"mn-tm-bar","aria-hidden":"true",children:h.jsx("div",{className:"mn-tm-bar-fill",style:{width:\`\${(leftFrac*100).toFixed(1)}%\`}})}),
      z&&h.jsxs("div",{className:"mn-tm-strip",children:[
        Jte.map($=>h.jsx("button",{type:"button",className:s===$*60?"on":"",onClick:()=>C($*60),children:isVi?\`\${$}p\`:\`\${$}m\`},$)),
        h.jsxs("label",{className:"mn-tm-custom",children:[
          h.jsx("input",{type:"text",inputMode:"decimal",value:y,placeholder:isVi?"Khác":"Min","aria-label":o.typeTime,onChange:$=>k($.target.value),onBlur:_,onKeyDown:$=>$.key==="Enter"&&$.currentTarget.blur()}),
          h.jsx("span",{children:isVi?"p":"m"})
        ]})
      ]})
    ]
  });
}`;

replaceRange("Compact Studio Pi Timer (kse)", "function kse({onClose:e,keepRunning:t}){", "const wse=2600", compactTimerCode);

// Clean leftover bicep emoji in timer mottoStart (VN & EN)
if (src.includes('mottoStart:"Cố lên nào! 💪"')) {
  src = src.replace('mottoStart:"Cố lên nào! 💪"', 'mottoStart:"Cố lên nào! ✨"');
  console.log("[OK] Updated VN timer mottoStart");
}
if (src.includes('mottoStart:"You can do it! 💪"')) {
  src = src.replace('mottoStart:"You can do it! 💪"', 'mottoStart:"You can do it! ✨"');
  console.log("[OK] Updated EN timer mottoStart");
}

// ============================================================================
// 3. RANDOM STUDENT PICKER (Mse) -> 4 DISTINCT INTERACTIVE CALLING METHODS
//    wheel (Vòng quay) | cards (Lật thẻ bí ẩn) | radar (Quét lưới) | capsule (Bốc thăm bi)
// ============================================================================
const pickerNewCode = `function Mse({onClose:e}){
  var qe,rt;
  const t=tt().classroom,n=tt().picker,isVi=n.call==="Gọi tên!";
  const [o,s]=D.useState(l8);
  const [i,r]=D.useState(()=>Math.min(bd().pickerClass??0,Math.max(0,l8().length-1)));
  const a=((qe=o[i])==null?void 0:qe.names)??[];
  const l=((rt=o[i])==null?void 0:rt.called)??[];
  const [c,u]=D.useState(()=>bd().pickerNoRepeat!==!1);
  const [p,d]=D.useState(()=>l8().length?null:"new");
  const [m,g]=D.useState("");
  const [v,y]=D.useState("");
  const [mode,setMode]=D.useState(()=>{const m0=bd().pickerMode;return["wheel","cards","radar","capsule"].includes(m0)?m0:"wheel"});
  const [j,T]=D.useState(!1);
  const [C,_]=D.useState(null);
  const [E,P]=D.useState(null);
  const [L,O]=D.useState(()=>bd().pickerTone??"mix");
  const [G,Z]=D.useState(()=>bd().pickerLines??{cheer:[],tease:[]});
  const [X,z]=D.useState(()=>bd().pickerBuiltIn!==!1);
  const [$,B]=D.useState(!1);
  const [F,K]=D.useState(0);
  const [H,R]=D.useState(!1);
  const [q,U]=LH();
  const [wheelList,setWheelList]=D.useState([]);
  const [wheelAngle,setWheelAngle]=D.useState(0);
  const [cardDeck,setCardDeck]=D.useState([]);
  const [cardFocus,setCardFocus]=D.useState(-1);
  const [radarList,setRadarList]=D.useState([]);
  const [radarIdx,setRadarIdx]=D.useState(-1);
  const [radarWinIdx,setRadarWinIdx]=D.useState(-1);
  const [capPhase,setCapPhase]=D.useState("idle");
  const [capTick,setCapTick]=D.useState(0);
  const [capNum,setCapNum]=D.useState(0);
  const Y=D.useRef(0),tmRef=D.useRef(0),angRef=D.useRef(0);
  const piHtml=D.useMemo(()=>{try{if(window.katex&&typeof window.katex.renderToString==="function")return window.katex.renderToString("\\\\pi",{throwOnError:!1,displayMode:!1})}catch{}return"π"},[]);

  const stopAnims=()=>{cancelAnimationFrame(Y.current),clearTimeout(tmRef.current),Y.current=0,tmRef.current=0};
  D.useEffect(()=>stopAnims,[]);

  const ee=l.filter(ie=>a.includes(ie));
  const pool=c?a.filter(ie=>!ee.includes(ie)):a;
  const ce=pool.length;

  const fmtShort=(nm,mx=13)=>{
    const str=String(nm||"").trim();
    if(str.length<=mx)return str;
    const pts=str.split(/\\s+/);
    if(pts.length>=3){
      const l2p=pts.slice(-2).join(" ");
      if(l2p.length+3<=mx)return pts[0][0]+". "+l2p;
      return l2p.length<=mx?l2p:l2p.slice(0,mx-1)+"…";
    }
    return str.slice(0,mx-1)+"…";
  };

  const shuffleArr=arr=>{
    const cp=[...arr];
    for(let idx2=cp.length-1;idx2>0;idx2--){
      const sw=Math.floor(Math.random()*(idx2+1));
      [cp[idx2],cp[sw]]=[cp[sw],cp[idx2]];
    }
    return cp;
  };

  const buildSample=(srcPool,mustInclude,maxN)=>{
    const uniq=[...new Set(srcPool)];
    if(!uniq.length)return[];
    if(uniq.length<=maxN)return mustInclude?uniq:uniq.slice(0,maxN);
    const others=uniq.filter(nm=>nm!==mustInclude);
    const picked=shuffleArr(others).slice(0,mustInclude?maxN-1:maxN);
    if(mustInclude)picked.splice(Math.floor(Math.random()*(picked.length+1)),0,mustInclude);
    return picked;
  };

  // Sync idle stage display when class / pool changes and not spinning
  const poolSig=pool.join("\\n");
  D.useEffect(()=>{
    if(j)return;
    setWheelList(prev=>{
      if(C&&prev.includes(C)&&prev.length>=Math.min(2,a.length))return prev;
      return pool.length?pool.slice(0,12):a.slice(0,12);
    });
    setRadarList(prev=>{
      if(C&&prev.includes(C)&&prev.length>=Math.min(2,a.length))return prev;
      return pool.length?pool.slice(0,16):a.slice(0,16);
    });
    if(!C){
      const cnt=Math.min(6,Math.max(2,pool.length||a.length||6));
      setCardDeck(Array.from({length:cnt},(_,idx2)=>({slot:idx2+1,name:"",flipped:!1,winner:!1})));
      setCardFocus(-1);
      setRadarIdx(-1);
      setRadarWinIdx(-1);
      setCapPhase("idle");
    }
  },[i,poolSig,p,mode]);

  const he=(ie,xe)=>{s(ie),r(xe),ht({pickerClasses:ie,pickerClass:xe})};
  const Q=ie=>he(o.map((xe,_e)=>_e===i?{...xe,called:ie}:xe),i);
  const resetVisual=()=>{_(null),P(null),setCardFocus(-1),setRadarIdx(-1),setRadarWinIdx(-1),setCapPhase("idle"),setCapNum(0)};

  const re=ie=>{if(j)return;stopAnims(),resetVisual(),he(o,ie)};
  const switchMode=nextM=>{if(j||nextM===mode)return;stopAnims(),resetVisual(),setMode(nextM),ht({pickerMode:nextM})};

  const be=ie=>{
    stopAnims(),T(!1);
    const xe=ie==="new"?null:o[ie];
    g((xe==null?void 0:xe.name)??""),y((xe==null?void 0:xe.names.join("\\n"))??""),d(ie);
  };

  const Ee=()=>{
    const ie=UM(v);
    if(!ie.length||p===null)return;
    const xe=m.trim().slice(0,30)||n.classN(p==="new"?o.length+1:p+1);
    p==="new"
      ?he([...o,{name:xe,names:ie,called:[]}],o.length)
      :he(o.map((_e,ve)=>ve===p?{name:xe,names:ie,called:_e.called.filter($e=>ie.includes($e))}:_e),p);
    resetVisual(),d(null);
  };

  const Ae=async ie=>{
    if(!await window.meaConfirm(n.confirmDelete(o[ie].name)))return;
    const xe=o.filter((_e,ve)=>ve!==ie);
    he(xe,Math.max(0,Math.min(i,xe.length-1))),resetVisual(),d(xe.length?null:"new"),g(""),y("");
  };

  const finishWin=win=>{
    T(!1),_(win),P(Se=>ene(tne(n.lines,G,X),L,Se)),K(Se=>Se+1);
    if(q)[784,1046.5,1318.5].forEach((Se,Be)=>t1(Se,Be*.09,.46,.13));
    if(c)Q([...ee,win]);
  };

  // Method 1: Spinning Fortune Wheel
  const runWheel=win=>{
    const slices=buildSample(pool,win,12);
    const wIdx=Math.max(0,slices.indexOf(win));
    const N=slices.length,step=360/N;
    setWheelList(slices),_(null),T(!0);
    const targetCenter=(wIdx+0.5)*step;
    const jitter=(Math.random()-0.5)*step*0.44;
    const desiredMod=((360-(targetCenter+jitter)%360)+360)%360;
    const startA=angRef.current;
    const curMod=((startA%360)+360)%360;
    const turns=(5+Math.floor(Math.random()*2))*360;
    const delta=turns+((desiredMod-curMod+360)%360);
    const dur=3100,t0=performance.now();
    let lastSlice=Math.floor(startA/step);
    const tick=now=>{
      const pr=Math.min(1,(now-t0)/dur);
      const eased=1-Math.pow(1-pr,4);
      const curA=startA+delta*eased;
      angRef.current=curA,setWheelAngle(curA);
      const sl=Math.floor(curA/step);
      if(sl!==lastSlice){lastSlice=sl;if(q)bse()}
      if(pr<1){Y.current=requestAnimationFrame(tick);return}
      finishWin(win);
    };
    Y.current=requestAnimationFrame(tick);
  };

  // Method 2: Mystery Flip Cards (supports clicking a specific card OR auto-draw!)
  const runCards=(win,chosenSlot)=>{
    const cnt=Math.min(6,Math.max(1,pool.length));
    const slot=typeof chosenSlot==="number"&&chosenSlot>=0&&chosenSlot<cnt?chosenSlot:Math.floor(Math.random()*cnt);
    const decoys=shuffleArr((pool.length>=cnt?pool:a).filter(nm=>nm!==win));
    const fresh=Array.from({length:cnt},(_,idx2)=>({slot:idx2+1,name:"",flipped:!1,winner:!1}));
    setCardDeck(fresh),_(null),T(!0);
    const totalHops=typeof chosenSlot==="number"?8:13;
    let step=0,prev=-1;
    const hop=()=>{
      if(step>=totalHops){
        let dPtr=0;
        const doneDeck=fresh.map((item,idx2)=>idx2===slot
          ?{...item,name:win,flipped:!0,winner:!0}
          :{...item,name:decoys[dPtr++]||"",flipped:!1,winner:!1}
        );
        setCardFocus(slot),setCardDeck(doneDeck),finishWin(win);
        return;
      }
      let next=step===totalHops-1?slot:Math.floor(Math.random()*cnt);
      if(cnt>1&&next===prev)next=(next+1)%cnt;
      prev=next,setCardFocus(next);
      if(q)bse();
      step++;
      const delay=65+Math.round(Math.pow(step/totalHops,2)*135);
      tmRef.current=window.setTimeout(hop,delay);
    };
    hop();
  };

  // Method 3: Classroom Spotlight Radar Grid
  const runRadar=win=>{
    const keepCurrent=radarList.length>=2&&radarList.length<=16&&radarList.includes(win)&&radarList.every(nm=>pool.includes(nm));
    const grid=keepCurrent?radarList:buildSample(pool,win,16);
    const winIdx=Math.max(0,grid.indexOf(win));
    setRadarList(grid),setRadarWinIdx(-1),_(null),T(!0);
    const totalSteps=grid.length>1?24:1;
    let step=0,prev=-1;
    const jump=()=>{
      if(step>=totalSteps){
        setRadarIdx(winIdx),setRadarWinIdx(winIdx),finishWin(win);
        return;
      }
      let next=step===totalSteps-1?winIdx:Math.floor(Math.random()*grid.length);
      if(grid.length>1&&next===prev)next=(next+1)%grid.length;
      prev=next,setRadarIdx(next);
      if(q)bse();
      step++;
      const delay=48+Math.round(Math.pow(step/totalSteps,2.3)*235);
      tmRef.current=window.setTimeout(jump,delay);
    };
    jump();
  };

  // Method 4: Glass Lottery Capsule Chamber
  const runCapsule=win=>{
    const rosterNo=Math.max(1,a.indexOf(win)+1);
    setCapNum(rosterNo),_(null),T(!0),setCapPhase("shake");
    const shakeDur=1550,t0=performance.now();
    let lastBeep=0;
    const anim=now=>{
      const pr=Math.min(1,(now-t0)/shakeDur);
      setCapTick(pr);
      if(now-lastBeep>95){lastBeep=now;if(q)bse()}
      if(pr<1){Y.current=requestAnimationFrame(anim);return}
      setCapPhase("drop");
      if(q)t1(520,0,.11,.09);
      tmRef.current=window.setTimeout(()=>{
        setCapPhase("open"),finishWin(win);
      },460);
    };
    Y.current=requestAnimationFrame(anim);
  };

  const ye=(optSlot)=>{
    const win=XM(a,ee,c);
    if(!win||j)return;
    stopAnims();
    if(mode==="wheel")runWheel(win);
    else if(mode==="cards")runCards(win,optSlot);
    else if(mode==="radar")runRadar(win);
    else runCapsule(win);
  };

  const He=()=>{if(j)return;stopAnims(),Q([]),resetVisual()};

  const wheelPalette=["#2563eb","#0d9488","#7c3aed","#e11d48","#d97706","#0284c7","#059669","#4f46e5","#db2777","#0891b2","#ea580c","#6366f1"];
  const modes=[
    {id:"wheel",icon:"🎡",label:isVi?"Vòng quay":"Wheel"},
    {id:"cards",icon:"🃏",label:isVi?"Lật thẻ":"Cards"},
    {id:"radar",icon:"🎯",label:isVi?"Quét lưới":"Radar"},
    {id:"capsule",icon:"🎱",label:isVi?"Bốc bi":"Capsules"}
  ];
  const ctaLabel=j
    ?(mode==="wheel"?(isVi?"Đang quay...":"Spinning..."):mode==="cards"?(isVi?"Đang xào bài...":"Shuffling..."):mode==="radar"?(isVi?"Đang quét...":"Scanning..."):(isVi?"Đang lắc bi...":"Drawing..."))
    :!XM(a,ee,c)?n.allCalled
    :mode==="wheel"?(isVi?"Quay vòng!":"Spin wheel!")
    :mode==="cards"?(isVi?"Xào & rút thẻ!":"Shuffle & draw!")
    :mode==="radar"?(isVi?"Quét chọn!":"Scan class!")
    :(isVi?"Lắc & bốc bi!":"Shake & draw!");

  const renderWheel=()=>{
    const list=wheelList.length?wheelList:(pool.length?pool.slice(0,12):a.slice(0,12));
    const N=Math.max(1,list.length),step=360/N,R0=118,cx=130,cy=130;
    const rad=deg=>deg*Math.PI/180;
    return h.jsxs("div",{className:"mnpk-wheel-wrap",children:[
      h.jsx("div",{className:"mnpk-wheel-pointer","aria-hidden":"true",children:h.jsx("svg",{viewBox:"0 0 28 24",children:h.jsx("path",{d:"M14 23 L2 3 Q14 -1 26 3 Z",fill:"#ef4444",stroke:"#ffffff",strokeWidth:"2.2"})})}),
      h.jsxs("div",{className:"mnpk-wheel-stage",children:[
        h.jsxs("svg",{className:"mnpk-wheel-svg",viewBox:"0 0 260 260",role:"img","aria-label":isVi?"Vòng quay gọi tên":"Name wheel",children:[
          h.jsx("circle",{cx,cy,r:R0+6,className:"mnpk-wheel-rim"}),
          h.jsx("g",{transform:\`rotate(\${wheelAngle.toFixed(2)} 130 130)\`,children:
            N===1
              ?h.jsxs("g",{children:[
                  h.jsx("circle",{cx,cy,r:R0,fill:wheelPalette[0],stroke:"#ffffff",strokeWidth:"2"}),
                  h.jsx("text",{x:cx,y:cy-44,fill:"#ffffff",fontSize:"13",fontWeight:"700",textAnchor:"middle",dominantBaseline:"central",children:fmtShort(list[0],16)})
                ]})
              :list.map((nm,idx2)=>{
                  const a0=-90+idx2*step,a1=a0+step,mid=(a0+a1)/2;
                  const x1=cx+R0*Math.cos(rad(a0)),y1=cy+R0*Math.sin(rad(a0));
                  const x2=cx+R0*Math.cos(rad(a1)),y2=cy+R0*Math.sin(rad(a1));
                  const large=step>180?1:0;
                  const dPath=\`M\${cx},\${cy} L\${x1.toFixed(2)},\${y1.toFixed(2)} A\${R0},\${R0} 0 \${large},1 \${x2.toFixed(2)},\${y2.toFixed(2)} Z\`;
                  const tx=cx+R0*0.64*Math.cos(rad(mid)),ty=cy+R0*0.64*Math.sin(rad(mid));
                  const fSize=N<=6?12.5:N<=10?11:10;
                  const maxCh=N<=6?13:N<=10?11:10;
                  return h.jsxs("g",{children:[
                    h.jsx("path",{d:dPath,fill:wheelPalette[idx2%wheelPalette.length],stroke:"rgba(255,255,255,0.85)",strokeWidth:"1.8"}),
                    h.jsx("text",{x:tx,y:ty,fill:"#ffffff",fontSize:fSize,fontWeight:"700",textAnchor:"middle",dominantBaseline:"central",transform:\`rotate(\${mid},\${tx.toFixed(1)},\${ty.toFixed(1)})\`,style:{textShadow:"0 1px 2px rgba(15,23,42,0.35)"},children:fmtShort(nm,maxCh)})
                  ]},idx2);
                })
          })
        ]}),
        h.jsx("button",{type:"button",className:"mnpk-wheel-hub-btn",disabled:j||!XM(a,ee,c),title:ctaLabel,"aria-label":ctaLabel,onClick:()=>ye(),children:h.jsx("span",{className:"mnpk-katex-pi",dangerouslySetInnerHTML:{__html:piHtml}})})
      ]})
    ]});
  };

  const renderCards=()=>{
    const deck=cardDeck.length?cardDeck:Array.from({length:Math.min(6,Math.max(2,pool.length||a.length||6))},(_,idx2)=>({slot:idx2+1,name:"",flipped:!1,winner:!1}));
    const hasFlip=deck.some(x=>x.flipped);
    return h.jsxs("div",{className:"mnpk-cards-wrap",children:[
      h.jsx("div",{className:"mnpk-cards-tip",children:isVi?(hasFlip?"Bấm lá khác hoặc rút lượt mới":"Chọn trực tiếp 1 thẻ bất kỳ hoặc bấm Xào & rút thẻ"):(hasFlip?"Pick another card or draw again":"Tap any mystery card or press Shuffle & draw")}),
      h.jsx("div",{className:\`mnpk-cards-grid cols-\${deck.length<=4?2:3}\`,children:deck.map((card,idx2)=>{
        const isLit=cardFocus===idx2&&j;
        const isDim=hasFlip&&!card.winner;
        return h.jsx("button",{
          type:"button",
          disabled:j||!XM(a,ee,c),
          className:\`mnpk-card\${card.flipped?" is-flipped":""}\${card.winner?" is-win":""}\${isLit?" is-lit":""}\${isDim?" is-dim":""}\`,
          onClick:()=>ye(idx2),
          children:h.jsxs("div",{className:"mnpk-card-inner",children:[
            h.jsxs("div",{className:"mnpk-card-back",children:[
              h.jsx("span",{className:"mnpk-card-num",children:\`#\${card.slot}\`}),
              h.jsx("span",{className:"mnpk-card-pi mnpk-katex-pi",dangerouslySetInnerHTML:{__html:piHtml}}),
              h.jsx("span",{className:"mnpk-card-lbl",children:isVi?"Thẻ bí ẩn":"Mystery"})
            ]}),
            h.jsxs("div",{className:"mnpk-card-front",children:[
              h.jsx("span",{className:"mnpk-card-crown",children:"★"}),
              h.jsx("span",{className:"mnpk-card-name",children:card.name||"?"})
            ]})
          ]})
        },idx2);
      })})
    ]});
  };

  const renderRadar=()=>{
    const list=radarList.length?radarList:(pool.length?pool.slice(0,16):a.slice(0,16));
    const cols=list.length<=4?2:list.length<=9?3:4;
    return h.jsxs("div",{className:"mnpk-radar-wrap",children:[
      h.jsx("div",{className:\`mnpk-radar-grid cols-\${cols}\`,children:list.map((nm,idx2)=>{
        const lit=radarIdx===idx2&&j;
        const win=radarWinIdx===idx2&&!j&&C===nm;
        return h.jsxs("div",{className:\`mnpk-radar-cell\${lit?" is-lit":""}\${win?" is-win":""}\`,title:nm,children:[
          h.jsx("span",{className:"mnpk-radar-dot"}),
          h.jsx("span",{className:"mnpk-radar-nm",children:fmtShort(nm,cols===4?12:16)})
        ]},idx2);
      })}),
      pool.length>list.length&&h.jsx("div",{className:"mnpk-radar-note",children:isVi?\`Hiển thị ngẫu nhiên \${list.length}/\${pool.length} học sinh (công bằng 100% cả lớp)\`:\`Sampling \${list.length}/\${pool.length} students (100% fair across class)\`})
    ]});
  };

  const renderCapsule=()=>{
    const ballCols=["#2563eb","#0d9488","#7c3aed","#e11d48","#d97706","#0284c7","#059669","#4f46e5","#db2777","#0891b2"];
    const baseBalls=[
      {x:108,y:112,n:1},{x:126,y:116,n:2},{x:144,y:114,n:3},{x:162,y:112,n:4},{x:174,y:102,n:5},
      {x:116,y:98,n:6},{x:135,y:100,n:7},{x:154,y:99,n:8},{x:126,y:85,n:9},{x:146,y:86,n:10}
    ];
    const shaking=capPhase==="shake";
    return h.jsxs("div",{className:\`mnpk-cap-wrap phase-\${capPhase}\`,children:[
      h.jsxs("svg",{className:"mnpk-cap-svg",viewBox:"0 0 280 154",role:"img","aria-label":isVi?"Lồng bốc thăm bi":"Lottery dome",children:[
        h.jsxs("defs",{children:[
          h.jsxs("radialGradient",{id:"mnCapGlass",cx:"38%",cy:"30%",r:"70%",children:[
            h.jsx("stop",{offset:"0%",stopColor:"#ffffff",stopOpacity:"0.95"}),
            h.jsx("stop",{offset:"65%",stopColor:"#eff6ff",stopOpacity:"0.72"}),
            h.jsx("stop",{offset:"100%",stopColor:"#bfdbfe",stopOpacity:"0.88"})
          ]}),
          h.jsxs("linearGradient",{id:"mnCapBase",x1:"0",y1:"0",x2:"0",y2:"1",children:[
            h.jsx("stop",{offset:"0%",stopColor:"#2563eb"}),
            h.jsx("stop",{offset:"100%",stopColor:"#1e3a8a"})
          ]})
        ]}),
        h.jsx("circle",{cx:"140",cy:"74",r:"60",fill:"url(#mnCapGlass)",stroke:"#60a5fa",strokeWidth:"2.5"}),
        baseBalls.map((b,idx2)=>{
          let bx=b.x,by=b.y;
          if(shaking){
            const ph=capTick*Math.PI*12+idx2*1.35;
            const radX=28+(idx2%3)*9,radY=26+((idx2+1)%3)*9;
            bx=140+Math.cos(ph*(idx2%2===0?1:-1.15))*radX;
            by=74+Math.sin(ph*1.3+idx2)*radY;
          }
          return h.jsxs("g",{transform:\`translate(\${bx.toFixed(1)},\${by.toFixed(1)})\`,children:[
            h.jsx("circle",{r:"10.5",fill:ballCols[idx2%ballCols.length],stroke:"rgba(255,255,255,0.75)",strokeWidth:"1.2"}),
            h.jsx("circle",{cx:"-3",cy:"-3.5",r:"2.6",fill:"rgba(255,255,255,0.55)"}),
            h.jsx("text",{y:"0.8",fill:"#ffffff",fontSize:"8",fontWeight:"800",textAnchor:"middle",dominantBaseline:"central",children:b.n})
          ]},idx2);
        }),
        h.jsx("path",{d:"M104 42 Q120 24 148 26",fill:"none",stroke:"rgba(255,255,255,0.85)",strokeWidth:"4",strokeLinecap:"round"}),
        h.jsx("path",{d:"M98 126 Q140 136 182 126 L190 144 Q140 152 90 144 Z",fill:"url(#mnCapBase)"}),
        h.jsx("rect",{x:"126",y:"131",width:"28",height:"13",rx:"6.5",fill:"#0f172a",opacity:"0.35"}),
        (capPhase==="drop"||capPhase==="open")&&h.jsxs("g",{className:\`mnpk-cap-drop \${capPhase==="open"?"is-open":""}\`,children:[
          h.jsx("circle",{cx:"140",cy:"136",r:"14",fill:"#f59e0b",stroke:"#ffffff",strokeWidth:"2.4"}),
          h.jsx("text",{x:"140",y:"136.5",fill:"#ffffff",fontSize:"11",fontWeight:"800",textAnchor:"middle",dominantBaseline:"central",children:\`#\${capNum}\`})
        ]})
      ]}),
      capPhase==="idle"&&!C&&h.jsx("div",{className:"mnpk-cap-hint",children:isVi?"Nhấn Lắc & bốc bi để chọn ngẫu nhiên 1 số may mắn!":"Press Shake & draw to drop a lucky numbered capsule!"})
    ]});
  };

  return h.jsx(NH,{className:\`class-picker mnpk-studio mode-\${mode}\${C?" has-winner":""}\`,icon:h.jsx(oe.dice,{}),title:t.pickerTitle,big:H,onBig:()=>R(!H),tools:h.jsx($H,{on:q,onToggle:U}),onClose:()=>{stopAnims(),e()},children:$?h.jsx(Sse,{own:G,builtIn:X,onDone:(ie,xe)=>{Z(ie),z(xe),ht({pickerLines:ie,pickerBuiltIn:xe}),B(!1)},onCancel:()=>B(!1)}):h.jsxs(h.Fragment,{children:[
    p===null&&h.jsxs("div",{className:"picker-classes",role:"tablist","aria-label":n.classes,children:[
      o.map((ie,xe)=>h.jsx("button",{role:"tab","aria-selected":xe===i,className:xe===i?"on":"",onClick:()=>re(xe),children:ie.name},xe)),
      o.length<w9&&h.jsxs("button",{className:"picker-add","aria-label":n.addClass,title:n.addClass,onClick:()=>be("new"),children:["+ ",n.addClassShort]})
    ]}),
    p===null&&h.jsx("div",{className:"mnpk-modes",role:"tablist","aria-label":isVi?"Phương thức gọi tên":"Calling method",children:
      modes.map(md=>h.jsxs("button",{type:"button",role:"tab","aria-selected":mode===md.id,className:\`mnpk-mode-btn\${mode===md.id?" on":""}\`,disabled:j,onClick:()=>switchMode(md.id),children:[
        h.jsx("span",{className:"mnpk-mode-ico","aria-hidden":"true",children:md.icon}),
        h.jsx("span",{children:md.label})
      ]},md.id))
    }),
    p!==null
      ?h.jsxs("div",{className:"picker-edit",children:[
          h.jsx("label",{className:"picker-label",htmlFor:"picker-class",children:p==="new"?n.newClass:n.editClass}),
          h.jsx("input",{id:"picker-class",className:"picker-class-name",value:m,maxLength:30,placeholder:n.classPlaceholder,"aria-label":n.className,onChange:ie=>g(ie.target.value)}),
          h.jsx("label",{className:"picker-label",htmlFor:"picker-names",children:n.listTitle}),
          h.jsx("p",{className:"picker-hint",children:n.listHint}),
          h.jsx("textarea",{id:"picker-names",value:v,spellCheck:!1,placeholder:n.placeholder,onChange:ie=>y(ie.target.value)}),
          h.jsxs("div",{className:"class-actions",children:[
            h.jsx("button",{className:"class-main",disabled:!UM(v).length,onClick:Ee,children:n.saveList(UM(v).length)}),
            o.length>0&&h.jsx("button",{onClick:()=>d(null),children:tt().cancel})
          ]}),
          p!=="new"&&h.jsx("button",{className:"picker-delete",onClick:()=>Ae(p),children:n.deleteClass})
        ]})
      :h.jsxs(h.Fragment,{children:[
          h.jsxs("div",{className:\`picker-stage mnpk-stage\${C?" has-winner":""}\${j?" is-spinning":""}\`,children:[
            mode==="wheel"?renderWheel():mode==="cards"?renderCards():mode==="radar"?renderRadar():renderCapsule(),
            C&&h.jsxs("div",{className:"mnpk-winner-banner",children:[
              h.jsx("span",{className:"mnpk-winner-tag",children:mode==="capsule"&&capNum?\`#\${capNum}\`:(isVi?"ĐƯỢC GỌI":"SELECTED")}),
              h.jsx("span",{className:"mnpk-winner-name",children:C})
            ]},\`w\${F}\`),
            C&&h.jsx("div",{className:"picker-confetti","aria-hidden":"true",children:Array.from({length:24},(ie,xe)=>h.jsx("i",{style:{"--a":\`\${xe*360/24}deg\`,"--d":\`\${75+xe*37%65}px\`,"--c":kE[xe%kE.length]}},xe))},F),
            C&&E&&h.jsxs("div",{className:"picker-meme",children:[
              h.jsx("span",{className:"picker-meme-face","aria-hidden":"true",children:E[0]}),
              h.jsx("span",{className:"picker-meme-text",children:E[1]})
            ]},\`m\${F}\`)
          ]}),
          h.jsxs("div",{className:"class-actions",children:[
            h.jsx("button",{className:"class-main picker-go",disabled:j||!XM(a,ee,c),onClick:()=>ye(),children:ctaLabel}),
            h.jsx("button",{onClick:()=>be(i),children:n.editList})
          ]}),
          h.jsxs("div",{className:"picker-foot",children:[
            h.jsxs("label",{className:"picker-check",children:[
              h.jsx("input",{type:"checkbox",checked:c,onChange:ie=>{u(ie.target.checked),ht({pickerNoRepeat:ie.target.checked})}}),
              n.noRepeat
            ]}),
            h.jsx("span",{className:"picker-tones",role:"group","aria-label":n.toneLabel,children:QR.map(ie=>h.jsx("button",{className:L===ie?"on":"","aria-pressed":L===ie,onClick:()=>{O(ie),ht({pickerTone:ie})},children:n.tones[ie]},ie))}),
            h.jsxs("button",{className:"picker-lines-btn",onClick:()=>B(!0),children:["✎ ",n.ownLines]}),
            c&&h.jsxs("span",{className:"picker-count",children:[n.left(ce,a.length),ee.length>0&&h.jsx("button",{className:"link",onClick:He,children:n.again})]})
          ]}),
          c&&ee.length>0&&h.jsx("ul",{className:"picker-called","aria-label":n.calledList,children:ee.map(ie=>h.jsx("li",{children:ie},ie))})
        ]})
  ]})})}`;

replaceRange("Random Picker 4-Mode Studio", "function Mse({onClose:e}){", "function Sse({own:e,builtIn:t,onDone:n,onCancel:o}){", pickerNewCode);

fs.writeFileSync(targetPath, src, "utf8");
console.log("[DONE] Successfully patched Resources/Whiteboard/assets/index-CTbULhps.js");
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
