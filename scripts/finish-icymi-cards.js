const fs=require('node:fs'),cp=require('node:child_process');
const file='index.html',expected='8bdb1a9f228d8f78a80a2ee7cef895d40896f090';
if(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim()!==expected)throw Error('Homepage changed; stop');
const source=fs.readFileSync(file,'utf8');
const anchor='  const published=(getPublishedNotes(w)||"").trim();';
if(source.split(anchor).length!==2)throw Error('ICYMI insertion point changed');
const insert=`  // Structured commissioner stories live in the existing cards below awards.
  const story=window.CPBFFL_SHARED_DATA?.icymi?.[String(w)]||{};
  const storyGames=story.games&&typeof story.games==="object"?Object.values(story.games):[];
  if(storyGames.length){
   const intro=(story.notes||"").split(/\\n{2,}/).map(x=>x.trim()).filter(Boolean);
   const title=intro.shift()||weekLabel(w)+" ICYMI";
   const paragraph=s=>\`<p>\${esc(s).replace(/\\n/g,"<br>")}</p>\`;
   root.innerHTML=\`
    <div class="icymi-lead"><div class="icymi-kicker">\${weekLabel(w).toUpperCase()} • ICYMI</div><h3>\${esc(title)}</h3>\${intro.length?paragraph(intro[0]):""}</div>
    <div class="icymi-awards">
     <div class="icymi-award"><span>High Score of the Week</span><strong>\${esc(scored[0].team.owner)} — \${scored[0].pts.toFixed(2)}</strong></div>
     <div class="icymi-award"><span>What The Fuck Am I Watching?</span><strong>\${esc(scored[scored.length-1].team.owner)} — \${scored[scored.length-1].pts.toFixed(2)}</strong></div>
     <div class="icymi-award"><span>Closest Sweat</span><strong>\${esc(closest.a.owner)} vs \${esc(closest.b.owner)} — \${Math.abs(closest.ap-closest.bp).toFixed(2)} pts</strong></div>
    </div>
    \${storyGames.map((g,i)=>{
     const blocks=String(g.body||"").split(/\\n{2,}/).map(x=>x.trim()).filter(Boolean);
     const score=blocks.shift()||"";
     const pair=score.match(/\\b\\d{2,3}\\.\\d{2}\\b/g)||[];
     return \`<div class="icymi-game"><div class="icymi-game-head"><div><div class="icymi-game-rank">\${i===0?"🏈 GAME OF THE WEEK":\`MATCHUP \${i+1}\`} • \${esc(score)}</div><h3>\${esc(g.title||"Matchup")}</h3></div><div class="icymi-score">\${pair.length>=2?\`\${pair[0]} – \${pair[1]}\`:""}</div></div>\${blocks.map(paragraph).join("")}</div>\`;
    }).join("")}
    \${intro.slice(1).map(x=>\`<div class="icymi-lead">\${paragraph(x)}</div>\`).join("")}\`;
   status.querySelector("small").textContent=\`\${storyGames.length} published matchup write-ups with Sleeper scores and league history.\`;
   return;
  }
`+anchor;
const patched=source.replace(anchor,insert);
const p=patched.indexOf('/* ===== ICYMI 2026'),e=patched.indexOf('</script>',p);
new Function(patched.slice(p,e));
fs.writeFileSync(file,patched);
