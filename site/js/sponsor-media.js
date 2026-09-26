// Single source of truth for sponsor showcase content — used by sponsors.html and the
// in-app broadcast overlay. To add a banner/flyer/video later: drop the file in
// assets/sponsors/ (or assets/) and add one entry below. No other code changes needed.

export const SPONSOR_SLIDES = [
  { type: 'title' },
  { type: 'image', src: 'assets/sponsors/bpl-banner.jpg', label: 'BPL 8 · Teams & Sponsors' },
  { type: 'logo', src: 'assets/casorra.jpg', label: 'Title Sponsor', imgClass: 'logoCasorra' },
  { type: 'image', src: 'assets/sponsors/casorra-promo.jpg', label: 'Title Sponsor · CASORRA' },
  { type: 'logo', src: 'assets/chai-katta.png', label: 'Co-Title Sponsor' },
  { type: 'logo', src: 'assets/mvpm.jpg', label: 'Community Partner' },
  { type: 'video', src: 'assets/sponsors/casorra-intro.mp4', label: 'Title Sponsor · CASORRA' },
];
