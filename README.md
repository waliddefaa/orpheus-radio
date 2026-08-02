# Orpheus Radio

A warm, installable internet radio built as a static site for GitHub Pages.

## Features

- Sixteen live HTTPS stations across Moroccan, lo-fi/study, jazz, blues, hip-hop, ambient and more
- Live track metadata for supported SomaFM broadcasters, with honest fallbacks elsewhere
- Search, genre filtering, and a dedicated favorites view
- Persistent favorites, volume, last station, and recently played history
- Shareable station URLs such as `?station=fipjazz`
- Browser and lock-screen media controls through the Media Session API
- 15, 30, 45, and 60 minute sleep timers
- Random discovery, retry controls, connection timeouts, and real signal states
- Animated analog tuner with explicitly labeled virtual frequencies
- Installable PWA support with offline access to the interface
- Responsive desktop/mobile layout and keyboard controls

## Keyboard controls

- `Space`: play or pause
- `←` / `→`: previous or next station
- `M`: mute or restore volume

No build step is required. Serve the repository over HTTP(S) to test service-worker and install behavior. Live audio always requires an internet connection.
