// Single source of truth for sponsor showcase content — used by sponsors.html and the
// in-app broadcast overlay. To add a banner/flyer/video later: drop the file in
// assets/sponsors/ (or assets/) and add one entry below. No other code changes needed.

export const SPONSOR_SLIDES = [
  { type: 'title' },
  { type: 'image', src: 'assets/sponsors/bpl-banner.jpg', label: 'BPL 8 · Teams & Sponsors' },
  {
    type: 'logos',
    items: [
      { src: 'assets/casorra.jpg', label: 'Title Sponsor' },
      { src: 'assets/chai-katta.png', label: 'Co-Title Sponsor' },
      { src: 'assets/mvpm.jpg', label: 'Community Partner' },
    ],
  },
  { type: 'video', src: 'assets/sponsors/casorra-intro.mp4', label: 'Title Sponsor · CASORRA' },
];
