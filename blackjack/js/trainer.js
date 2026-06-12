'use strict';

const ACT_STYLE = {
  Hit: ['H', '#31405a'],
  Stand: ['S', '#8a6d1d'],
  Double: ['D', '#1e7e4c'],
  Split: ['P', '#6b3fa0'],
  Surrender: ['R', '#a33636']
};

function chartRows(){
  const rows = [];
  rows.push({ key: 'H18', label: '18+', spec: { total: 18, soft: false, pair: 0 }, opts: { canD: true, canSp: false, canSu: true } });
  for(let t = 17; t >= 8; t--)
    rows.push({ key: 'H' + t, label: t === 8 ? '8 −' : 'Hard ' + t, spec: { total: t, soft: false, pair: 0 }, opts: { canD: true, canSp: false, canSu: true } });
  for(let t = 20; t >= 13; t--)
    rows.push({ key: 'S' + t, label: 'A,' + (t - 11), spec: { total: t, soft: true, pair: 0 }, opts: { canD: true, canSp: false, canSu: true } });
  const pairs = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  pairs.forEach(function(p){
    rows.push({
      key: 'P' + p,
      label: (p === 11 ? 'A,A' : p + ',' + p),
      spec: { total: p === 11 ? 12 : p * 2, soft: p === 11, pair: p },
      opts: { canD: true, canSp: true, canSu: true }
    });
  });
  return rows;
}

function buildGrid(mode, hi){
  const ups = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let h = '<table class="schart"><tr><th></th>';
  ups.forEach(function(u){ h += '<th>' + (u === 11 ? 'A' : u) + '</th>' });
  h += '</tr>';
  chartRows().forEach(function(row){
    h += '<tr><td class="rl">' + row.label + '</td>';
    ups.forEach(function(u){
      const key = row.key + '|' + u;
      const hl = hi === key ? ' hl' : '';
      if(mode === 'book'){
        const a = bookAction(row.spec, u, row.opts);
        const st = ACT_STYLE[a];
        h += '<td class="' + hl.trim() + '" style="background:' + st[1] + '" title="' + row.label + ' vs ' + (u === 11 ? 'A' : u) + ': ' + a + '">' + st[0] + '</td>';
      }else{
        const c = S.train.cells[key];
        if(!c || !c.n){
          h += '<td style="background:rgba(255,255,255,.04)" title="' + row.label + ' vs ' + (u === 11 ? 'A' : u) + ': not seen yet"></td>';
        }else{
          const acc = c.ok / c.n;
          const hue = Math.round(acc * 120);
          h += '<td style="background:hsl(' + hue + ',55%,32%)" title="' + row.label + ' vs ' + (u === 11 ? 'A' : u) + ': ' + c.ok + '/' + c.n + ' correct">' + Math.round(acc * 100) + '</td>';
        }
      }
    });
    h += '</tr>';
  });
  h += '</table>';
  return h;
}

window.renderChart = function(){
  let hi = null;
  if(S.phase === 'player' && S.hands[S.active] && S.dealer.length){
    hi = cellKey(S.hands[S.active], cardVal(S.dealer[0]));
  }
  let leg = '<div class="leg">';
  Object.keys(ACT_STYLE).forEach(function(a){
    leg += '<span style="background:' + ACT_STYLE[a][1] + '">' + ACT_STYLE[a][0] + ' ' + a + '</span>';
  });
  leg += '</div>';
  chartBody.innerHTML = leg + buildGrid('book', hi) +
    '<p style="font:400 11px var(--sans);color:#a99c78;margin:6px 0 0">Generated live for the current table rules (' +
    S.rules.decks + ' deck' + (S.rules.decks > 1 ? 's' : '') + ', ' +
    (S.rules.h17 ? 'H17' : 'S17') + ', ' +
    (S.rules.das ? 'DAS' : 'no DAS') + ', ' +
    (S.rules.surrender ? 'surrender' : 'no surrender') + ', ' +
    (S.rules.peek ? 'peek' : 'no-peek') + ').' +
    (hi ? ' Your current hand is outlined.' : '') + '</p>';
};

function trueCount(){
  const dr = Math.max(0.5, S.shoe.length / 52);
  return S.runCount / dr;
}

function deviationSays(h, up){
  if(!S.opts.deviations) return null;
  const v = handValue(h.cards);
  if(v.soft) return null;
  if(h.cards.length === 2 && cardVal(h.cards[0]) === cardVal(h.cards[1])){
    const p = cardVal(h.cards[0]);
    if(p !== 5 && p !== 10) return null;
  }
  const t = v.total, tc = trueCount();
  const canD = h.cards.length === 2 && S.bankroll >= h.bet && (!h.fromSplit || S.rules.das);
  if(t === 16 && up === 10 && tc >= 0) return 'Stand';
  if(t === 15 && up === 10 && tc >= 4) return 'Stand';
  if(t === 12 && up === 3 && tc >= 2) return 'Stand';
  if(t === 12 && up === 2 && tc >= 3) return 'Stand';
  if(canD){
    if(t === 11 && up === 11 && tc >= 1) return 'Double';
    if(t === 10 && up >= 10 && tc >= 4) return 'Double';
    if(t === 9 && up === 2 && tc >= 1) return 'Double';
    if(t === 9 && up === 7 && tc >= 3) return 'Double';
  }
  return null;
}
window.deviationSays = deviationSays;
window.trueCount = trueCount;

const ovQuiz = document.createElement('div');
ovQuiz.className = 'overlay';
ovQuiz.id = 'ovQuiz';
ovQuiz.innerHTML = '<div class="panel"><h3 id="quizT">Count check</h3><div id="quizCard" style="display:flex;justify-content:center;min-height:0"></div><p id="quizQ"></p><div class="pillrow" id="quizOpts"></div></div>';
app.appendChild(ovQuiz);
const quizT = $id('quizT'), quizQ = $id('quizQ'), quizOpts = $id('quizOpts'), quizCard = $id('quizCard');

function askCount(actual, title, question, onDone){
  quizT.textContent = title;
  quizQ.textContent = question;
  quizCard.innerHTML = '';
  const opts = [actual];
  while(opts.length < 3){
    const d = actual + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? -1 : 1);
    if(opts.indexOf(d) < 0) opts.push(d);
  }
  opts.sort(function(a, b){ return a - b });
  quizOpts.innerHTML = '';
  opts.forEach(function(o){
    const b = document.createElement('button');
    b.className = 'pill';
    b.textContent = (o > 0 ? '+' : '') + o;
    b.onclick = function(){
      const right = o === actual;
      S.quiz.n++;
      if(right) S.quiz.ok++;
      saveQuiz();
      toast(right ? 'Correct — count is ' + (actual > 0 ? '+' : '') + actual : 'It was ' + (actual > 0 ? '+' : '') + actual);
      if(right){ SFX.win(2); if(window.checkAwards) checkAwards('quiz', { passes: S.quiz.ok }) }
      else SFX.push();
      ovQuiz.classList.remove('show');
      if(onDone) onDone(right);
    };
    quizOpts.appendChild(b);
  });
  const skip = document.createElement('button');
  skip.className = 'pill';
  skip.textContent = 'Skip';
  skip.onclick = function(){ ovQuiz.classList.remove('show'); if(onDone) onDone(null) };
  quizOpts.appendChild(skip);
  ovQuiz.classList.add('show');
}

let quizCountdown = 0;
window.maybeCountQuiz = function(){
  if(!S.opts.quiz || S.mode !== 'free' || S.phase !== 'betting' || busy) return;
  if(ovLoan.classList.contains('show')) return;
  const dealt = S.rules.decks * 52 - S.shoe.length;
  if(dealt < 15) return;
  quizCountdown++;
  if(quizCountdown < 3) return;
  quizCountdown = 0;
  if(S.quiz.n % 2 === 1 && S.rules.decks > 1){
    askCount(Math.round(trueCount()), 'Count check', 'What is the true count right now (running count ÷ decks left, rounded)?');
  }else{
    askCount(S.runCount, 'Count check', 'What is the Hi-Lo running count right now?');
  }
};

let drillPace = 600;
function startDrill(){
  if(S.phase !== 'betting' || busy){ toast('Finish the hand first'); return }
  const deck = [];
  SUITS.forEach(function(s){ RANKS.forEach(function(r){ deck.push({ r: r, s: s }) }) });
  for(let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  const cards = deck.slice(0, 20);
  let rc = 0;
  cards.forEach(function(c){
    const v = cardVal(c);
    if(v >= 2 && v <= 6) rc++;
    else if(v >= 10) rc--;
  });
  ovTrainer.classList.remove('show');
  quizT.textContent = 'Speed drill';
  quizQ.textContent = 'Keep the running count…';
  quizOpts.innerHTML = '';
  ovQuiz.classList.add('show');
  let i = 0;
  (function next(){
    if(i >= cards.length){
      quizCard.innerHTML = '';
      askCount(rc, 'Speed drill', '20 cards flew by — what is the running count?');
      return;
    }
    quizCard.innerHTML = '';
    quizCard.appendChild(buildCard(cards[i], true));
    quizQ.textContent = 'Card ' + (i + 1) + ' of ' + cards.length;
    i++;
    setTimeout(next, drillPace);
  })();
}

window.trainerExtras = function(){
  const ex = $id('trainExtra');
  if(!ex) return;
  const qacc = S.quiz.n ? Math.round(100 * S.quiz.ok / S.quiz.n) : 0;
  ex.innerHTML =
    '<div class="set-sec" style="margin-top:12px"><div class="set-label">Card counting</div><div class="pillrow">' +
    '<button class="pill' + (S.opts.quiz ? ' sel' : '') + '" data-train="quiz">Count quizzes: ' + (S.opts.quiz ? 'on' : 'off') + '</button>' +
    '<button class="pill' + (S.opts.deviations ? ' sel' : '') + '" data-train="dev">Count deviations: ' + (S.opts.deviations ? 'on' : 'off') + '</button>' +
    '</div><p style="font:400 11px var(--sans);color:#a99c78;margin:7px 0 0">Quizzes pop up every few rounds. Deviations teach the Illustrious-18 index plays — the coach and hint grade against them when the count says so. Quiz record: ' +
    S.quiz.ok + '/' + S.quiz.n + (S.quiz.n ? ' (' + qacc + '%)' : '') + '</p></div>' +
    '<div class="set-sec"><div class="set-label">Speed drill — 20 cards, keep the count</div><div class="pillrow">' +
    '<button class="pill' + (drillPace === 900 ? ' sel' : '') + '" data-train="pace-900">Slow</button>' +
    '<button class="pill' + (drillPace === 600 ? ' sel' : '') + '" data-train="pace-600">Normal</button>' +
    '<button class="pill' + (drillPace === 350 ? ' sel' : '') + '" data-train="pace-350">Casino speed</button>' +
    '<button class="pill" data-train="drill" style="border-color:rgba(212,175,55,.85)">Start drill</button>' +
    '</div></div><div id="simSec"></div>';
  if(window.simExtras) window.simExtras();
};

trainBody.addEventListener('click', function(e){
  const b = e.target.closest('[data-train]');
  if(!b) return;
  const k = b.dataset.train;
  if(k === 'quiz'){ S.opts.quiz = !S.opts.quiz; saveOpts(); window.trainerExtras() }
  else if(k === 'dev'){ S.opts.deviations = !S.opts.deviations; saveOpts(); window.trainerExtras() }
  else if(k.indexOf('pace-') === 0){ drillPace = +k.slice(5); window.trainerExtras() }
  else if(k === 'drill') startDrill();
  else if(window.simClick) window.simClick(k);
});

window.renderTrainer = function(){
  const acc = S.train.n ? Math.round(100 * S.train.ok / S.train.n) : 0;
  let h = '<div class="sgrid" style="margin-bottom:10px">' +
    '<span>Decisions graded</span><b>' + S.train.n + '</b>' +
    '<span>Played by the book</span><b>' + S.train.ok + '</b>' +
    '<span>Accuracy</span><b class="' + (acc >= 95 ? 'pos' : acc >= 80 ? '' : 'neg') + '">' + acc + '%</b>' +
    '</div>' +
    '<div class="set-label">Accuracy heatmap — green cells are dialed in, red cells leak money</div>' +
    buildGrid('acc', null) +
    '<div id="trainExtra"></div>';
  trainBody.innerHTML = h;
  if(window.trainerExtras) window.trainerExtras();
};
