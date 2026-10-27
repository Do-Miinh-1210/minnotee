'use strict';
importScripts('ink-recognition.js');
onmessage=e=>{try{postMessage({ok:true,result:NBInkRecognition.recognise(e.data.strokes)});}catch(error){postMessage({ok:false,error:error.message});}};
