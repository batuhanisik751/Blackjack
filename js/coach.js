'use strict';

function cellKey(h, up){
  const v = handValue(h.cards);
  const canSp = h.cards.length === 2 && S.hands.length === 1 && cardVal(h.cards[0]) === cardVal(h.cards[1]) && S.bankroll >= h.bet;
  let row;
  if(canSp) row = 'P' + cardVal(h.cards[0]);
  else if(v.soft) row = 'S' + Math.min(20, Math.max(13, v.total));
  else row = 'H' + Math.min(18, Math.max(8, v.total));
  return row + '|' + up;
}

function coachNote(action){
  if(S.phase !== 'player' || !S.dealer.length) return;
  const h = S.hands[S.active];
  const up = cardVal(S.dealer[0]);
  const dev = window.deviationSays ? window.deviationSays(h, up) : null;
  const book = dev || bookSays(h, up);
  const key = cellKey(h, up);
  const c = S.train.cells[key] || (S.train.cells[key] = { n: 0, ok: 0 });
  c.n++; S.train.n++;
  if(action === book){
    c.ok++; S.train.ok++;
    if(window.checkAwards) checkAwards('coach', {});
    if(S.opts.coach) msg('Coach: ' + action.toLowerCase() + ' is the book play');
  }else if(S.opts.coach){
    const tcNote = dev ? ' (count deviation at TC ' + (window.trueCount() >= 0 ? '+' : '') + (Math.round(window.trueCount() * 10) / 10) + ')' : '';
    toast('Coach: the book says ' + book.toUpperCase() + tcNote + ' — you chose ' + action.toLowerCase());
    SFX.push();
  }
  saveTrain();
}

function coachInsurance(took){
  if(!S.opts.coach) return;
  const hot = S.opts.deviations && window.trueCount && window.trueCount() >= 3;
  if(took && !hot) toast('Coach: the book never takes insurance');
  else if(took && hot) toast('Coach: sharp — insurance is right at TC +3 and above');
  else if(!took && hot) toast('Coach: with TC +3 or better, the count says take insurance');
}

function toggleCoach(){
  S.opts.coach = !S.opts.coach;
  saveOpts();
  btnCoach.classList.toggle('on', S.opts.coach);
  toast(S.opts.coach ? 'Coach on — every move gets graded against basic strategy' : 'Coach off');
}
