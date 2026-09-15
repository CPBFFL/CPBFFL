const fs = require('node:fs');
const cp = require('node:child_process');
const file = 'index.html';
const expected = '4ec75ad72454bcc66e2f14f1ee5433a3eb5d8500';
const actual = cp.execFileSync('git', ['hash-object', file], {encoding:'utf8'}).trim();
if (actual !== expected) throw new Error('Homepage changed; refusing to overwrite it');
const source = fs.readFileSync(file, 'utf8');
const anchor = '  root.innerHTML=`\n   <div class="icymi-lead">';
if (source.split(anchor).length !== 2) throw new Error('ICYMI render anchor changed');
const insert = `  // Published articles replace generic matchup cards below the awards.
  const published=(getPublishedNotes(w)||"").trim();
  if(published){
   const blocks=published.replace(/\\r\\n/g,"\\n").split(/\\n{2,}/).map(x=>x.trim()).filter(Boolean);
   const title=blocks.shift()||weekLabel(w)+" ICYMI",intro=[],articles=[];
   let active=null;
   for(const block of blocks){
    const lines=block.split("\\n");
    if(lines.length>=2 && /\\b\\d{2,3}\\.\\d{2}\\b/.test(lines[1]) && lines[1].includes("|")){
     active={heading:lines[0],score:lines.slice(1).join("\\n"),paragraphs:[]};
     articles.push(active);
    }else if(active)active.paragraphs.push(block);
    else intro.push(block);
   }
   const outro=articles.length===games.length && articles.at(-1).paragraphs.length>3?articles.at(-1).paragraphs.pop():"";
   const paragraph=s=>\`<p>\${esc(s).replace(/\\n/g,"<br>")}</p>\`;
   root.innerHTML=\`
    <div class="icymi-lead"><div class="icymi-kicker">\${weekLabel(w).toUpperCase()} • ICYMI</div><h3>\${esc(title)}</h3>\${intro.map(paragraph).join("")}</div>
    <div class="icymi-awards">
     <div class="icymi-award"><span>High Score of the Week</span><strong>\${esc(scored[0].team.owner)} — \${scored[0].pts.toFixed(2)}</strong></div>
     <div class="icymi-award"><span>What The Fuck Am I Watching?</span><strong>\${esc(scored[scored.length-1].team.owner)} — \${scored[scored.length-1].pts.toFixed(2)}</strong></div>
     <div class="icymi-award"><span>Closest Sweat</span><strong>\${esc(closest.a.owner)} vs \${esc(closest.b.owner)} — \${Math.abs(closest.ap-closest.bp).toFixed(2)} pts</strong></div>
    </div>
    \${articles.map((a,i)=>{
     const pair=a.score.match(/\\b\\d{2,3}\\.\\d{2}\\b/g)||[];
     return \`<div class="icymi-game"><div class="icymi-game-head"><div><div class="icymi-game-rank">\${i===0?"🏈 GAME OF THE WEEK":\`MATCHUP \${i+1}\`} • \${esc(a.score)}</div><h3>\${esc(a.heading)}</h3></div><div class="icymi-score">\${pair.length>=2?\`\${pair[0]} – \${pair[1]}\`:""}</div></div>\${a.paragraphs.map(paragraph).join("")}</div>\`;
    }).join("")}
    \${outro?\`<div class="icymi-lead">\${paragraph(outro)}</div>\`:""}\`;
   status.querySelector("small").textContent=\`\${articles.length} published matchup write-ups with Sleeper scores and league history.\`;
   return;
  }
  root.innerHTML=\`
   <div class="icymi-lead">`;
const patched = source.replace(anchor, insert);
const begin = patched.indexOf('/* ===== ICYMI 2026');
const end = patched.indexOf('</script>', begin);
new Function(patched.slice(begin, end));
fs.writeFileSync(file, patched);
