// One-time animated sponsor intro splash for the "show" screens (display.html, captain.html).
// Plays once per browser tab session (sessionStorage), so refreshing mid-auction doesn't
// force a captain to rewatch it. Tap/click anywhere skips immediately.
const SEEN_KEY = 'bpl8_intro_seen';

export function maybePlaySponsorIntro(onDone) {
  if (sessionStorage.getItem(SEEN_KEY)) {
    onDone();
    return;
  }
  playSponsorIntro(onDone);
}

function playSponsorIntro(onDone) {
  sessionStorage.setItem(SEEN_KEY, '1');

  const root = document.createElement('div');
  root.className = 'sponsorIntro';
  root.innerHTML = `
    <div class="sponsorIntroSlide active">
      <div class="sponsorIntroWordmark">🏏 BPL 8<span>Auction 2026</span></div>
    </div>
    <div class="sponsorIntroSlide">
      <div class="sponsorIntroLabel">BPL 8 · Teams &amp; Sponsors</div>
      <img src="assets/sponsors/bpl-banner.jpg" alt="BPL 8 Banner">
    </div>
    <div class="sponsorIntroSlide">
      <div class="sponsorIntroLabel">Title Sponsor</div>
      <div class="sponsorIntroLogoChip"><img src="assets/casorra.jpg" alt="Casorra" class="logoCasorra"></div>
    </div>
    <div class="sponsorIntroSlide">
      <div class="sponsorIntroLabel">Co-Title Sponsor</div>
      <div class="sponsorIntroLogoChip"><img src="assets/chai-katta.png" alt="Chai Katta"></div>
    </div>
    <div class="sponsorIntroSlide">
      <div class="sponsorIntroLabel">Community Partner</div>
      <div class="sponsorIntroLogoChip"><img src="assets/mvpm.jpg" alt="MVPM"></div>
    </div>
    <div class="sponsorIntroSkip">Tap to skip</div>
  `;
  document.body.appendChild(root);

  const slides = [...root.querySelectorAll('.sponsorIntroSlide')];
  let i = 0;
  let finished = false;
  const timers = [];

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    root.classList.add('sponsorIntroOut');
    setTimeout(() => {
      root.remove();
      onDone();
    }, 400);
  }

  function next() {
    slides[i].classList.remove('active');
    i += 1;
    if (i >= slides.length) {
      finish();
      return;
    }
    slides[i].classList.add('active');
  }

  timers.push(setTimeout(next, 1200), setTimeout(next, 2350), setTimeout(next, 3500), setTimeout(next, 4650), setTimeout(next, 5800));
  root.addEventListener('click', finish);
}
