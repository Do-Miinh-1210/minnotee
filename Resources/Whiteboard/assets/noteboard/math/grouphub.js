/* ============================================================
 * Standalone Offline QR Code Engine (Kazuhiko Arase, MIT)
 * ============================================================ */
(function() {
  if (typeof window !== 'undefined' && typeof window.qrcode !== 'function') {
    var qrcode=function(){function i(t,r){function a(t,r){g=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(l=4*u+17),e(0,0),e(l-7,0),e(0,l-7),i(),o(),v(t,r),7<=u&&h(t),null==n&&(n=w(u,f,c)),d(n,r)}var u=t,f=y[r],g=null,l=0,n=null,c=[],s={},e=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||l<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||l<=r+n||(g[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},o=function(){for(var t=8;t<l-8;t+=1)null==g[t][6]&&(g[t][6]=t%2==0);for(var r=8;r<l-8;r+=1)null==g[6][r]&&(g[6][r]=r%2==0)},i=function(){for(var t=B.getPatternPosition(u),r=0;r<t.length;r+=1)for(var e=0;e<t.length;e+=1){var n=t[r],o=t[e];if(null==g[n][o])for(var i=-2;i<=2;i+=1)for(var a=-2;a<=2;a+=1)g[n+i][o+a]=-2==i||2==i||-2==a||2==a||0==i&&0==a}},h=function(t){for(var r=B.getBCHTypeNumber(u),e=0;e<18;e+=1){var n=!t&&1==(r>>e&1);g[Math.floor(e/3)][e%3+l-8-3]=n}for(e=0;e<18;e+=1){n=!t&&1==(r>>e&1);g[e%3+l-8-3][Math.floor(e/3)]=n}},v=function(t,r){for(var e=f<<3|r,n=B.getBCHTypeInfo(e),o=0;o<15;o+=1){var i=!t&&1==(n>>o&1);o<6?g[o][8]=i:o<8?g[o+1][8]=i:g[l-15+o][8]=i}for(o=0;o<15;o+=1){i=!t&&1==(n>>o&1);o<8?g[8][l-o-1]=i:o<9?g[8][15-o-1+1]=i:g[8][15-o-1]=i}g[l-8][8]=!t},d=function(t,r){for(var e=-1,n=l-1,o=7,i=0,a=B.getMaskFunction(r),u=l-1;0<u;u-=2)for(6==u&&(u-=1);;){for(var f=0;f<2;f+=1)if(null==g[n][u-f]){var c=!1;i<t.length&&(c=1==(t[i]>>>o&1)),a(n,u-f)&&(c=!c),g[n][u-f]=c,-1==(o-=1)&&(i+=1,o=7)}if((n+=e)<0||l<=n){n-=e,e=-e;break}}},w=function(t,r,e){for(var n=b.getRSBlocks(t,r),o=M(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=C(i[u],l.getLength()-1).mod(l);a[u]=new Array(l.getLength()-1);for(g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=0<=s?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};s.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=x(t);break;case"Alphanumeric":e=m(t);break;case"Byte":e=L(t);break;case"Kanji":e=D(t);break;default:throw"mode:"+r}c.push(e),n=null},s.isDark=function(t,r){if(t<0||l<=t||r<0||l<=r)throw t+","+r;return g[t][r]},s.getModuleCount=function(){return l},s.make=function(){if(u<1){for(var t=1;t<40;t++){for(var r=b.getRSBlocks(t,f),e=M(),n=0;n<c.length;n++){var o=c[n];e.put(o.getMode(),4),e.put(o.getLength(),B.getLengthInBits(o.getMode(),t)),o.write(e)}var i=0;for(n=0;n<r.length;n++)i+=r[n].dataCount;if(e.getLengthInBits()<=8*i)break}u=t}a(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){a(!0,e);var n=B.getLostPoint(s);(0==e||n<t)&&(t=n,r=e)}return r}())},s.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<s.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<s.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=s.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},s.createSvgTag=function(t,r,e,n){var o={};"object"==typeof t&&(t=(o=t).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,f,c=s.getModuleCount()*t+2*r,g="";for(f="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",g+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',g+=o.scalable?"":' width="'+c+'px" height="'+c+'px"',g+=' viewBox="0 0 '+c+" "+c+'" ',g+=' preserveAspectRatio="xMinYMin meet"',g+=n.text||e.text?' role="img" aria-labelledby="'+p([n.id,e.id].join(" ").trim())+'"':"",g+=">",g+=n.text?'<title id="'+p(n.id)+'">'+p(n.text)+"</title>":"",g+=e.text?'<description id="'+p(e.id)+'">'+p(e.text)+"</description>":"",g+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',g+='<path d="',a=0;a<s.getModuleCount();a+=1)for(u=a*t+r,i=0;i<s.getModuleCount();i+=1)s.isDark(a,i)&&(g+="M"+(i*t+r)+","+u+f);return g+='" stroke="transparent" fill="black"/>',g+="</svg>"},s.createDataURL=function(o,t){o=o||2,t=void 0===t?4*o:t;var r=s.getModuleCount()*o+2*t,i=t,a=r-t;return I(r,r,function(t,r){if(i<=t&&t<a&&i<=r&&r<a){var e=Math.floor((t-i)/o),n=Math.floor((r-i)/o);return s.isDark(n,e)?0:1}return 1})},s.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=s.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=s.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=p(e),o+='"'),o+="/>"};var p=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return s.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*s.getModuleCount()+2*t,u=t,f=a-t,c={"██":"█","█ ":"▀"," █":"▄","  ":" "},g={"██":"▀","█ ":"▀"," █":" ","  ":" "},l="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<f&&u<=r&&r<f&&s.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<f&&u<=r+1&&r+1<f&&s.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",l+=t<1&&f<=r+1?g[i]:c[i];l+="\n"}return a%2&&0<t?l.substring(0,l.length-a-1)+Array(1+a).join("▀"):l.substring(0,l.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=s.getModuleCount()*t+2*r,u=r,f=a-r,c=Array(t+1).join("██"),g=Array(t+1).join("  "),l="",h="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),h="",n=0;n<a;n+=1)i=1,u<=n&&n<f&&u<=e&&e<f&&s.isDark(o,Math.floor((n-u)/t))&&(i=0),h+=i?c:g;for(o=0;o<t;o+=1)l+=h+"\n"}return l.substring(0,l.length-1)},s.renderTo2dContext=function(t,r){r=r||2;for(var e=s.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=s.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},s}i.stringToBytes=(i.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,i.createStringToBytes=function(u,f){var i=function(){function t(){var t=r.read();if(-1==t)throw"eof";return t}for(var r=S(u),e=0,n={};;){var o=r.read();if(-1==o)break;var i=t(),a=t()<<8|t();n[String.fromCharCode(o<<8|i)]=a,e+=1}if(e!=f)throw e+" != "+f;return n}(),a="?".charCodeAt(0);return function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);if(n<128)r.push(n);else{var o=i[t.charAt(e)];"number"==typeof o?(255&o)==o?r.push(o):(r.push(o>>>8),r.push(255&o)):r.push(a)}}return r}};var r,t,a=1,u=2,o=4,f=8,y={L:1,M:0,Q:3,H:2},e=0,n=1,c=2,g=3,l=4,h=5,s=6,v=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],(t={}).getBCHTypeInfo=function(t){for(var r=t<<10;0<=d(r)-d(1335);)r^=1335<<d(r)-d(1335);return 21522^(t<<10|r)},t.getBCHTypeNumber=function(t){for(var r=t<<12;0<=d(r)-d(7973);)r^=7973<<d(r)-d(7973);return t<<12|r},t.getPatternPosition=function(t){return r[t-1]},t.getMaskFunction=function(t){switch(t){case e:return function(t,r){return(t+r)%2==0};case n:return function(t,r){return t%2==0};case c:return function(t,r){return r%3==0};case g:return function(t,r){return(t+r)%3==0};case l:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case h:return function(t,r){return t*r%2+t*r%3==0};case s:return function(t,r){return(t*r%2+t*r%3)%2==0};case v:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},t.getErrorCorrectPolynomial=function(t){for(var r=C([1],0),e=0;e<t;e+=1)r=r.multiply(C([1,w.gexp(e)],0));return r},t.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case o:case f:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case o:return 16;case f:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case o:return 16;case f:return 12;default:throw"mode:"+t}}},t.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);5<i&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},t);function d(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r}var w=function(){for(var r=new Array(256),e=new Array(256),t=0;t<8;t+=1)r[t]=1<<t;for(t=8;t<256;t+=1)r[t]=r[t-4]^r[t-5]^r[t-6]^r[t-8];for(t=0;t<255;t+=1)e[r[t]]=t;var n={glog:function(t){if(t<1)throw"glog("+t+")";return e[t]},gexp:function(t){for(;t<0;)t+=255;for(;256<=t;)t-=255;return r[t]}};return n}();function C(n,o){if(void 0===n.length)throw n.length+"/"+o;var r=function(){for(var t=0;t<n.length&&0==n[t];)t+=1;for(var r=new Array(n.length-t+o),e=0;e<n.length-t;e+=1)r[e]=n[e+t];return r}(),i={getAt:function(t){return r[t]},getLength:function(){return r.length},multiply:function(t){for(var r=new Array(i.getLength()+t.getLength()-1),e=0;e<i.getLength();e+=1)for(var n=0;n<t.getLength();n+=1)r[e+n]^=w.gexp(w.glog(i.getAt(e))+w.glog(t.getAt(n)));return C(r,0)},mod:function(t){if(i.getLength()-t.getLength()<0)return i;for(var r=w.glog(i.getAt(0))-w.glog(t.getAt(0)),e=new Array(i.getLength()),n=0;n<i.getLength();n+=1)e[n]=i.getAt(n);for(n=0;n<t.getLength();n+=1)e[n]^=w.gexp(w.glog(t.getAt(n))+r);return C(e,0).mod(t)}};return i}function p(){var e=[],o={writeByte:function(t){e.push(255&t)},writeShort:function(t){o.writeByte(t),o.writeByte(t>>>8)},writeBytes:function(t,r,e){r=r||0,e=e||t.length;for(var n=0;n<e;n+=1)o.writeByte(t[n+r])},writeString:function(t){for(var r=0;r<t.length;r+=1)o.writeByte(t.charCodeAt(r))},toByteArray:function(){return e},toString:function(){var t="";t+="[";for(var r=0;r<e.length;r+=1)0<r&&(t+=","),t+=e[r];return t+="]"}};return o}var k,A,b=(k=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],(A={}).getRSBlocks=function(t,r){var e=function(t,r){switch(r){case y.L:return k[4*(t-1)+0];case y.M:return k[4*(t-1)+1];case y.Q:return k[4*(t-1)+2];case y.H:return k[4*(t-1)+3];default:return}}(t,r);if(void 0===e)throw"bad rs block @ typeNumber:"+t+"/errorCorrectionLevel:"+r;for(var n,o,i=e.length/3,a=[],u=0;u<i;u+=1)for(var f=e[3*u+0],c=e[3*u+1],g=e[3*u+2],l=0;l<f;l+=1)a.push((n=g,o=void 0,(o={}).totalCount=c,o.dataCount=n,o));return a},A),M=function(){var e=[],n=0,o={getBuffer:function(){return e},getAt:function(t){var r=Math.floor(t/8);return 1==(e[r]>>>7-t%8&1)},put:function(t,r){for(var e=0;e<r;e+=1)o.putBit(1==(t>>>r-e-1&1))},getLengthInBits:function(){return n},putBit:function(t){var r=Math.floor(n/8);e.length<=r&&e.push(0),t&&(e[r]|=128>>>n%8),n+=1}};return o},x=function(t){var r=a,n=t,e={getMode:function(){return r},getLength:function(t){return n.length},write:function(t){for(var r=n,e=0;e+2<r.length;)t.put(o(r.substring(e,e+3)),10),e+=3;e<r.length&&(r.length-e==1?t.put(o(r.substring(e,e+1)),4):r.length-e==2&&t.put(o(r.substring(e,e+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return e},m=function(t){var r=u,n=t,e={getMode:function(){return r},getLength:function(t){return n.length},write:function(t){for(var r=n,e=0;e+1<r.length;)t.put(45*o(r.charAt(e))+o(r.charAt(e+1)),11),e+=2;e<r.length&&t.put(o(r.charAt(e)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return e},L=function(t){var r=o,e=i.stringToBytes(t),n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=0;r<e.length;r+=1)t.put(e[r],8)}};return n},D=function(t){var r=f,e=i.stringToBytesFuncs.SJIS;if(!e)throw"sjis not supported.";!function(){var t=e("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=e(t),n={getMode:function(){return r},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return n},S=function(t){var e=t,n=0,o=0,i=0,r={read:function(){for(;i<8;){if(n>=e.length){if(0==i)return-1;throw"unexpected end of file./"+i}var t=e.charAt(n);if(n+=1,"="==t)return i=0,-1;t.match(/^\s$/)||(o=o<<6|a(t.charCodeAt(0)),i+=6)}var r=o>>>i-8&255;return i-=8,r}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return r},I=function(t,r,e){for(var n=function(t,r){var n=t,o=r,l=new Array(t*r),e={setPixel:function(t,r,e){l[r*n+t]=e},write:function(t){t.writeString("GIF87a"),t.writeShort(n),t.writeShort(o),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(n),t.writeShort(o),t.writeByte(0);var r=i(2);t.writeByte(2);for(var e=0;255<r.length-e;)t.writeByte(255),t.writeBytes(r,e,255),e+=255;t.writeByte(r.length-e),t.writeBytes(r,e,r.length-e),t.writeByte(0),t.writeString(";")}},i=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,o=h(),i=0;i<r;i+=1)o.add(String.fromCharCode(i));o.add(String.fromCharCode(r)),o.add(String.fromCharCode(e));var a=p(),u=function(t){var e=t,n=0,o=0,r={write:function(t,r){if(t>>>r!=0)throw"length over";for(;8<=n+r;)e.writeByte(255&(t<<n|o)),r-=8-n,t>>>=8-n,n=o=0;o|=t<<n,n+=r},flush:function(){0<n&&e.writeByte(o)}};return r}(a);u.write(r,n);var f=0,c=String.fromCharCode(l[f]);for(f+=1;f<l.length;){var g=String.fromCharCode(l[f]);f+=1,o.contains(c+g)?c+=g:(u.write(o.indexOf(c),n),o.size()<4095&&(o.size()==1<<n&&(n+=1),o.add(c+g)),c=g)}return u.write(o.indexOf(c),n),u.write(e,n),u.flush(),a.toByteArray()},h=function(){var r={},e=0,n={add:function(t){if(n.contains(t))throw"dup key:"+t;r[t]=e,e+=1},size:function(){return e},indexOf:function(t){return r[t]},contains:function(t){return void 0!==r[t]}};return n};return e}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=p();n.write(a);for(var u=function(){function e(t){a+=String.fromCharCode(r(63&t))}var n=0,o=0,i=0,a="",t={},r=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return t.writeByte=function(t){for(n=n<<8|255&t,o+=8,i+=1;6<=o;)e(n>>>o-6),o-=6},t.flush=function(){if(0<o&&(e(n<<6-o),o=n=0),i%3!=0)for(var t=3-i%3,r=0;r<t;r+=1)a+="="},t.toString=function(){return a},t}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return i}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||57344<=n?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}(function(){return qrcode});
    window.qrcode = qrcode;
  }
})();

/**
 * NoteBoard Ink — GroupHub (Trung tâm Điều phối Hoạt động Nhóm Trực tiếp)
 * Tích hợp chế độ dạy trực tiếp: Quản lý thẻ nhóm đa nguồn, InkDrop (nộp bài bằng ảnh/link),
 * InkStage (chiếu toàn màn hình một nhóm có bút vẽ đè) và InkCompare (so sánh song song 2 nhóm).
 */
(()=>{
  'use strict';

  // Khởi tạo trạng thái GroupHub từ localStorage hoặc mặc định
  const STORAGE_KEY = 'noteboard_grouphub_v1';
  const DEFAULT_GROUPS_COUNT = 6;

  // Bảng màu nhận diện riêng biệt cho từng nhóm (Phong cách Padlet Pastel mềm mại & Apple Design)
  const GROUP_PALETTE = [
    // 1. Warm Amber / Honey Cream
    { 
      color: '#ea580c', 
      accent: '#c2410c', 
      bgLight: '#fffbf5', 
      cardBg: '#fffaf3', 
      borderLight: '#fed7aa', 
      cardBorder: '#fed7aa', 
      labelColor: '#9a3412',
      accentGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      pillBg: '#ffedd5',
      pillColor: '#9a3412',
      shadowColor: 'rgba(234, 88, 12, 0.16)'
    },
    // 2. Fresh Sage / Mint Green
    { 
      color: '#16a34a', 
      accent: '#15803d', 
      bgLight: '#f6fbf7', 
      cardBg: '#f4fbf6', 
      borderLight: '#bbf7d0', 
      cardBorder: '#bbf7d0', 
      labelColor: '#166534',
      accentGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      pillBg: '#dcfce7',
      pillColor: '#166534',
      shadowColor: 'rgba(22, 163, 74, 0.16)'
    },
    // 3. Glacier / Sky Blue
    { 
      color: '#0284c7', 
      accent: '#0369a1', 
      bgLight: '#f5faff', 
      cardBg: '#f3f9ff', 
      borderLight: '#bae6fd', 
      cardBorder: '#bae6fd', 
      labelColor: '#075985',
      accentGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
      pillBg: '#e0f2fe',
      pillColor: '#075985',
      shadowColor: 'rgba(2, 132, 199, 0.16)'
    },
    // 4. Lilac / Lavender Bloom
    { 
      color: '#9333ea', 
      accent: '#7e22ce', 
      bgLight: '#faf7ff', 
      cardBg: '#f8f4ff', 
      borderLight: '#e9d5ff', 
      cardBorder: '#e9d5ff', 
      labelColor: '#6b21a8',
      accentGradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
      pillBg: '#f3e8ff',
      pillColor: '#6b21a8',
      shadowColor: 'rgba(147, 51, 234, 0.16)'
    },
    // 5. Soft Coral / Rose Petal
    { 
      color: '#e11d48', 
      accent: '#be123c', 
      bgLight: '#fff6f7', 
      cardBg: '#fff4f6', 
      borderLight: '#fecdd3', 
      cardBorder: '#fecdd3', 
      labelColor: '#9f1239',
      accentGradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
      pillBg: '#ffe4e6',
      pillColor: '#9f1239',
      shadowColor: 'rgba(225, 29, 72, 0.16)'
    },
    // 6. Buttercream / Sunny Yellow
    { 
      color: '#ca8a04', 
      accent: '#a16207', 
      bgLight: '#fefdf2', 
      cardBg: '#fefcee', 
      borderLight: '#fef08a', 
      cardBorder: '#fef08a', 
      labelColor: '#854d0e',
      accentGradient: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
      pillBg: '#fef9c3',
      pillColor: '#854d0e',
      shadowColor: 'rgba(202, 138, 4, 0.16)'
    },
    // 7. Lagoon / Soft Teal
    { 
      color: '#0d9488', 
      accent: '#0f766e', 
      bgLight: '#f3fbfb', 
      cardBg: '#effaf9', 
      borderLight: '#99f6e4', 
      cardBorder: '#99f6e4', 
      labelColor: '#115e59',
      accentGradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
      pillBg: '#ccfbf1',
      pillColor: '#115e59',
      shadowColor: 'rgba(13, 148, 136, 0.16)'
    },
    // 8. Dusty Orchid / Cotton Pink
    { 
      color: '#db2777', 
      accent: '#be185d', 
      bgLight: '#fdf6fa', 
      cardBg: '#fcf3f9', 
      borderLight: '#fbcfe8', 
      cardBorder: '#fbcfe8', 
      labelColor: '#9d174d',
      accentGradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
      pillBg: '#fce7f3',
      pillColor: '#9d174d',
      shadowColor: 'rgba(219, 39, 119, 0.16)'
    },
    // 9. Indigo Wave
    { 
      color: '#4f46e5', 
      accent: '#4338ca', 
      bgLight: '#f6f7ff', 
      cardBg: '#f3f5ff', 
      borderLight: '#c7d2fe', 
      cardBorder: '#c7d2fe', 
      labelColor: '#3730a3',
      accentGradient: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
      pillBg: '#e0e7ff',
      pillColor: '#3730a3',
      shadowColor: 'rgba(79, 70, 229, 0.16)'
    },
    // 10. Modern Pebble Slate
    { 
      color: '#475569', 
      accent: '#334155', 
      bgLight: '#f8fafc', 
      cardBg: '#f6f8fb', 
      borderLight: '#cbd5e1', 
      cardBorder: '#cbd5e1', 
      labelColor: '#1e293b',
      accentGradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
      pillBg: '#f1f5f9',
      pillColor: '#1e293b',
      shadowColor: 'rgba(71, 85, 105, 0.16)'
    }
  ];

  function getGroupColor(index) {
    return GROUP_PALETTE[(Number(index) - 1) % GROUP_PALETTE.length] || GROUP_PALETTE[0];
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.groups)) {
          if (!parsed.task) {
            parsed.task = 'Thảo luận nhóm và nộp bài làm trên giấy (bảng nhóm, vở) hoặc liên kết Canva, Slides...';
          }
          parsed.isLocked = !!parsed.isLocked;
          if (!parsed.timerDefaultMinutes) parsed.timerDefaultMinutes = parsed.timerMinutes || 10;
          parsed.groups.forEach((g, idx) => {
            const pal = getGroupColor(g.id || (idx + 1));
            if (!g.color) g.color = pal.color;
            if (!g.accent) g.accent = pal.accent;
            if (!g.bgLight) g.bgLight = pal.bgLight;
            if (!g.borderLight) g.borderLight = pal.borderLight;
            if (typeof g.members !== 'string') g.members = '';
          });
          return parsed;
        }
      }
    } catch (_) {}
    return createInitialState(DEFAULT_GROUPS_COUNT);
  }

  function createInitialState(count = 6) {
    const groups = [];
    for (let i = 1; i <= count; i++) {
      const pal = getGroupColor(i);
      groups.push({
        id: i,
        name: `Nhóm ${i}`,
        members: '', // Thành viên nhóm
        color: pal.color,
        accent: pal.accent,
        bgLight: pal.bgLight,
        borderLight: pal.borderLight,
        status: 'pending', // 'pending' | 'submitted'
        items: [] // { id, type, title, url, embedUrl, imageData, color, badge, submittedAt }
      });
    }
    return {
      title: 'Hoạt động nhóm · Tiết học trực tiếp',
      task: 'Thảo luận nhóm và nộp bài làm trên giấy (bảng nhóm, vở) hoặc liên kết Canva, Slides...',
      groupCount: count,
      timerMinutes: 10,
      timerSeconds: 0,
      timerDefaultMinutes: 10,
      timerRunning: false,
      isLocked: false,
      groups: groups,
      compareSelection: [] // [groupIdA, groupIdB]
    };
  }

  let state = loadSavedState();
  let timerInterval = null;
  let activeStageGroup = null;
  let activeStageItemIndex = 0; // Index của sản phẩm đang chiếu trên sân khấu
  let activeCompareGroups = null; // [groupA, groupB]
  let penInteractMode = false; // false = vẽ nét đè (mặc định), true = click tương tác iframe
  let stageImageRotation = 0; // Góc xoay ảnh giấy khi chiếu

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
    broadcastTimerState();
  }

  
  /* ----------------------------------------------------
   * Real-time Cloud Sync (Đồng bộ trực tuyến máy chủ VPS)
   * ---------------------------------------------------- */
  let lastCloudSyncTime = Date.now() - 30000;

  async function syncLockToCloud(locked) {
    try {
      let origin = 'https://app.noteboardink.com';
      if ((location.protocol === 'http:' || location.protocol === 'https:') &&
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1')) {
        origin = location.origin;
      }
      await fetch(`${origin}/api/live/group/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: locked, task: state.task || '' })
      });
    } catch (_) {}
  }

  async function pollCloudSubmissions() {
    try {
      let origin = 'https://app.noteboardink.com';
      if ((location.protocol === 'http:' || location.protocol === 'https:') &&
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1')) {
        origin = location.origin;
      }
      const res = await fetch(`${origin}/api/live/group/submissions?since=${lastCloudSyncTime}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.submissions) && data.submissions.length > 0) {
        let hasChanges = false;
        data.submissions.forEach(sub => {
          if (sub.timestamp > lastCloudSyncTime) {
            lastCloudSyncTime = sub.timestamp;
          }
          const targetGroup = state.groups.find(g => g.id === Number(sub.groupId));
          if (targetGroup) {
            if (sub.groupName) targetGroup.name = sub.groupName;
            if (sub.members) targetGroup.members = sub.members;
            if (!targetGroup.items) targetGroup.items = [];

            const subData = sub.imageData || sub.data || null;
            const subUrl = sub.url || sub.content || '';
            const isDup = targetGroup.items.some(it => 
              (sub.id && it.id === sub.id) ||
              (subUrl && it.url === subUrl) ||
              (subData && it.imageData && it.imageData.slice(0, 100) === subData.slice(0, 100))
            );

            if (!isDup) {
              const rawType = (sub.type && sub.type !== 'STUDENT_SUBMISSION') ? sub.type : (subData ? 'image' : 'web');
              const parsedProduct = (rawType !== 'image' && subUrl) ? parseProductUrl(subUrl) : null;
              const newItem = {
                id: sub.id || ('sub_' + Date.now()),
                type: (parsedProduct ? parsedProduct.type : rawType) || 'image',
                title: sub.title || (parsedProduct ? parsedProduct.title : (rawType === 'image' ? 'Ảnh bài làm trên giấy' : 'Sản phẩm nhóm')),
                badge: sub.badge || (parsedProduct ? parsedProduct.badge : (rawType === 'image' ? '📷 Ảnh bài làm' : '🌐 Sản phẩm')),
                color: sub.color || (parsedProduct ? parsedProduct.color : '#8b5cf6'),
                url: subUrl,
                embedUrl: sub.embedUrl || (parsedProduct ? parsedProduct.embedUrl : subUrl),
                imageData: subData,
                canEmbed: parsedProduct ? parsedProduct.canEmbed : true,
                submittedAt: sub.submittedAt || new Date().toLocaleTimeString()
              };

              targetGroup.items.push(newItem);
              targetGroup.status = 'submitted';
              hasChanges = true;

              if (typeof window.toast === 'function') {
                window.toast(`🎉 ${targetGroup.name} vừa nộp bài làm!`);
              }
            }
          }
        });

        if (hasChanges) {
          saveState();
          renderDashboard();
        }
      }
    } catch (_) {}
  }

  setInterval(() => {
    pollCloudSubmissions();
  }, 2500);

  function broadcastTimerState() {
    const payload = {
      type: 'TIMER_STATE_SYNC',
      timerMinutes: state.timerMinutes,
      timerSeconds: state.timerSeconds,
      timerRunning: state.timerRunning,
      isLocked: !!state.isLocked,
      task: state.task
    };
    try {
      const syncCh = new BroadcastChannel('noteboard_grouphub_sync');
      syncCh.postMessage(payload);
    } catch (_) {}
    try {
      localStorage.setItem('noteboard_grouphub_timer_sync', JSON.stringify({ ...payload, timestamp: Date.now() }));
    } catch (_) {}
  }

  /* ----------------------------------------------------
   * 1. Smart URL Parser (Chuyển link thường sang Embed URL)
   * ---------------------------------------------------- */
  function parseProductUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') return null;
    let s = inputUrl.trim();

    // 0. Nếu dán cả thẻ iframe HTML: trích xuất giá trị src
    const iframeSrcMatch = s.match(/<iframe\b[^>]*\bsrc=["']?([^"'\s>]+)["']?/i);
    if (iframeSrcMatch && iframeSrcMatch[1]) {
      s = iframeSrcMatch[1];
    }

    if (!/^https?:\/\//i.test(s) && /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(s)) {
      s = 'https://' + s;
    }
    let urlObj;
    try {
      urlObj = new URL(s);
    } catch {
      return null;
    }

    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname;

    // 1. Google Slides
    const gslideMatch = path.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (gslideMatch || (host.includes('docs.google.com') && path.includes('/presentation'))) {
      const id = gslideMatch ? gslideMatch[1] : '';
      const embedUrl = id 
        ? `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`
        : s.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
      return {
        type: 'googleslides',
        title: 'Google Slides',
        badge: '📊 GG Slides',
        color: '#f59e0b',
        url: s,
        embedUrl: embedUrl,
        canEmbed: true
      };
    }

    // 2. Google Docs
    const gdocsMatch = path.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (gdocsMatch) {
      const id = gdocsMatch[1];
      return {
        type: 'googledocs',
        title: 'Google Docs',
        badge: '📝 GG Docs',
        color: '#2563eb',
        url: s,
        embedUrl: `https://docs.google.com/document/d/${id}/preview`,
        canEmbed: true
      };
    }

    // 3. Canva (Bao gồm canva.com, canva.link, canva.me)
    if (host.includes('canva.com') || host.includes('canva.link') || host.includes('canva.me')) {
      let embedUrl = s;
      if (host.includes('canva.com') && path.includes('/design/')) {
        let cleanPath = path.replace(/\/(edit|watch)(\/.*)?$/, '/view');
        if (!cleanPath.endsWith('/view') && !cleanPath.endsWith('/embed')) {
          cleanPath = cleanPath.replace(/\/+$/, '') + '/view';
        }
        embedUrl = `https://www.canva.com${cleanPath}`;
        if (!embedUrl.includes('embed')) {
          embedUrl += embedUrl.includes('?') ? '&embed' : '?embed';
        }
      }
      return {
        type: 'canva',
        title: 'Canva Thiết kế',
        badge: '🎨 Canva',
        color: '#00c4cc',
        url: s,
        embedUrl: embedUrl,
        canEmbed: true
      };
    }

    // 4. Padlet
    if (host.includes('padlet.com')) {
      let embedUrl = s;
      if (!s.includes('/embed/')) {
        embedUrl = s.replace('padlet.com/', 'padlet.com/embed/');
      }
      return {
        type: 'padlet',
        title: 'Padlet Bảng nhóm',
        badge: '📋 Padlet',
        color: '#e11d48',
        url: s,
        embedUrl: embedUrl,
        canEmbed: true
      };
    }

    // 5. YouTube
    let ytId = '';
    if (host === 'youtu.be') ytId = path.split('/')[1] || '';
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      ytId = urlObj.searchParams.get('v') || (path.match(/\/(?:shorts|embed|live)\/([^/]+)/) || [])[1] || '';
    }
    if (ytId && /^[A-Za-z0-9_-]{11}$/.test(ytId)) {
      return {
        type: 'youtube',
        title: 'Video YouTube',
        badge: '▶️ YouTube',
        color: '#ef4444',
        url: s,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?playsinline=1&rel=0`,
        canEmbed: true
      };
    }

    // 6. GeoGebra
    const ggbMatch = path.match(/\/(?:m|classic)\/([a-zA-Z0-9_-]+)/);
    if (ggbMatch || host.includes('geogebra.org')) {
      const id = ggbMatch ? ggbMatch[1] : '';
      return {
        type: 'geogebra',
        title: 'GeoGebra Mô phỏng',
        badge: '📐 GeoGebra',
        color: '#4f46e5',
        url: s,
        embedUrl: id ? `https://www.geogebra.org/material/iframe/id/${id}` : s,
        canEmbed: true
      };
    }

    // 7. Ảnh trực tiếp
    if (/\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(path)) {
      return {
        type: 'image',
        title: 'Ảnh minh họa',
        badge: '📷 Ảnh bài làm',
        color: '#8b5cf6',
        url: s,
        embedUrl: s,
        canEmbed: true
      };
    }

    // 8. Liên kết Web chung
    return {
      type: 'web',
      title: host.replace(/^www\./, ''),
      badge: '🌐 Web Link',
      color: '#64748b',
      url: s,
      embedUrl: s,
      canEmbed: false // Một số trang chặn iframe, GroupHub sẽ có nút mở tab ngoài
    };
  }

  /* ----------------------------------------------------
   * 2. CSS Styles cho GroupHub Dashboard, InkStage & InkCompare
   * ---------------------------------------------------- */
  const CSS = `
  /* Nút Rail GroupHub */
  #groupHubRailBtn svg { width: 20px; height: 20px; }
  #groupHubBadge {
    display: none;
    position: absolute;
    top: 5px;
    right: 5px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    font-size: 9px;
    font-weight: 700;
    line-height: 15px;
    text-align: center;
    background: #0f766e;
    color: #fff;
    border-radius: 99px;
  }

  /* Overlay Dashboard GroupHub (Phong cách Padlet Canvas + Apple iPadOS) */
  #groupHubDashboard {
    position: fixed;
    inset: 0;
    z-index: 85;
    background-color: #f8fafc;
    background-image: radial-gradient(#cbd5e1 0.85px, transparent 0.85px);
    background-size: 24px 24px;
    display: none;
    flex-direction: column;
    padding: 16px 28px 28px 28px;
    box-sizing: border-box;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }
  #groupHubDashboard.open { display: flex; }

  /* Apple Floating Island Capsule Header */
  .gh-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 10px;
    z-index: 30;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 999px;
    box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.02);
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-title-box { display: flex; align-items: center; gap: 12px; }
  .gh-title-box h1 {
    font-size: 19px;
    font-weight: 800;
    margin: 0;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.02em;
  }
  .gh-status-pill {
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
    box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
    letter-spacing: 0.01em;
  }

  /* Apple Interactive Widget: Khung nhiệm vụ giáo viên giao */
  .gh-mission-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1.5px solid rgba(226, 232, 240, 0.9);
    border-left: 6px solid #0284c7;
    border-radius: 20px;
    padding: 12px 20px;
    margin-bottom: 22px;
    box-shadow: 0 6px 20px -6px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.02);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-mission-bar:hover {
    box-shadow: 0 10px 25px -6px rgba(15, 23, 42, 0.08);
  }
  .gh-mission-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #e0f2fe, #bae6fd);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.15);
  }
  .gh-mission-content {
    flex: 1;
    min-width: 0;
  }
  .gh-mission-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #0284c7;
    margin-bottom: 2px;
    text-transform: uppercase;
  }
  .gh-mission-text {
    font-size: 13.5px;
    font-weight: 600;
    color: #1e293b;
    outline: none;
    border-radius: 6px;
    padding: 3px 6px;
    transition: background 0.15s, box-shadow 0.15s;
    line-height: 1.45;
  }
  .gh-mission-text:focus {
    background: #f0f9ff;
    box-shadow: 0 0 0 2.5px rgba(2, 132, 199, 0.35);
  }

  /* Apple Style Controls: Pill Buttons & Timer */
  .gh-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .gh-timer-box {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 255, 255, 0.95);
    border: 1.5px solid #cbd5e1;
    border-radius: 999px;
    padding: 4px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .gh-timer-digits {
    font-family: -apple-system, BlinkMacSystemFont, "SF Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 15px;
    font-weight: 800;
    color: #0284c7;
    width: 52px;
    text-align: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 2px 2px;
    letter-spacing: 0.02em;
    outline: none;
    cursor: text;
    transition: all 0.15s ease;
  }
  .gh-timer-digits:hover {
    background: rgba(2, 132, 199, 0.08);
    border-color: rgba(2, 132, 199, 0.3);
  }
  .gh-timer-digits:focus {
    background: #ffffff;
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
    color: #0369a1;
  }
  .gh-timer-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 3px 6px;
    font-size: 12px;
    border-radius: 999px;
    font-weight: 600;
    transition: all 0.15s;
  }
  .gh-timer-btn:hover { background: #f1f5f9; color: #0f172a; }

  /* Chuẩn nút bấm Apple Pill (UI/UX Pro Max) */
  .gh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 15px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 650;
    cursor: pointer;
    border: 1.5px solid #cbd5e1;
    background: #ffffff;
    color: #1e293b;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    white-space: nowrap;
  }
  .gh-btn:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    transform: translateY(-1.5px);
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
  }
  .gh-btn:active {
    transform: scale(0.95);
  }
  .gh-btn.primary {
    background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
    border: none;
    color: #ffffff;
    box-shadow: 0 3px 12px rgba(2, 132, 199, 0.3);
  }
  .gh-btn.primary:hover {
    background: linear-gradient(135deg, #0369a1 0%, #0f766e 100%);
    box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);
    transform: translateY(-1.5px);
  }
  .gh-btn.compare-btn {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    border: none;
    color: #ffffff;
    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.25);
  }
  .gh-btn.compare-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
  }
  .gh-btn.compare-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #e2e8f0;
    color: #94a3b8;
    border: 1px solid #cbd5e1;
    box-shadow: none;
    transform: none;
  }
  .gh-btn.gh-lock-btn {
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 700;
  }
  .gh-btn.gallery-btn {
    background: #ffffff;
    border-color: #cbd5e1;
    color: #1e293b;
  }
  .gh-btn.gallery-btn:hover {
    background: #f0f9ff;
    border-color: #0284c7;
    color: #0284c7;
  }
  .gh-btn.snapshot-btn, .gh-stage-btn.snapshot-btn {
    background: linear-gradient(135deg, #0284c7, #0d9488) !important;
    border: none !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    box-shadow: 0 3px 12px rgba(2, 132, 199, 0.32) !important;
  }
  .gh-stage-btn.rotate-btn {
    background: rgba(30, 41, 59, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
    color: #38bdf8 !important;
  }

  /* ----------------------------------------------------
   * Gallery Walk Overlay (Chuẩn Apple iPadOS Fullscreen Showcase)
   * ---------------------------------------------------- */
  #groupHubGalleryWalk {
    position: fixed;
    inset: 0;
    z-index: 86;
    background-color: #f8fafc;
    background-image: radial-gradient(#cbd5e1 0.85px, transparent 0.85px);
    background-size: 24px 24px;
    display: none;
    flex-direction: column;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #groupHubGalleryWalk.open { display: flex; }

  .gh-gallery-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 999px;
    box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.02);
    margin: 10px 20px 0 20px;
    gap: 14px;
    flex-wrap: wrap;
    z-index: 10;
  }
  .gh-gallery-title-box {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .gh-gallery-counter-pill {
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    background: #eff6ff;
    color: #0284c7;
    border: 1px solid #bae6fd;
    box-shadow: 0 1px 3px rgba(2, 132, 199, 0.1);
  }
  .gh-gallery-mission {
    flex: 1;
    min-width: 200px;
    font-size: 12.5px;
    color: #1e3a8a;
    background: rgba(240, 249, 255, 0.85);
    border: 1px solid #bfdbfe;
    border-radius: 999px;
    padding: 6px 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gh-gallery-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .gh-gallery-focus-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    position: relative;
    overflow: hidden;
    gap: 16px;
  }
  .gh-gallery-nav-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1.5px solid rgba(226, 232, 240, 0.9);
    color: #334155;
    font-size: 32px;
    line-height: 46px;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    user-select: none;
  }
  .gh-gallery-nav-btn:hover {
    background: #ffffff;
    color: #0284c7;
    border-color: #0284c7;
    transform: scale(1.1);
    box-shadow: 0 8px 24px rgba(2, 132, 199, 0.2);
  }
  .gh-gallery-nav-btn:active {
    transform: scale(0.94);
  }
  .gh-gallery-main-card {
    flex: 1;
    height: 100%;
    max-height: calc(100vh - 145px);
    background: #ffffff;
    border: 1.5px solid rgba(226, 232, 240, 0.9);
    border-radius: 26px;
    box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .gh-gallery-card-banner {
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1.5px solid #e2e8f0;
    gap: 12px;
    background: #ffffff;
  }
  .gh-gallery-card-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .gh-gallery-group-badge {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    font-size: 15px;
    flex-shrink: 0;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  }
  .gh-gallery-card-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    overflow: hidden;
    position: relative;
  }
  .gh-gallery-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: transform 0.25s ease;
  }
  .gh-gallery-grid-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }
  .gh-gallery-bottom-bar {
    padding: 8px 20px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 999px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
    margin: 0 20px 10px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    overflow-x: auto;
  }
  .gh-gallery-dot-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1.5px solid transparent;
    cursor: pointer;
    background: #f1f5f9;
    color: #475569;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
  }
  .gh-gallery-dot-btn:hover {
    background: #e2e8f0;
    transform: translateY(-1px);
  }
  .gh-gallery-dot-btn.active {
    border-color: currentColor;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
    transform: scale(1.06);
  }

  /* Grid các thẻ nhóm */
  .gh-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 20px;
    flex: 1;
    margin-bottom: 24px;
  }

  /* Thẻ của từng nhóm — Phong cách Padlet Pastel mềm mại + Apple Elevation */
  .gh-card {
    border-radius: 26px;
    padding: 18px 18px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                border-color 0.25s ease;
    position: relative;
    box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
    border: 1.5px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }
  .gh-card:hover {
    box-shadow: 0 20px 38px -10px var(--card-glow, rgba(15, 23, 42, 0.12)), 0 4px 12px rgba(15, 23, 42, 0.03);
    transform: translateY(-6px) scale(1.008);
  }
  .gh-card.has-items {
    /* Đã nộp bài */
  }
  .gh-card.selected-compare {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35), 0 16px 32px rgba(99, 102, 241, 0.15) !important;
  }

  /* Header của thẻ nhóm */
  .gh-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .gh-card-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .gh-group-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: #ffffff;
    font-weight: 850;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  }
  .gh-group-name {
    font-size: 16px;
    font-weight: 750;
    color: #0f172a;
    border: 1.5px solid transparent;
    border-radius: 8px;
    padding: 3px 8px;
    background: transparent;
    outline: none;
    flex: 1;
    min-width: 0;
    transition: all 0.15s ease;
  }
  .gh-group-name:focus {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(2, 132, 199, 0.5);
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }
  .gh-group-badge {
    font-size: 11px;
    font-weight: 750;
    padding: 4px 10px;
    border-radius: 999px;
    letter-spacing: 0.02em;
    user-select: none;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .gh-group-badge.pending {
    background: rgba(254, 240, 138, 0.5);
    color: #854d0e;
    border: 1px solid #fef08a;
  }
  .gh-group-badge.submitted {
    background: rgba(187, 247, 208, 0.7);
    color: #15803d;
    border: 1px solid #86efac;
  }

  /* Dòng danh sách thành viên (Frosted Glass Capsule) */
  .gh-members-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-size: 12px;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }
  .gh-members-row:hover {
    background: #ffffff;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  .gh-members-icon { font-size: 13px; flex-shrink: 0; }
  .gh-members-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    font-weight: 500;
  }
  .gh-members-text.empty {
    font-style: italic;
    color: #94a3b8;
  }

  /* Danh sách sản phẩm trong thẻ nhóm — Phong cách Padlet Notes xếp lớp */
  .gh-items-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex: 1;
    min-height: 90px;
  }
  .gh-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 14px;
    padding: 8px 12px;
    gap: 10px;
    font-size: 12.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-item-row:hover {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
  }
  .gh-item-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .gh-item-badge {
    font-size: 10px;
    font-weight: 750;
    padding: 3px 8px;
    border-radius: 6px;
    color: #fff;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .gh-item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #0f172a;
    font-weight: 600;
  }
  .gh-item-del {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 14px;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .gh-item-del:hover { background: #fee2e2; color: #ef4444; }

  /* Sản phẩm đang được chọn để chiếu & triển lãm */
  .gh-item-row.is-selected {
    background: #f0f9ff;
    border-color: #38bdf8;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12);
  }
  .gh-item-select-btn {
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 999px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
    color: transparent;
    padding: 0;
    flex-shrink: 0;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-item-select-btn:hover {
    border-color: #0284c7;
    background: #e0f2fe;
    transform: scale(1.1);
  }
  .gh-item-row.is-selected .gh-item-select-btn {
    background: linear-gradient(135deg, #0284c7, #0369a1);
    border-color: #0284c7;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
  }
  .gh-item-selected-tag {
    font-size: 9.5px;
    font-weight: 750;
    padding: 2px 6px;
    border-radius: 999px;
    background: #e0f2fe;
    color: #0284c7;
    border: 1px solid #bae6fd;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .gh-item-action-present {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #0f172a;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .gh-item-action-present:hover {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
    transform: scale(1.04);
  }

  /* Thanh chọn sản phẩm trên Stage khi chiếu toàn màn hình */
  .gh-stage-products-bar {
    position: absolute;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 65;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 999px;
    padding: 6px 14px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
    max-width: 90vw;
    overflow-x: auto;
  }
  .gh-stage-products-bar::-webkit-scrollbar { display: none; }
  .gh-stage-products-label {
    font-size: 11.5px;
    font-weight: 750;
    color: #475569;
    white-space: nowrap;
    padding-right: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .gh-stage-prod-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #334155;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-stage-prod-tab:hover {
    background: #e2e8f0;
    color: #0f172a;
    transform: translateY(-1px);
  }
  .gh-stage-prod-tab.active {
    background: linear-gradient(135deg, #0284c7, #0369a1);
    border-color: #38bdf8;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
  }
  .gh-stage-set-featured-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 750;
    border: 1px solid #fde047;
    background: #fef9c3;
    color: #854d0e;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .gh-stage-set-featured-btn:hover {
    background: #fef08a;
    transform: translateY(-1px);
  }
  .gh-stage-set-featured-btn.is-featured {
    background: #fef3c7;
    border-color: #f59e0b;
    color: #b45309;
    cursor: default;
  }

  /* Gallery Walk Products Bar */
  .gh-gallery-products-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    overflow-x: auto;
  }
  .gh-gallery-products-bar::-webkit-scrollbar { display: none; }
  .gh-gallery-tabs-scroll {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
  }
  .gh-gallery-tabs-scroll::-webkit-scrollbar { display: none; }
  .gh-gallery-prod-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #334155;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .gh-gallery-prod-tab:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .gh-gallery-prod-tab.active {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
  }
  .gh-gallery-star-tag {
    font-size: 10px;
    font-weight: 750;
    padding: 1px 6px;
    border-radius: 999px;
    background: #fef08a;
    color: #854d0e;
    margin-left: 2px;
  }
  .gh-gallery-set-featured-btn {
    font-size: 11.5px;
    font-weight: 750;
    padding: 4px 10px;
    border-radius: 999px;
    background: #fef9c3;
    color: #854d0e;
    border: 1px solid #fde047;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .gh-gallery-set-featured-btn:hover { background: #fef08a; }
  .gh-gallery-current-featured {
    font-size: 11px;
    font-weight: 750;
    padding: 3px 8px;
    border-radius: 999px;
    background: #fef3c7;
    color: #b45309;
    white-space: nowrap;
  }

  /* Gallery Grid Mini Pills */
  .gh-gallery-grid-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .gh-gallery-grid-pill {
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
  }
  .gh-gallery-grid-pill:hover { background: #e2e8f0; color: #0f172a; }
  .gh-gallery-grid-pill.active {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
  }

  /* Compare Mode Selector */
  .gh-compare-prod-selector {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .gh-compare-prod-pill {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s;
  }
  .gh-compare-prod-pill:hover { background: #e2e8f0; }
  .gh-compare-prod-pill.active {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
  }

  .gh-empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px 12px;
    color: #64748b;
    font-size: 12px;
    border: 1.5px dashed rgba(0, 0, 0, 0.12);
    border-radius: 18px;
    gap: 4px;
    background: rgba(255, 255, 255, 0.45);
  }

  /* Thanh hành động cuối mỗi thẻ nhóm */
  .gh-card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  .gh-compare-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    user-select: none;
  }
  .gh-compare-toggle input { accent-color: #6366f1; cursor: pointer; }

  /* ----------------------------------------------------
   * 3. InkStage & InkCompare Overlay (Trình chiếu toàn màn hình)
   * ---------------------------------------------------- */
  #groupHubStage {
    position: absolute;
    inset: 0;
    z-index: 12;
    background: var(--paper, #fff);
    display: none;
    flex-direction: column;
    overflow: hidden;
  }
  #groupHubStage.on { display: flex; }

  /* Thanh điều khiển nổi phía trên khi đang chiếu */
  #ghFloatingBar {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 70;
    display: none;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 99px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  }
  #ghFloatingBar.on { display: flex; }
  .gh-stage-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #38bdf8;
    padding: 0 4px;
  }
  .gh-stage-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(30, 41, 59, 0.8);
    color: #f8fafc;
    cursor: pointer;
  }
  .gh-stage-btn:hover { background: rgba(51, 65, 85, 0.95); }
  .gh-stage-btn.active-pen {
    background: #0f766e;
    border-color: #2dd4bf;
    color: #fff;
  }

  /* Khung nội dung trình chiếu (Đơn nhóm) — Nền sáng trang nhã, không bao giờ tối đen */
  .gh-stage-content {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #f8fafc;
    background-image: radial-gradient(#cbd5e1 0.85px, transparent 0.85px);
    background-size: 24px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .gh-stage-loader {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    z-index: 5;
    transition: opacity 0.3s ease;
  }
  .gh-stage-spinner {
    width: 42px;
    height: 42px;
    border: 3.5px solid rgba(2, 132, 199, 0.15);
    border-top-color: #0284c7;
    border-radius: 50%;
    animation: ghSpin 0.9s linear infinite;
  }
  @keyframes ghSpin { to { transform: rotate(360deg); } }

  .gh-stage-helper-pill {
    position: absolute;
    bottom: 20px;
    right: 24px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 999px;
    padding: 8px 18px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
    pointer-events: auto;
  }
  .gh-stage-helper-btn {
    border: none;
    border-radius: 999px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    background: #f1f5f9;
    color: #0f172a;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gh-stage-helper-btn:hover { transform: scale(1.04); }
  .gh-stage-helper-btn.canva {
    background: linear-gradient(135deg, #00c4cc 0%, #0284c7 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(0, 196, 204, 0.35);
  }
  .gh-stage-helper-tip {
    font-size: 12px;
    color: #475569;
    max-width: 380px;
    line-height: 1.4;
    font-weight: 500;
  }
  .gh-stage-fallback-box {
    text-align: center;
    color: #0f172a;
    padding: 34px 38px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1.5px solid rgba(226, 232, 240, 0.95);
    border-radius: 26px;
    max-width: 580px;
    width: 90%;
    box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: ghModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .gh-stage-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
  .gh-stage-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  /* Khung so sánh 2 nhóm song song 50:50 */
  .gh-compare-wrap {
    flex: 1;
    width: 100%;
    height: 100%;
    display: flex;
    position: relative;
    background: #0f172a;
  }
  .gh-compare-pane {
    flex: 1;
    height: 100%;
    position: relative;
    border-right: 2px solid #334155;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .gh-compare-pane:last-child { border-right: none; }
  .gh-compare-head {
    height: 36px;
    background: rgba(15, 23, 42, 0.95);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 700;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Modal QR InkDrop & Thêm sản phẩm (Chuẩn Apple Sheet / Dialog) */
  .gh-modal {
    position: fixed;
    inset: 0;
    z-index: 95;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    transition: opacity 0.25s ease;
  }
  .gh-modal.open { display: flex; }
  .gh-modal-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 28px;
    width: min(540px, 95vw);
    padding: 24px;
    color: #0f172a;
    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: ghModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes ghModalPop {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .gh-modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f1f5f9;
    border: none;
    color: #64748b;
    font-size: 16px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .gh-modal-close-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
    transform: scale(1.08);
  }
  `;

  // Inject CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ----------------------------------------------------
   * 4. Tạo các phần tử DOM cho GroupHub
   * ---------------------------------------------------- */
  // 4a. Nút trên thanh rail bên trái
  const rail = document.getElementById('rail');
  let railBtn = document.getElementById('groupHubRailBtn');
  if (rail && !railBtn) {
    railBtn = document.createElement('button');
    railBtn.className = 'rail-btn';
    railBtn.id = 'groupHubRailBtn';
    railBtn.title = 'GroupHub · Hoạt động nhóm & Trình chiếu đa nguồn (Canva, Slides, Padlet, Ảnh)';
    railBtn.style.position = 'relative';
    railBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>Nhóm</span>
      <span id="groupHubBadge">0</span>
    `;
    const liveBtn = document.getElementById('liveRailBtn');
    if (liveBtn && liveBtn.nextSibling) {
      rail.insertBefore(railBtn, liveBtn.nextSibling);
    } else {
      rail.appendChild(railBtn);
    }
  }

  // 4b. Dashboard Overlay
  const dashboard = document.createElement('div');
  dashboard.id = 'groupHubDashboard';
  dashboard.innerHTML = `
    <div class="gh-header">
      <div class="gh-title-box">
        <h1>👥 NoteBoard Ink · GroupHub</h1>
        <span class="gh-status-pill" id="ghStatusPill">0/6 nhóm đã nộp bài</span>
      </div>

      <div class="gh-controls">
        <div class="gh-timer-box" title="Đồng hồ đếm ngược hoạt động nhóm">
          <span>⏱️</span>
          <input type="text" class="gh-timer-digits" id="ghTimerDigits" value="10:00" title="Nhấp vào để nhập số phút bất kỳ (VD: 5, 12, 15:30) rồi bấm Enter" maxlength="6" autocomplete="off" spellcheck="false" />
          <button class="gh-timer-btn" id="ghTimerToggleBtn" title="Bắt đầu / Tạm dừng">▶</button>
          <button class="gh-timer-btn" id="ghTimerResetBtn" title="Đặt lại thời gian">↺</button>
          <button class="gh-timer-btn" id="ghTimerPlus5Btn" title="+5 phút">+5p</button>
        </div>

        <button class="gh-btn gh-lock-btn" id="ghLockToggleBtn" title="Cổng nộp bài đang MỞ. Bấm để khóa nộp bài">
          <span id="ghLockIcon">🟢</span> <span id="ghLockText">Đang nhận bài</span>
        </button>

        <button class="gh-btn gallery-btn" id="ghGalleryWalkBtn" title="Xem triển lãm toàn màn hình tất cả các nhóm (Gallery Walk)">
          🖼️ Triển lãm (Gallery Walk)
        </button>

        <button class="gh-btn primary" id="ghInkDropBtn" title="Hiện mã QR để học sinh quét nhận nhiệm vụ và nộp bài theo nhóm">
          📱 Mã QR nộp bài (InkDrop)
        </button>

        <button class="gh-btn compare-btn" id="ghCompareBtn" disabled title="Chọn 2 nhóm để so sánh song song">
          ⚖️ So sánh (0)
        </button>

        <button class="gh-btn" id="ghAddGroupBtn" title="Thêm một nhóm mới">
          + Nhóm
        </button>

        <button class="gh-btn" id="ghResetAllBtn" title="Xóa toàn bộ sản phẩm các nhóm để bắt đầu hoạt động mới">
          🗑️ Làm mới
        </button>

        <button class="gh-btn" id="ghCloseDashboardBtn" style="font-size:16px;padding:6px 12px;" title="Trở lại bảng (Esc)">
          ✕
        </button>
      </div>
    </div>

    <!-- Thanh nhiệm vụ học tập của giáo viên giao -->
    <div class="gh-mission-bar">
      <div class="gh-mission-icon-wrap">🎯</div>
      <div class="gh-mission-content">
        <div class="gh-mission-label">NHIỆM VỤ GIÁO VIÊN GIAO CHO CÁC NHÓM (HIỂN THỊ KHI HS QUÉT QR):</div>
        <div class="gh-mission-text" id="ghMissionText" contenteditable="true" title="Nhấp vào đây để chỉnh sửa nhiệm vụ giao cho học sinh">Thảo luận nhóm và nộp bài làm trên giấy (bảng nhóm, vở) hoặc liên kết Canva, Slides...</div>
      </div>
      <button class="gh-btn" id="ghEditMissionBtn" style="font-size:12px;padding:6px 14px;" title="Lưu/Sửa nhiệm vụ">
        ✏️ Sửa nhiệm vụ
      </button>
    </div>

    <div class="gh-grid" id="ghGroupGrid"></div>
  `;
  document.body.appendChild(dashboard);

  // 4c. InkStage Container (đặt trong #stage, trước canvas #ink)
  const stage = document.getElementById('stage');
  let ghStage = document.getElementById('groupHubStage');
  if (stage && !ghStage) {
    ghStage = document.createElement('div');
    ghStage.id = 'groupHubStage';
    const inkCanvas = document.getElementById('ink');
    if (inkCanvas) {
      stage.insertBefore(ghStage, inkCanvas);
    } else {
      stage.appendChild(ghStage);
    }
  }

  // 4d. Floating Toolbar khi đang chiếu bài (InkStage / InkCompare)
  let floatingBar = document.getElementById('ghFloatingBar');
  if (!floatingBar) {
    floatingBar = document.createElement('div');
    floatingBar.id = 'ghFloatingBar';
    floatingBar.innerHTML = `
      <span class="gh-stage-name" id="ghStageGroupName">Nhóm 1</span>
      <button class="gh-stage-btn" id="ghStagePrevBtn" title="Chuyển sang nhóm trước">◀</button>
      <button class="gh-stage-btn" id="ghStageNextBtn" title="Chuyển sang nhóm sau">▶</button>
      <button class="gh-stage-btn active-pen" id="ghPenToggleBtn" title="Bật/Tắt chế độ vẽ đè trên slide/ảnh">
        ✏️ Bút vẽ đè: BẬT
      </button>
      <button class="gh-stage-btn toboard-btn" id="ghStageToBoardBtn" style="background:linear-gradient(135deg,#0284c7,#0369a1);border-color:#38bdf8;color:#fff;font-weight:750;" title="Chụp hình đưa ngay ảnh sản phẩm này lên bảng NoteBoard 1-click để viết vẽ chữa bài">
        📷 Chụp lên bảng
      </button>
      <button class="gh-stage-btn snapshot-btn" id="ghStageSnapshotBtn" title="Chụp bài làm + nét bút chữa lưu thành 1 trang slide mới trong NoteBoard Ink">
        📸 Lưu bài chữa
      </button>
      <button class="gh-stage-btn rotate-btn" id="ghStageRotateBtn" title="Xoay ảnh 90° nếu học sinh chụp ngược/ngang">
        🔄 Xoay 90°
      </button>
      <button class="gh-stage-btn" id="ghStageGalleryBtn" title="Mở chế độ Triển lãm Gallery Walk">
        🖼️ Triển lãm
      </button>
      <button class="gh-stage-btn" id="ghStageOpenExtBtn" title="Mở liên kết trong tab mới">
        🔗 Mở ngoài ↗
      </button>
      <button class="gh-stage-btn" id="ghStageBackToDashBtn" title="Mở lại bảng GroupHub">
        📋 Danh sách nhóm
      </button>
      <button class="gh-stage-btn" id="ghStageExitBtn" style="color:#f87171;" title="Thoát chiếu (Esc)">
        ✕ Thoát
      </button>
    `;
    document.body.appendChild(floatingBar);
  }

  // 4e. Gallery Walk Overlay Container
  const galleryWalk = document.createElement('div');
  galleryWalk.id = 'groupHubGalleryWalk';
  galleryWalk.innerHTML = `
    <div class="gh-gallery-header">
      <div class="gh-gallery-title-box">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
          <span>🖼️</span> <span>Triển lãm Gallery Walk</span>
        </h2>
        <span class="gh-gallery-counter-pill" id="ghGalleryCounterPill">0/6 nhóm</span>
      </div>

      <div class="gh-gallery-mission" id="ghGalleryMission">
        🎯 <b>Nhiệm vụ:</b> <span id="ghGalleryMissionText">...</span>
      </div>

      <div class="gh-gallery-actions">
        <button class="gh-btn primary" id="ghGalleryToBoardBtn" style="background:linear-gradient(135deg,#0284c7,#0369a1);border:none;color:#fff;font-weight:750;" title="Chụp hình đưa ngay ảnh sản phẩm của nhóm đang xem lên bảng NoteBoard 1-click để viết vẽ chữa bài">
          📷 Lên bảng 1-click
        </button>
        <button class="gh-btn" id="ghGalleryAutoBtn" title="Tự động lướt qua từng nhóm sau mỗi 12 giây để cả lớp tham quan">
          ▶ Tự động lướt (12s)
        </button>
        <button class="gh-btn" id="ghGalleryRotateBtn" title="Xoay ảnh bài làm giấy 90 độ">
          🔄 Xoay 90°
        </button>
        <button class="gh-btn snapshot-btn" id="ghGallerySnapshotBtn" title="Lưu bài đang xem vào bài giảng NoteBoard">
          📸 Lưu bài chữa
        </button>
        <button class="gh-btn" id="ghGalleryViewToggleBtn" title="Chuyển đổi giữa xem từng nhóm và xem lưới toàn cảnh">
          📋 Xem lưới
        </button>
        <button class="gh-btn" id="ghGalleryCloseBtn" style="color:#ef4444;" title="Đóng triển lãm (Esc)">
          ✕ Đóng
        </button>
      </div>
    </div>

    <!-- Vùng Focus View (xem từng nhóm lớn) -->
    <div class="gh-gallery-focus-wrap" id="ghGalleryFocusWrap">
      <button class="gh-gallery-nav-btn prev" id="ghGalleryPrevBtn" title="Nhóm trước (Phím ◀)">‹</button>
      
      <div class="gh-gallery-main-card" id="ghGalleryMainCard">
        <!-- Nội dung nhóm được render động -->
      </div>

      <button class="gh-gallery-nav-btn next" id="ghGalleryNextBtn" title="Nhóm sau (Phím ▶)">›</button>
    </div>

    <!-- Vùng Grid View (xem lưới tất cả các nhóm) -->
    <div class="gh-gallery-grid-wrap" id="ghGalleryGridWrap" style="display:none;"></div>

    <!-- Thanh chuyển nhóm nhanh phía dưới -->
    <div class="gh-gallery-bottom-bar" id="ghGalleryBottomBar"></div>
  `;
  document.body.appendChild(galleryWalk);

  // 4e. Modal thêm sản phẩm / link thủ công
  const addModal = document.createElement('div');
  addModal.className = 'gh-modal';
  addModal.id = 'ghAddModal';
  addModal.innerHTML = `
    <div class="gh-modal-card">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <h3 style="margin:0;font-size:17px;font-weight:750;color:#0f172a;" id="ghAddModalTitle">Thêm sản phẩm cho Nhóm</h3>
        <button id="ghAddModalClose" class="gh-modal-close-btn" title="Đóng">✕</button>
      </div>

      <div style="font-size:13px;color:#64748b;line-height:1.45;">
        Dán liên kết sản phẩm (Canva, Google Slides, Google Docs, Padlet, YouTube, GeoGebra, Web) hoặc tải ảnh bài làm trên giấy:
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Đường dẫn (URL):</label>
        <input type="url" id="ghInputUrl" placeholder="https://www.canva.com/design/... hoặc https://docs.google.com/presentation/..." style="width:100%;box-sizing:border-box;padding:10px 14px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;color:#0f172a;font-size:13px;outline:none;transition:border-color 0.15s, box-shadow 0.15s;">
      </div>

      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:12px;color:#94a3b8;">hoặc</span>
        <button class="gh-btn" id="ghPickImageBtn" style="font-size:12px;padding:7px 14px;">
          📷 Chọn ảnh bài làm từ máy…
        </button>
        <input type="file" id="ghFileInput" accept="image/*" style="display:none;">
      </div>

      <div id="ghImagePreviewWrap" style="display:none;background:#f1f5f9;border:1px solid #cbd5e1;padding:10px;border-radius:14px;text-align:center;">
        <img id="ghImagePreview" style="max-height:140px;max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);" alt="Xem trước">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:14px;">
        <button class="gh-btn" id="ghAddCancelBtn">Hủy</button>
        <button class="gh-btn primary" id="ghAddConfirmBtn">Thêm sản phẩm</button>
      </div>
    </div>
  `;
  document.body.appendChild(addModal);

  // 4f. Modal QR InkDrop (Chuẩn Apple iOS Dialog)
  const qrModal = document.createElement('div');
  qrModal.className = 'gh-modal';
  qrModal.id = 'ghQRModal';
  qrModal.innerHTML = `
    <div class="gh-modal-card" style="text-align:center;align-items:center;max-width:540px;">
      <div style="width:100%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
          <span>📱</span>
          <span>Chia Sẻ Mã QR · Nhận Nhiệm Vụ & Nộp Bài</span>
        </h3>
        <button id="ghQRModalClose" class="gh-modal-close-btn" title="Đóng (Esc)">✕</button>
      </div>

      <!-- Nhiệm vụ hiện tại dạng Apple Highlight Box -->
      <div style="width:100%;text-align:left;background:#f0f9ff;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:14px;padding:12px 16px;box-sizing:border-box;">
        <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.04em;">🎯 Nhiệm vụ các nhóm:</div>
        <div style="font-size:13.5px;font-weight:600;color:#1e3a8a;line-height:1.45;" id="ghQRModalTaskText"></div>
      </div>

      <div style="font-size:13px;color:#475569;margin-top:2px;line-height:1.45;">
        Học sinh dùng điện thoại hoặc iPad quét mã QR dưới đây để vào nhóm, tự đặt tên nhóm, nhập danh sách thành viên và gửi ảnh bài làm / link Canva:
      </div>

      <div id="ghQRContainer" style="width:230px;height:230px;background:#fff;border:2px solid #e2e8f0;border-radius:20px;padding:12px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
        <!-- SVG / Image QR code -->
      </div>

      <div style="display:flex;align-items:center;gap:8px;width:100%;justify-content:center;">
        <div style="font-size:12.5px;color:#0284c7;font-weight:700;background:#f1f5f9;padding:7px 14px;border-radius:999px;border:1px solid #cbd5e1;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" id="ghQRUrlText">
          https://app.noteboardink.com/live-drop
        </div>
        <button class="gh-btn" id="ghCopyQRUrlBtn" style="font-size:12px;padding:7px 14px;" title="Sao chép liên kết vào clipboard">
          📋 Chép link
        </button>
      </div>

      <div style="display:flex;gap:10px;width:100%;justify-content:center;">
        <button class="gh-btn primary" id="ghOpenPortalTestBtn" style="font-size:13px;padding:9px 18px;background:linear-gradient(135deg,#0284c7,#0369a1);box-shadow:0 4px 14px rgba(2,132,199,0.35);">
          💻 Mở giao diện nộp bài học sinh (Portal) ↗
        </button>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 16px;font-size:12px;color:#475569;text-align:left;line-height:1.55;width:100%;box-sizing:border-box;">
        <b>💡 Hướng dẫn 3 bước cho học sinh:</b><br>
        1. Quét mã QR ➔ Đọc nhiệm vụ giáo viên giao.<br>
        2. Chọn nhóm (Nhóm 1, 2, 3...) ➔ Đặt tên nhóm & nhập tên các bạn trong nhóm.<br>
        3. Chụp ảnh bài làm trên giấy hoặc dán link Canva / Slides ➔ Bấm <b>Nộp bài</b>.
      </div>
    </div>
  `;
  document.body.appendChild(qrModal);

  /* ----------------------------------------------------
   * 5. Logic Điều Khiển & Render Giao Diện
   * ---------------------------------------------------- */
  let currentTargetGroupId = null;
  let tempImageData = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function renderDashboard() {
    const grid = document.getElementById('ghGroupGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Cập nhật nhiệm vụ giáo viên giao
    const missionText = document.getElementById('ghMissionText');
    if (missionText && document.activeElement !== missionText) {
      missionText.textContent = state.task || 'Thảo luận nhóm và nộp sản phẩm học tập.';
    }

    let submittedCount = 0;

    state.groups.forEach((group, idx) => {
      const palette = getGroupColor(group.id || (idx + 1));
      const hasItems = group.items && group.items.length > 0;
      if (hasItems) submittedCount++;

      const isSelectedCompare = state.compareSelection.includes(group.id);

      const card = document.createElement('div');
      card.className = `gh-card ${hasItems ? 'has-items' : ''} ${isSelectedCompare ? 'selected-compare' : ''}`;
      card.dataset.groupId = group.id;
      // Áp dụng phong cách Padlet Soft Pastel Card: Nền màu pastel nguyên khối + Viền đa tầng
      card.style.backgroundColor = palette.cardBg || palette.bgLight;
      card.style.borderColor = palette.cardBorder || palette.borderLight;
      card.style.setProperty('--card-glow', palette.shadowColor || 'rgba(15, 23, 42, 0.12)');

      // Header thẻ nhóm
      const header = document.createElement('div');
      header.className = 'gh-card-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'gh-card-title-wrap';

      const numBadge = document.createElement('span');
      numBadge.className = 'gh-group-num';
      numBadge.style.background = palette.accentGradient || palette.color;
      numBadge.textContent = group.id;

      const nameInput = document.createElement('input');
      nameInput.className = 'gh-group-name';
      nameInput.value = group.name;
      nameInput.title = 'Nhấp vào để đổi tên nhóm';
      nameInput.onchange = (e) => {
        group.name = e.target.value.trim() || `Nhóm ${group.id}`;
        saveState();
      };

      titleWrap.appendChild(numBadge);
      titleWrap.appendChild(nameInput);

      const badge = document.createElement('span');
      badge.className = `gh-group-badge ${hasItems ? 'submitted' : 'pending'}`;
      if (hasItems) {
        badge.style.backgroundColor = palette.pillBg || '#dcfce7';
        badge.style.color = palette.pillColor || '#15803d';
        badge.style.borderColor = palette.borderLight || '#86efac';
      }
      badge.textContent = hasItems ? `Đã nộp (${group.items.length})` : 'Đang làm';

      header.appendChild(titleWrap);
      header.appendChild(badge);
      card.appendChild(header);

      // Dòng thành viên nhóm (Frosted Glass Capsule)
      const membersRow = document.createElement('div');
      membersRow.className = 'gh-members-row';
      membersRow.title = 'Nhấp vào để chỉnh sửa danh sách thành viên nhóm';
      const hasMembers = Boolean(group.members && group.members.trim());
      membersRow.innerHTML = `
        <span class="gh-members-icon" style="color:${palette.accent}">👥</span>
        <span class="gh-members-text ${hasMembers ? '' : 'empty'}">${hasMembers ? escapeHtml(group.members) : 'Chưa nhập thành viên (Bấm để thêm hoặc HS tự điền)'}</span>
      `;
      membersRow.onclick = () => {
        const input = prompt(`Nhập danh sách thành viên cho ${group.name} (ví dụ: Minh (NT), An, Hùng, Vy):`, group.members || '');
        if (input !== null) {
          group.members = input.trim();
          saveState();
          renderDashboard();
        }
      };
      card.appendChild(membersRow);

      // Danh sách sản phẩm (Phong cách Padlet Mini Card xếp lớp)
      const itemsList = document.createElement('div');
      itemsList.className = 'gh-items-list';

      if (hasItems) {
        const selectedIdx = (typeof group.selectedItemIndex === 'number' && group.selectedItemIndex >= 0 && group.selectedItemIndex < group.items.length)
          ? group.selectedItemIndex 
          : 0;
        const hasMultiple = group.items.length > 1;

        group.items.forEach((item, itemIdx) => {
          const isSelected = itemIdx === selectedIdx;
          const row = document.createElement('div');
          row.className = `gh-item-row ${isSelected && hasMultiple ? 'is-selected' : ''}`;
          row.style.cursor = 'pointer';
          row.title = hasMultiple 
            ? (isSelected ? '⭐ Sản phẩm đang được chọn để chiếu & triển lãm (Bấm để chiếu)' : 'Bấm để chọn sản phẩm này để chiếu & triển lãm')
            : 'Sản phẩm bài làm của nhóm';

          // Click vào hàng: nếu chưa chọn thì chọn; nếu đã chọn và có nhiều sp thì chiếu luôn
          row.onclick = () => {
            if (group.selectedItemIndex !== itemIdx) {
              group.selectedItemIndex = itemIdx;
              saveState();
              renderDashboard();
              if (typeof window.toast === 'function') {
                window.toast(`⭐ Đã chọn "${item.title || item.type}" làm sản phẩm chính của ${group.name}!`);
              }
            } else if (hasMultiple) {
              presentGroup(group, itemIdx);
            }
          };

          // Nút tròn chọn sản phẩm chính nếu nhóm có từ 2 sản phẩm trở lên
          if (hasMultiple) {
            const selectBtn = document.createElement('button');
            selectBtn.className = 'gh-item-select-btn';
            selectBtn.title = isSelected 
              ? 'Đang là sản phẩm chính để chiếu & triển lãm' 
              : 'Chọn sản phẩm này làm sản phẩm chính để chiếu & triển lãm';
            selectBtn.innerHTML = isSelected ? '✓' : '';
            selectBtn.onclick = (e) => {
              e.stopPropagation();
              group.selectedItemIndex = itemIdx;
              saveState();
              renderDashboard();
              if (typeof window.toast === 'function') {
                window.toast(`⭐ Đã chọn "${item.title || item.type}" làm sản phẩm chính của ${group.name}!`);
              }
            };
            row.appendChild(selectBtn);
          }

          const info = document.createElement('div');
          info.className = 'gh-item-info';

          // Thumbnail nếu là ảnh bài làm giấy
          if (item.type === 'image' && (item.imageData || item.embedUrl || item.url)) {
            const thumb = document.createElement('img');
            thumb.src = item.imageData || item.embedUrl || item.url;
            thumb.alt = 'Thumbnail bài làm';
            thumb.style.width = '34px';
            thumb.style.height = '34px';
            thumb.style.objectFit = 'cover';
            thumb.style.borderRadius = '8px';
            thumb.style.flexShrink = '0';
            thumb.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
            info.appendChild(thumb);
          }

          if (isSelected && hasMultiple) {
            const starTag = document.createElement('span');
            starTag.className = 'gh-item-selected-tag';
            starTag.innerHTML = '⭐ Chiếu/Triển lãm';
            starTag.title = 'Sản phẩm này sẽ được chiếu và trưng bày trong Gallery Walk';
            info.appendChild(starTag);
          }

          const b = document.createElement('span');
          b.className = 'gh-item-badge';
          b.style.background = item.color || palette.color || '#64748b';
          b.textContent = item.badge || item.type;

          const title = document.createElement('span');
          title.className = 'gh-item-title';
          title.textContent = item.title || item.url || 'Sản phẩm';
          title.title = item.url || item.title;

          info.appendChild(b);
          info.appendChild(title);

          const actionsWrap = document.createElement('div');
          actionsWrap.style.display = 'flex';
          actionsWrap.style.alignItems = 'center';
          actionsWrap.style.gap = '4px';

          // Nút Chiếu nhanh riêng sản phẩm này
          if (hasMultiple) {
            const quickPresentBtn = document.createElement('button');
            quickPresentBtn.className = 'gh-item-action-present';
            quickPresentBtn.innerHTML = '📺 Chiếu';
            quickPresentBtn.title = 'Chiếu ngay sản phẩm này lên màn hình';
            quickPresentBtn.onclick = (e) => {
              e.stopPropagation();
              group.selectedItemIndex = itemIdx;
              saveState();
              presentGroup(group, itemIdx);
            };
            actionsWrap.appendChild(quickPresentBtn);
          }

          const quickBoardBtn = document.createElement('button');
          quickBoardBtn.className = 'gh-item-del';
          quickBoardBtn.style.color = '#0284c7';
          quickBoardBtn.style.fontSize = '12px';
          quickBoardBtn.innerHTML = '📷';
          quickBoardBtn.title = 'Đưa sản phẩm này lên bảng NoteBoard 1-click để viết vẽ chữa bài';
          quickBoardBtn.onclick = (e) => {
            e.stopPropagation();
            insertProductToBoard(group, item);
          };

          const delBtn = document.createElement('button');
          delBtn.className = 'gh-item-del';
          delBtn.textContent = '✕';
          delBtn.title = 'Xóa sản phẩm này';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            group.items.splice(itemIdx, 1);
            if (group.selectedItemIndex >= group.items.length) {
              group.selectedItemIndex = Math.max(0, group.items.length - 1);
            }
            if (group.items.length === 0) group.status = 'pending';
            saveState();
            renderDashboard();
          };

          actionsWrap.appendChild(quickBoardBtn);
          actionsWrap.appendChild(delBtn);

          row.appendChild(info);
          row.appendChild(actionsWrap);
          itemsList.appendChild(row);
        });
      } else {
        const empty = document.createElement('div');
        empty.className = 'gh-empty-placeholder';
        empty.innerHTML = `
          <span style="font-size:13px;font-weight:600;color:#64748b;">Chưa có sản phẩm</span>
          <span style="font-size:11px;color:#94a3b8;">Bấm <b>+ Thêm</b> hoặc học sinh quét QR nộp bài</span>
        `;
        itemsList.appendChild(empty);
      }
      card.appendChild(itemsList);

      // Actions cuối thẻ (Chuẩn Apple Pill Buttons)
      const actions = document.createElement('div');
      actions.className = 'gh-card-actions';

      const leftBtns = document.createElement('div');
      leftBtns.style.display = 'flex';
      leftBtns.style.gap = '6px';
      leftBtns.style.alignItems = 'center';

      const addBtn = document.createElement('button');
      addBtn.className = 'gh-btn';
      addBtn.style.padding = '5px 12px';
      addBtn.style.fontSize = '12px';
      addBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      addBtn.style.borderColor = 'rgba(0, 0, 0, 0.08)';
      addBtn.innerHTML = '+ Thêm';
      addBtn.title = 'Thêm liên kết hoặc ảnh chụp bài làm';
      addBtn.onclick = () => openAddModal(group.id);

      const chosenItemIdx = (typeof group.selectedItemIndex === 'number' && group.items && group.selectedItemIndex < group.items.length) 
        ? group.selectedItemIndex 
        : 0;
      const countStr = group.items && group.items.length > 1 ? ` (${chosenItemIdx + 1}/${group.items.length})` : '';

      const presentBtn = document.createElement('button');
      presentBtn.className = 'gh-btn primary gh-btn-present';
      presentBtn.style.padding = '5px 14px';
      presentBtn.style.fontSize = '12px';
      presentBtn.style.background = palette.accentGradient || `linear-gradient(135deg, ${palette.color}, ${palette.accent})`;
      presentBtn.style.border = 'none';
      presentBtn.style.color = '#fff';
      presentBtn.style.boxShadow = `0 3px 10px ${palette.shadowColor || 'rgba(0,0,0,0.12)'}`;
      presentBtn.innerHTML = `📺 Chiếu bài${countStr}`;
      presentBtn.title = group.items && group.items.length > 1 
        ? `Chiếu sản phẩm số ${chosenItemIdx + 1} của nhóm (${group.items[chosenItemIdx]?.title || ''})`
        : 'Chiếu toàn màn hình sản phẩm của nhóm lên bảng TV/máy chiếu';
      presentBtn.disabled = !hasItems;
      presentBtn.onclick = () => presentGroup(group, chosenItemIdx);

      leftBtns.appendChild(addBtn);
      leftBtns.appendChild(presentBtn);

      if (hasItems) {
        const toBoardBtn = document.createElement('button');
        toBoardBtn.className = 'gh-btn gh-card-toboard-btn';
        toBoardBtn.style.padding = '5px 12px';
        toBoardBtn.style.fontSize = '12px';
        toBoardBtn.style.fontWeight = '750';
        toBoardBtn.style.background = '#f0f9ff';
        toBoardBtn.style.borderColor = '#38bdf8';
        toBoardBtn.style.color = '#0284c7';
        toBoardBtn.innerHTML = '📷 Lên bảng';
        toBoardBtn.title = 'Chụp hình đưa ngay ảnh sản phẩm đang chọn của nhóm lên bảng NoteBoard 1-click để viết vẽ chữa bài';
        toBoardBtn.onclick = () => insertProductToBoard(group, group.items[chosenItemIdx]);
        leftBtns.appendChild(toBoardBtn);
      }

      const compareLabel = document.createElement('label');
      compareLabel.className = 'gh-compare-toggle';
      compareLabel.title = 'Chọn nhóm này để so sánh 2 nhóm song song';

      const compareCheckbox = document.createElement('input');
      compareCheckbox.type = 'checkbox';
      compareCheckbox.checked = isSelectedCompare;
      compareCheckbox.onchange = (e) => {
        toggleCompareSelection(group.id, e.target.checked);
      };

      const compareSpan = document.createElement('span');
      compareSpan.textContent = 'So sánh';

      compareLabel.appendChild(compareCheckbox);
      compareLabel.appendChild(compareSpan);

      actions.appendChild(leftBtns);
      actions.appendChild(compareLabel);
      card.appendChild(actions);

      grid.appendChild(card);
    });

    // Cập nhật số lượng nhóm nộp bài
    const statusPill = document.getElementById('ghStatusPill');
    if (statusPill) {
      statusPill.textContent = `${submittedCount}/${state.groups.length} nhóm đã nộp bài`;
    }

    // Cập nhật badge trên thanh rail
    const railBadge = document.getElementById('groupHubBadge');
    if (railBadge) {
      railBadge.textContent = submittedCount;
      railBadge.style.display = submittedCount > 0 ? 'inline-block' : 'none';
    }

    // Cập nhật nút so sánh
    const compareBtn = document.getElementById('ghCompareBtn');
    if (compareBtn) {
      compareBtn.textContent = `⚖️ So sánh (${state.compareSelection.length}/2)`;
      compareBtn.disabled = state.compareSelection.length !== 2;
    }
  }

  function toggleCompareSelection(groupId, isChecked) {
    if (isChecked) {
      if (!state.compareSelection.includes(groupId)) {
        if (state.compareSelection.length >= 2) {
          state.compareSelection.shift(); // Chỉ giữ tối đa 2 nhóm
        }
        state.compareSelection.push(groupId);
      }
    } else {
      state.compareSelection = state.compareSelection.filter(id => id !== groupId);
    }
    renderDashboard();
  }

  /* ----------------------------------------------------
   * 6. InkStage: Chiếu toàn màn hình 1 nhóm
   * ---------------------------------------------------- */
  function openExternalUrl(url) {
    if (!url) return;
    try {
      if (window.nbDesktop && typeof window.nbDesktop.openExternal === 'function') {
        window.nbDesktop.openExternal(url);
        return;
      }
    } catch (_) {}
    window.open(url, '_blank', 'noopener');
  }

  function presentGroup(group, targetItemIndex = null) {
    if (!group || !group.items || group.items.length === 0) return;
    activeStageGroup = group;
    activeCompareGroups = null;

    if (typeof targetItemIndex === 'number' && targetItemIndex >= 0 && targetItemIndex < group.items.length) {
      activeStageItemIndex = targetItemIndex;
    } else {
      activeStageItemIndex = (typeof group.selectedItemIndex === 'number' && group.selectedItemIndex >= 0 && group.selectedItemIndex < group.items.length) 
        ? group.selectedItemIndex 
        : 0;
    }

    // Ẩn dashboard
    dashboard.classList.remove('open');

    // Mở #groupHubStage
    ghStage.classList.add('on');
    ghStage.innerHTML = '';

    const item = group.items[activeStageItemIndex];
    stageImageRotation = item.rotation || 0;

    // Thanh chọn sản phẩm trên Stage nếu nhóm có nhiều hơn 1 sản phẩm
    if (group.items.length > 1) {
      const prodBar = document.createElement('div');
      prodBar.className = 'gh-stage-products-bar';

      const label = document.createElement('div');
      label.className = 'gh-stage-products-label';
      label.innerHTML = `<span>📦 SP nhóm (${activeStageItemIndex + 1}/${group.items.length}):</span>`;
      prodBar.appendChild(label);

      group.items.forEach((it, idx) => {
        const tab = document.createElement('button');
        const isActive = idx === activeStageItemIndex;
        const isFeatured = idx === (group.selectedItemIndex || 0);
        tab.className = `gh-stage-prod-tab ${isActive ? 'active' : ''}`;
        tab.title = `Chuyển sang xem ${it.title || it.type}`;
        tab.innerHTML = `
          <span style="font-weight:800;">${idx + 1}.</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:6px;background:${it.color || '#64748b'};color:#fff;">${it.badge || it.type}</span>
          <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.title || 'Sản phẩm')}</span>
          ${isFeatured ? '<span style="color:#eab308;font-size:11px;" title="Sản phẩm đang được chọn triển lãm">⭐</span>' : ''}
        `;
        tab.onclick = () => {
          presentGroup(group, idx);
        };
        prodBar.appendChild(tab);
      });

      const setFeaturedBtn = document.createElement('button');
      const isCurrFeatured = activeStageItemIndex === (group.selectedItemIndex || 0);
      setFeaturedBtn.className = `gh-stage-set-featured-btn ${isCurrFeatured ? 'is-featured' : ''}`;
      setFeaturedBtn.innerHTML = isCurrFeatured ? '⭐ Đã chọn triển lãm' : '☆ Đặt làm SP triển lãm';
      setFeaturedBtn.title = 'Đặt sản phẩm đang xem này làm sản phẩm triển lãm chính cho cả lớp xem';
      setFeaturedBtn.onclick = () => {
        group.selectedItemIndex = activeStageItemIndex;
        saveState();
        renderDashboard();
        presentGroup(group, activeStageItemIndex);
        if (typeof window.toast === 'function') {
          window.toast(`⭐ Đã đặt "${item.title || item.type}" làm sản phẩm triển lãm của ${group.name}!`);
        }
      };
      prodBar.appendChild(setFeaturedBtn);

      ghStage.appendChild(prodBar);
    }

    const contentBox = document.createElement('div');
    contentBox.className = 'gh-stage-content';

    // Loading overlay
    const loader = document.createElement('div');
    loader.className = 'gh-stage-loader';
    loader.innerHTML = `
      <div class="gh-stage-spinner"></div>
      <div style="font-size:14px;font-weight:600;color:#f8fafc;margin-top:12px;">Đang tải ${item.title || item.type}...</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Chờ kết nối nội dung</div>
    `;
    contentBox.appendChild(loader);

    const isCanva = item.type === 'canva' || 
      Boolean(item.url && (item.url.includes('canva.com') || item.url.includes('canva.link') || item.url.includes('canva.me')));

    if (item.type === 'image' && (item.imageData || item.embedUrl)) {
      loader.remove();
      const img = document.createElement('img');
      img.className = 'gh-stage-img';
      img.id = 'ghActiveStageImg';
      img.src = item.imageData || item.embedUrl;
      img.alt = group.name;
      contentBox.appendChild(img);
    } else if (isCanva) {
      loader.remove();
      // Hiển thị ngay Canva Presentation Hub Card sang trọng, không bao giờ để màn hình đen thui
      const canvaCard = document.createElement('div');
      canvaCard.className = 'gh-stage-fallback-box canva-card';
      canvaCard.innerHTML = `
        <div style="width:60px;height:60px;border-radius:20px;background:linear-gradient(135deg,#00c4cc,#0284c7);display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff;box-shadow:0 8px 24px rgba(0,196,204,0.35);margin-bottom:4px;">🎨</div>
        <h2 style="font-size:21px;font-weight:800;color:#0f172a;margin:0;">Bản thiết kế Canva · ${escapeHtml(group.name)}</h2>
        <p style="font-size:13.5px;color:#475569;line-height:1.55;margin:0;max-width:500px;">
          Để bảo mật, Canva yêu cầu mở bằng tài khoản đã đăng nhập để trình chiếu toàn màn hình. Thầy cô hãy bấm nút bên dưới để mở ngay bằng trình duyệt máy tính (Chrome/Edge đã có sẵn tài khoản Canva):
        </p>
        
        <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:460px;margin-top:6px;">
          <button class="gh-btn primary gh-stage-open-canva" style="width:100%;justify-content:center;padding:12px 22px;font-size:14.5px;font-weight:750;background:linear-gradient(135deg,#00c4cc,#0284c7);box-shadow:0 4px 18px rgba(0,196,204,0.4);border:none;border-radius:999px;">
            🚀 Mở Canva Chiếu Toàn Màn Hình (Đã đăng nhập) ↗
          </button>
          
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="gh-btn gh-stage-login-canva" style="flex:1;justify-content:center;font-size:12.5px;padding:8px 14px;border-radius:999px;">
              🔑 Đăng nhập tài khoản Canva
            </button>
            <button class="gh-btn gh-stage-try-embed" style="flex:1;justify-content:center;font-size:12.5px;padding:8px 14px;border-radius:999px;">
              🔄 Thử nhúng trực tiếp
            </button>
          </div>
        </div>

        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:12px 16px;font-size:12px;color:#0369a1;line-height:1.5;text-align:left;margin-top:8px;width:100%;box-sizing:border-box;">
          💡 <b>Mẹo nhúng trực tiếp trong khung bảng:</b> Trong Canva, bấm nút <i>Chia sẻ</i> ➔ <i>Xem thêm</i> ➔ chọn <i>Nhúng (Embed)</i> để lấy liên kết nhúng công khai.
        </div>
      `;

      canvaCard.querySelector('.gh-stage-open-canva').onclick = () => openExternalUrl(item.url);
      canvaCard.querySelector('.gh-stage-login-canva').onclick = () => openExternalUrl('https://www.canva.com/login');
      canvaCard.querySelector('.gh-stage-try-embed').onclick = () => {
        canvaCard.style.display = 'none';
        const iframe = document.createElement('iframe');
        iframe.className = 'gh-stage-frame';
        iframe.src = item.embedUrl;
        iframe.allow = 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        contentBox.appendChild(iframe);

        const backPill = document.createElement('div');
        backPill.className = 'gh-stage-helper-pill';
        backPill.innerHTML = `
          <button class="gh-stage-helper-btn canva" title="Mở Canva trong trình duyệt để chiếu toàn màn hình">
            🎨 Mở Canva trình chiếu ↗
          </button>
          <button class="gh-stage-helper-btn" id="ghBackToCanvaCard" style="background:#f1f5f9;color:#0f172a;" title="Quay lại bảng hướng dẫn đăng nhập">
            ✕ Đóng khung nhúng
          </button>
        `;
        backPill.querySelector('.canva').onclick = () => openExternalUrl(item.url);
        backPill.querySelector('#ghBackToCanvaCard').onclick = () => {
          iframe.remove();
          backPill.remove();
          canvaCard.style.display = 'flex';
        };
        contentBox.appendChild(backPill);
      };

      contentBox.appendChild(canvaCard);
    } else if (item.canEmbed && item.embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.className = 'gh-stage-frame';
      iframe.src = item.embedUrl;
      iframe.allow = 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.onload = () => {
        loader.style.display = 'none';
      };
      contentBox.appendChild(iframe);

      setTimeout(() => {
        if (loader && loader.style.display !== 'none') {
          loader.style.display = 'none';
        }
      }, 5000);
    } else {
      loader.remove();
      // Trang bị chặn iframe
      contentBox.innerHTML = `
        <div class="gh-stage-fallback-box">
          <div style="width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,0.3);margin-bottom:4px;">🌐</div>
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0;">${escapeHtml(item.title || 'Liên kết ngoài')}</h2>
          <p style="font-size:13.5px;color:#475569;line-height:1.5;margin:0;max-width:460px;">Trang web này yêu cầu mở trực tiếp trong trình duyệt để duyệt đầy đủ nội dung:</p>
          <button class="gh-btn primary gh-stage-open-action" style="font-size:14px;padding:10px 22px;border-radius:999px;cursor:pointer;margin-top:6px;">
            🔗 Mở ${escapeHtml(item.title || 'trang web')} trong trình duyệt ↗
          </button>
        </div>
      `;
      contentBox.querySelector('.gh-stage-open-action').onclick = () => openExternalUrl(item.url);
    }

    ghStage.appendChild(contentBox);

    // Bật floating bar
    floatingBar.classList.add('on');
    document.getElementById('ghStageGroupName').textContent = group.items.length > 1 
      ? `${group.name} (${activeStageItemIndex + 1}/${group.items.length}): ${item.title || item.type}` 
      : `${group.name}: ${item.title || item.type}`;
    
    // Cập nhật nút Mở Ngoài & Xoay ảnh trên thanh công cụ nổi
    const extBtn = document.getElementById('ghStageOpenExtBtn');
    if (extBtn) {
      if (isCanva) {
        extBtn.innerHTML = '🎨 Mở Canva ↗';
        extBtn.style.background = 'linear-gradient(135deg, #00c4cc, #0284c7)';
        extBtn.style.borderColor = '#38bdf8';
        extBtn.style.color = '#fff';
        extBtn.title = 'Mở Canva trong trình duyệt (đã đăng nhập) để chiếu toàn màn hình';
      } else {
        extBtn.innerHTML = '🔗 Mở ngoài ↗';
        extBtn.style.background = 'rgba(30, 41, 59, 0.8)';
        extBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        extBtn.style.color = '#f8fafc';
        extBtn.title = 'Mở liên kết trong tab mới';
      }
      extBtn.style.display = item.url ? 'inline-flex' : 'none';
    }

    const rotateBtn = document.getElementById('ghStageRotateBtn');
    if (rotateBtn) {
      rotateBtn.style.display = item.type === 'image' ? 'inline-flex' : 'none';
    }

    // Mặc định: Chế độ bút vẽ đè hoạt động ngay
    setPenInteractMode(false);
  }

  /* ----------------------------------------------------
   * 7. InkCompare: So sánh 2 nhóm song song 50:50
   * ---------------------------------------------------- */
  const comparePaneItemIndexes = {}; // { [groupId]: itemIndex }

  function presentCompare() {
    if (state.compareSelection.length !== 2) return;
    const g1 = state.groups.find(g => g.id === state.compareSelection[0]);
    const g2 = state.groups.find(g => g.id === state.compareSelection[1]);
    if (!g1 || !g2) return;

    activeStageGroup = null;
    activeCompareGroups = [g1, g2];

    dashboard.classList.remove('open');
    ghStage.classList.add('on');
    ghStage.innerHTML = '';

    const compareWrap = document.createElement('div');
    compareWrap.className = 'gh-compare-wrap';

    [g1, g2].forEach(g => {
      const gItemIdx = (typeof comparePaneItemIndexes[g.id] === 'number' && g.items && comparePaneItemIndexes[g.id] < g.items.length)
        ? comparePaneItemIndexes[g.id]
        : ((typeof g.selectedItemIndex === 'number' && g.items && g.selectedItemIndex < g.items.length) ? g.selectedItemIndex : 0);
      const item = g.items && g.items.length > 0 ? g.items[gItemIdx] : null;
      const itemIsCanva = item && (item.type === 'canva' || Boolean(item.url && (item.url.includes('canva.com') || item.url.includes('canva.link') || item.url.includes('canva.me'))));

      const pane = document.createElement('div');
      pane.className = 'gh-compare-pane';

      let selectorHtml = '';
      if (g.items && g.items.length > 1) {
        const pills = g.items.map((it, idx) => {
          const isActive = idx === gItemIdx;
          return `<button class="gh-compare-prod-pill ${isActive ? 'active' : ''}" data-compare-prod="${idx}" title="${escapeHtml(it.title || it.type)}">SP ${idx + 1}</button>`;
        }).join('');
        selectorHtml = `<div class="gh-compare-prod-selector" style="margin-left:6px;">${pills}</div>`;
      }

      const head = document.createElement('div');
      head.className = 'gh-compare-head';
      head.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
          <b style="font-size:13.5px;color:#0f172a;white-space:nowrap;">${g.name}</b>
          <span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 6px;border-radius:6px;white-space:nowrap;">${item ? (item.badge || item.type) : 'Chưa có bài'}</span>
          ${selectorHtml}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${item ? `<button class="gh-stage-btn gh-compare-toboard-btn" style="padding:2px 8px;font-size:11px;background:#0284c7;color:#fff;border-color:#38bdf8;" title="Chụp hình đưa bài nhóm này lên bảng NoteBoard 1-click">📷 Lên bảng</button>` : ''}
          ${item && item.url ? `<button class="gh-stage-btn gh-compare-open-btn" style="padding:2px 8px;font-size:11px;" title="Mở ngoài">${itemIsCanva ? '🎨 Mở Canva ↗' : '🔗 Mở ↗'}</button>` : ''}
        </div>
      `;
      if (item) {
        const toBoardBtn = head.querySelector('.gh-compare-toboard-btn');
        if (toBoardBtn) toBoardBtn.onclick = () => insertProductToBoard(g, item);
      }
      if (item && item.url) {
        const btn = head.querySelector('.gh-compare-open-btn');
        if (btn) btn.onclick = () => openExternalUrl(item.url);
      }
      head.querySelectorAll('.gh-compare-prod-pill').forEach(pill => {
        pill.onclick = () => {
          comparePaneItemIndexes[g.id] = Number(pill.dataset.compareProd);
          presentCompare();
        };
      });
      pane.appendChild(head);

      const content = document.createElement('div');
      content.style.flex = '1';
      content.style.width = '100%';
      content.style.height = 'calc(100% - 36px)';
      content.style.position = 'relative';

      if (item) {
        if (item.type === 'image' && (item.imageData || item.embedUrl)) {
          const img = document.createElement('img');
          img.className = 'gh-stage-img';
          img.src = item.imageData || item.embedUrl;
          content.appendChild(img);
        } else if (itemIsCanva) {
          content.innerHTML = `
            <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;background:#f8fafc;gap:12px;">
              <div style="width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,#00c4cc,#0284c7);display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;box-shadow:0 6px 18px rgba(0,196,204,0.35);">🎨</div>
              <div style="font-size:15px;font-weight:750;color:#0f172a;">Bản thiết kế Canva · ${escapeHtml(g.name)}</div>
              <p style="font-size:12px;color:#64748b;max-width:320px;line-height:1.45;margin:0;">Để bảo mật, Canva yêu cầu mở trực tiếp bằng trình duyệt đã có tài khoản:</p>
              <button class="gh-btn primary gh-compare-pane-open" style="font-size:13px;padding:9px 20px;border-radius:999px;background:linear-gradient(135deg,#00c4cc,#0284c7);box-shadow:0 4px 14px rgba(0,196,204,0.35);border:none;">
                🚀 Mở Canva Chiếu Toàn Màn Hình ↗
              </button>
            </div>
          `;
          const b = content.querySelector('.gh-compare-pane-open');
          if (b) b.onclick = () => openExternalUrl(item.url);
        } else if (item.canEmbed && item.embedUrl) {
          const iframe = document.createElement('iframe');
          iframe.className = 'gh-stage-frame';
          iframe.src = item.embedUrl;
          iframe.allow = 'fullscreen';
          content.appendChild(iframe);
        } else {
          content.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><button class="gh-btn primary gh-compare-pane-open">Mở ${escapeHtml(item.title || 'trang web')} ↗</button></div>`;
          const b = content.querySelector('.gh-compare-pane-open');
          if (b) b.onclick = () => openExternalUrl(item.url);
        }
      } else {
        content.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">Chưa có sản phẩm để so sánh</div>`;
      }

      pane.appendChild(content);
      compareWrap.appendChild(pane);
    });

    ghStage.appendChild(compareWrap);

    // Floating bar
    floatingBar.classList.add('on');
    document.getElementById('ghStageGroupName').textContent = `So sánh: ${g1.name} ⟷ ${g2.name}`;
    document.getElementById('ghStageOpenExtBtn').style.display = 'none';

    setPenInteractMode(false);
  }

  function setPenInteractMode(interact) {
    penInteractMode = interact;
    const penCanvas = document.getElementById('ink');
    const toggleBtn = document.getElementById('ghPenToggleBtn');

    if (penInteractMode) {
      // Cho phép click chuột vào iframe Canva / Slide
      if (penCanvas) penCanvas.style.pointerEvents = 'none';
      if (toggleBtn) {
        toggleBtn.textContent = '🖱️ Tương tác slide: BẬT';
        toggleBtn.classList.remove('active-pen');
      }
    } else {
      // Bật lại nét vẽ đè trên bảng
      if (penCanvas) penCanvas.style.pointerEvents = 'auto';
      if (toggleBtn) {
        toggleBtn.textContent = '✏️ Bút vẽ đè: BẬT';
        toggleBtn.classList.add('active-pen');
      }
    }
  }

  function exitStage() {
    ghStage.classList.remove('on');
    ghStage.innerHTML = '';
    floatingBar.classList.remove('on');
    activeStageGroup = null;
    activeCompareGroups = null;

    // Đưa canvas bút về bình thường
    const penCanvas = document.getElementById('ink');
    if (penCanvas) penCanvas.style.pointerEvents = 'auto';

    // Mở lại dashboard
    dashboard.classList.add('open');
  }

  /* ----------------------------------------------------
   * 8. Hẹn Giờ Thảo Luận Nhóm (Discussion Timer) & Khóa Nộp Tự Động
   * ---------------------------------------------------- */
  function updateLockDisplay() {
    const lockBtn = document.getElementById('ghLockToggleBtn');
    const lockIcon = document.getElementById('ghLockIcon');
    const lockText = document.getElementById('ghLockText');
    if (!lockBtn) return;
    if (state.isLocked) {
      lockBtn.style.background = '#fef2f2';
      lockBtn.style.borderColor = '#ef4444';
      lockBtn.style.color = '#b91c1c';
      lockBtn.title = 'Cổng nộp bài đang KHÓA. Bấm để mở nhận bài';
      if (lockIcon) lockIcon.textContent = '🔒';
      if (lockText) lockText.textContent = 'Đã khóa nộp';
    } else {
      lockBtn.style.background = '#ecfdf5';
      lockBtn.style.borderColor = '#10b981';
      lockBtn.style.color = '#047857';
      lockBtn.title = 'Cổng nộp bài đang MỞ. Bấm để khóa nộp bài';
      if (lockIcon) lockIcon.textContent = '🟢';
      if (lockText) lockText.textContent = 'Đang nhận bài';
    }
  }

  function parseTimerInput(val) {
    if (!val) return null;
    val = String(val).trim();
    if (val.includes(':')) {
      const parts = val.split(':');
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (!isNaN(m)) {
        return {
          minutes: Math.max(0, Math.min(180, m)),
          seconds: !isNaN(s) ? Math.max(0, Math.min(59, s)) : 0
        };
      }
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const totalSec = Math.round(num * 60);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return {
        minutes: Math.max(0, Math.min(180, m)),
        seconds: Math.max(0, Math.min(59, s))
      };
    }
    return null;
  }

  function updateTimerDisplay() {
    const min = String(state.timerMinutes).padStart(2, '0');
    const sec = String(state.timerSeconds).padStart(2, '0');
    const digits = document.getElementById('ghTimerDigits');
    if (digits && document.activeElement !== digits) {
      digits.value = `${min}:${sec}`;
    }
    const resetBtn = document.getElementById('ghTimerResetBtn');
    if (resetBtn) {
      resetBtn.title = `Đặt lại ${state.timerDefaultMinutes || 10} phút`;
    }
    updateLockDisplay();
  }

  function startTimer() {
    if (state.timerRunning) return;
    state.timerRunning = true;
    const toggleBtn = document.getElementById('ghTimerToggleBtn');
    if (toggleBtn) toggleBtn.textContent = '⏸';
    broadcastTimerState();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (state.timerSeconds > 0) {
        state.timerSeconds--;
      } else if (state.timerMinutes > 0) {
        state.timerMinutes--;
        state.timerSeconds = 59;
      } else {
        // Hết giờ thảo luận -> Tự động khóa nộp bài
        stopTimer();
        state.isLocked = true;
        updateLockDisplay();
        broadcastTimerState();
        syncLockToCloud(true);
        saveState();
        if (typeof window.toast === 'function') {
          window.toast('⏱️ HẾT GIỜ THẢO LUẬN NHÓM! Cổng nộp bài đã tự động khóa.');
        } else {
          alert('⏱️ HẾT GIỜ THẢO LUẬN NHÓM! Cổng nộp bài đã tự động khóa.');
        }
        return;
      }
      updateTimerDisplay();
      broadcastTimerState();
    }, 1000);
  }

  function stopTimer() {
    state.timerRunning = false;
    clearInterval(timerInterval);
    const toggleBtn = document.getElementById('ghTimerToggleBtn');
    if (toggleBtn) toggleBtn.textContent = '▶';
    broadcastTimerState();
  }

  function resetTimer(min) {
    stopTimer();
    const targetMin = typeof min === 'number' ? min : (state.timerDefaultMinutes || 10);
    state.timerMinutes = targetMin;
    state.timerSeconds = 0;
    state.timerDefaultMinutes = targetMin;
    updateTimerDisplay();
    broadcastTimerState();
    saveState();
  }

  /* ----------------------------------------------------
   * 9. Modal Thêm Sản Phẩm & QR InkDrop
   * ---------------------------------------------------- */
  function openAddModal(groupId) {
    currentTargetGroupId = groupId;
    tempImageData = null;
    const group = state.groups.find(g => g.id === groupId);
    document.getElementById('ghAddModalTitle').textContent = `Thêm sản phẩm cho ${group ? group.name : 'Nhóm'}`;
    document.getElementById('ghInputUrl').value = '';
    document.getElementById('ghImagePreviewWrap').style.display = 'none';
    addModal.classList.add('open');
  }

  function closeAddModal() {
    addModal.classList.remove('open');
    currentTargetGroupId = null;
    tempImageData = null;
  }

  function openQRModal() {
    let origin = 'https://app.noteboardink.com';
    if ((location.protocol === 'http:' || location.protocol === 'https:') &&
        !location.hostname.includes('localhost') &&
        !location.hostname.includes('127.0.0.1')) {
      origin = location.origin;
    }
    const taskParam = encodeURIComponent(state.task || '');
    const portalUrl = `${origin}/live-drop?task=${taskParam}&total=${state.groups.length}`;

    const urlDisplay = document.getElementById('ghQRUrlText');
    if (urlDisplay) urlDisplay.textContent = portalUrl;

    const taskDisplay = document.getElementById('ghQRModalTaskText');
    if (taskDisplay) taskDisplay.textContent = state.task || 'Chưa có nhiệm vụ cụ thể.';

    const qrContainer = document.getElementById('ghQRContainer');
    if (qrContainer) {
      let qrSvg = '';
      const qrEngine = (typeof qrcode === 'function') ? qrcode : (typeof window !== 'undefined' && typeof window.qrcode === 'function' ? window.qrcode : null);
      if (qrEngine) {
        try {
          const qr = qrEngine(0, 'M');
          qr.addData(portalUrl);
          qr.make();
          qrSvg = qr.createSvgTag({ scalable: true, margin: 2 });
          qrSvg = qrSvg.replace(/<svg\s+/, '<svg style="width:100%;height:100%;display:block;border-radius:6px;" ');
        } catch (err) {
          console.warn('[GroupHub] Lỗi tạo QR SVG offline:', err);
        }
      }
      if (qrSvg) {
        qrContainer.innerHTML = qrSvg;
      } else {
        qrContainer.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:20px;text-align:center;">Không thể sinh mã QR. Hãy dùng liên kết bên dưới.</div>`;
      }
    }

    qrModal.classList.add('open');
  }

  // Chỉnh sửa nhiệm vụ giáo viên giao
  const missionText = document.getElementById('ghMissionText');
  if (missionText) {
    missionText.onblur = () => {
      state.task = missionText.textContent.trim() || 'Thảo luận nhóm và nộp sản phẩm học tập.';
      saveState();
    };
    missionText.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        missionText.blur();
      }
    };
  }
  const editMissionBtn = document.getElementById('ghEditMissionBtn');
  if (editMissionBtn) {
    editMissionBtn.onclick = () => {
      const input = prompt('Nhập nhiệm vụ giáo viên giao cho các nhóm:', state.task || '');
      if (input !== null && input.trim()) {
        state.task = input.trim();
        saveState();
        renderDashboard();
      }
    };
  }

  // Sao chép link nộp bài nhóm trong modal QR
  const copyQRBtn = document.getElementById('ghCopyQRUrlBtn');
  if (copyQRBtn) {
    copyQRBtn.onclick = () => {
      const url = document.getElementById('ghQRUrlText')?.textContent?.trim() || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          alert('Đã sao chép liên kết nộp bài nhóm vào bộ nhớ tạm!');
        }).catch(() => {
          prompt('Sao chép liên kết dưới đây:', url);
        });
      } else {
        prompt('Sao chép liên kết dưới đây:', url);
      }
    };
  }

  // Mở cổng nộp bài học sinh thử nghiệm
  const openPortalBtn = document.getElementById('ghOpenPortalTestBtn');
  if (openPortalBtn) {
    openPortalBtn.onclick = () => {
      let origin = 'https://app.noteboardink.com';
      if ((location.protocol === 'http:' || location.protocol === 'https:') &&
          !location.hostname.includes('localhost') &&
          !location.hostname.includes('127.0.0.1')) {
        origin = location.origin;
      }
      const taskParam = encodeURIComponent(state.task || '');
      const portalUrl = `${origin}/live-drop?task=${taskParam}&total=${state.groups.length}`;
      if (window.nbDesktop && window.nbDesktop.openExternal) {
        window.nbDesktop.openExternal(portalUrl);
      } else {
        window.open(portalUrl, '_blank');
      }
    };
  }

  // Lắng nghe bài nộp học sinh qua BroadcastChannel (Đồng bộ thời gian thực đa tab / thiết bị)
  try {
    const syncCh = new BroadcastChannel('noteboard_grouphub_sync');
    syncCh.onmessage = (evt) => {
      if (evt.data && evt.data.type === 'STUDENT_SUBMISSION') {
        const { groupId, groupName, members, item } = evt.data;
        const g = state.groups.find(grp => grp.id === Number(groupId));
        if (g) {
          if (groupName) g.name = groupName.trim();
          if (members) g.members = members.trim();
          if (item) {
            g.items.push(item);
            g.status = 'submitted';
          }
          saveState();
          renderDashboard();
          if (typeof window.toast === 'function') {
            window.toast(`🎉 ${g.name} vừa nộp bài thành công!`);
          }
        }
      }
    };
  } catch (_) {}

  // Lắng nghe sự kiện storage (nếu nộp từ tab khác)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && Array.isArray(parsed.groups)) {
          state = parsed;
          renderDashboard();
        }
      } catch (_) {}
    }
  });

  /* ----------------------------------------------------
   * 10. Ink Snapshot: Lưu bài chữa & nét vẽ vào NoteBoard
   * ---------------------------------------------------- */
  async function takeInkSnapshot(targetGroup, targetItem = null) {
    const group = targetGroup || activeStageGroup;
    if (!group) {
      if (typeof window.toast === 'function') window.toast('Không có bài nào đang hiển thị để lưu.');
      return;
    }
    const item = targetItem || (group.items && (group.items[activeStageItemIndex ?? group.selectedItemIndex ?? 0] || group.items[0]));

    const W = 1600;
    const H = 900;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = W;
    offCanvas.height = H;
    const ctx = offCanvas.getContext('2d');

    // Nền trắng
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Tiêu đề nhận xét trên đỉnh slide
    const pal = getGroupColor(group.id);
    ctx.fillStyle = pal.color;
    ctx.fillRect(0, 0, W, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`NOTEBOARD INK · BÀI LÀM: ${group.name.toUpperCase()}`, 24, 33);

    ctx.font = '13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const timeStr = new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString();
    const membersTxt = group.members ? `Thành viên: ${group.members} | ` : '';
    ctx.fillText(`${membersTxt}Chấm chữa lúc: ${timeStr}`, W - 540, 32);

    // Vùng vẽ nội dung bài làm giấy
    const contentY = 58;
    const contentH = H - contentY - 14;

    if (item && item.type === 'image' && (item.imageData || item.embedUrl)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => {
        img.onload = res;
        img.onerror = res;
        img.src = item.imageData || item.embedUrl;
      });

      if (img.width && img.height) {
        const rot = (stageImageRotation || galleryRotation || 0) % 360;
        const is90 = rot % 180 !== 0;
        const iw = is90 ? img.height : img.width;
        const ih = is90 ? img.width : img.height;

        const fitScale = Math.min((W - 80) / iw, (contentH - 20) / ih);
        const dw = Math.round(iw * fitScale);
        const dh = Math.round(ih * fitScale);
        const dx = Math.round((W - dw) / 2);
        const dy = Math.round(contentY + (contentH - dh) / 2);

        ctx.save();
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate((rot * Math.PI) / 180);
        const drawW = Math.round(img.width * fitScale);
        const drawH = Math.round(img.height * fitScale);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Viền thẻ bài làm giấy
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx, dy, dw, dh);
      }
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(80, contentY + 20, W - 160, contentH - 40);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(80, contentY + 20, W - 160, contentH - 40);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item ? (item.title || item.type) : group.name, W / 2, contentY + 120);
      if (item && item.url) {
        ctx.font = '15px sans-serif';
        ctx.fillStyle = '#0284c7';
        ctx.fillText(item.url, W / 2, contentY + 160);
      }
      ctx.textAlign = 'left';
    }

    // Vẽ đè các nét mực của NoteBoard Ink
    const inkCanvas = document.getElementById('ink');
    if (inkCanvas) {
      try { ctx.drawImage(inkCanvas, 0, 0, W, H); } catch (_) {}
    }
    const liveInk = document.getElementById('liveInk');
    if (liveInk) {
      try { ctx.drawImage(liveInk, 0, 0, W, H); } catch (_) {}
    }

    const snapshotDataUrl = offCanvas.toDataURL('image/png', 0.95);

    // 1. Thêm thành 1 trang slide mới trong NoteBoard Ink
    if (typeof window.addWritingPage === 'function') {
      window.addWritingPage();
      if (typeof window.addPic === 'function') {
        const pos = typeof window.placeCentered === 'function' ? window.placeCentered(1450, 815) : { x: 75, y: 40, w: 1450 };
        window.addPic(snapshotDataUrl, pos);
      }
    }

    // 2. Tải file ảnh PNG về máy tính để gửi Zalo
    try {
      const dl = document.createElement('a');
      dl.download = `BaiChua_${group.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      dl.href = snapshotDataUrl;
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    } catch (_) {}

    if (typeof window.toast === 'function') {
      window.toast(`📸 Đã lưu bài chữa của ${group.name} thành 1 trang slide mới & tải ảnh PNG về máy!`);
    } else {
      alert(`📸 Đã lưu bài chữa của ${group.name} thành 1 trang slide mới!`);
    }
  }

  /* ----------------------------------------------------
   * 10b. Đưa ảnh sản phẩm lên bảng NoteBoard 1-click
   * ---------------------------------------------------- */
  async function insertProductToBoard(group, targetItem, rotation = 0) {
    if (!group) return;
    const item = targetItem || (group.items && (group.items[activeStageItemIndex ?? group.selectedItemIndex ?? 0] || group.items[0]));
    if (!item) {
      if (typeof window.toast === 'function') {
        window.toast('Nhóm này chưa có bài làm để đưa lên bảng.');
      } else {
        alert('Nhóm này chưa có bài làm để đưa lên bảng.');
      }
      return;
    }

    // Đóng màn hình Start / chào nếu đang hiển thị
    const startEl = document.getElementById('start');
    if (startEl && !startEl.classList.contains('off')) {
      if (typeof window.start === 'function') {
        window.start([]);
      } else {
        startEl.classList.add('off');
        startEl.hidden = true;
      }
    }

    // Đóng Stage, Gallery Walk và Dashboard để giáo viên thao tác trên bảng
    ghStage.classList.remove('on');
    ghStage.innerHTML = '';
    floatingBar.classList.remove('on');
    activeStageGroup = null;
    activeCompareGroups = null;
    stopGalleryAuto();
    if (galleryWalk) galleryWalk.classList.remove('open');
    if (dashboard) dashboard.classList.remove('open');
    const penCanvas = document.getElementById('ink');
    if (penCanvas) penCanvas.style.pointerEvents = 'auto';

    let imgSrc = null;
    let imgW = 1000;
    let imgH = 650;

    // A. Nếu là ảnh chụp bài làm trên giấy
    if (item.type === 'image' && (item.imageData || item.embedUrl || item.url)) {
      const rawSrc = item.imageData || item.embedUrl || item.url;
      const rot = (rotation || stageImageRotation || galleryRotation || 0) % 360;

      if (rot !== 0) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise(res => { img.onload = res; img.onerror = res; img.src = rawSrc; });
          if (img.width && img.height) {
            const is90 = rot % 180 !== 0;
            const c = document.createElement('canvas');
            c.width = is90 ? img.height : img.width;
            c.height = is90 ? img.width : img.height;
            const ctx = c.getContext('2d');
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate((rot * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            imgSrc = c.toDataURL('image/png', 0.92);
            imgW = c.width;
            imgH = c.height;
          }
        } catch (_) {
          imgSrc = rawSrc;
        }
      } else {
        imgSrc = rawSrc;
        try {
          const testImg = new Image();
          testImg.src = rawSrc;
          if (testImg.naturalWidth) {
            imgW = testImg.naturalWidth;
            imgH = testImg.naturalHeight;
          }
        } catch (_) {}
      }
    } else {
      // B. Nếu là Canva, Google Slides hoặc Web: vẽ thẻ bài làm sang trọng với thông tin nhóm
      const pal = getGroupColor(group.id);
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 700;
      const ctx = c.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 700);

      // Header dải màu nhóm
      ctx.fillStyle = pal.color;
      ctx.fillRect(0, 0, 1200, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`NOTEBOARD INK · SẢN PHẨM: ${group.name.toUpperCase()}`, 30, 44);

      // Thân thẻ
      ctx.fillStyle = pal.bgLight || '#f8fafc';
      ctx.fillRect(40, 110, 1120, 540);
      ctx.strokeStyle = pal.color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(40, 110, 1120, 540);

      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      const isCanva = item.type === 'canva' || (item.url && (item.url.includes('canva.com') || item.url.includes('canva.link') || item.url.includes('canva.me')));
      const icon = isCanva ? '🎨' : (item.type === 'googleslides' ? '📊' : '🌐');
      ctx.fillText(icon, 600, 240);

      ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.title || group.name, 600, 310);

      if (group.members) {
        ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`👥 Thành viên: ${group.members}`, 600, 365);
      }

      if (item.url) {
        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#0284c7';
        const displayUrl = item.url.length > 70 ? item.url.slice(0, 70) + '...' : item.url;
        ctx.fillText(displayUrl, 600, 420);
      }

      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Nộp lúc: ${item.submittedAt || new Date().toLocaleTimeString()}`, 600, 475);

      ctx.textAlign = 'left';
      imgSrc = c.toDataURL('image/png', 0.92);
      imgW = 1200;
      imgH = 700;
    }

    if (!imgSrc) return;

    // Đưa ảnh lên bảng NoteBoard
    if (typeof window.addPic === 'function') {
      const W = Math.min(1100, Math.max(500, imgW));
      const H = Math.round(W * (imgH / (imgW || 1)));
      const pos = typeof window.placeCentered === 'function' ? window.placeCentered(W, H) : { x: 120, y: (window.scrollY || 0) + 80, w: W };
      
      const t = window.addPic(imgSrc, pos);
      if (t) {
        if (typeof window.setMode === 'function') window.setMode('pen');
        if (Array.isArray(window.selected)) window.selected = [t];
        if (typeof window.apply === 'function') window.apply();
        if (typeof window.toast === 'function') {
          window.toast(`📷 Đã đưa bài làm của ${group.name} lên bảng — sẵn sàng viết vẽ chữa bài!`);
        }
      }
    }
  }

  /* ----------------------------------------------------
   * 11. Gallery Walk: Triển lãm sản phẩm toàn lớp
   * ---------------------------------------------------- */
  let galleryIndex = 0;
  let galleryAutoInterval = null;
  let galleryIsGrid = false;
  let galleryRotation = 0;

  function openGalleryWalk(startIndex = 0) {
    if (state.groups.length === 0) return;
    galleryIndex = Math.min(Math.max(0, startIndex), state.groups.length - 1);
    galleryRotation = 0;
    galleryIsGrid = false;
    stopGalleryAuto();

    dashboard.classList.remove('open');
    if (ghStage) ghStage.classList.remove('on');
    if (floatingBar) floatingBar.classList.remove('on');

    galleryWalk.classList.add('open');
    renderGalleryView();
  }

  function closeGalleryWalk() {
    stopGalleryAuto();
    galleryWalk.classList.remove('open');
    dashboard.classList.add('open');
  }

  function stopGalleryAuto() {
    if (galleryAutoInterval) {
      clearInterval(galleryAutoInterval);
      galleryAutoInterval = null;
      const btn = document.getElementById('ghGalleryAutoBtn');
      if (btn) {
        btn.innerHTML = '▶ Tự động lướt (12s)';
        btn.style.background = '#ffffff';
        btn.style.color = '#1e293b';
      }
    }
  }

  function toggleGalleryAuto() {
    if (galleryAutoInterval) {
      stopGalleryAuto();
    } else {
      const btn = document.getElementById('ghGalleryAutoBtn');
      if (btn) {
        btn.innerHTML = '⏸ Dừng lướt';
        btn.style.background = '#ecfdf5';
        btn.style.color = '#059669';
      }
      galleryAutoInterval = setInterval(() => {
        galleryIndex = (galleryIndex + 1) % state.groups.length;
        galleryRotation = 0;
        renderGalleryView();
      }, 12000);
    }
  }

  function renderGalleryView() {
    const missionText = document.getElementById('ghGalleryMissionText');
    if (missionText) missionText.textContent = state.task || 'Chưa có nhiệm vụ cụ thể.';

    const counterPill = document.getElementById('ghGalleryCounterPill');
    const submittedCount = state.groups.filter(g => g.items && g.items.length > 0).length;
    if (counterPill) counterPill.textContent = `${submittedCount}/${state.groups.length} nhóm đã nộp bài`;

    const focusWrap = document.getElementById('ghGalleryFocusWrap');
    const gridWrap = document.getElementById('ghGalleryGridWrap');
    const viewToggleBtn = document.getElementById('ghGalleryViewToggleBtn');
    const rotateBtn = document.getElementById('ghGalleryRotateBtn');

    if (galleryIsGrid) {
      focusWrap.style.display = 'none';
      gridWrap.style.display = 'grid';
      if (rotateBtn) rotateBtn.style.display = 'none';
      if (viewToggleBtn) viewToggleBtn.innerHTML = '🖼️ Xem từng nhóm';
      renderGalleryGrid();
    } else {
      focusWrap.style.display = 'flex';
      gridWrap.style.display = 'none';
      if (rotateBtn) rotateBtn.style.display = 'inline-flex';
      if (viewToggleBtn) viewToggleBtn.innerHTML = '📋 Xem lưới';
      renderGalleryFocus();
    }

    renderGalleryBottomBar();
  }

  function renderGalleryFocus() {
    const card = document.getElementById('ghGalleryMainCard');
    if (!card) return;
    const group = state.groups[galleryIndex] || state.groups[0];
    const pal = getGroupColor(group.id);

    const hasMultiple = group.items && group.items.length > 1;
    const currGalleryIdx = (typeof group.activeGalleryItemIndex === 'number' && group.items && group.activeGalleryItemIndex < group.items.length)
      ? group.activeGalleryItemIndex
      : ((typeof group.selectedItemIndex === 'number' && group.items && group.selectedItemIndex < group.items.length) ? group.selectedItemIndex : 0);

    const item = group.items && group.items[currGalleryIdx];

    const membersStr = group.members ? `👥 <b>Thành viên:</b> ${group.members}` : '<span style="color:#94a3b8;">Chưa nhập thành viên</span>';
    const statusBadge = item
      ? `<span style="background:${pal.bgLight};color:${pal.accent};padding:4px 10px;border-radius:99px;font-weight:700;font-size:12px;">Đã nộp bài lúc ${item.submittedAt || ''}</span>`
      : `<span style="background:#fef3c7;color:#b45309;padding:4px 10px;border-radius:99px;font-weight:700;font-size:12px;">⏳ Đang làm bài trên giấy</span>`;

    let productsBarHtml = '';
    if (hasMultiple) {
      const tabsHtml = group.items.map((it, idx) => {
        const isActive = idx === currGalleryIdx;
        const isFeatured = idx === (group.selectedItemIndex || 0);
        return `
          <button class="gh-gallery-prod-tab ${isActive ? 'active' : ''}" data-gallery-tab="${idx}" title="Xem sản phẩm ${idx + 1}: ${escapeHtml(it.title || it.type)}">
            <span style="font-weight:750;">${idx + 1}.</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:6px;background:${it.color || '#64748b'};color:#fff;">${it.badge || it.type}</span>
            <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.title || 'Sản phẩm')}</span>
            ${isFeatured ? '<span class="gh-gallery-star-tag">⭐ SP chính</span>' : ''}
          </button>
        `;
      }).join('');

      const isCurrFeatured = currGalleryIdx === (group.selectedItemIndex || 0);
      const featureBtnHtml = isCurrFeatured 
        ? `<span class="gh-gallery-current-featured">⭐ Đang là SP triển lãm chính</span>`
        : `<button class="gh-gallery-set-featured-btn" id="ghGallerySetFeaturedBtn" title="Đặt sản phẩm đang xem này làm sản phẩm triển lãm chính của nhóm">⭐ Đặt làm SP triển lãm chính</button>`;

      productsBarHtml = `
        <div class="gh-gallery-products-bar">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span style="font-size:12px;font-weight:750;color:#334155;white-space:nowrap;">📦 Sản phẩm (${currGalleryIdx + 1}/${group.items.length}):</span>
            <div class="gh-gallery-tabs-scroll">${tabsHtml}</div>
          </div>
          <div>${featureBtnHtml}</div>
        </div>
      `;
    }

    let contentHtml = '';
    const isCanva = item && (item.type === 'canva' || Boolean(item.url && (item.url.includes('canva.com') || item.url.includes('canva.link') || item.url.includes('canva.me'))));

    if (item && item.type === 'image' && (item.imageData || item.embedUrl)) {
      contentHtml = `
        <div class="gh-gallery-card-content">
          <img class="gh-gallery-img" id="ghGalleryActiveImg" src="${item.imageData || item.embedUrl}" alt="${group.name}" style="transform:rotate(${galleryRotation}deg);">
        </div>
      `;
    } else if (isCanva) {
      contentHtml = `
        <div class="gh-gallery-card-content" style="background:#f8fafc;flex-direction:column;gap:14px;color:#0f172a;padding:28px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#00c4cc,#0284c7);display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff;box-shadow:0 8px 24px rgba(0,196,204,0.35);margin-bottom:2px;">🎨</div>
          <div style="font-size:19px;font-weight:800;color:#0f172a;">Bản thiết kế Canva · ${escapeHtml(group.name)}</div>
          <p style="font-size:13.5px;color:#475569;max-width:460px;line-height:1.55;margin:0;">
            Để bảo mật, Canva yêu cầu mở bằng tài khoản đã đăng nhập để trình chiếu toàn màn hình. Thầy cô hãy bấm nút bên dưới để mở ngay bằng trình duyệt:
          </p>
          <button class="gh-btn primary" id="ghGalleryOpenExtBtn" style="padding:12px 24px;font-size:14.5px;font-weight:750;border-radius:999px;background:linear-gradient(135deg,#00c4cc,#0284c7);box-shadow:0 4px 18px rgba(0,196,204,0.35);border:none;">
            🚀 Mở Canva Chiếu Toàn Màn Hình (Đã đăng nhập) ↗
          </button>
        </div>
      `;
    } else if (item && item.canEmbed && item.embedUrl) {
      contentHtml = `
        <div class="gh-gallery-card-content" style="background:#fff;">
          <iframe src="${item.embedUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
        </div>
      `;
    } else if (item && item.url) {
      contentHtml = `
        <div class="gh-gallery-card-content" style="background:#f8fafc;flex-direction:column;gap:14px;color:#0f172a;padding:28px;text-align:center;">
          <div style="width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,0.3);margin-bottom:2px;">🌐</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(item.title || 'Sản phẩm trực tuyến')}</div>
          <p style="font-size:13.5px;color:#475569;max-width:460px;line-height:1.55;margin:0;">Trang web này yêu cầu mở trực tiếp trong trình duyệt để xem đầy đủ nội dung:</p>
          <button class="gh-btn primary" id="ghGalleryOpenExtBtn" style="padding:11px 22px;font-size:14px;font-weight:700;border-radius:999px;">
            🔗 Mở ${escapeHtml(item.title || 'bài làm')} trong trình duyệt ↗
          </button>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="gh-gallery-card-content" style="background:#f8fafc;flex-direction:column;gap:12px;color:#64748b;">
          <div style="font-size:48px;">📝</div>
          <div style="font-size:16px;font-weight:700;color:#334155;">Nhóm đang hoàn thiện bài làm trên giấy...</div>
          <div style="font-size:13px;color:#94a3b8;">Học sinh quét mã QR và chụp ảnh để gửi bài trực tiếp lên đây.</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="gh-gallery-card-banner" style="border-top:5px solid ${pal.color};">
        <div class="gh-gallery-card-info">
          <div class="gh-gallery-group-badge" style="background:${pal.color};">${group.id}</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;">${group.name}</div>
            <div style="font-size:12.5px;color:#475569;margin-top:2px;">${membersStr}</div>
          </div>
        </div>
        <div>${statusBadge}</div>
      </div>
      ${productsBarHtml}
      ${contentHtml}
    `;

    card.querySelectorAll('.gh-gallery-prod-tab').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.galleryTab);
        group.activeGalleryItemIndex = idx;
        renderGalleryFocus();
      };
    });

    const setFeaturedBtn = document.getElementById('ghGallerySetFeaturedBtn');
    if (setFeaturedBtn) {
      setFeaturedBtn.onclick = () => {
        group.selectedItemIndex = currGalleryIdx;
        saveState();
        renderDashboard();
        renderGalleryFocus();
        if (typeof window.toast === 'function') {
          window.toast(`⭐ Đã đặt "${item.title || item.type}" làm sản phẩm triển lãm chính của ${group.name}!`);
        }
      };
    }

    const openExtBtn = document.getElementById('ghGalleryOpenExtBtn');
    if (openExtBtn && item && item.url) {
      openExtBtn.onclick = () => openExternalUrl(item.url);
    }
  }

  function renderGalleryGrid() {
    const grid = document.getElementById('ghGalleryGridWrap');
    if (!grid) return;
    grid.innerHTML = '';

    state.groups.forEach((g, idx) => {
      const pal = getGroupColor(g.id);
      const hasMultiple = g.items && g.items.length > 1;
      const chosenIdx = (typeof g.activeGalleryItemIndex === 'number' && g.items && g.activeGalleryItemIndex < g.items.length)
        ? g.activeGalleryItemIndex
        : ((typeof g.selectedItemIndex === 'number' && g.items && g.selectedItemIndex < g.items.length) ? g.selectedItemIndex : 0);
      const item = g.items && g.items[chosenIdx];

      const card = document.createElement('div');
      card.className = 'gh-card';
      card.style.borderTop = `4px solid ${pal.color}`;
      card.style.cursor = 'pointer';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';

      let pillsHtml = '';
      if (hasMultiple) {
        const pills = g.items.map((it, pIdx) => {
          const isActive = pIdx === chosenIdx;
          const isFeatured = pIdx === (g.selectedItemIndex || 0);
          return `<button class="gh-gallery-grid-pill ${isActive ? 'active' : ''}" data-grid-pill="${pIdx}" title="${escapeHtml(it.title || it.type)}">${pIdx + 1}${isFeatured ? '⭐' : ''}</button>`;
        }).join('');
        pillsHtml = `
          <div class="gh-gallery-grid-tabs" style="justify-content:center;margin-bottom:6px;">
            <span style="font-size:10.5px;color:#64748b;font-weight:600;">Xem:</span>
            ${pills}
          </div>
        `;
      }

      let thumbHtml = '';
      if (item && item.type === 'image' && (item.imageData || item.embedUrl)) {
        thumbHtml = `
          <div style="height:150px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin:10px 0;">
            <img src="${item.imageData || item.embedUrl}" style="max-height:100%;max-width:100%;object-fit:contain;">
          </div>
        `;
      } else if (item) {
        const itemIsCanva = item.type === 'canva' || Boolean(item.url && (item.url.includes('canva.com') || item.url.includes('canva.link') || item.url.includes('canva.me')));
        thumbHtml = `
          <div style="height:150px;background:${itemIsCanva ? '#f0fdfa' : '#f0f9ff'};border:1px dashed ${itemIsCanva ? '#99f6e4' : '#bae6fd'};border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:10px 0;gap:6px;">
            <span style="font-size:32px;">${itemIsCanva ? '🎨' : '🌐'}</span>
            <span style="font-size:13px;font-weight:700;color:${itemIsCanva ? '#0f766e' : '#0369a1'};">${itemIsCanva ? 'Canva Thiết kế' : escapeHtml(item.title || item.type)}</span>
          </div>
        `;
      } else {
        thumbHtml = `
          <div style="height:150px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:10px 0;color:#94a3b8;gap:6px;">
            <span style="font-size:28px;">📝</span>
            <span style="font-size:12px;">Đang làm bài trên giấy...</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:26px;height:26px;border-radius:50%;background:${pal.color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">${g.id}</span>
            <b style="font-size:14px;color:#0f172a;">${g.name}</b>
          </div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:${item ? pal.bgLight : '#f1f5f9'};color:${item ? pal.accent : '#64748b'};">
            ${item ? (hasMultiple ? `Đã nộp (${g.items.length} SP)` : 'Đã nộp bài') : 'Đang làm'}
          </span>
        </div>
        ${pillsHtml}
        ${thumbHtml}
        <div style="font-size:11.5px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          👥 ${g.members || 'Chưa nhập thành viên'}
        </div>
      `;

      card.querySelectorAll('.gh-gallery-grid-pill').forEach(pill => {
        pill.onclick = (e) => {
          e.stopPropagation();
          g.activeGalleryItemIndex = Number(pill.dataset.gridPill);
          renderGalleryGrid();
        };
      });

      card.onclick = () => {
        galleryIndex = idx;
        galleryIsGrid = false;
        renderGalleryView();
      };

      grid.appendChild(card);
    });
  }

  function renderGalleryBottomBar() {
    const bar = document.getElementById('ghGalleryBottomBar');
    if (!bar) return;
    bar.innerHTML = '';

    state.groups.forEach((g, idx) => {
      const pal = getGroupColor(g.id);
      const btn = document.createElement('button');
      btn.className = `gh-gallery-dot-btn ${idx === galleryIndex && !galleryIsGrid ? 'active' : ''}`;
      btn.style.background = idx === galleryIndex && !galleryIsGrid ? pal.bgLight : '#f8fafc';
      btn.style.color = pal.accent;
      btn.style.borderColor = idx === galleryIndex && !galleryIsGrid ? pal.color : '#e2e8f0';
      btn.innerHTML = `Nhóm ${g.id}${g.items && g.items.length > 0 ? ' ✓' : ''}`;

      btn.onclick = () => {
        galleryIndex = idx;
        galleryIsGrid = false;
        renderGalleryView();
      };
      bar.appendChild(btn);
    });
  }

  /* ----------------------------------------------------
   * 12. Đăng Ký Sự Kiện Lắng Nghe
   * ---------------------------------------------------- */
  // Mở GroupHub từ rail
  if (railBtn) {
    railBtn.onclick = () => {
      dashboard.classList.toggle('open');
      if (dashboard.classList.contains('open')) {
        state = loadSavedState();
        renderDashboard();
        updateLockDisplay();
        syncLockToCloud(state.isLocked);
      }
    };
  }

  // Đóng dashboard
  document.getElementById('ghCloseDashboardBtn').onclick = () => dashboard.classList.remove('open');

  // Khóa / Mở cổng nộp bài
  const lockToggleBtn = document.getElementById('ghLockToggleBtn');
  if (lockToggleBtn) {
    lockToggleBtn.onclick = () => {
      state.isLocked = !state.isLocked;
      updateLockDisplay();
      broadcastTimerState();
      syncLockToCloud(state.isLocked);
      saveState();
      if (typeof window.toast === 'function') {
        window.toast(state.isLocked ? '🔒 Đã khóa cổng nộp bài học sinh.' : '🟢 Đã mở lại cổng nộp bài học sinh.');
      }
    };
  }

  // Nút mở Triển lãm Gallery Walk
  const galleryWalkBtn = document.getElementById('ghGalleryWalkBtn');
  if (galleryWalkBtn) {
    galleryWalkBtn.onclick = () => openGalleryWalk(0);
  }

  // Thêm nhóm mới
  document.getElementById('ghAddGroupBtn').onclick = () => {
    const nextId = state.groups.length + 1;
    const pal = getGroupColor(nextId);
    state.groups.push({
      id: nextId,
      name: `Nhóm ${nextId}`,
      members: '',
      color: pal.color,
      accent: pal.accent,
      bgLight: pal.bgLight,
      borderLight: pal.borderLight,
      status: 'pending',
      items: []
    });
    saveState();
    renderDashboard();
  };

  // Làm mới / Xóa toàn bộ
  document.getElementById('ghResetAllBtn').onclick = () => {
    if (confirm('Thầy cô có chắc chắn muốn làm mới toàn bộ bài nộp của các nhóm để bắt đầu hoạt động mới?')) {
      state = createInitialState(state.groups.length || 6);
      saveState();
      renderDashboard();
    }
  };

  // Nút So sánh 2 nhóm
  document.getElementById('ghCompareBtn').onclick = () => presentCompare();

  // Nút QR InkDrop
  document.getElementById('ghInkDropBtn').onclick = () => openQRModal();
  document.getElementById('ghQRModalClose').onclick = () => qrModal.classList.remove('open');

  // Nhập thời gian trực tiếp theo phút bất kỳ
  const timerDigitsInput = document.getElementById('ghTimerDigits');
  if (timerDigitsInput) {
    timerDigitsInput.onfocus = () => {
      timerDigitsInput.select();
    };

    const commitTimerChange = () => {
      const parsed = parseTimerInput(timerDigitsInput.value);
      if (parsed) {
        stopTimer();
        state.timerMinutes = parsed.minutes;
        state.timerSeconds = parsed.seconds;
        state.timerDefaultMinutes = parsed.minutes;
        saveState();
        broadcastTimerState();
        if (typeof window.toast === 'function') {
          window.toast(`⏱️ Đã đặt thời gian thảo luận: ${String(parsed.minutes).padStart(2, '0')}:${String(parsed.seconds).padStart(2, '0')}`);
        }
      }
      updateTimerDisplay();
    };

    timerDigitsInput.onchange = commitTimerChange;
    timerDigitsInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitTimerChange();
        timerDigitsInput.blur();
      } else if (e.key === 'Escape') {
        updateTimerDisplay();
        timerDigitsInput.blur();
      }
    };
  }

  // Timer buttons
  document.getElementById('ghTimerToggleBtn').onclick = () => {
    if (state.timerRunning) stopTimer(); else startTimer();
  };
  document.getElementById('ghTimerResetBtn').onclick = () => resetTimer();
  document.getElementById('ghTimerPlus5Btn').onclick = () => {
    state.timerMinutes += 5;
    state.timerDefaultMinutes = state.timerMinutes;
    updateTimerDisplay();
    broadcastTimerState();
    saveState();
  };

  // Add Modal Actions
  document.getElementById('ghAddModalClose').onclick = closeAddModal;
  document.getElementById('ghAddCancelBtn').onclick = closeAddModal;

  document.getElementById('ghPickImageBtn').onclick = () => {
    document.getElementById('ghFileInput').click();
  };

  document.getElementById('ghFileInput').onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        tempImageData = evt.target.result;
        const preview = document.getElementById('ghImagePreview');
        preview.src = tempImageData;
        document.getElementById('ghImagePreviewWrap').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  document.getElementById('ghAddConfirmBtn').onclick = () => {
    if (!currentTargetGroupId) return;
    const group = state.groups.find(g => g.id === currentTargetGroupId);
    if (!group) return;

    const url = document.getElementById('ghInputUrl').value.trim();

    if (tempImageData) {
      // Thêm ảnh chụp bài làm
      group.items.push({
        id: 'img_' + Date.now(),
        type: 'image',
        title: 'Ảnh bài làm ' + (group.items.length + 1),
        badge: '📷 Ảnh bài làm',
        color: '#8b5cf6',
        url: '',
        embedUrl: '',
        imageData: tempImageData,
        canEmbed: true,
        submittedAt: new Date().toLocaleTimeString()
      });
      group.status = 'submitted';
    } else if (url) {
      // Parse link
      const parsed = parseProductUrl(url);
      if (parsed) {
        group.items.push({
          id: 'link_' + Date.now(),
          type: parsed.type,
          title: parsed.title,
          badge: parsed.badge,
          color: parsed.color,
          url: parsed.url,
          embedUrl: parsed.embedUrl,
          canEmbed: parsed.canEmbed,
          submittedAt: new Date().toLocaleTimeString()
        });
        group.status = 'submitted';
      } else {
        alert('Đường dẫn không hợp lệ. Vui lòng nhập link đầy đủ (bắt đầu bằng https://).');
        return;
      }
    } else {
      alert('Vui lòng dán liên kết hoặc chọn ảnh bài làm.');
      return;
    }

    saveState();
    closeAddModal();
    renderDashboard();
  };

  // Floating Bar Controls
  document.getElementById('ghStageExitBtn').onclick = exitStage;
  document.getElementById('ghStageBackToDashBtn').onclick = () => {
    ghStage.classList.remove('on');
    ghStage.innerHTML = '';
    floatingBar.classList.remove('on');
    dashboard.classList.add('open');
  };

  document.getElementById('ghPenToggleBtn').onclick = () => {
    setPenInteractMode(!penInteractMode);
  };

  // Nút Chụp hình đưa lên bảng NoteBoard 1-click từ Stage
  const stageToBoardBtn = document.getElementById('ghStageToBoardBtn');
  if (stageToBoardBtn) {
    stageToBoardBtn.onclick = () => insertProductToBoard(activeStageGroup, null, stageImageRotation);
  }

  // Nút Lưu bài chữa Ink Snapshot
  const stageSnapshotBtn = document.getElementById('ghStageSnapshotBtn');
  if (stageSnapshotBtn) {
    stageSnapshotBtn.onclick = () => takeInkSnapshot(activeStageGroup);
  }

  // Nút Xoay ảnh 90° trên Stage
  const stageRotateBtn = document.getElementById('ghStageRotateBtn');
  if (stageRotateBtn) {
    stageRotateBtn.onclick = () => {
      stageImageRotation = (stageImageRotation + 90) % 360;
      const activeImg = document.getElementById('ghActiveStageImg');
      if (activeImg) {
        activeImg.style.transform = `rotate(${stageImageRotation}deg)`;
      }
    };
  }

  // Nút mở Gallery Walk từ Stage
  const stageGalleryBtn = document.getElementById('ghStageGalleryBtn');
  if (stageGalleryBtn) {
    stageGalleryBtn.onclick = () => {
      const idx = activeStageGroup ? state.groups.findIndex(g => g.id === activeStageGroup.id) : 0;
      if (activeStageGroup) {
        activeStageGroup.activeGalleryItemIndex = activeStageItemIndex;
      }
      exitStage();
      openGalleryWalk(Math.max(0, idx));
    };
  }

  document.getElementById('ghStageOpenExtBtn').onclick = () => {
    if (activeStageGroup && activeStageGroup.items) {
      const curItem = activeStageGroup.items[activeStageItemIndex || activeStageGroup.selectedItemIndex || 0];
      if (curItem && curItem.url) openExternalUrl(curItem.url);
    }
  };

  // Gallery Walk Controls
  const galleryAutoBtn = document.getElementById('ghGalleryAutoBtn');
  if (galleryAutoBtn) galleryAutoBtn.onclick = toggleGalleryAuto;

  const galleryRotateBtn = document.getElementById('ghGalleryRotateBtn');
  if (galleryRotateBtn) {
    galleryRotateBtn.onclick = () => {
      galleryRotation = (galleryRotation + 90) % 360;
      const gImg = document.getElementById('ghGalleryActiveImg');
      if (gImg) gImg.style.transform = `rotate(${galleryRotation}deg)`;
    };
  }

  const galleryToBoardBtn = document.getElementById('ghGalleryToBoardBtn');
  if (galleryToBoardBtn) {
    galleryToBoardBtn.onclick = () => {
      const g = state.groups[galleryIndex];
      if (g && g.items) {
        const curIdx = (typeof g.activeGalleryItemIndex === 'number' && g.activeGalleryItemIndex < g.items.length)
          ? g.activeGalleryItemIndex
          : ((typeof g.selectedItemIndex === 'number' && g.selectedItemIndex < g.items.length) ? g.selectedItemIndex : 0);
        const curItem = g.items[curIdx];
        insertProductToBoard(g, curItem, galleryRotation);
      }
    };
  }

  const gallerySnapshotBtn = document.getElementById('ghGallerySnapshotBtn');
  if (gallerySnapshotBtn) {
    gallerySnapshotBtn.onclick = () => {
      const g = state.groups[galleryIndex];
      if (g && g.items) {
        const curIdx = (typeof g.activeGalleryItemIndex === 'number' && g.activeGalleryItemIndex < g.items.length)
          ? g.activeGalleryItemIndex
          : ((typeof g.selectedItemIndex === 'number' && g.selectedItemIndex < g.items.length) ? g.selectedItemIndex : 0);
        const curItem = g.items[curIdx];
        takeInkSnapshot(g, curItem);
      }
    };
  }

  const galleryViewToggleBtn = document.getElementById('ghGalleryViewToggleBtn');
  if (galleryViewToggleBtn) {
    galleryViewToggleBtn.onclick = () => {
      galleryIsGrid = !galleryIsGrid;
      renderGalleryView();
    };
  }

  const galleryCloseBtn = document.getElementById('ghGalleryCloseBtn');
  if (galleryCloseBtn) galleryCloseBtn.onclick = closeGalleryWalk;

  const galleryPrevBtn = document.getElementById('ghGalleryPrevBtn');
  if (galleryPrevBtn) {
    galleryPrevBtn.onclick = () => {
      galleryIndex = (galleryIndex - 1 + state.groups.length) % state.groups.length;
      galleryRotation = 0;
      renderGalleryView();
    };
  }

  const galleryNextBtn = document.getElementById('ghGalleryNextBtn');
  if (galleryNextBtn) {
    galleryNextBtn.onclick = () => {
      galleryIndex = (galleryIndex + 1) % state.groups.length;
      galleryRotation = 0;
      renderGalleryView();
    };
  }

  // Chuyển nhóm trước / sau trong InkStage
  document.getElementById('ghStagePrevBtn').onclick = () => {
    if (!activeStageGroup) return;
    const submittedGroups = state.groups.filter(g => g.items && g.items.length > 0);
    if (submittedGroups.length <= 1) return;
    const currIdx = submittedGroups.findIndex(g => g.id === activeStageGroup.id);
    const prevIdx = (currIdx - 1 + submittedGroups.length) % submittedGroups.length;
    presentGroup(submittedGroups[prevIdx]);
  };

  document.getElementById('ghStageNextBtn').onclick = () => {
    if (!activeStageGroup) return;
    const submittedGroups = state.groups.filter(g => g.items && g.items.length > 0);
    if (submittedGroups.length <= 1) return;
    const currIdx = submittedGroups.findIndex(g => g.id === activeStageGroup.id);
    const nextIdx = (currIdx + 1) % submittedGroups.length;
    presentGroup(submittedGroups[nextIdx]);
  };

  // Phím tắt Esc và Mũi tên
  window.addEventListener('keydown', (e) => {
    if (galleryWalk.classList.contains('open')) {
      if (e.key === 'Escape') {
        closeGalleryWalk();
      } else if (e.key === 'ArrowLeft') {
        galleryIndex = (galleryIndex - 1 + state.groups.length) % state.groups.length;
        galleryRotation = 0;
        renderGalleryView();
      } else if (e.key === 'ArrowRight') {
        galleryIndex = (galleryIndex + 1) % state.groups.length;
        galleryRotation = 0;
        renderGalleryView();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (qrModal.classList.contains('open')) {
        qrModal.classList.remove('open');
      } else if (addModal.classList.contains('open')) {
        closeAddModal();
      } else if (ghStage.classList.contains('on')) {
        exitStage();
      } else if (dashboard.classList.contains('open')) {
        dashboard.classList.remove('open');
      }
    }
  });

  // Khởi tạo ban đầu
  renderDashboard();
  updateTimerDisplay();

  // Export API toàn cục
  window.NBGroupHub = {
    open: () => { dashboard.classList.add('open'); renderDashboard(); },
    close: () => { dashboard.classList.remove('open'); },
    presentGroup,
    presentCompare,
    openGalleryWalk,
    closeGalleryWalk,
    takeInkSnapshot,
    insertToBoard: insertProductToBoard,
    parseProductUrl,
    openExternal: openExternalUrl,
    submitToGroup: (groupId, productData) => {
      const g = state.groups.find(grp => grp.id === groupId);
      if (g) {
        g.items.push(productData);
        g.status = 'submitted';
        saveState();
        renderDashboard();
      }
    }
  };

})();
