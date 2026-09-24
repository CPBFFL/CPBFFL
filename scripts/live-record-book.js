/* CPBFFL record book: compare completed Sleeper weeks with the ESPN baseline. */
(function(){
  'use strict';
  const API='https://api.sleeper.app/v1';
  const FIRST_LEAGUE='1387828207922724864';
  const COMMISSIONER='726674372642795520';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const get=async path=>{const r=await fetch(API+path,{cache:'no-store'});if(!r.ok)throw Error('Sleeper '+r.status);return r.json()};
  const top=(rows,ascending=false)=>[...rows].filter(x=>Number.isFinite(Number(x.points)))
    .sort((a,b)=>(ascending?Number(a.points)-Number(b.points):Number(b.points)-Number(a.points)) || Number(a.year)-Number(b.year) || Number(a.week||0)-Number(b.week||0))
    .slice(0,10);
  window.CPBFFL_RECORDS_TOP10=top;

  function list(panel,rows,main,minor){
    const ol=panel?.querySelector('ol');if(!ol)return;
    ol.innerHTML=rows.map(x=>'<li><strong>'+esc(main(x))+'</strong><small>'+esc(minor(x))+'</small></li>').join('');
  }
  function card(label,subject,detail){
    return '<div class="history-panel"><h3>'+esc(label)+'</h3><strong>'+esc(subject)+'</strong><p>'+esc(detail)+'</p></div>';
  }
  function ownerName(user){return user?.metadata?.team_name || user?.metadata?.team_name_update || user?.display_name || user?.username || 'Unknown team'}
  function score(row){return Number(row.custom_points??row.points)}

  async function seasonLeagueIds(){
    const first=await get('/league/'+FIRST_LEAGUE);
    if(String(first.season)!=='2026')throw Error('Unexpected Sleeper anchor season');
    const leagues=[first];
    for(let year=2027;year<=new Date().getFullYear();year++){
      const candidates=await get('/user/'+COMMISSIONER+'/leagues/nfl/'+year);
      const next=(candidates||[]).find(l=>String(l.previous_league_id)===String(leagues.at(-1).league_id));
      if(!next)break; // A new season has not been renewed under this league yet.
      leagues.push(next);
    }
    return leagues;
  }
  async function readSeason(league){
    const id=league.league_id,year=Number(league.season);
    const [users,rosters]=await Promise.all([get('/league/'+id+'/users'),get('/league/'+id+'/rosters')]);
    const names=new Map((users||[]).map(u=>[String(u.user_id),ownerName(u)]));
    const teams=new Map((rosters||[]).map(r=>[Number(r.roster_id),names.get(String(r.owner_id))||'Roster '+r.roster_id]));
    const teamSettings=new Map((rosters||[]).map(r=>[Number(r.roster_id),r.settings||{}]));
    const played=Math.max(0,...(rosters||[]).map(r=>Number(r.settings?.wins||0)+Number(r.settings?.losses||0)+Number(r.settings?.ties||0)));
    const leagueWeek=Number(league.settings?.leg||0)-1;
    const complete=league.status==='complete';
    const through=Math.min(18,Math.max(played,leagueWeek));
    const weeks=await Promise.all(Array.from({length:through},(_,i)=>get('/league/'+id+'/matchups/'+(i+1))));
    const events=[],players=[],benches=[],seasonTotals=new Map();
    weeks.forEach((rows,i)=>{
      const week=i+1,groups=new Map();
      for(const row of rows||[]){
        if(row.matchup_id==null || !Number.isFinite(score(row)))continue;
        const key=String(row.matchup_id);if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(row);
      }
      for(const pair of groups.values()){
        if(pair.length!==2)continue; // Excludes byes and unpaired unfinished games.
        const [a,b]=pair;
        for(const [side,opponent] of [[a,b],[b,a]]){
          const points=score(side),other=score(opponent),rid=Number(side.roster_id);
          const e={year,week,rosterId:rid,team:teams.get(rid)||'Roster '+rid,points,opponent:teams.get(Number(opponent.roster_id))||'Unknown opponent',opponentPoints:other,
            result:points>other?'W':points<other?'L':'T',margin:Math.abs(points-other)};
          events.push(e);
          if(week<=Number(league.settings?.playoff_week_start||15)-1){
            const total=seasonTotals.get(rid)||{pointsFor:0,pointsAgainst:0,games:0};
            total.pointsFor+=points;total.pointsAgainst+=other;total.games++;
            seasonTotals.set(rid,total);
          }
        }
      }
      for(const row of rows||[]){
        if(!events.some(e=>e.year===year&&e.week===week&&e.rosterId===Number(row.roster_id)))continue;
        const starters=new Set((row.starters||[]).map(String));
        for(const [pid,raw] of Object.entries(row.players_points||{})){
          const points=Number(raw);if(!Number.isFinite(points)||points<=0)continue;
          const p={year,week,rosterId:Number(row.roster_id),team:teams.get(Number(row.roster_id))||'Roster '+row.roster_id,playerId:pid,points};
          if(starters.has(pid))players.push(p);
          else if((row.players||[]).some(id=>String(id)===pid))benches.push(p);
        }
      }
    });
    const regularWeeks=Math.max(1,Number(league.settings?.playoff_week_start||15)-1);
    const seasonRows=complete && through>=regularWeeks ? [...seasonTotals].filter(([,t])=>t.games===regularWeeks)
      .map(([rid,t])=>({year,teamName:teams.get(rid),...t,rosterId:rid,
        wins:Number(teamSettings.get(rid)?.wins||0),losses:Number(teamSettings.get(rid)?.losses||0),ties:Number(teamSettings.get(rid)?.ties||0)})) : [];
    return {events,players,benches,seasonRows};
  }
  function update(baseline,live){
    const root=document.getElementById('historicalRecordBoards');
    const grid=root?.querySelector('.history-record-grid');
    if(!grid)return;
    const panels=[...grid.children];
    // Seasonal leaderboards count completed seasons only, never a partial-season pace.
    const seasons=Object.entries(baseline.seasons||{}).flatMap(([year,teams])=>teams.map(t=>({...t,year:Number(year)})));
    const totals=[...seasons,...live.seasonRows];
    const pf=top(totals.map(t=>({...t,points:Number(t.pointsFor)})));
    const pa=top([...seasons,...live.seasonRows.filter(t=>Number.isFinite(Number(t.pointsAgainst)))].map(t=>({...t,points:Number(t.pointsAgainst)})));
    list(panels[0],pf,t=>t.teamName+' — '+money(t.points)+' PF',t=>t.year+' • completed regular season');
    list(panels[1],pa,t=>t.teamName+' — '+money(t.points)+' PA',t=>t.year+' • completed regular season');
    const played=t=>Number(t.games||Number(t.wins||0)+Number(t.losses||0)+Number(t.ties||0));
    list(panels[2],top(totals.map(t=>({...t,points:Number(t.pointsFor)/played(t)}))),t=>t.teamName+' — '+money(t.points)+' PPG',t=>t.year+' • completed regular season');
    list(panels[3],top(totals.filter(t=>t.wins!==undefined).map(t=>({...t,points:(Number(t.wins)+Number(t.ties||0)/2)/played(t)}))),t=>t.teamName+' — '+(t.points*100).toFixed(1)+'%',t=>t.year+' • completed regular season');
    const weekly=top([
      ...(baseline.weeklyTeamTop10||[]),...live.events
    ]);
    list(panels[4],weekly,t=>t.team+' — '+money(t.points),t=>t.year+' • Week '+t.week);
    const individuals=top([...(baseline.individualStarterTop10||[]),...live.players]);
    list(panels[5],individuals,t=>(t.player||t.playerName||'Player '+t.playerId)+' — '+money(t.points)+' • '+t.team,t=>t.year+' • Week '+t.week);

    const shame=document.querySelector('#historicalRecordBoards > .history-record-grid:last-of-type');
    if(shame){
      const initial=Object.fromEntries((baseline.hallOfShame||[]).map(x=>[x.label,x]));
      const losses=live.events.filter(e=>e.result==='L'),wins=live.events.filter(e=>e.result==='W');
      const biggestLoss=top(losses)[0],worstMargin=top(wins.map(e=>({...e,points:e.margin})))[0];
      const closest=top(wins.map(e=>({...e,points:e.margin})),true)[0];
      const benched=top(live.benches)[0];
      const minWin=top(wins,true)[0];
      const formatEvent=e=>e.year+' Week '+e.week+' • '+e.team+' vs '+e.opponent;
      const historicLoss=initial['Highest score in a loss'];
      const historicMargin=initial['Biggest ass-kicking'];
      const historicClose=initial['Closest finish'];
      const historicBench=initial['Highest score left on the bench'];
      const loss=biggestLoss&&biggestLoss.points>173.18?card('Highest score in a loss',biggestLoss.team,money(biggestLoss.points)+' points • '+formatEvent(biggestLoss)):card(historicLoss.label,historicLoss.subject,historicLoss.detail);
      const margin=worstMargin&&worstMargin.margin>138.64?card('Biggest ass-kicking',worstMargin.team,'Won by '+money(worstMargin.margin)+' • '+formatEvent(worstMargin)):card(historicMargin.label,historicMargin.subject,historicMargin.detail);
      const narrow=closest&&closest.margin<0.08?card('Closest finish',closest.team,'Won by '+money(closest.margin)+' • '+formatEvent(closest)):card(historicClose.label,historicClose.subject,historicClose.detail);
      const bench=benched&&benched.points>57.3?card('Highest score left on the bench',benched.playerName||'Player '+benched.playerId,money(benched.points)+' points • '+benched.team+' • '+benched.year+' Week '+benched.week):card(historicBench.label,historicBench.subject,historicBench.detail);
      shame.innerHTML=loss+margin+narrow+bench+
        (minWin?card('Lowest-scoring win • Sleeper era',minWin.team,money(minWin.points)+' points • '+formatEvent(minWin)):'');
      const trailing=shame.nextElementSibling;
      if(trailing)trailing.innerHTML='ESPN historical audit still pending for lowest-scoring victory and complete top-ten shame lists. Sleeper results from 2026 onward recalculate whenever this page opens.';
      let extras=document.getElementById('sleeperShameBoards');
      if(!extras){extras=document.createElement('div');extras.id='sleeperShameBoards';extras.className='history-record-grid';trailing?.after(extras)}
      extras.innerHTML='<div class="history-panel"><h3>Top 10 • Painful losses (2026 onward)</h3><ol>'+top(losses).map(e=>'<li><strong>'+esc(e.team)+' — '+money(e.points)+'</strong><small>'+esc(formatEvent(e))+'</small></li>').join('')+'</ol></div>'+
        '<div class="history-panel"><h3>Top 10 • Bench disasters (2026 onward)</h3><ol>'+top(live.benches).map(e=>'<li><strong>'+esc(e.playerName||'Player '+e.playerId)+' — '+money(e.points)+'</strong><small>'+esc(e.team+' • '+e.year+' Week '+e.week)+'</small></li>').join('')+'</ol></div>';
    }
    root.dataset.liveRecords='updated';
  }
  async function start(){
    const baseline=await fetch('./cpbffl-history.json',{cache:'no-store'}).then(r=>r.json());
    const leagues=await seasonLeagueIds();
    const results=await Promise.all(leagues.map(readSeason));
    const live={events:results.flatMap(x=>x.events),players:results.flatMap(x=>x.players),benches:results.flatMap(x=>x.benches),seasonRows:results.flatMap(x=>x.seasonRows)};
    // Sleeper's full player map is requested only if somebody approaches a leaderboard.
    const ids=[...new Set([...top(live.players),...top(live.benches)].map(x=>x.playerId))];
    if(ids.length){
      try{
        const names=await get('/players/nfl'),wanted=new Set(ids);
        for(const p of [...live.players,...live.benches])if(wanted.has(p.playerId)){
          const player=names[p.playerId]||{};
          p.playerName=player.full_name||[player.first_name,player.last_name].filter(Boolean).join(' ')||'Player '+p.playerId;
        }
      }catch(error){console.warn('Sleeper player names unavailable; scores can still refresh.',error)}
    }
    const root=document.getElementById('historicalRecordBoards');
    for(let retry=0;retry<20&&!root?.querySelector('.history-record-grid');retry++)await new Promise(resolve=>setTimeout(resolve,100));
    update(baseline,live);
  }
  let started=false;
  function refresh(){
   if(location.hash!=='#records'||started)return;
   started=true;
   start().catch(error=>{
    console.warn('Sleeper record sync unavailable; historical baseline remains visible.',error);
    const root=document.getElementById('historicalRecordBoards');
    if(root?.querySelector('.history-record-grid'))root.insertAdjacentHTML('beforeend','<p>Live Sleeper records could not refresh. Historical records remain visible; reload to retry.</p>');
   });
  }
  window.addEventListener('hashchange',refresh);
  refresh();
})();
