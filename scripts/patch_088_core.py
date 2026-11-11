import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

target_file = 'Resources/Whiteboard/assets/index-CTbULhps.js'
with open(target_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Enable webPanel in Hpe()
p1_old = 'function Hpe(){return{os:"web",'
p1_new = 'function Hpe(){return{os:"web",webPanel:!0,'
assert p1_old in text, "p1_old not found"
text = text.replace(p1_old, p1_new, 1)
print("1. webPanel enabled in Hpe()")

# 2. Add iframe fallback for webview in NoteRenderer 0.8.8
p2_old = 'D.createElement("webview",{ref:r,src:e,partition:"persist:webpanel",allowpopups:"true",className:t?void 0:"off"})'
p2_new = 'D.createElement((window.chrome&&window.chrome.webview)?"iframe":"webview",{ref:r,src:e,partition:"persist:webpanel",allowpopups:"true",className:t?void 0:"off",style:{width:"100%",height:"100%",border:"none"}})'
assert p2_old in text, "p2_old not found"
text = text.replace(p2_old, p2_new, 1)
print("2. webview iframe fallback patched")

# 3. Add Casio state hooks in main Whiteboard component
p3_old = ',[ca,jx]=D.useState(u.pagesPanel??!e.mobile),'
p3_new = ',[ca,jx]=D.useState(u.pagesPanel??!e.mobile),[__casioOpen,__setCasioOpen]=D.useState(!!(u.calc&&u.calc.open)),__casioPrefsRef=D.useRef({...u.calc}),__casioSavePrefs=A=>{__casioPrefsRef.current={...__casioPrefsRef.current,...A};ht({calc:__casioPrefsRef.current})},[__casioMachine]=D.useState(()=>{if(typeof window.initCasioEngine==="function"&&!window.CasioCalc)window.initCasioEngine();const A=window.CasioCalc?new window.CasioCalc.Machine:null;if(A&&u.calc&&u.calc.mem)try{A.load(u.calc.mem)}catch(W){}if(A){let W;A.onChange=()=>{clearTimeout(W);W=window.setTimeout(()=>__casioSavePrefs({mem:A.save()}),400)}}return A}),__toggleCasio=A=>{__setCasioOpen(A);__casioSavePrefs({open:A})},[__casioScreenOpen,__setCasioScreenOpen]=D.useState(!!(u.calc&&u.calc.screen&&u.calc.screen.open)),__toggleCasioScreen=()=>__setCasioScreenOpen(A=>{const W=!A;__casioSavePrefs({screen:{...(__casioPrefsRef.current&&__casioPrefsRef.current.screen),open:W}});return W}),__casioSaveScreenPrefs=A=>__casioSavePrefs({screen:{...(__casioPrefsRef.current&&__casioPrefsRef.current.screen),...A}}),'
assert p3_old in text, "p3_old not found"
text = text.replace(p3_old, p3_new, 1)
print("3. Casio state hooks added")

# 4. Expose editor, ref, and Casio on window
p4_old = 'u.tool&&A.setTool(u.tool),u.zoom&&A.setZoom(u.zoom),s.current=A,e.ready(),()=>A.dispose()}'
p4_new = 'u.tool&&A.setTool(u.tool),u.zoom&&A.setZoom(u.zoom),s.current=A,window.__meaBoardRef=s,window.__meaBoard=A,window.__noteRendererEditor=A,window.getBoard=()=>A,window.toggleCasioCalculator=()=>__toggleCasio(!__casioOpen),window.openCasioCalculator=()=>__toggleCasio(!0),window.closeCasioCalculator=()=>__toggleCasio(!1),window.__NR_React=D,window.__NR_JSX=h,window.__NR_ReactDOM=TW,window.__NR_i18n=tt,e.ready(),()=>A.dispose()}'
assert p4_old in text, "p4_old not found"
text = text.replace(p4_old, p4_new, 1)
print("4. window.__meaBoard and Casio exposed")

# 5. Add "calc" to tools lists
p5_old = '"structure","sticker","timer","picker","text"'
p5_new = '"structure","sticker","timer","picker","calc","text"'
assert p5_old in text, "p5_old not found"
text = text.replace(p5_old, p5_new, 1)

p5b_old = '"atomTool","sticker","timer","picker","webPanel","text"'
p5b_new = '"atomTool","sticker","timer","picker","webPanel","calc","text"'
assert p5b_old in text, "p5b_old not found"
text = text.replace(p5b_old, p5b_new, 1)
print("5. calc added to tool lists")

# 6. Add "calc" command switch case
p6_old = 'case"timer":return $1(!hp);case"picker":return Uc(!Za);case"text":return Bi("text");'
p6_new = 'case"timer":return $1(!hp);case"picker":return Uc(!Za);case"calc":return __toggleCasio(!__casioOpen);case"text":return Bi("text");'
assert p6_old in text, "p6_old not found"
text = text.replace(p6_old, p6_new, 1)
print("6. calc command switch case added")

# 7. Add "calc" active check
p7_old = 'if(A==="webPanel")return du;if(A==="picker")return Za;'
p7_new = 'if(A==="webPanel")return du;if(A==="picker")return Za;if(A==="calc")return __casioOpen;'
assert p7_old in text, "p7_old not found"
text = text.replace(p7_old, p7_new, 1)
print("7. calc active check added")

# 8. Add "calc" toolbar button rendering
p8_old = 'picker:()=>Pt("picker")&&h.jsx(zt,{title:n.pickerTip,on:Za,onClick:()=>Uc(!Za),children:h.jsx(oe.dice,{})}),'
calc_btn = 'calc:()=>h.jsx(zt,{title:"Máy tính khoa học (Casio)",on:__casioOpen,onClick:()=>__toggleCasio(!__casioOpen),children:h.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("rect",{x:"4",y:"2",width:"16",height:"20",rx:"2"}),h.jsx("line",{x1:"8",y1:"6",x2:"16",y2:"6"}),h.jsx("line",{x1:"16",y1:"14",x2:"16",y2:"14.01"}),h.jsx("line",{x1:"8",y1:"10",x2:"8",y2:"10.01"}),h.jsx("line",{x1:"12",y1:"10",x2:"12",y2:"10.01"}),h.jsx("line",{x1:"16",y1:"10",x2:"16",y2:"10.01"}),h.jsx("line",{x1:"8",y1:"14",x2:"8",y2:"14.01"}),h.jsx("line",{x1:"12",y1:"14",x2:"12",y2:"14.01"}),h.jsx("line",{x1:"8",y1:"18",x2:"8",y2:"18.01"}),h.jsx("line",{x1:"12",y1:"18",x2:"12",y2:"18.01"}),h.jsx("line",{x1:"16",y1:"18",x2:"16",y2:"18.01"})]})}),'
p8_new = p8_old + calc_btn
assert p8_old in text, "p8_old not found"
text = text.replace(p8_old, p8_new, 1)
print("8. calc toolbar button added")

# 9. Add Casio Dee and Bee rendering right next to webPanel and timer
p9_old = 'Za&&h.jsx(Mse,{onClose:()=>Uc(!1)}),'
casio_jsx = '__casioOpen&&window.CasioCalc&&h.jsx(window.CasioCalc.Dee,{machine:__casioMachine,place:(__casioPrefsRef.current&&__casioPrefsRef.current.x!==void 0)?{x:__casioPrefsRef.current.x,y:__casioPrefsRef.current.y}:void 0,onPlace:A=>__casioSavePrefs(A),scale:((__casioPrefsRef.current&&__casioPrefsRef.current.scale)?__casioPrefsRef.current.scale:(window.innerHeight<680?Math.max(0.72,Number(((window.innerHeight-70)/610).toFixed(2))):1)),onScale:A=>__casioSavePrefs({scale:A}),screen:__casioScreenOpen,onScreen:__toggleCasioScreen,onClose:()=>__toggleCasio(!1)}),__casioOpen&&__casioScreenOpen&&window.CasioCalc&&h.jsx(window.CasioCalc.Bee,{machine:__casioMachine,place:(__casioPrefsRef.current&&__casioPrefsRef.current.screen&&__casioPrefsRef.current.screen.x!==void 0)?{x:__casioPrefsRef.current.screen.x,y:__casioPrefsRef.current.screen.y}:void 0,onPlace:A=>__casioSaveScreenPrefs(A),scale:(__casioPrefsRef.current&&__casioPrefsRef.current.screen&&__casioPrefsRef.current.screen.scale)?__casioPrefsRef.current.screen.scale:1.6,onScale:A=>__casioSaveScreenPrefs({scale:A}),onClose:__toggleCasioScreen}),'
p9_new = p9_old + casio_jsx
assert p9_old in text, "p9_old not found"
text = text.replace(p9_old, p9_new, 1)
print("9. Casio Dee & Bee JSX components added")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: index-CTbULhps.js patched with NoteRenderer v0.8.8 core + Casio + __meaBoard!")
