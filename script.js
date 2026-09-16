/**
 * Happy Birthday Koko - 3D Celebration Script
 * Features: Three.js background, CSS 3D cylindrical carousel,
 * Web Audio procedural synthesizer (Happy Birthday chimes & SFX),
 * Interactive 3D cake candle blowout, mystery gift unboxing, and confetti.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. BACKGROUND MUSIC: YOUTUBE API (SONG: nAw2ooeubSQ) + PROCEDURAL FALLBACK
     ========================================================================== */
  let audioCtx = null;
  let isMusicPlaying = false;
  let musicTimeoutId = null;
  let noteIndex = 0;
  let ytPlayer = null;
  let isYTReady = false;
  let useFallbackSynth = false;

  // Initialize YouTube IFrame Player for the requested song
  window.onYouTubeIframeAPIReady = function () {
    try {
      ytPlayer = new YT.Player('yt-audio-player', {
        height: '64',
        width: '64',
        videoId: 'nAw2ooeubSQ',
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: 'nAw2ooeubSQ',
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          playsinline: 1
        },
        events: {
          onReady: function (e) {
            isYTReady = true;
            try {
              e.target.setVolume(100);
              e.target.unMute();
            } catch (err) {}
          },
          onStateChange: function (e) {
            if (e.data === 1) {
              // Playing
              isMusicPlaying = true;
              updateMusicUI(true);
            } else if (e.data === 2 || e.data === 0) {
              if (e.data === 0 && ytPlayer) {
                // Loop back
                ytPlayer.playVideo();
              } else {
                isMusicPlaying = false;
                updateMusicUI(false);
              }
            }
          },
          onError: function (err) {
            console.warn('YouTube audio blocked, falling back to Web Audio synth', err);
            useFallbackSynth = true;
          }
        }
      });
    } catch (e) {
      console.warn('YT Player init failed:', e);
      useFallbackSynth = true;
    }
  };

  function updateMusicUI(playing) {
    const musicBtn = document.getElementById('music-toggle-btn');
    const label = document.getElementById('music-btn-label');
    const bars = musicBtn ? musicBtn.querySelector('.equalizer-bars') : null;

    if (playing) {
      if (label) label.textContent = 'Pause Music';
      if (bars) bars.classList.add('playing');
    } else {
      if (label) label.textContent = 'Play Music';
      if (bars) bars.classList.remove('playing');
    }
  }

  function startMusic() {
    if (isYTReady && ytPlayer && typeof ytPlayer.playVideo === 'function' && !useFallbackSynth) {
      try {
        ytPlayer.playVideo();
        isMusicPlaying = true;
        updateMusicUI(true);
        return;
      } catch (err) {
        useFallbackSynth = true;
      }
    }
    startFallbackSynth();
  }

  function pauseMusic() {
    if (isYTReady && ytPlayer && typeof ytPlayer.pauseVideo === 'function' && !useFallbackSynth) {
      try {
        ytPlayer.pauseVideo();
      } catch (err) {}
    }
    stopFallbackSynth();
    isMusicPlaying = false;
    updateMusicUI(false);
  }

  function toggleMusic() {
    if (isMusicPlaying) {
      pauseMusic();
    } else {
      startMusic();
    }
  }

  function startFallbackSynth() {
    getAudioContext();
    isMusicPlaying = true;
    updateMusicUI(true);
    noteIndex = 0;
    playNextMelodyStep();
  }

  function stopFallbackSynth() {
    clearTimeout(musicTimeoutId);
  }

  // SFX: Blowing out candles (white noise whoosh with lowpass filter)
  function playBlowSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 1.0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 1.2);
  }

  // SFX: Confetti pop & celebration chord
  function playCelebrationChime() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        playChimeNote(freq, 0.8);
      }, idx * 90);
    });
  }

  /* ==========================================================================
     2. THREE.JS 3D BACKGROUND STAGE
     ========================================================================== */
  function initThreeBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 40;

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pinkLight = new THREE.PointLight(0xff6584, 2.5, 100);
    pinkLight.position.set(20, 20, 20);
    scene.add(pinkLight);

    const goldLight = new THREE.PointLight(0xffd166, 2.0, 100);
    goldLight.position.set(-20, -10, 25);
    scene.add(goldLight);

    const purpleLight = new THREE.PointLight(0xc084fc, 2.0, 80);
    purpleLight.position.set(0, 25, 10);
    scene.add(purpleLight);

    // 1. Floating 3D Pastel Spheres (Balloons / Orbs)
    const orbGroup = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const orbColors = [0xff6584, 0xffd166, 0xf472b6, 0xc084fc, 0x60a5fa, 0x34d399];
    const orbs = [];

    for (let i = 0; i < 28; i++) {
      const col = orbColors[i % orbColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.25,
        metalness: 0.4,
        emissive: col,
        emissiveIntensity: 0.15
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 40
      );
      const scale = 0.6 + Math.random() * 1.4;
      mesh.scale.set(scale, scale, scale);

      mesh.userData = {
        speedY: 0.015 + Math.random() * 0.03,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        initialY: mesh.position.y,
        floatOffset: Math.random() * Math.PI * 2
      };
      orbs.push(mesh);
      orbGroup.add(mesh);
    }
    scene.add(orbGroup);

    // 2. Sparkling 3D Star Particles (Octahedrons)
    const starGeo = new THREE.OctahedronGeometry(0.5, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const stars = [];
    const starGroup = new THREE.Group();

    for (let j = 0; j < 65; j++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 110,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 50
      );
      const s = 0.3 + Math.random() * 0.7;
      star.scale.set(s, s, s);
      star.userData = {
        rotX: (Math.random() - 0.5) * 0.03,
        rotY: (Math.random() - 0.5) * 0.03,
        pulseSpeed: 0.02 + Math.random() * 0.04
      };
      stars.push(star);
      starGroup.add(star);
    }
    scene.add(starGroup);

    // Mouse pointer interaction
    let targetCameraX = 0;
    let targetCameraY = 0;

    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCameraX = nx * 5;
      targetCameraY = ny * 4;
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    let clock = 0;
    function animate() {
      requestAnimationFrame(animate);
      clock += 0.015;

      // Smooth camera parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Animate balloons
      orbs.forEach((orb) => {
        orb.position.y += orb.userData.speedY;
        orb.rotation.y += orb.userData.rotSpeed;
        orb.rotation.x += orb.userData.rotSpeed * 0.5;
        // subtle bobbing
        orb.position.x += Math.sin(clock + orb.userData.floatOffset) * 0.02;

        if (orb.position.y > 45) {
          orb.position.y = -45;
          orb.position.x = (Math.random() - 0.5) * 80;
        }
      });

      // Animate star sparkles
      stars.forEach((star) => {
        star.rotation.x += star.userData.rotX;
        star.rotation.y += star.userData.rotY;
        const pulse = 1 + Math.sin(clock * 5 + star.position.x) * 0.25;
        star.scale.set(pulse * 0.5, pulse * 0.5, pulse * 0.5);
      });

      renderer.render(scene, camera);
    }
    animate();
    } catch (err) {
      console.warn("Three.js WebGL initialization skipped:", err.message);
    }
  }

  /* ==========================================================================
     3. 3D CYLINDRICAL MEMORY CAROUSEL (ALL 14 PHOTOS)
     ========================================================================== */
  function initCylinderCarousel() {
    const cylinder = document.getElementById('carousel-cylinder');
    const viewport = document.getElementById('carousel-viewport');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const spinToggleBtn = document.getElementById('carousel-toggle-spin');
    const spinStateText = document.getElementById('spin-state-text');

    if (!cylinder || !viewport) return;

    const cards = Array.from(cylinder.querySelectorAll('.polaroid-card'));
    const total = cards.length; // 14
    if (total === 0) return;

    // Calculate 3D radius based on screen width
    function getRadius() {
      return window.innerWidth < 640 ? 340 : 490;
    }

    let radius = getRadius();
    const angleStep = 360 / total; // ~25.714 deg

    // Arrange cards evenly on cylinder perimeter
    function layoutCards() {
      radius = getRadius();
      cards.forEach((card, idx) => {
        const angle = idx * angleStep;
        card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
      });
    }
    layoutCards();

    window.addEventListener('resize', layoutCards);

    // Carousel state
    let rotationY = 0;
    let targetRotationY = 0;
    let isAutoSpinning = true;
    const autoSpinSpeed = 0.15; // deg per frame

    // Touch & Pointer Dragging physics
    let isDragging = false;
    let startX = 0;
    let lastX = 0;
    let dragVelocity = 0;

    function updateCarousel() {
      if (isAutoSpinning && !isDragging) {
        targetRotationY -= autoSpinSpeed;
      }

      // Smooth inertia lerp
      rotationY += (targetRotationY - rotationY) * 0.12;
      cylinder.style.transform = `rotateY(${rotationY}deg)`;

      requestAnimationFrame(updateCarousel);
    }
    requestAnimationFrame(updateCarousel);

    // Drag start
    function onPointerDown(e) {
      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      lastX = startX;
      dragVelocity = 0;
    }

    // Drag move
    function onPointerMove(e) {
      if (!isDragging) return;
      const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const deltaX = currentX - lastX;
      lastX = currentX;

      dragVelocity = deltaX * 0.35;
      targetRotationY += dragVelocity;
    }

    // Drag end
    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      targetRotationY += dragVelocity * 6; // inertia carry
    }

    viewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    viewport.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Mouse wheel support
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetRotationY += e.deltaY * 0.15;
    }, { passive: false });

    // Buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        targetRotationY += angleStep;
        playChimeNote(659.25, 0.2); // soft click sound
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        targetRotationY -= angleStep;
        playChimeNote(659.25, 0.2);
      });
    }

    if (spinToggleBtn) {
      spinToggleBtn.addEventListener('click', () => {
        isAutoSpinning = !isAutoSpinning;
        if (spinStateText) {
          spinStateText.textContent = isAutoSpinning ? '⏸ Pause Spin' : '▶ Resume Spin';
        }
      });
    }

    // Clicking polaroid opens Lightbox
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        // If dragging actively, ignore click
        if (Math.abs(dragVelocity) > 1.2) return;
        const img = card.querySelector('img');
        const caption = card.getAttribute('data-caption') || card.querySelector('.polaroid-caption').textContent;
        if (img) {
          openLightbox(img.src, caption);
        }
      });
    });
  }

  /* ==========================================================================
     4. INTERACTIVE 3D CAKE & CANDLE WISH
     ========================================================================== */
  function initBirthdayCake() {
    const blowBtn = document.getElementById('blow-candles-btn');
    const relightBtn = document.getElementById('relight-candles-btn');
    const wishCard = document.getElementById('wish-unlocked-card');
    const candles = document.querySelectorAll('.candle');

    let allBlownOut = false;

    function blowOutCandles() {
      if (allBlownOut) return;
      allBlownOut = true;

      // Play procedural blow audio
      playBlowSound();

      // Extinguish candles
      candles.forEach((c) => c.classList.add('blown-out'));

      // Massive Confetti Explosion
      fireMassiveConfetti();

      // Play celebratory sound arpeggio
      setTimeout(() => {
        playCelebrationChime();
      }, 500);

      // Reveal wish card
      if (wishCard) {
        wishCard.classList.remove('hidden-element');
      }

      // Switch buttons
      if (blowBtn) blowBtn.style.display = 'none';
      if (relightBtn) relightBtn.style.display = 'inline-flex';
    }

    function relightCandles() {
      allBlownOut = false;
      candles.forEach((c) => c.classList.remove('blown-out'));
      if (wishCard) wishCard.classList.add('hidden-element');
      if (blowBtn) blowBtn.style.display = 'inline-flex';
      if (relightBtn) relightBtn.style.display = 'none';
      playChimeNote(880.00, 0.4);
    }

    if (blowBtn) blowBtn.addEventListener('click', blowOutCandles);
    if (relightBtn) relightBtn.addEventListener('click', relightCandles);

    // Individual candle tap to blow
    candles.forEach((candle) => {
      candle.addEventListener('click', () => {
        candle.classList.add('blown-out');
        playBlowSound();
        // Check if all are blown out
        const remaining = Array.from(candles).some((c) => !c.classList.contains('blown-out'));
        if (!remaining) {
          blowOutCandles();
        }
      });
    });
  }

  /* ==========================================================================
     5. DUAL-CANNON CONFETTI ENGINE
     ========================================================================== */
  function fireMassiveConfetti() {
    if (typeof confetti !== 'function') return;

    const count = 220;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#ff6584', '#ffd166', '#f472b6', '#c084fc', '#ffffff', '#38bdf8']
    };

    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }

    // Fireworks pattern
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2,  { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 1.1 });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.3 });
    fire(0.1,  { spread: 120, startVelocity: 45 });

    // Side cannons burst
    setTimeout(() => {
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: defaults.colors
      });
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: defaults.colors
      });
    }, 250);
  }

  /* ==========================================================================
     6. 3D MYSTERY GIFT UNBOXING
     ========================================================================== */
  function initMysteryGift() {
    const giftBox = document.getElementById('mystery-gift-box');
    const unwrapBtn = document.getElementById('unwrap-gift-btn');
    const revealedLetter = document.getElementById('revealed-letter');
    const celebrateAgainBtn = document.getElementById('celebrate-again-btn');

    let isUnwrapped = false;

    function unboxGift() {
      if (isUnwrapped) return;
      isUnwrapped = true;

      if (giftBox) giftBox.classList.add('unboxed');

      // Sound and confetti
      playCelebrationChime();
      fireMassiveConfetti();

      // Show Certificate / Letter
      setTimeout(() => {
        if (revealedLetter) revealedLetter.classList.remove('hidden-element');
        if (unwrapBtn) unwrapBtn.style.display = 'none';
      }, 450);
    }

    if (giftBox) giftBox.addEventListener('click', unboxGift);
    if (unwrapBtn) unwrapBtn.addEventListener('click', unboxGift);

    if (celebrateAgainBtn) {
      celebrateAgainBtn.addEventListener('click', () => {
        fireMassiveConfetti();
        playCelebrationChime();
      });
    }
  }

  /* ==========================================================================
     7. VIDEO SPOTLIGHT & FLOATING REACTION PARTICLES
     ========================================================================== */
  function initVideoReactions() {
    const reactBtns = document.querySelectorAll('.react-btn');
    const theaterCard = document.getElementById('theater-card');

    reactBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const emoji = btn.getAttribute('data-emoji') || '❤️';
        spawnFloatingEmoji(emoji, e.clientX, e.clientY);
        playChimeNote(783.99, 0.2);
      });
    });

    function spawnFloatingEmoji(emoji, clientX, clientY) {
      const span = document.createElement('span');
      span.textContent = emoji;
      span.style.position = 'fixed';
      span.style.left = `${clientX - 16}px`;
      span.style.top = `${clientY - 16}px`;
      span.style.fontSize = '2rem';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '999';
      span.style.transition = 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
      span.style.opacity = '1';

      document.body.appendChild(span);

      requestAnimationFrame(() => {
        const randomX = (Math.random() - 0.5) * 80;
        span.style.transform = `translate(${randomX}px, -120px) scale(1.6)`;
        span.style.opacity = '0';
      });

      setTimeout(() => {
        span.remove();
      }, 1250);
    }
  }

  /* ==========================================================================
     8. BENTO CARD 3D TILT EFFECT
     ========================================================================== */
  function initTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -9;
        const rotateY = ((x - centerX) / centerX) * 9;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  /* ==========================================================================
     9. STAT COUNTER ANIMATION
     ========================================================================== */
  function initStatCounters() {
    const stats = document.querySelectorAll('.stat-number');
    if (!('IntersectionObserver' in window)) {
      stats.forEach((s) => s.textContent = s.getAttribute('data-target'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10) || 0;
          animateValue(el, 0, target, 1600);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach((s) => observer.observe(s));

    function animateValue(obj, start, end, duration) {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }

  /* ==========================================================================
     10. LIGHTBOX MODAL (FOR CAROUSEL & MOSAIC)
     ========================================================================== */
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');

  function openLightbox(src, caption) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || '';
    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // Mosaic items click
  document.querySelectorAll('.mosaic-item').forEach((item) => {
    item.addEventListener('click', () => {
      const full = item.getAttribute('data-full') || item.querySelector('img').src;
      const cap = item.getAttribute('data-caption') || '';
      openLightbox(full, cap);
    });
  });

  /* ==========================================================================
     11. INITIALIZATION & EVENT HOOKS
     ========================================================================== */
  function bootWebsite() {
    try { initThreeBackground(); } catch (e) { console.warn("Three background skipped:", e); }
    try { initCylinderCarousel(); } catch (e) { console.warn("Carousel skipped:", e); }
    try { initBirthdayCake(); } catch (e) { console.warn("Cake skipped:", e); }
    try { initMysteryGift(); } catch (e) { console.warn("Gift skipped:", e); }
    try { initVideoReactions(); } catch (e) { console.warn("Video reactions skipped:", e); }
    try { initTiltCards(); } catch (e) { console.warn("Tilt cards skipped:", e); }
    try { initStatCounters(); } catch (e) { console.warn("Stat counters skipped:", e); }

    // Music & Confetti Quick Action Buttons
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    if (musicToggleBtn) {
      musicToggleBtn.addEventListener('click', toggleMusic);
    }

    const confettiQuickBtn = document.getElementById('confetti-quick-btn');
    if (confettiQuickBtn) {
      confettiQuickBtn.addEventListener('click', () => {
        fireMassiveConfetti();
        playCelebrationChime();
      });
    }

    // Auto-start background music on first user tap/click
    const onFirstUserGesture = () => {
      if (!isMusicPlaying) {
        startMusic();
      }
      window.removeEventListener('click', onFirstUserGesture);
      window.removeEventListener('touchstart', onFirstUserGesture);
    };
    window.addEventListener('click', onFirstUserGesture, { once: true });
    window.addEventListener('touchstart', onFirstUserGesture, { once: true });

    // Pause background song when spotlight video plays; resume when paused
    const spotlightVid = document.getElementById('spotlight-video');
    if (spotlightVid) {
      spotlightVid.addEventListener('play', () => {
        if (isMusicPlaying) pauseMusic();
      });
      spotlightVid.addEventListener('pause', () => {
        if (!isMusicPlaying) startMusic();
      });
      spotlightVid.addEventListener('ended', () => {
        if (!isMusicPlaying) startMusic();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWebsite);
  } else {
    bootWebsite();
  }

})();
