/* Curated outbound references, not redistributed PhET simulation files.
 * Curriculum mappings are teaching suggestions, not Ministry endorsement. */
(()=>{'use strict';
const rows=[
 ['math','fractions-intro','Phân số','Lớp 3–6','Biểu diễn, so sánh và ý nghĩa phân số'],
 ['math','equality-explorer','Khám phá đẳng thức','Lớp 6–8','Đẳng thức và giải phương trình'],
 ['math','graphing-lines','Đồ thị đường thẳng','Lớp 8–10','Hệ số góc, hàm số bậc nhất'],
 ['math','graphing-quadratics','Đồ thị hàm bậc hai','Lớp 9–10','Parabol và ảnh hưởng của các hệ số'],
 ['math','trig-tour','Vòng tròn lượng giác','Lớp 11','Góc lượng giác, sin và cos'],
 ['math','plinko-probability','Thí nghiệm xác suất','Lớp 7–11','Tần suất thực nghiệm và phân bố kết quả'],
 ['physics','forces-and-motion-basics','Lực và chuyển động','KHTN 6–8 · Lí 10','Lực tổng hợp, ma sát, định luật Newton'],
 ['physics','energy-skate-park','Bảo toàn cơ năng','Lí 10','Động năng, thế năng, ma sát'],
 ['physics','wave-on-a-string','Sóng trên dây','Lí 11','Bước sóng, tần số, sóng dừng'],
 ['physics','circuit-construction-kit-dc','Lắp mạch điện một chiều','KHTN · Lí 11','Dòng điện, điện trở và đo trong mạch'],
 ['physics','gas-properties','Tính chất chất khí','Lí 12','Mô hình động học, các thông số trạng thái'],
 ['physics','bending-light','Khúc xạ ánh sáng','KHTN 9','Khúc xạ, phản xạ toàn phần'],
 ['chemistry','build-an-atom','Xây dựng nguyên tử','KHTN 7 · Hóa 10','Proton, neutron, electron và ion'],
 ['chemistry','molecule-shapes','Hình dạng phân tử','Chuyên đề Hóa 10','Mô hình hình học phân tử; học liệu bổ trợ'],
 ['chemistry','balancing-chemical-equations','Cân bằng phương trình hóa học','KHTN 8','Bảo toàn nguyên tử và hệ số phản ứng'],
 ['chemistry','concentration','Nồng độ dung dịch','KHTN 8 · Hóa 11','Pha loãng, lượng chất tan và nồng độ'],
 ['chemistry','ph-scale','Thang pH','KHTN 8 · Hóa 11','Acid, base và môi trường dung dịch'],
 ['chemistry','reactants-products-and-leftovers','Chất phản ứng và sản phẩm','KHTN 8 · Hóa 10','Tỉ lệ phản ứng và chất còn dư'],
 ['biology','natural-selection','Chọn lọc tự nhiên','Sinh 12','Biến dị, di truyền, tác động môi trường'],
 ['biology','gene-expression-essentials','Biểu hiện gene','Sinh 12','Phiên mã, dịch mã và tổng hợp protein'],
 ['biology','neuron','Tế bào thần kinh','Sinh 11','Mô hình điện thế hoạt động và truyền tin'],
 ['biology','diffusion','Mô hình khuếch tán','Sinh 10 · bổ trợ','Khuếch tán phân tử; không thay thế mô hình màng tế bào'],
 ['math','function-builder','Xây dựng hàm số','Lớp 8–10','Quy tắc hàm, đầu vào – đầu ra, hàm hợp'],
 ['math','area-model-algebra','Mô hình diện tích (đại số)','Lớp 7–8','Nhân đa thức, hằng đẳng thức bằng diện tích'],
 ['math','unit-rates','Tỉ lệ đơn vị','Lớp 6–7','Tỉ số, tỉ lệ thuận, đơn giá'],
 ['physics','projectile-motion','Chuyển động ném','Lí 10','Ném ngang, ném xiên, tầm xa và độ cao'],
 ['physics','masses-and-springs','Con lắc lò xo','Lí 10 · Lí 11','Định luật Hooke, dao động của con lắc lò xo'],
 ['physics','pendulum-lab','Con lắc đơn','Lí 11','Chu kì con lắc đơn, dao động điều hòa'],
 ['physics','coulombs-law','Định luật Coulomb','Lí 11','Lực tương tác giữa hai điện tích điểm'],
 ['physics','faradays-law','Định luật Faraday','Lí 12','Cảm ứng điện từ, suất điện động cảm ứng'],
 ['chemistry','states-of-matter','Trạng thái của chất','KHTN 6 · Hóa 10','Rắn, lỏng, khí; chuyển thể theo nhiệt độ'],
 ['chemistry','molarity','Nồng độ mol','Hóa 10 · Hóa 11','Số mol chất tan, thể tích, nồng độ mol'],
 ['chemistry','acid-base-solutions','Dung dịch acid – base','Hóa 11','Acid mạnh/yếu, base, pH và độ điện li'],
 ['math','area-builder','Diện tích và chu vi','Lớp 6','Diện tích, chu vi hình chữ nhật và hình ghép'],
 ['math','area-model-multiplication','Mô hình nhân bằng diện tích','Lớp 6','Phép nhân, tính chất phân phối'],
 ['math','fractions-equality','Phân số bằng nhau','Lớp 6','Tính chất cơ bản của phân số, rút gọn'],
 ['math','fractions-mixed-numbers','Phân số và hỗn số','Lớp 6','Hỗn số dương, quy đổi phân số'],
 ['math','number-line-integers','Số nguyên trên trục số','Lớp 6','Số nguyên âm, so sánh, số đối'],
 ['math','number-line-operations','Phép tính trên trục số','Lớp 6–7','Cộng, trừ số nguyên trên trục số'],
 ['math','number-line-distance','Khoảng cách trên trục số','Lớp 6–7','Khoảng cách hai điểm, giá trị tuyệt đối'],
 ['math','ratio-and-proportion','Tỉ số và tỉ lệ','Lớp 6–7','Tỉ số bằng nhau, đại lượng tỉ lệ'],
 ['math','proportion-playground','Tỉ lệ thức','Lớp 7','Tỉ lệ thức, đại lượng tỉ lệ thuận'],
 ['math','mean-share-and-balance','Số trung bình cộng','Lớp 6–7','Ý nghĩa số trung bình của dãy số liệu'],
 ['math','expression-exchange','Biểu thức đại số','Lớp 7','Đơn thức đồng dạng, thu gọn biểu thức'],
 ['math','quadrilateral','Tứ giác','Lớp 8','Hình bình hành, hình thang, hình chữ nhật, hình thoi'],
 ['math','graphing-slope-intercept','Hàm số y = ax + b','Lớp 8–9','Hệ số góc, tung độ gốc, đồ thị'],
 ['math','equality-explorer-two-variables','Phương trình hai ẩn','Lớp 9','Phương trình, hệ phương trình bậc nhất hai ẩn'],
 ['math','center-and-variability','Số đặc trưng của mẫu số liệu','Lớp 9–10','Trung bình, trung vị, khoảng biến thiên, tứ phân vị'],
 ['math','vector-addition','Cộng véc tơ','Toán 10 · Lí 10','Tổng, hiệu véc tơ, phân tích thành phần'],
 ['math','vector-addition-equations','Tổ hợp véc tơ','Toán 10','Tích một số với véc tơ, biểu thị véc tơ'],
 ['math','least-squares-regression','Đường thẳng phù hợp dữ liệu','Toán 10 (bổ trợ)','Tương quan, hồi quy tuyến tính'],
 ['math','curve-fitting','Khớp đường cong','Toán 11–12 (bổ trợ)','Mô hình hàm số từ số liệu thực nghiệm'],
 ['math','calculus-grapher','Đồ thị đạo hàm và tích phân','Toán 11–12','Đạo hàm, nguyên hàm, tích phân trên đồ thị'],
 ['physics','friction','Lực ma sát','KHTN 6','Ma sát, sự nóng lên khi cọ xát'],
 ['physics','energy-forms-and-changes','Các dạng năng lượng','KHTN 6','Chuyển hóa và truyền năng lượng'],
 ['physics','gravity-force-lab-basics','Lực hấp dẫn (cơ bản)','KHTN 6','Khối lượng, khoảng cách và lực hút'],
 ['physics','density','Khối lượng riêng','KHTN 8','Khối lượng, thể tích, khối lượng riêng'],
 ['physics','buoyancy','Lực đẩy Archimedes','KHTN 8','Lực đẩy, điều kiện vật nổi, vật chìm'],
 ['physics','under-pressure','Áp suất chất lỏng','KHTN 8','Áp suất theo độ sâu, áp suất khí quyển'],
 ['physics','balloons-and-static-electricity','Nhiễm điện do cọ xát','KHTN 8','Điện tích, lực hút và đẩy'],
 ['physics','john-travoltage','Hiện tượng phóng điện','KHTN 8','Tích điện và phóng điện'],
 ['physics','sound-waves','Sóng âm','KHTN 8 · Lí 11','Độ cao, độ to của âm'],
 ['physics','balancing-act','Cân bằng đòn bẩy','KHTN 8 · Lí 10','Moment lực, điều kiện cân bằng'],
 ['physics','energy-skate-park-basics','Động năng và thế năng','KHTN 9','Cơ năng, chuyển hóa năng lượng'],
 ['physics','geometric-optics','Thấu kính','KHTN 9','Ảnh qua thấu kính hội tụ, phân kì'],
 ['physics','color-vision','Ánh sáng màu','KHTN 9','Ánh sáng trắng, màu sắc vật'],
 ['physics','ohms-law','Định luật Ohm','KHTN 9 · Lí 11','Hiệu điện thế, cường độ, điện trở'],
 ['physics','resistance-in-a-wire','Điện trở của dây dẫn','KHTN 9 · Lí 11','Phụ thuộc chiều dài, tiết diện, vật liệu'],
 ['physics','magnets-and-electromagnets','Nam châm điện','KHTN 9','Từ trường của nam châm, ống dây'],
 ['physics','faradays-electromagnetic-lab','Cảm ứng điện từ','KHTN 9 · Lí 12','Dòng điện cảm ứng, máy phát, máy biến áp'],
 ['physics','greenhouse-effect','Hiệu ứng nhà kính','KHTN 9','Cân bằng năng lượng Trái Đất, khí nhà kính'],
 ['physics','gravity-force-lab','Định luật vạn vật hấp dẫn','Lí 10','Lực hấp dẫn giữa hai vật'],
 ['physics','hookes-law','Định luật Hooke','Lí 10','Lực đàn hồi, độ cứng lò xo'],
 ['physics','collision-lab','Va chạm','Lí 10','Động lượng, va chạm đàn hồi và mềm'],
 ['physics','gravity-and-orbits','Hấp dẫn và quỹ đạo','Lí 10','Chuyển động tròn của hành tinh, vệ tinh'],
 ['physics','keplers-laws','Các định luật Kepler','Lí 10 (chuyên đề)','Quỹ đạo elip, định luật diện tích'],
 ['physics','my-solar-system','Hệ Mặt Trời','Lí 10 (bổ trợ)','Quỹ đạo nhiều vật dưới lực hấp dẫn'],
 ['physics','waves-intro','Sóng cơ và sóng điện từ','Lí 11','Biên độ, tần số, bước sóng'],
 ['physics','wave-interference','Giao thoa sóng','Lí 11','Giao thoa mặt nước, âm, ánh sáng; khe Young'],
 ['physics','normal-modes','Dao động của hệ lò xo','Lí 11 (bổ trợ)','Các dạng dao động riêng'],
 ['physics','fourier-making-waves','Tổng hợp dao động','Lí 11 (bổ trợ)','Tổng hợp các dao động điều hòa'],
 ['physics','charges-and-fields','Điện trường','Lí 11','Điện tích, đường sức, điện thế'],
 ['physics','capacitor-lab-basics','Tụ điện','Lí 11','Điện dung, năng lượng tụ điện'],
 ['physics','circuit-construction-kit-ac','Mạch điện xoay chiều','Lí 12','Dòng điện xoay chiều, tụ điện, cuộn cảm'],
 ['physics','gases-intro','Chất khí','Lí 12','Áp suất, nhiệt độ, thể tích khí'],
 ['physics','build-a-nucleus','Cấu tạo hạt nhân','Lí 12','Proton, neutron, đồng vị, phóng xạ'],
 ['physics','rutherford-scattering','Thí nghiệm Rutherford','Lí 12 · Hóa 10','Tán xạ hạt alpha, hạt nhân nguyên tử'],
 ['physics','models-of-the-hydrogen-atom','Mẫu nguyên tử hydrogen','Lí 12 (bổ trợ)','Mẫu Bohr và quang phổ'],
 ['physics','blackbody-spectrum','Bức xạ nhiệt','Lí 12 (bổ trợ)','Phổ bức xạ theo nhiệt độ'],
 ['chemistry','states-of-matter-basics','Ba thể của chất','KHTN 6','Rắn, lỏng, khí và sự chuyển thể'],
 ['chemistry','build-a-molecule','Xây dựng phân tử','KHTN 7','Đơn chất, hợp chất, công thức phân tử'],
 ['chemistry','ph-scale-basics','Thang pH (cơ bản)','KHTN 8','Acid, base trong đời sống'],
 ['chemistry','isotopes-and-atomic-mass','Đồng vị và nguyên tử khối','Hóa 10','Đồng vị, nguyên tử khối trung bình'],
 ['chemistry','atomic-interactions','Tương tác giữa các nguyên tử','Hóa 10','Lực hút, đẩy và liên kết'],
 ['chemistry','molecule-polarity','Phân cực phân tử','Hóa 10','Độ âm điện, liên kết phân cực'],
 ['chemistry','molecule-shapes-basics','Hình dạng phân tử (cơ bản)','Hóa 10','Cặp electron và hình dạng phân tử'],
 ['chemistry','beers-law-lab','Nồng độ và hấp thụ ánh sáng','Hóa 11 (bổ trợ)','Định luật Beer, màu dung dịch'],
 ['biology','membrane-transport','Vận chuyển qua màng','Sinh 10','Khuếch tán, kênh, bơm protein']
];
/* cấp học suy từ nhãn lớp: KHTN/lớp 6–9 → THCS; lớp 10–12 → THPT (một mô phỏng có thể dùng cho cả hai cấp) */
const levelOf=g=>{const n=(g.match(/\d+/g)||[]).map(Number);return {thcs:/KHTN/.test(g)||n.some(x=>x>=6&&x<=9),thpt:n.some(x=>x>=10&&x<=12)};};
const catalog=rows.map(([subject,id,title,grade,topic])=>Object.freeze({subject,id,title,grade,topic,...levelOf(grade),url:'https://phet.colorado.edu/sims/html/'+id+'/latest/'+id+'_all.html?locale=vi',source:'PhET Interactive Simulations, University of Colorado Boulder · CC BY 4.0'}));
function parse(raw){
 if(typeof raw!=='string'||raw.length>4096)throw Error('Liên kết quá dài hoặc không hợp lệ.');
 let s=raw.trim();
 if(!/^https?:\/\//i.test(s)&&/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(s))s='https://'+s;
 let url;try{url=new URL(s);}catch{throw Error('Nhập địa chỉ đầy đủ bắt đầu bằng https:// hoặc http://.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Chỉ chấp nhận liên kết Web, không chứa tài khoản/mật khẩu.');
 const host=url.hostname.toLowerCase(),isPhET=host==='phet.colorado.edu'||host.endsWith('.phet.colorado.edu');let video='';
 if(host==='youtu.be')video=url.pathname.split('/')[1]||'';
 if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))video=url.searchParams.get('v')||(/^\/(?:shorts|embed|live)\/([^/]+)/.exec(url.pathname)||[])[1]||'';
 const start=Math.max(0,Math.min(86400,Number(url.searchParams.get('start')||url.searchParams.get('t'))||0));
 if(video&&!/^[A-Za-z0-9_-]{11}$/.test(video))throw Error('Mã video YouTube không hợp lệ.');
 let gslidesId='';
 if(host==='docs.google.com'){
  const sm=url.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if(sm)gslidesId=sm[1];
 }else if(host==='drive.google.com'){
  const dm=url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)||(url.pathname.includes('/open')?[null,url.searchParams.get('id')]:null);
  if(dm&&dm[1])gslidesId=dm[1];
 }
 const isGSlides=!!gslidesId;
 const isNotebookLM=/^(notebooklm|notebook)\.google\.com$/.test(host)||host==='notebooklm.google';
 const privateHost=/^(localhost|.*\.localhost|.*\.local|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||host.includes(':')||host==='noteboardink.com'||host.endsWith('.noteboardink.com');
 /* Chỉ nhúng nguồn được CSP của NoteBoard cho phép: video YouTube (youtube-nocookie), mô phỏng PhET HTML5, Google Trình bày (Google Slides/Drive); trang khác mở trong trình duyệt */
 const phetSim=isPhET&&/^\/sims\/html\//.test(url.pathname);
 const gslidesEmbed=isGSlides?'https://docs.google.com/presentation/d/'+gslidesId+'/embed?start=false&loop=false&delayms=3000':'';
 const embed=video?'https://www.youtube-nocookie.com/embed/'+video+'?playsinline=1&rel=0&start='+start:isGSlides?gslidesEmbed:url.href;
 return {url:url.href,type:video?'youtube':isPhET?'phet':isGSlides?'gslides':isNotebookLM?'notebooklm':'web',video,start,embeddable:url.protocol==='https:'&&!privateHost&&(!!video||phetSim||isGSlides),embed};
}
function clean(value){try{if(!value||typeof value.url!=='string')return null;const p=parse(value.url);return {url:p.url,title:String(value.title||p.type==='youtube'&&'Video YouTube'||p.type==='gslides'&&'Google Trình bày'||p.type==='notebooklm'&&'NotebookLM · Sổ tay AI'||new URL(p.url).hostname).slice(0,160)};}catch{return null;}}
const api=Object.freeze({catalog,parse,clean});if(typeof window!=='undefined')window.NBLinks=api;if(typeof module!=='undefined')module.exports=api;
})();
