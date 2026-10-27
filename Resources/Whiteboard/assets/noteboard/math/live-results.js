/* Live Quiz reporting only. No changes to grading, ranking or stored answers. */
(function(root){
  'use strict';
  function status(round, answer) {
    if (!answer) return round.closed === false ? 'Đang chờ trả lời' : 'Chưa trả lời';
    if (answer.correct === 1) return 'Đúng';
    if (answer.correct === 0) return 'Sai';
    return round.type === 'word_cloud' ? 'Không chấm điểm' : 'Chưa chấm';
  }
  function stats(s, st) {
    const result = { total:s.rounds.length, answered:0, correct:0, wrong:0, missing:0, waiting:0, ungraded:0, survey:0 };
    s.rounds.forEach((r,i) => {
      const a = st.answers[i];
      if (!a) { result[r.closed === false ? 'waiting' : 'missing']++; return; }
      result.answered++;
      result[a.correct === 1 ? 'correct' : a.correct === 0 ? 'wrong' : r.type === 'word_cloud' ? 'survey' : 'ungraded']++;
    });
    return result;
  }
  const percent = (n,d) => d ? Math.round(n * 10000 / d) / 100 : null;
  function sheets(s) {
    const summary = [['Hạng','Mã người chơi','Học sinh','Số câu đã phát','Đã trả lời','Đúng','Sai','Chưa trả lời','Đang chờ trả lời','Chưa chấm','Không chấm điểm','Điểm thi đua','Hoàn thành (%)','Đúng / câu đã chấm (%)','Đúng / tổng câu có đáp án (%)','Tổng thời gian trả lời (giây)','Điểm hệ 10','Thời gian TB / câu (giây)']];
    const detail = [['Mã người chơi','Học sinh','Lượt câu','Nội dung câu hỏi','Các lựa chọn','Câu trả lời','Đáp án đúng / chấp nhận','Trạng thái','Điểm thi đua','Thời gian trả lời (giây)']];
    const keyed = s.rounds.filter(r => r.graded).length;
    const matrix = [['Hạng','Mã người chơi','Học sinh',...s.rounds.map(r=>'Câu '+r.n),'Số câu đúng','Điểm hệ 10','Điểm thi đua']];
    s.students.forEach((st,i) => {
      const x = stats(s,st), id = st.id || String(i+1);
      const score10 = keyed ? Math.round((x.correct / keyed) * 100) / 10 : (x.total ? Math.round((x.correct / x.total) * 100) / 10 : null);
      const avgTime = x.answered ? Math.round((st.time / x.answered) / 100) / 10 : 0;
      summary.push([i+1,id,st.name,x.total,x.answered,x.correct,x.wrong,x.missing,x.waiting,x.ungraded,x.survey,st.points,percent(x.answered,x.total),percent(x.correct,x.correct+x.wrong),percent(x.correct,keyed),Math.round(st.time/100)/10,score10,avgTime]);
      s.rounds.forEach((r,j) => {
        const a = st.answers[j];
        detail.push([id,st.name,r.n,r.text,(r.optionTexts||[]).map((v,k)=>String.fromCharCode(65+k)+'. '+v).join('\n'),a?.answer ?? '',r.key || '',status(r,a),a ? a.points : null,a ? Math.round(a.ms/100)/10 : null]);
      });
      const mRow = [i+1,id,st.name];
      s.rounds.forEach((r,j) => {
        const a = st.answers[j];
        if (!a) mRow.push(r.closed === false ? 'Đang chờ' : '-');
        else if (a.correct === 1) mRow.push('✓ Đúng' + (a.answer ? ' ('+a.answer+')' : ''));
        else if (a.correct === 0) mRow.push('✗ Sai' + (a.answer ? ' ('+a.answer+')' : ''));
        else mRow.push(a.answer || 'Đã nộp');
      });
      mRow.push(x.correct + '/' + (keyed || x.total), score10, st.points);
      matrix.push(mRow);
    });
    if (s.rounds.length) {
      const statsRow = ['','','Tỉ lệ đúng cả lớp (%)'];
      s.rounds.forEach(r => {
        const pct = r.graded && r.answered ? (Math.round(r.correct * 1000 / r.answered) / 10) + '%' : (r.graded ? '0%' : '-');
        statsRow.push(pct);
      });
      statsRow.push('','','');
      matrix.push(statsRow);
    }
    return [{name:'Tổng hợp',rows:summary},{name:'Chi tiết',rows:detail},{name:'Ma trận làm bài',rows:matrix}];
  }
  // Small, dependency-free OOXML workbook: text is inlineStr, never an Excel formula.
  const xml = v => String(v ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g,'').slice(0,32767).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function col(n) { let s=''; for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s; return s; }
  function sheet(rows) {
    const end=col(rows[0].length-1)+rows.length;
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<dimension ref="A1:'+end+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      '<sheetFormatPr defaultColWidth="20" defaultRowHeight="18"/><sheetData>'+rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.map((v,j)=>{
        const ref=col(j)+(i+1), style=i===0?' s="1"':'';
        return typeof v==='number'&&Number.isFinite(v)?'<c r="'+ref+'"><v>'+v+'</v></c>':'<c r="'+ref+'" t="inlineStr"'+style+'><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
      }).join('')+'</row>').join('')+'</sheetData><autoFilter ref="A1:'+end+'"/></worksheet>';
  }
  function zip(files) {
    const enc=new TextEncoder(),parts=[],central=[];let offset=0,centralSize=0;
    const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
    for(const [name,text] of Object.entries(files)) {
      const n=enc.encode(name),data=enc.encode(text);let crc=0xffffffff;
      for(const b of data)crc=table[(crc^b)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
      const local=new Uint8Array(30+n.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);local.set(n,30);
      const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);
      w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);c.set(n,46);
      parts.push(local,data);central.push(c);offset+=local.length+data.length;centralSize+=c.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function workbook(s) {
    const tabs=sheets(s),ns='http://schemas.openxmlformats.org/',rel=ns+'package/2006/relationships',ss=ns+'spreadsheetml/2006/main',doc=ns+'officeDocument/2006/relationships';
    const files={
      '[Content_Types].xml':'<Types xmlns="'+ns+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+tabs.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>',
      '_rels/.rels':'<Relationships xmlns="'+rel+'"><Relationship Id="rId1" Type="'+doc+'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="'+ss+'" xmlns:r="'+doc+'"><sheets>'+tabs.map((t,i)=>'<sheet name="'+xml(t.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="'+rel+'">'+tabs.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+doc+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="styles" Type="'+doc+'/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':'<styleSheet xmlns="'+ss+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    };
    tabs.forEach((t,i)=>{files['xl/worksheets/sheet'+(i+1)+'.xml']=sheet(t.rows);});
    return zip(files);
  }
  const api={stats,status,sheets,workbook};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.NBLiveResults=api;
})(globalThis);
