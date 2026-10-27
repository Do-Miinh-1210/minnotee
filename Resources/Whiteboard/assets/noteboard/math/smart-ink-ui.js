/* Circle handwriting -> confirm recognition -> native interactive formula & live graph. */
(()=>{
'use strict';
const M=window.NBSmartMath,R=window.NBSmartRender,I=window.NBInkRecognition;if(!M||!R||!I)return;
const css=document.createElement('style');css.textContent=`
body.smart-live #ink,body.smart-live #liveInk{pointer-events:none!important}.txt.pic.smart-object{background:transparent!important}
#smartEdit{background:#168b82!important;color:#fff!important;font-weight:600!important;padding:0 12px!important;min-width:145px!important;border-radius:8px!important;box-shadow:0 2px 8px rgba(22,139,130,0.35)!important;font-size:11px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;cursor:pointer!important;touch-action:manipulation!important}
#smartEdit:hover,#smartEdit:active{background:#0e6b63!important}
#smartRecBtn{background:#1f6377!important;color:#fff!important;font-weight:600!important;padding:0 12px!important;min-width:145px!important;border-radius:8px!important;font-size:11px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;cursor:pointer!important;touch-action:manipulation!important}
#smartRecBtn:hover,#smartRecBtn:active{background:#154a59!important}
#smartEdit[hidden],#smartRecBtn[hidden]{display:none!important}
.smart-live-object{pointer-events:auto!important;z-index:7!important;outline:2px solid #278379;outline-offset:5px}.smart-live-object>img{display:none!important}.smart-live-object>canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;pointer-events:auto;cursor:pointer}
#smartLasso{position:fixed;inset:0;width:100vw;height:100dvh;touch-action:none;z-index:69;cursor:crosshair}#smartLasso[hidden],#smartPanel[hidden],#smartLassoHelp[hidden]{display:none}
#smartLassoHelp{position:fixed;z-index:70;left:50%;transform:translateX(-50%);bottom:calc(var(--nb-footer-height,34px) + 12px);width:min(650px,calc(100vw - 24px));padding:12px;border-radius:10px;background:#153f42;color:#fff;font:14px/1.5 'Segoe UI',sans-serif}
.smart-dialog{width:min(720px,calc(100vw - 24px));box-sizing:border-box;border:1px solid #b7d0c8;border-radius:14px;padding:20px;color:#173f42;background:#fff;max-height:88dvh;overflow:auto;font:15px/1.5 'Segoe UI',sans-serif}.smart-dialog::backdrop{background:#102c3b66}.smart-dialog h2{margin:0 0 10px;font-size:21px}.smart-dialog label{display:block;margin:8px 0}.smart-dialog input,.smart-dialog select{box-sizing:border-box;max-width:100%;padding:9px;border:1px solid #adc8bf;border-radius:6px;font:inherit}.smart-dialog input[type=text]{width:100%}.smart-dialog .sm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.smart-dialog .sm-grid input{width:100%}.smart-dialog img{max-width:100%;max-height:150px;object-fit:contain}.smart-dialog canvas{display:block;max-width:100%;max-height:150px;object-fit:contain}.smart-dialog .sm-error{color:#a3361c;min-height:1.5em}.smart-dialog button,#smartPanel button,#smartLassoHelp button{border:1px solid #afc9c0;border-radius:7px;background:#e6f3ee;color:#173f42;min-height:38px;padding:6px 12px;margin:3px;font:inherit;cursor:pointer}.smart-dialog button:disabled{opacity:.5;cursor:default}
#smartPanel{position:fixed;z-index:68;left:50%;transform:translateX(-50%);bottom:calc(var(--nb-footer-height,34px) + 10px);width:min(820px,calc(100vw - 22px));max-height:48dvh;overflow:auto;padding:8px 12px 12px;box-sizing:border-box;background:#ffffff;border:1.5px solid #228479;border-radius:12px;box-shadow:0 10px 36px rgba(18,52,60,0.22);color:#173f42;font:14px/1.5 'Segoe UI',sans-serif}#smartPanel .sm-actions{display:flex;gap:3px;flex-wrap:wrap;align-items:center}#smartPanel .sm-slider{display:flex;gap:8px;align-items:center;min-height:42px}#smartPanel .sm-slider label{min-width:30px}#smartPanel .sm-slider input[type=range]{flex:1;min-width:60px;accent-color:#1b8379}#smartPanel .sm-slider input[type=number]{width:92px;padding:6px;border:1px solid #bfd4ca;border-radius:6px;font:inherit}#smartPanel p{font-size:12px;margin:5px 3px}.smart-dialog .sm-note{font-size:12px;color:#536c68}
.sm-expr-header{display:flex;align-items:center;justify-content:space-between;margin:8px 0 4px}.sm-expr-header label{margin:0!important;font-weight:600;color:#173f42}.sm-kbd-toggle{display:inline-flex;align-items:center;gap:4px;padding:3px 10px!important;min-height:28px!important;margin:0!important;font-size:12px!important;font-weight:600!important;border-radius:6px!important;border:1px solid #168a80!important;background:#e6f5f1!important;color:#0e5952!important;cursor:pointer!important;touch-action:manipulation!important}.sm-kbd-toggle:hover{background:#d5eee7!important}.sm-kbd-toggle.active{background:#168a80!important;color:#fff!important}.sm-kbd{margin:8px 0 12px;padding:10px;background:#f5f9f8;border:1.5px solid #b2d5cc;border-radius:12px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.04);box-sizing:border-box}.sm-kbd[hidden]{display:none!important}.sm-kbd-grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px}.sm-kbtn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:3px 1px;margin:0!important;border:1px solid #bddbd3;border-radius:6px;background:#fff;color:#173f42;font:600 14px/1 system-ui,-apple-system,sans-serif;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;box-sizing:border-box;transition:background .1s,transform .06s}.sm-kbtn:hover{background:#edf7f4}.sm-kbtn:active{background:#d6efe8!important;transform:scale(0.96)}.sm-kbtn-var{font-family:'Cambria Math',Cambria,'Times New Roman',serif;font-style:italic;font-size:16px;background:#f9fcfa}.sm-kbtn-num{font-weight:700;font-size:15px;background:#fff}.sm-kbtn-fn{font-size:12.5px;background:#eef6f3;color:#0e5e57}.sm-kbtn-op{font-size:15px;background:#ebf3f7;color:#134e62;font-weight:700}.sm-kbtn-del{background:#fdefec;border-color:#f2c5be;color:#a3361c;font-weight:700}.sm-kbtn-del:hover{background:#fbdcd8}.sm-kbtn-action{font-size:12px;background:#e7eeec;color:#234440}
@media(max-width:700px){#smartPanel,#smartLassoHelp{bottom:calc(var(--nb-footer-height,104px) + env(safe-area-inset-bottom,0px) + 6px)}#smartPanel button{font-size:12px}.smart-dialog{padding:15px}.smart-dialog .sm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sm-kbtn{min-height:36px;font-size:13px;padding:2px 0}.sm-kbtn-var{font-size:14px}.sm-kbd-grid{gap:3.5px}.sm-kbd{padding:6px}}
`;document.head.appendChild(css);

const make=(tag,id,html)=>{const e=document.createElement(tag);e.id=id;if(tag==='dialog')e.className='smart-dialog';e.innerHTML=html;document.body.appendChild(e);return e;};
const lasso=make('canvas','smartLasso','');lasso.hidden=true;
const help=make('div','smartLassoHelp','<span>Khoanh một vòng kín, lấy trọn các nét công thức. Vòng khoanh không trở thành nét mực.</span> <button type="button">Hủy</button>');help.hidden=true;
const confirm=make('dialog','smartConfirm',`<h2>Nhận diện công thức viết tay</h2><p class="sm-note">Nhận diện công thức toán học và vật lí. Tự động liên kết tham số và đồ thị sống.</p><img id="smartSourcePreview" alt="Nét viết trong vùng khoanh"><p id="smartRecognitionStatus" role="status"></p><div class="sm-presets" style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:12px;color:#536c68;font-weight:600">Toán:</span><button type="button" class="sm-preset" data-expr="y=2x^2" style="padding:4px 8px;font-size:13px;min-height:28px">y = 2x²</button><button type="button" class="sm-preset" data-expr="y=x^2-4x+3" style="padding:4px 8px;font-size:13px;min-height:28px">y = ax² + bx + c</button><button type="button" class="sm-preset" data-expr="y=x^3-3x+1" style="padding:4px 8px;font-size:13px;min-height:28px">y = ax³ + bx² + cx + d</button><button type="button" class="sm-preset" data-expr="y=(2x+1)/(x-1)" style="padding:4px 8px;font-size:13px;min-height:28px">y = (ax+b)/(cx+d)</button><button type="button" class="sm-preset" data-expr="y=2*sin(x)" style="padding:4px 8px;font-size:13px;min-height:28px">y = a·sin(x)</button><span style="font-size:12px;color:#0e6b63;font-weight:700;margin-left:4px">Vật lí:</span><button type="button" class="sm-preset" data-expr="I = U / R" style="padding:4px 8px;font-size:13px;min-height:28px;background:#e1f5ef;border-color:#168a80;color:#0d5952;font-weight:600">I = U / R (Định luật Ôm)</button><button type="button" class="sm-preset" data-expr="v = 2 + 3*t" style="padding:4px 8px;font-size:13px;min-height:28px">v = v₀ + a·t</button><button type="button" class="sm-preset" data-expr="x = 4*cos(2*pi*t)" style="padding:4px 8px;font-size:13px;min-height:28px">x = A·cos(ωt)</button><button type="button" class="sm-preset" data-expr="F = 2*a" style="padding:4px 8px;font-size:13px;min-height:28px">F = m·a</button></div><div class="sm-expr-header"><label for="smartExpression">Công thức nhận được</label><button type="button" id="smartToggleKbd" class="sm-kbd-toggle" aria-expanded="false" title="Hiện/ẩn bàn phím ảo để nhập công thức toán và vật lí">⌨ Hiện bàn phím</button></div><input id="smartExpression" type="text" maxlength="512" autocomplete="off" spellcheck="false" placeholder="Ví dụ: y=2x^2 hoặc I=U/R hoặc x=4cos(2*pi*t)"><div id="smartKeyboard" class="sm-kbd" hidden aria-label="Bàn phím toán học và vật lí ảo"><div class="sm-kbd-grid"><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="^2" title="Bình phương">x²</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="^3" title="Lập phương">x³</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="^" title="Lũy thừa">xⁿ</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="sqrt(" title="Căn bậc hai">√</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="abs(" title="Giá trị tuyệt đối">|x|</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="sin(" title="Hàm sin">sin</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="cos(" title="Hàm cos">cos</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="tan(" title="Hàm tan">tan</button><button type="button" class="sm-kbtn sm-kbtn-fn" data-insert="pi" title="Số Pi">π</button><button type="button" class="sm-kbtn sm-kbtn-del" data-action="backspace" title="Xóa lùi">⌫</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="x">x</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="y">y</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="z">z</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="t">t</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="(">(</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert=")">)</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="7">7</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="8">8</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="9">9</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="/" title="Phép chia">/</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="a" title="Hệ số / Gia tốc">a</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="b" title="Hệ số">b</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="c" title="Hệ số">c</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="m" title="Khối lượng">m</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="v" title="Vận tốc">v</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="=" title="Dấu bằng">=</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="4">4</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="5">5</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="6">6</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="*" title="Phép nhân">*</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="F" title="Lực">F</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="A" title="Biên độ / Công">A</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="U" title="Hiệu điện thế">U</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="I" title="Cường độ dòng điện">I</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="R" title="Điện trở">R</button><button type="button" class="sm-kbtn sm-kbtn-var" data-insert="ω" title="Tần số góc">ω</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="1">1</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="2">2</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="3">3</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="-" title="Phép trừ">−</button><button type="button" class="sm-kbtn sm-kbtn-action" data-action="left" title="Sang trái">←</button><button type="button" class="sm-kbtn sm-kbtn-action" data-action="right" title="Sang phải">→</button><button type="button" class="sm-kbtn sm-kbtn-action" data-insert=" " style="grid-column:span 2" title="Khoảng trắng">␣ Cách</button><button type="button" class="sm-kbtn sm-kbtn-del" data-action="clear" title="Xóa toàn bộ">AC</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert="0">0</button><button type="button" class="sm-kbtn sm-kbtn-num" data-insert=".">.</button><button type="button" class="sm-kbtn sm-kbtn-op" data-insert="+" title="Phép cộng">+</button><button type="button" class="sm-kbtn sm-kbtn-action" data-action="hide" style="grid-column:span 2;background:#e2ece8;font-weight:600" title="Ẩn bàn phím">Ẩn ⌨</button></div></div><canvas id="smartFormulaPreview" aria-label="Công thức sau chuẩn hóa"></canvas><p class="sm-error" id="smartConfirmError" role="alert"></p><button id="smartAccept" type="button" disabled>Xác nhận công thức</button><button id="smartCancel" type="button">Hủy</button><details></details><p class="sm-note">Sau xác nhận, công thức chuẩn nằm ngay trên bảng. Kéo ngang số để biến thiên đồ thị trực tiếp.</p>`);
const tokenDialog=make('dialog','smartToken',`<h2 id="smartTokenTitle">Thay đổi đại lượng</h2><p id="smartTokenNote"></p><label>Tên tham số<input id="smartParamName" type="text" maxlength="1" autocomplete="off"></label><div class="sm-grid"><label>Giá trị<input id="smartParamValue" type="number" step="any"></label><label>Nhỏ nhất<input id="smartParamMin" type="number" step="any"></label><label>Lớn nhất<input id="smartParamMax" type="number" step="any"></label><label>Bước nhảy<input id="smartParamStep" type="number" min="0.000001" step="any"></label><label>Đơn vị<input id="smartParamUnit" type="text" maxlength="24"></label></div><p class="sm-error" id="smartParamError" role="alert"></p><button id="smartParamSave" type="button">Tạo thanh trượt</button><button id="smartParamRemove" type="button">Bỏ thanh trượt</button><button id="smartParamCancel" type="button">Đóng</button><p class="sm-note">Đơn vị là nhãn do thầy/cô xác định; chưa tự kiểm tra hoặc chuyển đổi đơn vị. Góc trong hàm lượng giác tính bằng radian.</p>`);
const graphDialog=make('dialog','smartGraph',`<h2>Đồ thị liên kết công thức</h2><label>Biến độc lập<select id="smartGraphVar"></select></label><div class="sm-grid"><label>Cận trái<input id="smartGraphMin" type="number" step="any"></label><label>Cận phải<input id="smartGraphMax" type="number" step="any"></label></div><p class="sm-note">Dạng y=f(x), x=f(t): vẽ đại lượng vế trái theo biến đã chọn. Phương trình khác một biến: vẽ hiệu hai vế để quan sát giao điểm với trục ngang. Các biến còn lại cần được gán giá trị bằng thanh trượt.</p><p class="sm-error" id="smartGraphError" role="alert"></p><button id="smartGraphSave" type="button">Hiện đồ thị</button><button id="smartGraphCancel" type="button">Đóng</button>`);
const original=make('dialog','smartOriginal','<h2>Nét viết gốc</h2><img alt="Nét viết gốc được giữ lại"><p>Khôi phục nét gốc tại vị trí hiện tại của công thức. Có thể Hoàn tác để trở lại công thức tương tác.</p><button id="smartRestoreInk" type="button">Khôi phục nét gốc</button><button id="smartOriginalClose" type="button">Đóng</button>');

// Draggable Control Panel
const panel=make('section','smartPanel',`
<div class="sm-drag-bar" style="cursor:move;user-select:none;display:flex;align-items:center;justify-content:space-between;padding:2px 4px 6px;margin-bottom:6px;border-bottom:1px solid #d4e5de">
  <span style="font-size:12px;font-weight:700;color:#185358;display:flex;align-items:center;gap:6px">
    <span style="cursor:move;font-size:15px;opacity:.7">⋮⋮</span> Bảng điều khiển (Kéo để di chuyển vị trí)
  </span>
  <span style="font-size:11px;color:#536c68">Giữ chuột để kéo</span>
</div>
<div class="sm-actions">
  <strong>Công thức tương tác</strong>
  <button data-sm="tokens">Chọn số/ký hiệu</button>
  <button data-sm="graph">Đồ thị</button>
  <button data-sm="solve" title="Giải phương trình hoặc tính giá trị với các tham số đang đặt">Giải / Tính</button>
  <button data-sm="variation" title="Lập bảng biến thiên của hàm số này">Bảng biến thiên</button>
  <button data-sm="scale" title="Đặt lại hệ trục vừa vặn với đồ thị hiện tại">Vừa đồ thị</button>
  <button data-sm="autofit" id="smAutoFitBtn" title="Bật/Tắt tự động co đồ thị khi kéo tham số">Tự động co: BẬT</button>
  <button data-sm="hideGraph">Ẩn đồ thị</button>
  <button data-sm="edit">Sửa công thức</button>
  <button data-sm="source">Nét gốc</button>
  <button data-sm="copy">Sao chép LaTeX</button>
  <button data-sm="done">✓ Viết tiếp</button>
</div>
<p id="smartHint" role="status">Nhấn giữ một số hoặc kéo thanh trượt để thay đổi đại lượng và biến thiên đồ thị.</p>
<div id="smartTokenChoices" hidden></div>
<div id="smartSliders"></div>
`);
panel.hidden=true;
panel.setAttribute('aria-label','Điều chỉnh công thức tương tác');

// Panel drag logic
let panelPos=null;
const dragBar=panel.querySelector('.sm-drag-bar');
let isDraggingPanel=false,panelDragStart=null;
dragBar.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  e.preventDefault();
  dragBar.setPointerCapture(e.pointerId);
  const r=panel.getBoundingClientRect();
  isDraggingPanel=true;
  panelDragStart={id:e.pointerId,offX:e.clientX-r.left,offY:e.clientY-r.top};
});
dragBar.addEventListener('pointermove',e=>{
  if(!isDraggingPanel||panelDragStart?.id!==e.pointerId)return;
  e.preventDefault();
  const x=clamp(e.clientX-panelDragStart.offX,10,window.innerWidth-panel.offsetWidth-10);
  const y=clamp(e.clientY-panelDragStart.offY,10,window.innerHeight-panel.offsetHeight-10);
  panel.style.left=x+'px';
  panel.style.top=y+'px';
  panel.style.bottom='auto';
  panel.style.transform='none';
  panelPos={x,y};
});
const endPanelDrag=e=>{
  if(isDraggingPanel&&panelDragStart?.id===e.pointerId){
    isDraggingPanel=false;
    panelDragStart=null;
  }
};
dragBar.addEventListener('pointerup',endPanelDrag);
dragBar.addEventListener('pointercancel',endPanelDrag);

confirm.querySelector('.sm-note').textContent='Nhận diện trên máy chủ NoteBoard. Chỉ ảnh nét viết trong vùng khoanh được gửi qua HTTPS; không gửi đến dịch vụ nhận diện bên thứ ba. Cần kết nối Internet.';
const recognitionDetails=confirm.querySelector('details');recognitionDetails.replaceChildren();
const rawSummary=document.createElement('summary');rawSummary.textContent='LaTeX do máy chủ nhận diện';
const rawLatex=document.createElement('pre');rawLatex.id='smartRawLatex';rawLatex.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';recognitionDetails.append(rawSummary,rawLatex);
const q=(id,root=document)=>root.querySelector('#'+id),hint=t=>q('smartHint').textContent=t;
let ocrAbort=null;
let active=null,frame=null,raf=0,pointer=null,selection=null,worker=null,job=0,editingTarget=null,tokenKey=null,circle=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function updateAutoFitBtn(){
  const btn=q('smAutoFitBtn',panel);
  if(btn&&active){
    const on=active.scene.graph.autoFit!==false;
    btn.textContent='Tự động co: '+(on?'BẬT':'TẮT');
    btn.style.background=on?'#e2f4ef':'#f0f3f4';
    btn.style.color=on?'#0d5952':'#576770';
  }
}

function stopWorker(){job++;ocrAbort?.abort();ocrAbort=null;if(worker){worker.terminate();worker=null;}}
function endCircle(){circle=null;lasso.hidden=help.hidden=true;}
function beginCircle(){finish();window.NBSpatialBoard?.finish();window.nbHtmlLive?.exit();commitEdit();if(!$('#start').classList.contains('off'))start([]);lasso.width=innerWidth;lasso.height=innerHeight;lasso.hidden=help.hidden=false;lasso.getContext('2d').clearRect(0,0,lasso.width,lasso.height);}
function circlePaint(){const c=lasso.getContext('2d');c.clearRect(0,0,lasso.width,lasso.height);if(!circle)return;c.beginPath();circle.screen.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#168a80';c.lineWidth=2;c.setLineDash([7,4]);c.stroke();}
lasso.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();if(circle){circle=null;circlePaint();return;}lasso.setPointerCapture(e.pointerId);circle={id:e.pointerId,points:[toBoard(e)],screen:[{x:e.clientX,y:e.clientY}]};});
lasso.addEventListener('pointermove',e=>{if(circle?.id!==e.pointerId)return;e.preventDefault();if(circle.points.length>=2000)return;circle.points.push(toBoard(e));circle.screen.push({x:e.clientX,y:e.clientY});circlePaint();});
lasso.addEventListener('pointerup',e=>{if(circle?.id!==e.pointerId)return;e.preventDefault();const polygon=circle.points.slice();polygon.push(toBoard(e));endCircle();try{recogniseSelection(I.select(strokes,polygon));}catch(error){toast(error.message);}});
lasso.addEventListener('pointercancel',endCircle);help.querySelector('button').onclick=endCircle;
addEventListener('resize',()=>{if(!lasso.hidden)endCircle();});

function sourceOf(sel){const b=sel.box;const rawW=b.x1-b.x0,rawH=b.y1-b.y0;if(rawW>2800||rawH>2800)throw Error('Vùng nhận diện quá lớn.');
 const pad=Math.max(16,Math.min(36,Math.round(Math.min(rawW,rawH)*0.12)));const w=rawW+pad*2,h=rawH+pad*2;
 const targetH=Math.max(72,Math.min(180,rawH*1.1));const scale=Math.min(1.6,920/w,260/h,Math.max(0.65,targetH/(h||1)));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(w*scale));canvas.height=Math.max(1,Math.ceil(h*scale));
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=true;c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);
 c.scale(scale,scale);c.translate(pad-b.x0,pad-b.y0);
 for(const s of sel.strokes){const sw=Math.max(2.4,s.w||2);drawStroke({...s,color:'#000000',w:sw},c);}
 const ink=sel.strokes.map(s=>({color:s.color,w:s.w,pts:s.pts.map(p=>({x:p.x-b.x0+pad,y:p.y-b.y0+pad,p:p.p}))}));
 return {src:canvas.toDataURL('image/png'),ink,w,h,x:b.x0-pad,y:b.y0-pad};
}

function verifyExpression(){const input=q('smartExpression'),error=q('smartConfirmError');try{const scene={version:1,expression:input.value,params:[],graph:{enabled:false}};const clean=M.clean(scene);if(!clean)throw Error('Kiểm tra lại cú pháp công thức.');R.draw(q('smartFormulaPreview'),clean);error.textContent='';q('smartAccept').disabled=false;return true;}catch(e){error.textContent=e.message;q('smartAccept').disabled=true;return false;}}

function recogniseSelection(sel){
 stopWorker();selection={...sel,source:sourceOf(sel)};editingTarget=null;
 q('smartSourcePreview').src=selection.source.src;
 q('smartConfirmError').textContent='';
 rawLatex.textContent='';
 q('smartFormulaPreview').getContext('2d').clearRect(0,0,1100,800);

 // 1. Instant local recognition in ~2ms (zero waiting):
 let hasLocal=false, userEdited=false;lastLocal=null;lastServer='';
 try{
  if(window.NBInkRecognition?.recognise&&sel.strokes?.length){
   const local=window.NBInkRecognition.recognise(sel.strokes);lastLocal=local;
   if(local?.expression){
    rawLatex.textContent=local.expression;
    let norm=local.expression;
    try{norm=M.normalise(local.expression);}catch(_){}
    q('smartExpression').value=memoFor()||tidy(norm);
    q('smartExpression').disabled=false;
    q('smartAccept').disabled=false;
    q('smartRecognitionStatus').textContent='⚡ Đã nhận diện tức thì trên máy — đúng thì bấm Xác nhận luôn, AI máy chủ vẫn kiểm tra nền và báo nếu đọc khác.';
    verifyExpression();
    hasLocal=true;
   }
  }
 }catch(e){console.warn('Local instant recognition:',e);}

 if(!hasLocal){
  q('smartExpression').value='';
  q('smartExpression').disabled=true;
  q('smartAccept').disabled=true;
  q('smartRecognitionStatus').textContent='Đang nhận diện công thức qua AI máy chủ…';
 }

 showCandidates();
 restoreKeyboardPreference();
 confirm.showModal();
 const id=job,controller=new AbortController();ocrAbort=controller;
 const timeout=setTimeout(()=>controller.abort(),52000);

 const inputEl=q('smartExpression');
 const onUserInput=()=>{userEdited=true;};
 inputEl.addEventListener('input',onUserInput,{once:true});

 // 2. High-precision server AI inference in the background:
 const local0=lastLocal;
 Promise.resolve().then(()=>serverRecognize(selection.source,controller.signal)).then(result=>{
  if(bg&&bg.controller===controller){backgroundResult(result,local0);return;}
  if(id!==job||!confirm.open)return;
  if(typeof result.latex!=='string'||!result.latex||result.latex.length>4096)throw Error('Máy chủ chưa trả công thức hợp lệ.');
  lastServer=result.latex;
  if(!userEdited){
   rawLatex.textContent=result.latex;
   q('smartExpression').disabled=false;
   try{q('smartExpression').value=memoFor()||tidy(M.normalise(result.latex));}catch{q('smartExpression').value=result.latex;}
   serverShown=q('smartExpression').value;
   q('smartRecognitionStatus').textContent=result.cached?'✓ Nét này đã nhận diện trước đó — lấy ngay kết quả AI đã lưu':'✓ Nhận diện AI từ máy chủ hoàn tất — bấm Xác nhận để chèn';
   verifyExpression();
  } else {
   q('smartRecognitionStatus').textContent='✓ Nhận diện AI từ máy chủ hoàn tất (đã giữ nội dung bạn vừa sửa)';
  }
  showCandidates();
 }).catch(error=>{
  if(bg&&bg.controller===controller){bg=null;return;}
  if(id!==job||!confirm.open)return;
  showCandidates();
  if(hasLocal){
   q('smartRecognitionStatus').textContent='Đã hoàn tất nhận diện trực tiếp trên thiết bị.';
   verifyExpression();
   return;
  }
  const reason=error.name==='AbortError'?'Quá thời gian chờ máy chủ':(error.message||'Máy chủ chưa cấu hình');
  q('smartExpression').disabled=false;
  q('smartRecognitionStatus').textContent=reason+'. Có thể chọn mẫu hoặc nhập công thức để tiếp tục.';
 }).finally(()=>{
  if(!(bg&&bg.controller===controller))clearTimeout(timeout);
  inputEl.removeEventListener('input',onUserInput);
  if(ocrAbort===controller)ocrAbort=null;
 });
}

confirm.addEventListener('click',e=>{
 const preset=e.target.closest('.sm-preset');
 if(preset?.dataset?.expr){stopWorker();q('smartExpression').disabled=false;q('smartExpression').value=preset.dataset.expr;q('smartRecognitionStatus').textContent='Đang dùng mẫu công thức đã chọn.';verifyExpression();}
});

q('smartExpression').addEventListener('input',verifyExpression);

/* Bàn phím toán học và vật lí ảo cho màn hình cảm ứng & iPad */
const KBD_KEY='noteboard.smartInk.keyboard';
const kbd=q('smartKeyboard',confirm);
const toggleKbdBtn=q('smartToggleKbd',confirm);

function isKeyboardWanted(){
 try{
  const saved=localStorage.getItem(KBD_KEY);
  if(saved!==null)return saved==='1';
 }catch(_){}
 return ('ontouchstart' in window||(navigator.maxTouchPoints||0)>0)&&window.innerWidth<=1024;
}

function setKeyboardVisible(visible){
 if(!kbd||!toggleKbdBtn)return;
 kbd.hidden=!visible;
 toggleKbdBtn.classList.toggle('active',visible);
 toggleKbdBtn.textContent=visible?'⌨ Ẩn bàn phím':'⌨ Hiện bàn phím';
 toggleKbdBtn.setAttribute('aria-expanded',visible?'true':'false');
 try{localStorage.setItem(KBD_KEY,visible?'1':'0');}catch(_){}
}

function restoreKeyboardPreference(){
 setKeyboardVisible(isKeyboardWanted());
}

function insertTextAtCursor(input,text){
 let start=input.selectionStart,end=input.selectionEnd;
 if(start==null||end==null){start=end=input.value.length;}
 const val=input.value;
 input.value=val.slice(0,start)+text+val.slice(end);
 const newPos=start+text.length;
 try{input.setSelectionRange(newPos,newPos);}catch(_){}
 input.dispatchEvent(new Event('input',{bubbles:true}));
}

function backspaceAtCursor(input){
 let start=input.selectionStart,end=input.selectionEnd;
 if(start==null||end==null){start=end=input.value.length;}
 const val=input.value;
 if(start!==end){
  input.value=val.slice(0,start)+val.slice(end);
  input.setSelectionRange(start,start);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }else if(start>0){
  input.value=val.slice(0,start-1)+val.slice(end);
  input.setSelectionRange(start-1,start-1);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
}

function moveCursor(input,delta){
 let pos=input.selectionStart??input.value.length;
 pos=Math.max(0,Math.min(input.value.length,pos+delta));
 try{input.setSelectionRange(pos,pos);}catch(_){}
}

if(toggleKbdBtn){
 toggleKbdBtn.onclick=()=>{
  setKeyboardVisible(kbd.hidden);
  q('smartExpression').focus();
 };
}

if(kbd){
 kbd.addEventListener('pointerdown',e=>{
  const btn=e.target.closest('.sm-kbtn');
  if(btn)e.preventDefault();
 });
 kbd.addEventListener('click',e=>{
  const btn=e.target.closest('.sm-kbtn');
  if(!btn)return;
  const input=q('smartExpression');
  if(input.disabled){
   stopWorker();
   input.disabled=false;
   q('smartRecognitionStatus').textContent='Nhập công thức từ bàn phím ảo.';
  }
  const ins=btn.dataset.insert;
  const action=btn.dataset.action;
  if(action==='hide'){
   setKeyboardVisible(false);
  }else if(action==='clear'){
   input.value='';
   try{input.setSelectionRange(0,0);}catch(_){}
   input.dispatchEvent(new Event('input',{bubbles:true}));
  }else if(action==='backspace'){
   backspaceAtCursor(input);
  }else if(action==='left'){
   moveCursor(input,-1);
  }else if(action==='right'){
   moveCursor(input,1);
  }else if(ins!=null){
   insertTextAtCursor(input,ins);
  }
 });
}

function cancelConfirm(){stopWorker();confirm.close();selection=null;editingTarget=null;}q('smartCancel').onclick=cancelConfirm;confirm.addEventListener('cancel',cancelConfirm);

q('smartAccept').onclick=()=>{if(!verifyExpression())return;try{
 if(editingTarget){if(!editingTarget.el.isConnected)throw Error('Đối tượng không còn trên bảng.');const source=editingTarget.pic.smart.source,t=editingTarget;confirm.close();stopWorker();enter(t);active.scene=M.clean({version:1,expression:q('smartExpression').value,params:[],graph:{enabled:false},source});editingTarget=null;render(true);sliders();active.dirty=true;commit();return;}
 if(!selection||selection.strokes.some(s=>!strokes.includes(s)))throw Error('Nét viết đã thay đổi. Hãy khoanh lại.');
 learn(q('smartExpression').value);
 const src=selection.source;const parsed=M.parse(q('smartExpression').value);const out=parsed.rhs&&parsed.lhs.type==='var'?parsed.lhs.name:null;const vars=M.available(parsed,[]).filter(v=>v!==out);const v=vars.find(x=>x==='x'||x==='t')||vars[0];
 const otherVars = vars.filter(x => x !== v);
 const defaultParams = otherVars.map(name => {
   let value = 2, min = 0.1, max = 20, step = 0.1, unit = '';
   if (name === 'R') { value = 5; min = 0.1; max = 50; step = 0.5; unit = 'Ω'; }
   else if (name === 'U') { value = 12; min = 0.1; max = 240; step = 1; unit = 'V'; }
   else if (name === 'I') { value = 2; min = 0.01; max = 20; step = 0.1; unit = 'A'; }
   else if (name === 'm') { value = 1; min = 0.1; max = 50; step = 0.1; unit = 'kg'; }
   else if (name === 'a') { value = 2; min = -20; max = 20; step = 0.5; unit = 'm/s²'; }
   else if (name === 'v') { value = 5; min = 0; max = 100; step = 1; unit = 'm/s'; }
   else if (name === 'C') { value = 10; min = 0.1; max = 100; step = 1; unit = ''; }
   return { key: 'v:' + name, name, value, min, max, step, unit };
 });
 const isNonNegVar = ['U', 'R', 't', 'm', 'V', 'T', 'l', 'r'].includes(v);
 const gMin = isNonNegVar ? 0 : -6, gMax = isNonNegVar ? 20 : 6;
 const s=M.clean({version:1,expression:q('smartExpression').value,params:defaultParams,graph:{enabled:!!v,autoFit:false,variable:v||'x',min:gMin,max:gMax,ymin:-20,ymax:20},source:src});if(!s)throw Error('Dữ liệu nhận diện vượt giới hạn.');
 const c=document.createElement('canvas');R.draw(c,s);const w=innerWidth<700?Math.min(1360,c.width*1.8):Math.min(1100,Math.max(c.width,src.w));
 const t=addPic(c.toDataURL('image/png'),{x:Math.max(0,src.x),y:Math.max(0,src.y),w});t.pic={...t.pic,smart:s};t.el.classList.add('smart-object');t.el.querySelector('img').alt='Công thức tương tác';const chosen=new Set(selection.strokes);strokes=strokes.filter(st=>!chosen.has(st));
 historyStates[historyIndex]=snapshot();scheduleSave();markPages();apply();
 if(ocrAbort){bg={controller:ocrAbort,target:t};ocrAbort=null;}   /* AI máy chủ chưa xong: chèn ngay, kiểm tra nền */
 confirm.close();stopWorker();selection=null;enter(t);
 }catch(error){q('smartConfirmError').textContent=error.message;}};

function render(resize=false){if(!active)return;const old=active.canvas.width,oldW=parseFloat(active.target.el.style.width)||old;frame=R.draw(active.canvas,active.scene);
 if(frame.range&&active.scene.graph.autoFit!==true&&(!Number.isFinite(active.scene.graph.ymin)||!Number.isFinite(active.scene.graph.ymax))){Object.assign(active.scene.graph,{ymin:frame.range.ymin,ymax:frame.range.ymax});active.dirty=true;}
 if(resize&&old&&old!==frame.width)active.target.el.style.width=clamp(oldW*frame.width/old,120,1500)+'px';active.target.el.style.aspectRatio=frame.width+'/'+frame.height;if(frame.error)hint(frame.error);updateAutoFitBtn();}
function queue(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render();});}
function commit(){if(!active||!active.target.el.isConnected)return;render();const scene=M.clean(active.scene);active.target.pic={...active.target.pic,smart:scene,src:active.canvas.toDataURL('image/png')};active.target.el.querySelector('img').src=active.target.pic.src;active.dirty=false;markPages();historyCommit();}
function finish(){if(!active)return;if(raf){cancelAnimationFrame(raf);raf=0;}clearTimeout(pointer?.timer);pointer=null;if(active.dirty)commit();const t=active.target;active.canvas.remove();t.el.classList.remove('smart-live-object');t.el.style.aspectRatio='';active=null;frame=null;panel.hidden=true;document.body.classList.remove('smart-live');for(const d of [tokenDialog,graphDialog,original])if(d.open)d.close();if(t.el.isConnected){setMode('sel');selected=[t];apply();}}
function point(e){const t=active.target,r=active.canvas.getBoundingClientRect(),a=t.rot||0,m=objectMirror(t),aspect=active.canvas.height/active.canvas.width,w=r.width/(Math.abs(Math.cos(a))+aspect*Math.abs(Math.sin(a))),h=w*aspect,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;return {x:(.5+m.x*(Math.cos(a)*dx+Math.sin(a)*dy)/w)*active.canvas.width,y:(.5+m.y*(-Math.sin(a)*dx+Math.cos(a)*dy)/h)*active.canvas.height};}
function hit(e){const p=point(e),padding=8;return frame?.hits.find(h=>p.x>=h.x-padding&&p.x<=h.x+h.w+padding&&p.y>=h.y-padding&&p.y<=h.y+h.h+padding);}

function enter(t){if(!t?.pic?.smart)return;finish();window.NBSpatialBoard?.finish();window.nbHtmlLive?.exit();commitEdit();const s=M.clean(t.pic.smart);if(!s)return;if(s.graph.autoFit){if(s.graph.ymin==null)s.graph.ymin=-20;if(s.graph.ymax==null)s.graph.ymax=20;}s.graph.autoFit=false;const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=100;canvas.tabIndex=0;canvas.setAttribute('aria-label','Kéo số hoặc ký hiệu để thay đổi đại lượng');
 t.el.appendChild(canvas);t.el.classList.add('smart-live-object');document.body.classList.add('smart-live');active={target:t,scene:s,canvas,dirty:false};
 panel.hidden=false;
 if(panelPos){panel.style.left=panelPos.x+'px';panel.style.top=panelPos.y+'px';panel.style.bottom='auto';panel.style.transform='none';}
 selected=[];apply();render();sliders();hint('Kéo chuột hoặc ngón tay ngang trên một số để thay đổi đại lượng và xem đồ thị biến đổi.');q('smartTokenChoices').hidden=true;

 let scrub=null;
 let graphDrag=null;

 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();if(scrub||graphDrag)return;
  canvas.setPointerCapture(e.pointerId);const h=hit(e);

  if(h?.isGraphHandle){
   graphDrag={
    id:e.pointerId,type:'handle',edge:h.key,startX:e.clientX,startY:e.clientY,
    origMin:active.scene.graph.min,origMax:active.scene.graph.max,
    origYmin:frame?.range?.ymin??-20,origYmax:frame?.range?.ymax??20
   };
   canvas.style.cursor=(h.key==='handleTop'||h.key==='handleBottom')?'ns-resize':'ew-resize';
   return;
  }

  if(h?.isGraphArea&&!h?.isParam){
   graphDrag={
    id:e.pointerId,type:'pan',startX:e.clientX,startY:e.clientY,
    origMin:active.scene.graph.min,origMax:active.scene.graph.max,
    origYmin:frame?.range?.ymin??-20,origYmax:frame?.range?.ymax??20
   };
   canvas.style.cursor='grab';
   return;
  }

  if(!h)return;
  const parsed=M.parse(active.scene.expression),token=parsed.tokens.find(tok=>M.keyOf(tok)===h.key);
  let param=active.scene.params.find(p=>p.key===h.key);
  if(!param&&token?.type==='num'){
   const used=new Set([...parsed.vars,...active.scene.params.map(p=>p.name)]),name=['a','b','c','m','k','A','R','n'].find(n=>!used.has(n))||'m',val=token.value,span=Math.max(10,Math.abs(val)*2.5);
   param={key:h.key,name,value:val,min:Number((val-span).toFixed(2)),max:Number((val+span).toFixed(2)),step:Math.max(0.05,Number((span/100).toFixed(2))),unit:''};
   active.scene.params.push(param);
   if(!active.scene.graph.enabled){const out=parsed.rhs&&parsed.lhs.type==='var'?parsed.lhs.name:null,vars=M.available(parsed,active.scene.params).filter(v=>v!==out),v=vars.find(x=>x==='x'||x==='t')||vars[0];if(v){active.scene.graph.enabled=true;active.scene.graph.variable=v;active.scene.graph.ymin=-20;active.scene.graph.ymax=20;active.scene.graph.autoFit=false;active.target.el.style.width=(innerWidth<700?1360:900)+'px';}}
   active.dirty=true;render(true);sliders();
  }
  if(param){scrub={id:e.pointerId,key:h.key,param,startX:e.clientX,startVal:param.value,step:param.step||0.1,moved:false};canvas.style.cursor='ew-resize';hint('Kéo ngang để đổi '+param.name+' = '+R.format(param.value));}
  else{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,hit:h,moved:false};}
 });

 canvas.addEventListener('pointermove',e=>{
  if(graphDrag&&graphDrag.id===e.pointerId){
   e.preventDefault();
   const from=point({clientX:graphDrag.startX,clientY:graphDrag.startY}),to=point(e),dx=to.x-from.x,dy=to.y-from.y;
   const gw=frame?.graphRect?.w||965,gh=frame?.graphRect?.h||380;
   const xSpan=graphDrag.origMax-graphDrag.origMin,ySpan=graphDrag.origYmax-graphDrag.origYmin;
   if(graphDrag.type==='pan'){
    const shiftX=-dx*xSpan/gw,shiftY=dy*ySpan/gh;
    active.scene.graph.min=Number((graphDrag.origMin+shiftX).toFixed(2));
    active.scene.graph.max=Number((graphDrag.origMax+shiftX).toFixed(2));
    active.scene.graph.ymin=Number((graphDrag.origYmin+shiftY).toFixed(2));
    active.scene.graph.ymax=Number((graphDrag.origYmax+shiftY).toFixed(2));
    active.scene.graph.autoFit=false;updateAutoFitBtn();active.dirty=true;queue();
    hint('Di chuyển hệ trục: x ∈ ['+R.format(active.scene.graph.min)+', '+R.format(active.scene.graph.max)+']');
   }else if(graphDrag.type==='handle'){
    active.scene.graph.autoFit=false;updateAutoFitBtn();
    if(graphDrag.edge==='handleTop'){
     const deltaY=-dy*ySpan/gh;active.scene.graph.ymax=Math.max(graphDrag.origYmin+1,Number((graphDrag.origYmax+deltaY).toFixed(2)));
    }else if(graphDrag.edge==='handleBottom'){
     const deltaY=-dy*ySpan/gh;active.scene.graph.ymin=Math.min(graphDrag.origYmax-1,Number((graphDrag.origYmin+deltaY).toFixed(2)));
    }else if(graphDrag.edge==='handleLeft'){
     const deltaX=dx*xSpan/gw;active.scene.graph.min=Math.min(graphDrag.origMax-1,Number((graphDrag.origMin+deltaX).toFixed(2)));
    }else if(graphDrag.edge==='handleRight'){
     const deltaX=dx*xSpan/gw;active.scene.graph.max=Math.max(graphDrag.origMin+1,Number((graphDrag.origMax+deltaX).toFixed(2)));
    }
    active.dirty=true;queue();hint('Kéo giãn trục đồ thị');
   }
   return;
  }
  if(scrub&&scrub.id===e.pointerId){
   e.preventDefault();const dx=e.clientX-scrub.startX;if(Math.abs(dx)>3)scrub.moved=true;
   const steps=Math.round(dx/4);let nextVal=scrub.startVal+steps*scrub.step;nextVal=Math.max(scrub.param.min,Math.min(scrub.param.max,nextVal));nextVal=Number(nextVal.toFixed(3));
   if(nextVal!==scrub.param.value){scrub.param.value=nextVal;active.dirty=true;queue();hint('Tham số '+scrub.param.name+' = '+R.format(nextVal));}return;
  }
  const h=hit(e);
  if(h?.isGraphHandle)canvas.style.cursor=(h.key==='handleTop'||h.key==='handleBottom')?'ns-resize':'ew-resize';
  else if(h?.isGraphArea)canvas.style.cursor='grab';
  else if(h?.isParam)canvas.style.cursor='ew-resize';
  else canvas.style.cursor='default';
 });

 canvas.addEventListener('pointerup',e=>{
  canvas.style.cursor='default';
  if(graphDrag&&graphDrag.id===e.pointerId){graphDrag=null;commit();return;}
  if(scrub&&scrub.id===e.pointerId){e.preventDefault();const s=scrub;scrub=null;if(s.moved){commit();sliders();}else{showToken(s.key);}return;}
  if(pointer&&pointer.id===e.pointerId)pointer=null;
 });

 canvas.addEventListener('wheel',e=>{
  const h=hit(e);
  if(h?.isGraphArea&&!h?.isParam){
   e.preventDefault();
   const factor=e.deltaY<0?0.88:1.14;
   const curMin=active.scene.graph.min,curMax=active.scene.graph.max;
   const curYmin=frame?.range?.ymin??-20,curYmax=frame?.range?.ymax??20;
   const midX=(curMin+curMax)/2,midY=(curYmin+curYmax)/2;
   const halfX=(curMax-curMin)*factor/2,halfY=(curYmax-curYmin)*factor/2;
   active.scene.graph.min=Number((midX-halfX).toFixed(2));
   active.scene.graph.max=Number((midX+halfX).toFixed(2));
   active.scene.graph.ymin=Number((midY-halfY).toFixed(2));
   active.scene.graph.ymax=Number((midY+halfY).toFixed(2));
   active.scene.graph.autoFit=false;updateAutoFitBtn();active.dirty=true;render();commit();
   hint('Thu phóng hệ trục: x ∈ ['+R.format(active.scene.graph.min)+', '+R.format(active.scene.graph.max)+']');
   return;
  }
  if(!h)return;const param=active.scene.params.find(p=>p.key===h.key);if(!param)return;e.preventDefault();
  const dir=e.deltaY<0?1:-1;let nextVal=param.value+dir*(param.step||0.1);nextVal=Math.max(param.min,Math.min(param.max,Number(nextVal.toFixed(3))));
  if(nextVal!==param.value){param.value=nextVal;active.dirty=true;render();sliders();commit();hint('Lăn chuột: '+param.name+' = '+R.format(nextVal));}
 },{passive:false});

 const cancel=()=>{clearTimeout(pointer?.timer);pointer=null;scrub=null;graphDrag=null;canvas.style.cursor='default';};canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.focus({preventScroll:true});}

function sliders(){const host=q('smartSliders');host.replaceChildren();if(!active)return;for(const p of active.scene.params){const row=document.createElement('div');row.className='sm-slider';const label=document.createElement('label'),range=document.createElement('input'),number=document.createElement('input'),unit=document.createElement('span'),edit=document.createElement('button');label.textContent=p.name;range.type='range';number.type='number';for(const e of [range,number]){e.min=p.min;e.max=p.max;e.step=p.step;e.value=p.value;e.setAttribute('aria-label','Giá trị '+p.name);}unit.textContent=p.unit;edit.type='button';edit.textContent='⋯';edit.setAttribute('aria-label','Sửa tham số '+p.name);edit.onclick=()=>showToken(p.key);
  const update=(e,other)=>{const value=Number(e.value);if(e.value===''||!Number.isFinite(value)||value<p.min||value>p.max){e.setCustomValidity('Giá trị cần nằm trong khoảng đã đặt.');return false;}e.setCustomValidity('');p.value=value;other.value=value;active.dirty=true;queue();return true;};range.oninput=()=>update(range,number);number.oninput=()=>update(number,range);range.onchange=()=>{if(active&&update(range,number))commit();};number.onchange=()=>{if(active&&update(number,range))commit();};row.append(label,range,number,unit,edit);host.append(row);}}

function showToken(key){if(!active)return;const parsed=M.parse(active.scene.expression),token=parsed.tokens.find(t=>M.keyOf(t)===key);if(!token)return;const dependent=parsed.rhs&&parsed.lhs.type==='var'&&token.type==='var'&&token.name===parsed.lhs.name;
 tokenKey=key;const existing=active.scene.params.find(p=>p.key===key),used=new Set([...parsed.vars,...active.scene.params.map(p=>p.name)]),name=token.type==='var'?token.name:existing?.name||['a','b','c','A','k','m','R','U','ω','φ'].find(n=>!used.has(n))||'';
 const value=existing?.value??(token.type==='num'?token.value:1),span=Math.max(10,Math.abs(value)*2),v=existing||{name,value,min:-span,max:span,step:Math.max(.01,span/200),unit:''};
 q('smartTokenTitle').textContent='Đại lượng: '+token.text;q('smartTokenNote').textContent=dependent?token.name+' là đại lượng kết quả ở vế trái. Điều chỉnh các đại lượng ở vế phải để cập nhật kết quả.':token.type==='num'?'Chỉ hệ số được chọn chuyển thành tham số; các số giống nó ở vị trí khác được giữ nguyên.':'Các lần xuất hiện của '+token.name+' trong công thức dùng chung giá trị.';
 for(const [id,k] of [['smartParamName','name'],['smartParamValue','value'],['smartParamMin','min'],['smartParamMax','max'],['smartParamStep','step'],['smartParamUnit','unit']])q(id).value=v[k];q('smartParamName').disabled=token.type==='var';q('smartParamSave').disabled=dependent;q('smartParamSave').textContent=existing?'Lưu thay đổi':'Tạo thanh trượt';q('smartParamRemove').hidden=!existing;q('smartParamError').textContent='';tokenDialog.showModal();}

q('smartParamCancel').onclick=()=>tokenDialog.close();
q('smartParamSave').onclick=()=>{if(!active)return;const p={key:tokenKey,name:q('smartParamName').value.trim(),value:Number(q('smartParamValue').value),min:Number(q('smartParamMin').value),max:Number(q('smartParamMax').value),step:Number(q('smartParamStep').value),unit:q('smartParamUnit').value};
 const next=M.clean({...active.scene,params:active.scene.params.filter(x=>x.key!==tokenKey).concat(p)});if(!next||['smartParamValue','smartParamMin','smartParamMax','smartParamStep'].some(id=>q(id).value.trim()==='')){q('smartParamError').textContent='Dùng tên một chữ chưa trùng biến khác; giá trị phải trong khoảng, bước nhảy dương và nhỏ hơn khoảng.';return;}
 active.scene=next;tokenDialog.close();render(true);sliders();active.dirty=true;commit();hint('Đã tạo tham số '+p.name+'. Kéo thanh trượt hoặc chọn Đồ thị để liên kết.');};
q('smartParamRemove').onclick=()=>{if(!active)return;active.scene.params=active.scene.params.filter(p=>p.key!==tokenKey);tokenDialog.close();render(true);sliders();active.dirty=true;commit();};

for(const [id,label] of [['smartGraphYmin','Trục dọc: nhỏ nhất'],['smartGraphYmax','Trục dọc: lớn nhất']]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='number';input.step='any';input.id=id;input.placeholder='Tự căn lần đầu';l.append(input);graphDialog.querySelector('.sm-grid').append(l);}
function graphMenu(){if(!active)return;const parsed=M.parse(active.scene.expression),output=parsed.rhs&&parsed.lhs.type==='var'?parsed.lhs.name:null;const vars=[...new Set([...M.available(parsed,active.scene.params),...parsed.vars])].filter(v=>v!==output);const select=q('smartGraphVar');select.replaceChildren();for(const name of vars)select.add(new Option(name,name));select.value=active.scene.graph.variable||(['x','t'].find(v=>vars.includes(v))||vars[0]||'');for(const [id,key] of [['smartGraphMin','min'],['smartGraphMax','max'],['smartGraphYmin','ymin'],['smartGraphYmax','ymax']])q(id).value=active.scene.graph[key]??'';q('smartGraphError').textContent=vars.length?'':'Cần ít nhất một biến độc lập hoặc tham số để vẽ đồ thị.';graphDialog.showModal();}
q('smartGraphCancel').onclick=()=>graphDialog.close();q('smartGraphSave').onclick=()=>{if(!active)return;try{
 const ymin=q('smartGraphYmin').value,ymax=q('smartGraphYmax').value;
 if((ymin==='')!==(ymax===''))throw Error('Nhập cả hai cận trục dọc, hoặc để trống cả hai để căn một lần.');
 const newVar=q('smartGraphVar').value;
 const oldVar=active.scene.graph.variable;
 let nextParams=[...active.scene.params];
 if(newVar&&newVar!==oldVar){
   nextParams=nextParams.filter(p=>p.name!==newVar);
   const parsed=M.parse(active.scene.expression);
   const output=parsed.rhs&&parsed.lhs.type==='var'?parsed.lhs.name:null;
   if(oldVar&&oldVar!==output&&parsed.vars.includes(oldVar)&&!nextParams.some(p=>p.name===oldVar)){
     let value=12,min=0.1,max=50,step=0.5,unit='';
     if(oldVar==='U'){value=12;min=0.1;max=240;step=1;unit='V';}
     else if(oldVar==='R'){value=5;min=0.1;max=50;step=0.5;unit='Ω';}
     else if(oldVar==='I'){value=2;min=0.01;max=20;step=0.1;unit='A';}
     else if(oldVar==='m'){value=1;min=0.1;max=50;step=0.1;unit='kg';}
     else if(oldVar==='a'){value=2;min=-20;max=20;step=0.5;unit='m/s²';}
     else if(oldVar==='v'){value=5;min=0;max=100;step=1;unit='m/s';}
     nextParams.push({key:'v:'+oldVar,name:oldVar,value,min,max,step,unit});
   }
 }
 const isNonNegVar=['U','R','t','m','V','T','l','r'].includes(newVar);
 let gMin=Number(q('smartGraphMin').value);
 let gMax=Number(q('smartGraphMax').value);
 if(!Number.isFinite(gMin)||!Number.isFinite(gMax)||gMax<=gMin){
   gMin=isNonNegVar?0:-6;
   gMax=isNonNegVar?20:6;
 }
 const graph={enabled:true,autoFit:ymin===''&&ymax==='',variable:newVar,min:gMin,max:gMax,ymin:ymin===''?null:Number(ymin),ymax:ymax===''?null:Number(ymax)};
 const next=M.clean({...active.scene,params:nextParams,graph});
 if(!next||!graph.variable)throw Error('Chọn biến độc lập hợp lệ.');
 M.graphSpec(next);
 active.scene=next;
 active.target.el.style.width=(innerWidth<700?1360:900)+'px';
 render(true);
 sliders();
 active.dirty=true;
 commit();
 graphDialog.close();
 hint('Đã vẽ đồ thị theo '+newVar+'. Kéo thanh trượt để quan sát đồ thị thay đổi.');
 }catch(e){q('smartGraphError').textContent=e.message;}};

panel.addEventListener('click',async e=>{const action=e.target.closest('[data-sm]')?.dataset.sm;if(!action||!active)return;
 if(action==='done'){finish();setMode('pen');}
 else if(action==='tokens'){const host=q('smartTokenChoices');host.hidden=!host.hidden;host.replaceChildren();const seen=new Set();for(const token of M.parse(active.scene.expression).tokens){const key=M.keyOf(token);if(!key||seen.has(key))continue;seen.add(key);const b=document.createElement('button');b.type='button';b.textContent=token.text;b.onclick=()=>showToken(key);host.append(b);}}
 else if(action==='graph')graphMenu();
 else if(action==='solve')solveActive();
 else if(action==='variation')variationFromActive();
 else if(action==='scale'){active.scene.graph.autoFit=true;active.scene.graph.ymin=active.scene.graph.ymax=null;render(true);if(frame.range)Object.assign(active.scene.graph,{ymin:frame.range.ymin,ymax:frame.range.ymax});active.scene.graph.autoFit=false;active.dirty=true;commit();hint('Đã căn vừa một lần và khóa hệ trục. Kéo tham số để quan sát đường cong thay đổi.');}
 else if(action==='autofit'){const on=active.scene.graph.autoFit===true;if(on&&frame.range)Object.assign(active.scene.graph,{ymin:frame.range.ymin,ymax:frame.range.ymax});active.scene.graph.autoFit=!on;render(true);active.dirty=true;commit();hint('Tự động co đồ thị: '+(active.scene.graph.autoFit?'BẬT':'TẮT (cố định hệ trục)'));}
 else if(action==='hideGraph'){if(active.scene.graph.enabled){active.scene.graph.enabled=false;render(true);active.dirty=true;commit();}}
 else if(action==='source'){if(!active.scene.source)return hint('Đối tượng này không có nét gốc.');original.querySelector('img').src=active.scene.source.src;original.showModal();}
 else if(action==='copy'){try{await navigator.clipboard.writeText(M.latex(M.parse(active.scene.expression),active.scene.params));hint('Đã sao chép LaTeX.');}catch{hint('Trình duyệt chưa cho phép sao chép vào bộ nhớ tạm.');}}
 else if(action==='edit'){editingTarget=active.target;const s=active.scene;q('smartSourcePreview').src=s.source?.src||active.target.pic.src;q('smartExpression').disabled=false;q('smartExpression').value=s.expression;q('smartRecognitionStatus').textContent='Sửa công thức sẽ bỏ các liên kết tham số và đồ thị hiện tại; nét gốc vẫn được giữ.';finish();restoreKeyboardPreference();confirm.showModal();verifyExpression();}
});

q('smartOriginalClose').onclick=()=>original.close();q('smartRestoreInk').onclick=()=>{if(!active?.scene.source)return;const t=active.target,source=active.scene.source,x=parseFloat(t.el.style.left)||0,y=parseFloat(t.el.style.top)||0,a=t.rot||0,m=objectMirror(t);finish();const restored=source.ink.map(s=>{const pts=s.pts.map(p=>{const dx=m.x*(p.x-source.w/2),dy=m.y*(p.y-source.h/2);return {...p,x:x+source.w/2+Math.cos(a)*dx-Math.sin(a)*dy,y:y+source.h/2+Math.sin(a)*dx+Math.cos(a)*dy};});return {...s,pts,y0:Math.min(...pts.map(p=>p.y)),y1:Math.max(...pts.map(p=>p.y)),erase:false,hl:false};});strokes.push(...restored);texts=texts.filter(o=>o!==t);t.el.remove();selected=[];markPages();apply();historyCommit();setMode('pen');};

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lasso.hidden){endCircle();e.preventDefault();return;}if(!active)return;if(e.key==='Escape'&&!tokenDialog.open&&!graphDialog.open&&!original.open){finish();e.preventDefault();e.stopPropagation();}else if((e.ctrlKey||e.metaKey)&&['z','y','s'].includes(e.key.toLowerCase()))finish();},true);
document.addEventListener('pointerdown',e=>{if(active&&!active.target.el.contains(e.target)&&!panel.contains(e.target)&&![tokenDialog,graphDialog,original].some(d=>d.contains(e.target)))finish();},true);
new MutationObserver(()=>{if(active&&!active.target.el.isConnected)finish();}).observe(board,{childList:true});

const edit=document.createElement('button');edit.type='button';edit.id='smartEdit';edit.hidden=true;edit.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19c4-1 6-5 6-14h4M9 11h6"/></svg><span>Tương tác công thức</span>';edit.onclick=()=>enter(selected[0]);selBar.prepend(edit);
const recBtn=document.createElement('button');recBtn.type='button';recBtn.id='smartRecBtn';recBtn.hidden=true;recBtn.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="8"/><path d="M15 5c-4-2-5 3-5 7l-1 6M6 11h9"/></svg><span>Nhận diện công thức</span>';recBtn.onclick=()=>{const sel=selected.filter(s=>s.pts?.length);if(!sel.length)return;const b=I.box(sel.flatMap(s=>s.pts));recogniseSelection({strokes:sel,box:b});};selBar.prepend(recBtn);
const oldPlace=placeSelBar;placeSelBar=function(){edit.hidden=!(selected.length===1&&selected[0].pic?.smart);recBtn.hidden=!selected.some(s=>s.pts?.length);oldPlace();};

board.addEventListener('pointerup',e=>{
  if(active)return;
  const el=e.target.closest('.txt.pic.smart-object');
  if(!el)return;
  const t=texts.find(x=>x.el===el);
  if(!t)return;
  if(selected.length!==1||selected[0]!==t){
    setMode('sel');selected=[t];apply();
  }
});

const rail=document.createElement('button');rail.id='smartInkRail';rail.type='button';rail.className='rail-btn';rail.title='Khoanh nét viết để nhận diện công thức và tạo tham số';rail.innerHTML='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="10" ry="8"/><path d="M15 5c-4-2-5 3-5 7l-1 6M6 11h9"/></svg><span>Khoanh thông minh</span>';rail.onclick=beginCircle;$('#rail').prepend(rail);

/* ---- Tăng độ chính xác khi nhận diện: phương án để chọn, từ điển công thức, tự học nét chữ của người viết.
   Mọi dữ liệu học chỉ lưu trong trình duyệt/ứng dụng trên máy này, không gửi đi. ---- */
let lastLocal=null,lastServer='';
const LEARN_KEY='noteboard.smartInk.learn.v1',TPL_KEY='noteboard.smartInk.templates.v1';
const kv={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const flat=t=>String(t||'').replace(/[\s*]/g,'');
const norm=t=>{try{return M.parse(t).source;}catch{try{return M.parse(M.normalise(t)).source;}catch{return '';}}};
const DICT=['I=U/R','U=I*R','R=U/I','P=U*I','P=I^2*R','P=U^2/R','Q=I^2*R*t','A=U*I*t','R=ρ*l/S','F=m*a','a=F/m','P=m*g','W=F*s','P=A/t','p=m*v','v=s/t','s=v*t','F=k*x','W=k*x^2/2','W=m*v^2/2','W=m*g*h','x=A*cos(ω*t+φ)','x=A*cos(2*pi*f*t)','x=A*sin(ω*t)','T=2*pi*sqrt(l/g)','T=2*pi*sqrt(m/k)','ω=2*pi*f','ω=sqrt(k/m)','f=1/T','λ=v/f','λ=v*T','F=k*q*Q/r^2','E=k*Q/r^2','C=Q/U','n=c/v','E=h*f','p=F/S','p=d*g*h','Q=m*c*t','p*V=n*R*T','y=a*x+b','y=a*x^2+b*x+c','y=x^2','y=2*x+1','y=x^3-3*x+1','y=(a*x+b)/(c*x+d)','y=sin(x)','y=cos(x)','y=tan(x)','y=a*sin(x)','y=e^x','y=ln(x)','y=log(x)','y=sqrt(x)','y=1/x','y=abs(x)','x^2+y^2=r^2','a^2+b^2=c^2','S=π*r^2','C=2*π*r','V=4/3*π*r^3','S=a*h/2','Δ=b^2-4*a*c'].map(norm).filter(Boolean);
function lev(a,b){const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=t;}}return d[b.length];}
function nearest(expr,n){const a=flat(expr);if(!a)return [];return DICT.map(e=>{const b=flat(e);return {e,s:1-lev(a,b)/Math.max(a.length,b.length)};}).filter(x=>x.s>=0.55&&x.s<1).sort((x,y)=>y.s-x.s).slice(0,n).map(x=>x.e);}
function memoKeys(){return [lastServer&&'s:'+flat(norm(lastServer)||lastServer),lastLocal?.expression&&'l:'+flat(lastLocal.expression)].filter(Boolean);}
function memoFor(){const memo=kv.get(LEARN_KEY,{});for(const k of memoKeys())if(memo[k]?.e)return memo[k].e;return null;}
/* Mẫu nét đã học được nạp lại mỗi lần mở */
for(const t of kv.get(TPL_KEY,[]))try{I.addTemplate(t.l,t.p);}catch{}
const candCss=document.createElement('style');candCss.textContent='#smartCandidates{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}#smartCandidates[hidden]{display:none}#smartCandidates .sm-cand{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:4px 10px;min-height:36px;border:1px solid #9cc9c2;border-radius:8px;background:#f2faf8;color:#123f3b;font:600 15px/1.2 "Cambria Math",Cambria,serif;cursor:pointer}#smartCandidates .sm-cand small{font:500 11px/1.2 system-ui,sans-serif;color:#537a74}#smartCandidates .sm-cand.on{background:#d6f0ea;border-color:#168a80;box-shadow:inset 0 0 0 1px #168a80}#smartCandidates .sm-learned{font-size:11px;color:#6b7f7c;margin-left:auto}#smartCandidates .sm-forget{font-size:11px;padding:2px 6px;min-height:0;background:none;border:0;color:#a3402f;text-decoration:underline;cursor:pointer}';document.head.append(candCss);
const candBox=document.createElement('div');candBox.id='smartCandidates';candBox.hidden=true;q('smartRecognitionStatus',confirm).after(candBox);
function showCandidates(){
 const list=[],seen=new Set(),push=(src,e)=>{e=norm(e);const k=flat(e);if(!k||seen.has(k))return;seen.add(k);list.push({src,e});};
 const memo=kv.get(LEARN_KEY,{});for(const k of memoKeys())if(memo[k]?.e)push('Bạn đã sửa lần trước',memo[k].e);
 if(lastServer)push('AI máy chủ',lastServer);
 if(lastLocal?.expression)push('Nhận diện trên máy',lastLocal.expression);
 for(const e of nearest(list[0]?.e||q('smartExpression').value,3))push('Công thức thường gặp',e);
 candBox.replaceChildren();const cur=flat(norm(q('smartExpression').value));
 for(const c of list.slice(0,6)){const b=document.createElement('button');b.type='button';b.className='sm-cand'+(flat(c.e)===cur?' on':'');b.innerHTML='<span></span><small></small>';b.firstChild.textContent=c.e;b.lastChild.textContent=c.src;
  b.onclick=()=>{const inp=q('smartExpression');inp.disabled=false;inp.value=c.e;inp.dispatchEvent(new Event('input'));};candBox.append(b);}
 const n=I.userTemplateCount();if(n){const s=document.createElement('span');s.className='sm-learned';s.textContent='Đã học '+n+' mẫu nét chữ của bạn';const f=document.createElement('button');f.type='button';f.className='sm-forget';f.textContent='Quên';f.title='Xóa các mẫu nét chữ và các lần sửa đã học trên máy này';f.onclick=()=>{I.clearUserTemplates();kv.set(TPL_KEY,[]);kv.set(LEARN_KEY,{});showCandidates();};candBox.append(s,f);}
 candBox.hidden=!candBox.childElementCount;
}
q('smartExpression').addEventListener('input',()=>{const cur=flat(norm(q('smartExpression').value));candBox.querySelectorAll('.sm-cand').forEach(b=>b.classList.toggle('on',flat(b.firstChild.textContent)===cur));});
/* Học khi người dùng xác nhận: nhớ lần sửa; nếu chỉ sai vài kí hiệu thì lấy nét đó làm mẫu cho kí hiệu đúng */
const SAME_SHAPE=[['1','I','l','i','|'],['0','o','O'],['x','×']];
function learn(accepted){
 const acc=norm(accepted);if(!acc)return;
 const memo=kv.get(LEARN_KEY,{}),now=Date.now();
 if(lastLocal?.expression&&flat(norm(lastLocal.expression)||lastLocal.expression)!==flat(acc))memo['l:'+flat(lastLocal.expression)]={e:acc,t:now};
 if(lastServer&&flat(norm(lastServer))!==flat(acc))memo['s:'+flat(norm(lastServer)||lastServer)]={e:acc,t:now};
 const ks=Object.keys(memo);if(ks.length>300)ks.sort((a,b)=>memo[a].t-memo[b].t).slice(0,ks.length-300).forEach(k=>delete memo[k]);
 kv.set(LEARN_KEY,memo);
 const syms=lastLocal?.symbols;if(!syms?.length||/\(\(/.test(lastLocal.expression))return;
 const want=Array.from(acc.replace(/[\s*^]/g,''));if(want.length!==syms.length)return;
 const diff=syms.map((s,i)=>[s,want[i]]).filter(([s,c])=>!s.exact&&s.text!==c&&s.text.toLowerCase()!==c.toLowerCase()&&!SAME_SHAPE.some(g=>g.includes(s.text)&&g.includes(c)));
 if(!diff.length||diff.length>Math.max(1,Math.floor(syms.length*0.4)))return;
 const thin=path=>{const step=Math.max(1,Math.ceil(path.length/48));return path.filter((_,i)=>i%step===0||i===path.length-1).map(p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}));};
 const saved=kv.get(TPL_KEY,[]);
 for(const [s,c] of diff){const p=(s.paths||[]).map(thin);if(p.length&&I.addTemplate(c,p))saved.push({l:c,p});}
 kv.set(TPL_KEY,saved.slice(-400));
}
/* Giải / Tính từ công thức viết tay, dùng giá trị các thanh trượt đang đặt */
function fmtNum(v){if(!Number.isFinite(v))return 'không xác định';for(let d=1;d<=12;d++){const n=Math.round(v*d);if(Math.abs(v*d-n)<1e-9&&Math.abs(n)<10000)return (n<0?'−':'')+Math.abs(n)+(d>1?'/'+d+' ≈ '+dec(v):'');}return dec(v);}
const dec=v=>(+v.toPrecision(6)).toLocaleString('vi-VN',{maximumFractionDigits:6}).replace('-','−');
/* Đơn vị thường gặp của đại lượng cần tính (khi chưa có trong thanh trượt) */
const UNITS={I:'A',U:'V',R:'Ω',P:'W',F:'N',m:'kg',v:'m/s',a:'m/s²',s:'m',t:'s',T:'s',f:'Hz',ω:'rad/s',λ:'m',Q:'J',A:'J',W:'J',E:'J',p:'Pa',C:'F',g:'m/s²'};
function roots(f,lo,hi){const N=4000,out=[],h=(hi-lo)/N;let xp=NaN,fp=NaN,xa=lo,fa=f(xa);
 for(let i=1;i<=N;i++){const xb=lo+i*h,fb=f(xb);
  if(Number.isFinite(fa)&&Number.isFinite(fb)){
   if(fa===0)out.push(xa);
   else if(fa*fb<0&&Math.abs(fa)<1e6&&Math.abs(fb)<1e6){let a=xa,b=xb,va=fa;for(let k=0;k<70;k++){const m=(a+b)/2,vm=f(m);if(!Number.isFinite(vm))break;if(va*vm<=0)b=m;else{a=m;va=vm;}}const r=(a+b)/2,fr=f(r);if(Number.isFinite(fr)&&Math.abs(fr)<1e-6*(1+Math.abs(fa)+Math.abs(fb)))out.push(r);}
   else if(Number.isFinite(fp)&&Math.abs(fa)<Math.abs(fp)&&Math.abs(fa)<Math.abs(fb)&&Math.abs(fa)<1e-6){let a=xp,b=xb;for(let k=0;k<80;k++){const m1=a+(b-a)/3,m2=b-(b-a)/3;if(Math.abs(f(m1))<Math.abs(f(m2)))b=m2;else a=m1;}const r=(a+b)/2;if(Math.abs(f(r))<1e-9)out.push(r);}
  }xp=xa;fp=fa;xa=xb;fa=fb;}
 return out.filter((r,i)=>!out.slice(0,i).some(x=>Math.abs(x-r)<Math.max(1e-7,h)));}
function solveActive(){try{
 const s=active.scene,p=M.parse(s.expression),params=s.params||[],bound=new Set(params.map(x=>x.key));
 const free=p.vars.filter(v=>!bound.has('v:'+v)),unit=n=>{const u=params.find(x=>x.name===n)?.unit||(n===out?UNITS[n]:'');return u?' '+u:'';};
 const out=p.rhs&&p.lhs.type==='var'?p.lhs.name:null,g=s.graph||{};
 const range=[Number.isFinite(g.min)?Math.min(g.min,-100):-100,Number.isFinite(g.max)?Math.max(g.max,100):100];
 const show=(v,list,head)=>{if(!list.length)return hint('Không tìm thấy nghiệm trong khoảng '+range[0]+' đến '+range[1]+'.');hint(head+list.slice(0,6).map(r=>v+' = '+fmtNum(r)+unit(v)).join(';  ')+(list.length>6?' …':''));};
 if(out){const rest=free.filter(v=>v!==out);
  if(!rest.length)return hint(out+' = '+fmtNum(M.evaluate(p.rhs,params))+unit(out)+'  (theo giá trị các thanh trượt)');
  if(rest.length===1){const v=rest[0];return show(v,roots(x=>M.evaluate(p.rhs,params,{[v]:x}),range[0],range[1]),out+' = 0 khi ');}
  return hint('Còn '+rest.join(', ')+' chưa có giá trị. Bấm Chọn số/ký hiệu để tạo thanh trượt cho chúng.');}
 const f=sc=>p.rhs?M.evaluate(p.lhs,params,sc)-M.evaluate(p.rhs,params,sc):M.evaluate(p.lhs,params,sc);
 if(!free.length)return hint(p.rhs?(Math.abs(f({}))<1e-9?'Đẳng thức đúng.':'Đẳng thức sai: hai vế lệch '+fmtNum(f({}))+'.'):'= '+fmtNum(f({})));
 if(free.length===1){const v=free[0];return show(v,roots(x=>f({[v]:x}),range[0],range[1]),'Nghiệm: ');}
 hint('Phương trình có nhiều ẩn ('+free.join(', ')+'). Bấm Chọn số/ký hiệu để gán giá trị, giữ lại một ẩn cần giải.');
}catch(e){hint(e.message);}}

/* ---- Không phải chờ AI máy chủ: bộ nhớ đệm theo nét viết + kiểm tra nền sau khi đã chèn ---- */
const tidy=t=>String(t||'').replace(/\^\((\d+)\)/g,'^$1');
const OCR_CACHE='noteboard.smartInk.ocrCache.v1';
async function inkKey(source){
 const text=JSON.stringify((source.ink||[]).map(s=>s.pts.map(p=>[Math.round(p.x),Math.round(p.y)])));
 try{const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].slice(0,16).map(b=>b.toString(16).padStart(2,'0')).join('');}
 catch{let h=0;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))|0;return 'h'+h+'_'+text.length;}
}
/* Cùng nét viết (khoanh lại, hoàn tác rồi khoanh lại, mở lại bài) thì lấy ngay kết quả AI đã có */
async function serverRecognize(source,signal){
 const key=await inkKey(source),cache=kv.get(OCR_CACHE,{});
 if(cache[key]?.l)return {latex:cache[key].l,cached:true};
 const r=await window.NBFormulaOCR.recognize(source.src,signal);
 if(typeof r?.latex==='string'&&r.latex&&r.latex.length<=4096){
  cache[key]={l:r.latex,t:Date.now()};const ks=Object.keys(cache);
  if(ks.length>150)ks.sort((a,b)=>cache[a].t-cache[b].t).slice(0,ks.length-150).forEach(k=>delete cache[k]);
  kv.set(OCR_CACHE,cache);
 }
 return r;
}
let bg=null;
const offer=document.createElement('div');offer.id='smartAiOffer';offer.hidden=true;
offer.innerHTML='<span></span> <button type="button" data-ai="use">Dùng bản AI</button> <button type="button" data-ai="skip">Giữ nguyên</button>';
q('smartHint',panel).after(offer);
const offerCss=document.createElement('style');offerCss.textContent='#smartAiOffer{margin:6px 0;padding:6px 10px;border:1px solid #e0b25a;border-radius:8px;background:#fff8e6;color:#5b4210;font-size:13px}#smartAiOffer[hidden]{display:none}#smartAiOffer b{font-family:"Cambria Math",Cambria,serif;font-size:15px}#smartAiOffer button{min-height:30px;padding:3px 10px;margin-left:4px}';document.head.append(offerCss);
let offerFor=null;
function backgroundResult(result,local0){
 const t=bg?.target;bg=null;if(!t||!t.el.isConnected||!t.pic?.smart)return;
 if(typeof result?.latex!=='string'||!result.latex)return;
 let ai='';try{ai=tidy(M.parse(M.normalise(result.latex)).source);}catch{return;}
 if(flat(ai)===flat(tidy(t.pic.smart.expression)))return;            /* AI đồng ý với bản đã chèn */
 offerFor={t,ai,latex:result.latex,local:local0};
 if(active?.target===t)showOffer();
 else toast('AI máy chủ đọc công thức vừa chèn là '+ai+'. Chạm vào công thức để xem và đổi.');
}
function showOffer(){if(!offerFor||active?.target!==offerFor.t){offer.hidden=true;return;}offer.firstChild.innerHTML='AI máy chủ đọc là: <b></b>';offer.querySelector('b').textContent=offerFor.ai;offer.hidden=false;}
offer.addEventListener('click',e=>{const act=e.target.closest('[data-ai]')?.dataset.ai;if(!act||!offerFor)return;const o=offerFor;offerFor=null;offer.hidden=true;
 if(act!=='use'||active?.target!==o.t)return;
 /* Học từ lần này để lần sau nhận diện trên máy ra đúng ngay */
 const keep=[lastLocal,lastServer];lastLocal=o.local;lastServer=o.latex;learn(o.ai);[lastLocal,lastServer]=keep;
 editingTarget=o.t;const s=active.scene;q('smartSourcePreview').src=s.source?.src||o.t.pic.src;q('smartExpression').disabled=false;q('smartExpression').value=o.ai;
 q('smartRecognitionStatus').textContent='Bản đọc của AI máy chủ. Bấm Xác nhận để thay công thức (liên kết tham số và đồ thị sẽ đặt lại).';
 candBox.hidden=true;finish();restoreKeyboardPreference();confirm.showModal();verifyExpression();});
const enterBase=enter;enter=function(t){enterBase(t);showOffer();};   /* mở lại công thức thì hiện đề xuất AI còn chờ */

/* ---- Gợi ý theo môn ngay trong khung nhận diện: Hóa (cân bằng, khối lượng mol), Lí (đổi đơn vị, kiểm tra đơn vị),
   Tiếng Anh (đọc câu viết tay). Tính toán chạy trên máy (math/chem-units.js). ---- */
const CU=window.NBChemUnits;
const subjBox=document.createElement('div');subjBox.id='smartSubject';subjBox.hidden=true;candBox.after(subjBox);
const subjCss=document.createElement('style');subjCss.textContent='#smartSubject{margin:6px 0;padding:8px 10px;border:1px solid #b9d7e8;border-radius:10px;background:#f3f9fd;color:#173b52;font-size:14px}#smartSubject[hidden]{display:none}#smartSubject .sj-main{font:600 18px/1.35 "Cambria Math",Cambria,serif;margin:2px 0 4px}#smartSubject .sj-note{font-size:12.5px;color:#4b6475}#smartSubject .sj-warn{color:#a3402f;font-weight:600}#smartSubject .sj-ok{color:#1d7a55}#smartSubject button{min-height:32px;padding:4px 12px;margin:4px 6px 0 0}';document.head.append(subjCss);
const sources=()=>[lastServer,q('smartExpression').value].filter(Boolean);
let spokeFor='';
function readEnglish(text){if(!text)return;if(typeof speakWord==='function')speakWord(text,'en-US');}
function englishOf(){for(const s of sources()){const t=CU.latexToText(s);if(CU.looksLikeSentence(t))return t;}return '';}
/* Chèn kết quả dạng chữ ngay dưới nét viết (giữ nguyên nét viết tay) */
function insertBelow(text){
 const src=selection?.source;if(!src)return;
 const t=newText(src.x+8,src.y+src.h+18);t.el.textContent=text;endText(t);if(typeof historyCommit==='function')historyCommit();
 confirm.close();stopWorker();selection=null;toast('Đã chèn: '+text);
}
/* Câu tiếng Anh: thẻ chữ trên bảng, chạm (công cụ Chọn) để nghe lại */
function insertSpeakCard(text){
 const src=selection?.source;if(!src)return;
 const c=document.createElement('canvas'),g=c.getContext('2d'),font='600 44px "Segoe UI",Arial,sans-serif';g.font=font;
 const w=Math.min(1500,Math.ceil(g.measureText(text).width)+120),h=96;c.width=w;c.height=h;
 g.fillStyle='#ffffff';g.strokeStyle='#5aa0c8';g.lineWidth=3;g.beginPath();g.roundRect?.(2,2,w-4,h-4,18);if(!g.roundRect)g.rect(2,2,w-4,h-4);g.fill();g.stroke();
 g.font='34px "Segoe UI Emoji",sans-serif';g.fillText('🔊',22,62);g.font=font;g.fillStyle='#173b52';g.fillText(text,80,64);
 const width=Math.min(1200,w*0.7);addPic(c.toDataURL('image/png'),{x:Math.max(0,src.x),y:src.y+src.h+18,w:width,word:text,lang:'en-US'});
 confirm.close();stopWorker();selection=null;readEnglish(text);toast('Đã chèn thẻ câu. Dùng công cụ Chọn rồi chạm vào thẻ để nghe lại.');
}
function updateSubject(){
 if(!CU){subjBox.hidden=true;return;}
 const html=[],acts=[];let found=false;
 for(const s of sources()){
  if(CU.looksLikeEquation(s)){const r=CU.balance(s);if(r?.ok){found=true;
   html.push('<div class="sj-note">⚗ Hóa học · phương trình '+(r.already?'đã cân bằng':'sau khi cân bằng')+'</div><div class="sj-main"></div><div class="sj-note">Khối lượng mol (g/mol): '+r.masses.map(m=>m.formula+' = '+String(m.M).replace('.',',')).join(' · ')+'</div>');
   acts.push(['Chèn phương trình đã cân bằng',()=>insertBelow(r.text),r.text]);}
   else if(r){found=true;html.push('<div class="sj-warn">⚗ '+r.error+'</div>');}break;}
  if(CU.looksLikeFormula(s)){const f=CU.chemText(s),m=CU.molarMass(f);if(m){found=true;const t='M('+CU.pretty(f)+') = '+String(m).replace('.',',')+' g/mol';html.push('<div class="sj-note">⚗ Hóa học · khối lượng mol</div><div class="sj-main"></div>');acts.push(['Chèn lên bảng',()=>insertBelow(t),t]);}break;}
  const cv=CU.convert(s);if(cv){found=true;html.push('<div class="sj-note">📏 Đổi đơn vị về SI</div><div class="sj-main"></div>');acts.push(['Chèn lên bảng',()=>insertBelow(cv.text),cv.text]);break;}
 }
 if(!found){
  try{const d=CU.checkDimensions(M.parse(q('smartExpression').value));if(d){found=true;html.push(d.ok?'<div class="sj-ok">✓ Hai vế cùng đơn vị ('+d.unit+')</div>':'<div class="sj-warn">⚠ '+d.msg+'</div>');}}catch{}
 }
 const en=englishOf();
 if(en){found=true;html.push('<div class="sj-note">🔤 Câu tiếng Anh</div><div class="sj-main"></div>');acts.push(['🔊 Đọc',()=>readEnglish(en),en],['Chèn thẻ đọc lên bảng',()=>insertSpeakCard(en),null]);
  if(lastServer&&spokeFor!==lastServer){spokeFor=lastServer;readEnglish(en);}}
 subjBox.innerHTML=html.join('');
 const mains=[...subjBox.querySelectorAll('.sj-main')];let mi=0;
 for(const [label,fn,shown] of acts){if(shown!=null&&mains[mi])mains[mi++].textContent=shown;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;subjBox.append(b);}
 subjBox.hidden=!found;
}
const showCandidatesBase=showCandidates;showCandidates=function(){showCandidatesBase();updateSubject();};
q('smartExpression').addEventListener('input',updateSubject);
const solveBase=solveActive;solveActive=function(){solveBase();try{const d=CU?.checkDimensions(M.parse(active.scene.expression));if(d&&!d.ok)hint('⚠ '+d.msg+'  '+q('smartHint').textContent);}catch{}};
/* ---- Chèn công thức chuẩn dạng KaTeX: dựng bằng KaTeX, vẽ thành ảnh PNG nét cao (nhúng phông KaTeX) để lưu trong .nbink ---- */
const TEX_FONTS=['Main-Regular','Main-Italic','Main-Bold','Math-Italic','AMS-Regular','Size1-Regular','Size2-Regular','Size3-Regular','Size4-Regular'];
let texFontCss=null,serverShown=null;
async function katexFontCss(){
 if(texFontCss!=null)return texFontCss;
 const parts=await Promise.all(TEX_FONTS.map(async f=>{try{const r=await fetch('katex/fonts/KaTeX_'+f+'.woff2');if(!r.ok)throw 0;const b=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));
  const [fam,style]=f.split('-');return `@font-face{font-family:KaTeX_${fam};src:url(data:font/woff2;base64,${btoa(s)}) format("woff2");font-weight:${/Bold/.test(style)?'bold':'normal'};font-style:${/Italic/.test(style)?'italic':'normal'}}`;}catch{return '';}}));
 let css='';try{const sheet=[...document.styleSheets].find(s=>/katex/.test(s.href||''));css=[...sheet.cssRules].map(r=>r.cssText).filter(t=>!/^@font-face/.test(t)).join('\n');}catch{}
 return texFontCss=parts.join('\n')+'\n'+css;
}
/* LaTeX cho bản chuẩn: ưu tiên LaTeX gốc của AI máy chủ nếu người dùng chưa sửa; không thì từ công thức trong ô */
function texSource(){
 const v=q('smartExpression').value.trim();
 if(lastServer&&(!v||v===serverShown||flat(norm(lastServer))===flat(norm(v))&&norm(v)))return lastServer;
 try{return M.latex(M.parse(v),[]);}catch{return v;}
}
async function texToPng(latex){
 if(!window.katex)throw Error('Chưa nạp được KaTeX.');
 const html=katex.renderToString(latex,{displayMode:true,throwOnError:true,output:'html',strict:false});
 const css=await katexFontCss();
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;font-size:44px;color:#14263a;padding:8px 14px;display:inline-block;white-space:nowrap';host.innerHTML=html;document.body.append(host);
 try{await document.fonts?.ready;}catch{}
 const r=host.getBoundingClientRect(),w=Math.ceil(r.width)+4,h=Math.ceil(r.height)+4;host.remove();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:44px;color:#14263a;padding:8px 14px;display:inline-block;white-space:nowrap"><style>${css.replace(/<\//g,'<\\/')}</style>${html}</div></foreignObject></svg>`;
 const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Không dựng được ảnh công thức.'));img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
 const k=2,c=document.createElement('canvas');c.width=w*k;c.height=h*k;const g=c.getContext('2d');g.scale(k,k);g.drawImage(img,0,0);
 /* cắt sát phần có mực, chừa lề nhỏ */
 const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 if(x1<0)throw Error('Công thức trống.');
 const pad=16,cw=x1-x0+1+pad*2,ch=y1-y0+1+pad*2,o=document.createElement('canvas');o.width=cw;o.height=ch;o.getContext('2d').drawImage(c,x0-pad,y0-pad,cw,ch,0,0,cw,ch);
 return {src:o.toDataURL('image/png'),w:cw/k,h:ch/k};
}
const texBtn=document.createElement('button');texBtn.type='button';texBtn.id='smartTex';texBtn.textContent='Chèn công thức chuẩn (KaTeX)';texBtn.title='Thay nét viết bằng công thức in chuẩn, hiển thị như sách giáo khoa';
q('smartAccept',confirm).after(texBtn);
texBtn.onclick=async()=>{const err=q('smartConfirmError');err.textContent='';
 try{
  if(!selection||selection.strokes.some(s=>!strokes.includes(s)))throw Error('Nét viết đã thay đổi. Hãy khoanh lại.');
  const latex=texSource();if(!latex)throw Error('Chưa có công thức.');
  texBtn.disabled=true;const p=await texToPng(latex);
  const src=selection.source,w=Math.min(1400,Math.max(src.w,p.w*0.9));
  learn(q('smartExpression').value);
  const t=addPic(p.src,{x:Math.max(0,src.x),y:Math.max(0,src.y),w});t.el.querySelector('img').alt='Công thức: '+latex;
  const chosen=new Set(selection.strokes);strokes=strokes.filter(s=>!chosen.has(s));
  historyStates[historyIndex]=snapshot();scheduleSave();markPages();apply();
  confirm.close();stopWorker();selection=null;toast('Đã chèn công thức chuẩn. Ctrl+Z để lấy lại nét viết.');
 }catch(e){err.textContent=e.message.replace(/^KaTeX parse error: /,'Công thức chưa đúng cú pháp LaTeX: ');}
 finally{texBtn.disabled=false;}};

/* Bảng biến thiên từ công thức viết tay (thay giá trị thanh trượt vào tham số) */
function variationFromActive(){if(!active)return;if(typeof window.nbOpenVariation!=='function')return hint('Bản này chưa có công cụ bảng biến thiên.');
 const s=active.scene,p=M.parse(s.expression),vals=new Map((s.params||[]).map(x=>[x.key,x.value]));
 const text=p.tokens.map(t=>{const v=vals.get(M.keyOf(t));return v==null?t.text:'('+v+')';}).join('');
 finish();window.nbOpenVariation(text);}
window.NBSmartInk={begin:beginCircle,recogniseSelection,enter,finish,get active(){return active;},get view(){return frame;}};
})();
