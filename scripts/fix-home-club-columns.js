const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const path='index.html';
const before='29fdad0c1567ddfb328d9e68a23482dfd98aa5f5';
const after='8f201ac3c7f1117dc858ef517f699bcb358e893f';
const sha=()=>execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim();
if(sha()===after)process.exit(0);
if(sha()!==before)throw new Error('Unexpected homepage version; no file changed');
const changes=[
  ['.home-feature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}',
   '.home-feature-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:start;gap:14px}'],
  ['.home-feature-card{background:var(--panel-2);border:1px solid var(--line);border-radius:18px;padding:18px}',
   '.home-feature-card{min-width:0;background:var(--panel-2);border:1px solid var(--line);border-radius:18px;padding:18px}'],
  ['.home-club-row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line)}',
   '.home-club-row{display:grid;grid-template-columns:minmax(0,1fr);gap:3px;padding:9px 0;border-bottom:1px solid var(--line)}'],
  ['.home-club-row strong{white-space:nowrap}\n@media(max-width:800px){.home-feature-grid{grid-template-columns:1fr}.home-champion-name{font-size:34px}}',
   '.home-club-row strong{white-space:normal;overflow-wrap:anywhere}\n@media(max-width:1480px){.home-feature-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n@media(max-width:1000px){.home-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:800px){.home-feature-grid{grid-template-columns:1fr}.home-champion-name{font-size:34px}}']
];
let page=fs.readFileSync(path,'utf8');
for(const [from,to] of changes){
  if(page.split(from).length!==2)throw new Error('Expected CSS section not unique');
  page=page.replace(from,to);
}
fs.writeFileSync(path,page);
if(sha()!==after)throw new Error('Generated homepage differs from verified fix');
