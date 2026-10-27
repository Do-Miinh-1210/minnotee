/* Opens the independently authenticated Live console; never sends a Windows key. */
(()=>{'use strict';
 const menu=document.querySelector('#insertMenu');if(!menu)return;
 const button=document.createElement('button');button.type='button';button.role='menuitem';button.id='openLiveSession';
 button.innerHTML='<b>Phiên trực tiếp · cả lớp</b><small>Nhập đề Word, phát câu hỏi và nhận trả lời</small>';
 const open=()=>{
  menu.hidden=true;document.querySelector('#insertBtn')?.setAttribute('aria-expanded','false');
  const origin=document.querySelector('meta[name="noteboard-account"]')?location.origin:'https://app.noteboardink.com';
  window.open(origin+'/teacher/live','_blank','noopener,noreferrer');
 };
 button.onclick=open;
 menu.append(button);
 const lesson=document.querySelector('[data-section="lesson"]');if(lesson){const quick=document.createElement('button');quick.type='button';quick.className='setting-btn';quick.id='lessonLiveSession';quick.textContent='Phiên trực tiếp · câu hỏi cả lớp';quick.onclick=open;lesson.append(quick);}
})();
