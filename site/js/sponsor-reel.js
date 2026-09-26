// Shared sponsor-slide reel engine — powers both sponsors.html (standalone committee
// showcase) and the in-app broadcast overlay (display.html/admin.html/captain.html).
// Renders into rootEl, autoplays, loops forever.

const DURATIONS = { title: 5000, logo: 6000, image: 7000 };

export function createSponsorReel(rootEl, slides, opts = {}) {
  const includeVideo = opts.includeVideo !== false;
  const activeSlides = slides.filter((s) => includeVideo || s.type !== 'video');

  let index = 0;
  let running = false;
  let paused = false;
  let timer = null;
  let rafId = null;
  let videoEl = null;
  let progressStart = 0;
  let progressDuration = 0;
  let pausedAt = 0;
  let labelEl, stageEl, barEl;

  // stop() clears rootEl entirely (see below), so start() must remount this skeleton fresh
  // every time — caching these elements just once at creation time left them detached (and
  // invisible) on every restart after the first, which is what caused the "blank black
  // screen the 2nd time the overlay was shown" bug.
  function mount() {
    rootEl.innerHTML = `
      <div class="sponsorReelLabel"></div>
      <div class="sponsorReelStage"></div>
      <div class="sponsorReelProgress"><div class="sponsorReelBar"></div></div>
    `;
    labelEl = rootEl.querySelector('.sponsorReelLabel');
    stageEl = rootEl.querySelector('.sponsorReelStage');
    barEl = rootEl.querySelector('.sponsorReelBar');
  }

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function tickProgress() {
    if (!running) return;
    if (!paused && progressDuration) {
      const elapsed = Date.now() - progressStart;
      barEl.style.width = `${Math.min(100, (elapsed / progressDuration) * 100)}%`;
    }
    rafId = requestAnimationFrame(tickProgress);
  }

  function startProgress(duration) {
    progressStart = Date.now();
    progressDuration = duration;
    barEl.style.width = '0%';
    if (!rafId) rafId = requestAnimationFrame(tickProgress);
  }

  function attemptPlay(video) {
    video.muted = false;
    video.play().catch(() => {
      // Autoplay-with-sound was blocked (no prior user gesture on this document) — fall
      // back to muted so the reel still advances instead of stalling on this slide forever.
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  function renderSlide(slide) {
    clearTimer();
    videoEl = null;
    labelEl.textContent = slide.label || '';

    if (slide.type === 'title') {
      stageEl.innerHTML = `<div class="sponsorReelTitle">🏏 BPL 8<span>Auction 2026</span></div>`;
      startProgress(DURATIONS.title);
      timer = setTimeout(advance, DURATIONS.title);
    } else if (slide.type === 'image') {
      stageEl.innerHTML = `
        <div class="sponsorReelImageWrap">
          <div class="sponsorReelImageBg" style="background-image:url('${slide.src}')"></div>
          <img class="sponsorReelImageFg" src="${slide.src}" alt="">
        </div>`;
      startProgress(DURATIONS.image);
      timer = setTimeout(advance, DURATIONS.image);
    } else if (slide.type === 'logo') {
      stageEl.innerHTML = `<div class="sponsorReelLogoBig"><img src="${slide.src}" alt="" class="${slide.imgClass || ''}"></div>`;
      startProgress(DURATIONS.logo);
      timer = setTimeout(advance, DURATIONS.logo);
    } else if (slide.type === 'video') {
      stageEl.innerHTML = `<video class="sponsorReelVideo" src="${slide.src}" playsinline></video>`;
      videoEl = stageEl.querySelector('video');
      barEl.style.width = '0%';
      progressDuration = 0; // driven by timeupdate below, not the rAF timer
      videoEl.addEventListener('ended', advance);
      videoEl.addEventListener('error', advance);
      videoEl.addEventListener('timeupdate', () => {
        if (videoEl.duration) barEl.style.width = `${Math.min(100, (videoEl.currentTime / videoEl.duration) * 100)}%`;
      });
      attemptPlay(videoEl);
    }
  }

  function advance() {
    if (!running || !activeSlides.length) return;
    index = (index + 1) % activeSlides.length;
    renderSlide(activeSlides[index]);
  }

  function start() {
    if (!activeSlides.length) return;
    mount();
    running = true;
    paused = false;
    index = 0;
    renderSlide(activeSlides[0]);
  }

  function stop() {
    running = false;
    clearTimer();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (videoEl) videoEl.pause();
    videoEl = null;
    rootEl.innerHTML = '';
  }

  function next() { if (running) advance(); }
  function prev() {
    if (!running || !activeSlides.length) return;
    index = (index - 1 + activeSlides.length) % activeSlides.length;
    renderSlide(activeSlides[index]);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (videoEl) {
      if (paused) videoEl.pause();
      else videoEl.play().catch(() => {});
      return;
    }
    if (paused) {
      pausedAt = Date.now();
      clearTimer();
    } else {
      const pausedFor = Date.now() - pausedAt;
      progressStart += pausedFor; // exclude the paused span from elapsed time
      const remaining = Math.max(300, progressDuration - (Date.now() - progressStart));
      timer = setTimeout(advance, remaining);
    }
  }

  return { start, stop, next, prev, togglePause };
}
