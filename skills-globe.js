/* ==========================================================
   Skills Globe — interactive hero background
   Pure canvas 2D + DOM. Koi library nahi.

   Cursor left/right  -> globe yaw (Y axis)
   Cursor up/down     -> globe pitch (X axis)
   Idle par dheere-dheere khud bhi ghoomta rehta hai.
   ========================================================== */

(function () {
  'use strict';

  var home = document.querySelector('.home');
  var wrap = document.getElementById('globe-wrap');
  var canvas = document.getElementById('globe-canvas');
  var layer = document.getElementById('globe-nodes');
  if (!home || !wrap || !canvas || !layer) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Aapki skills — icon yahan se badal sakte ho ---------- */
  var SKILLS = [
    { icon: 'fa-solid fa-code', label: 'C / C++', lat: 18, lon: 0 },
    { icon: 'fa-brands fa-python', label: 'Python', lat: -8, lon: 60 },
    { icon: 'fa-solid fa-database', label: 'Database', lat: 32, lon: 125 },
    { icon: 'fa-solid fa-robot', label: 'Machine learning', lat: -26, lon: 185 },
    { icon: 'fa-solid fa-laptop-code', label: 'Web development', lat: 6, lon: 245 },
    { icon: 'fa-brands fa-git-alt', label: 'Git', lat: -14, lon: 305 }
  ];

  var MAIN = '89,178,244';        /* --main-color RGB mein */
  var CAM = 2.8;                  /* camera distance, radius ke multiple mein */
  var BANDS = 5;                  /* depth ke kitne alpha layers */

  var W = 0, H = 0, cx = 0, cy = 0, R = 0, dpr = 1, mobile = false;
  var yaw = 0, pitch = 0, tYaw = 0, tPitch = 0, spin = 0;
  var cosY = 1, sinY = 0, cosP = 1, sinP = 0;
  var running = true, inView = true;

  function rad(d) { return d * Math.PI / 180; }

  /* lat/lon -> 3D point. y screen ka down axis hai, isliye -sin(lat). */
  function sph(latDeg, lonDeg, r) {
    var la = rad(latDeg), lo = rad(lonDeg);
    return {
      x: r * Math.cos(la) * Math.sin(lo),
      y: r * -Math.sin(la),
      z: r * Math.cos(la) * Math.cos(lo)
    };
  }

  /* ---------- Sparkle sprite (glow dots ke liye, ek hi baar banta hai) ---------- */
  var sprite = document.createElement('canvas');
  (function () {
    var s = 32;
    sprite.width = sprite.height = s;
    var sc = sprite.getContext('2d');
    var g = sc.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.22, 'rgba(' + MAIN + ',.7)');
    g.addColorStop(1, 'rgba(' + MAIN + ',0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, s, s);
  })();

  /* ---------- Geometry buffers ---------- */
  var lineSrc = [], lineRanges = [], lx, ly, lz, LPX, LPY, LPD;
  var dotSrc = [], dx, dy, dz, DPX, DPY, DPD, DPK;
  var sparkIdx = [];

  function pack(list) {
    var n = list.length;
    var ax = new Float32Array(n), ay = new Float32Array(n), az = new Float32Array(n);
    for (var i = 0; i < n; i++) { ax[i] = list[i].x; ay[i] = list[i].y; az[i] = list[i].z; }
    return [ax, ay, az];
  }

  function ring(r, tiltX, tiltZ) {
    var pts = [], ax = rad(tiltX), az = rad(tiltZ);
    for (var a = 0; a <= 360; a += 4) {
      var t = rad(a), x = r * Math.cos(t), z = r * Math.sin(t);
      var y1 = -z * Math.sin(ax), z1 = z * Math.cos(ax);
      pts.push({
        x: x * Math.cos(az) - y1 * Math.sin(az),
        y: x * Math.sin(az) + y1 * Math.cos(az),
        z: z1
      });
    }
    return pts;
  }

  function buildGeometry() {
    /* --- wireframe: parallels + meridians + 2 orbit rings --- */
    lineSrc = [];
    var la, a, b, m;
    for (la = -60; la <= 60; la += 20) {
      var par = [];
      for (a = 0; a <= 360; a += 6) par.push(sph(la, a, 1));
      lineSrc.push(par);
    }
    var meridians = mobile ? 8 : 12;
    for (m = 0; m < meridians; m++) {
      var mer = [], lon = m * 360 / meridians;
      for (b = -90; b <= 90; b += 5) mer.push(sph(b, lon, 1));
      lineSrc.push(mer);
    }
    if (!mobile) {
      lineSrc.push(ring(1.07, 62, 18));
      lineSrc.push(ring(1.15, -48, -30));
    }

    var flat = [], total = 0;
    lineRanges = [];
    for (var i = 0; i < lineSrc.length; i++) {
      lineRanges.push([total, total + lineSrc[i].length]);
      total += lineSrc[i].length;
      flat = flat.concat(lineSrc[i]);
    }
    var p = pack(flat);
    lx = p[0]; ly = p[1]; lz = p[2];
    LPX = new Float32Array(total); LPY = new Float32Array(total); LPD = new Float32Array(total);

    /* --- surface dots: fibonacci sphere (evenly spread) --- */
    var N = mobile ? 260 : 620;
    dotSrc = [];
    for (var d = 0; d < N; d++) {
      var phi = Math.acos(1 - 2 * (d + 0.5) / N);
      var th = Math.PI * (1 + Math.sqrt(5)) * d;
      dotSrc.push({
        x: Math.sin(phi) * Math.cos(th),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(th)
      });
    }
    var q = pack(dotSrc);
    dx = q[0]; dy = q[1]; dz = q[2];
    DPX = new Float32Array(N); DPY = new Float32Array(N);
    DPD = new Float32Array(N); DPK = new Float32Array(N);

    sparkIdx = [];
    var sparks = mobile ? 10 : 26;
    for (var s = 0; s < sparks; s++) sparkIdx.push((s * 37) % N);
  }

  /* ---------- Skill hexagons ---------- */
  var nodes = SKILLS.map(function (s) {
    var el = document.createElement('div');
    el.className = 'skill-node';
    el.title = s.label;
    el.innerHTML =
      '<svg viewBox="0 0 100 115" aria-hidden="true">' +
      '<polygon points="50,3 96,29 96,86 50,112 4,86 4,29"/></svg>' +
      '<i class="' + s.icon + '" aria-hidden="true"></i>';
    layer.appendChild(el);
    return { el: el, v: sph(s.lat, s.lon, 1.22), sx: 0, sy: 0, d: 0 };
  });
  var nodeW = 0, nodeH = 0;

  /* ---------- Resize ---------- */
  function resize() {
    W = home.clientWidth;
    H = home.clientHeight;
    if (!W || !H) return;

    mobile = W < 769;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Desktop par text left mein hai, isliye globe right side. Mobile par center. */
    cx = mobile ? W * 0.5 : W * 0.72;
    cy = mobile ? H * 0.38 : H * 0.5;
    R = Math.max(110, Math.min(Math.min(W, H) * 0.3, 300));

    nodeW = nodes[0].el.offsetWidth || 66;
    nodeH = nodes[0].el.offsetHeight || 76;

    buildGeometry();
  }

  /* ---------- Draw ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    cosY = Math.cos(yaw); sinY = Math.sin(yaw);
    cosP = Math.cos(pitch); sinP = Math.sin(pitch);

    /* atmosphere glow */
    var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.95);
    g.addColorStop(0, 'rgba(' + MAIN + ',.17)');
    g.addColorStop(0.42, 'rgba(' + MAIN + ',.06)');
    g.addColorStop(1, 'rgba(' + MAIN + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.95, 0, 6.2832);
    ctx.fill();

    var i, k, x, y, z, z0;

    /* project wireframe */
    for (i = 0; i < lx.length; i++) {
      x = lx[i] * cosY + lz[i] * sinY;
      z0 = -lx[i] * sinY + lz[i] * cosY;
      y = ly[i] * cosP - z0 * sinP;
      z = ly[i] * sinP + z0 * cosP;
      k = CAM / (CAM - z);
      LPX[i] = cx + x * R * k;
      LPY[i] = cy + y * R * k;
      LPD[i] = (z + 1) * 0.5;
    }

    /* project dots */
    for (i = 0; i < dx.length; i++) {
      x = dx[i] * cosY + dz[i] * sinY;
      z0 = -dx[i] * sinY + dz[i] * cosY;
      y = dy[i] * cosP - z0 * sinP;
      z = dy[i] * sinP + z0 * cosP;
      k = CAM / (CAM - z);
      DPX[i] = cx + x * R * k;
      DPY[i] = cy + y * R * k;
      DPD[i] = (z + 1) * 0.5;
      DPK[i] = k;
    }

    /* wireframe — peeche se aage, har band alag alpha par */
    ctx.lineWidth = 1;
    for (var b = 0; b < BANDS; b++) {
      var lo = b / BANDS, hi = (b + 1) / BANDS;
      ctx.beginPath();
      for (var r = 0; r < lineRanges.length; r++) {
        var s0 = lineRanges[r][0], e0 = lineRanges[r][1];
        for (i = s0; i < e0 - 1; i++) {
          var dm = (LPD[i] + LPD[i + 1]) * 0.5;
          if (dm >= lo && dm < hi) {
            ctx.moveTo(LPX[i], LPY[i]);
            ctx.lineTo(LPX[i + 1], LPY[i + 1]);
          }
        }
      }
      ctx.strokeStyle = 'rgba(' + MAIN + ',' + (0.035 + (b / BANDS) * 0.2).toFixed(3) + ')';
      ctx.stroke();
    }

    /* surface dots */
    for (b = 0; b < BANDS; b++) {
      var dlo = b / BANDS, dhi = (b + 1) / BANDS;
      var rr = 0.7 + (b / BANDS) * 0.9;
      ctx.beginPath();
      for (i = 0; i < DPD.length; i++) {
        if (DPD[i] < dlo || DPD[i] >= dhi) continue;
        ctx.moveTo(DPX[i] + rr, DPY[i]);
        ctx.arc(DPX[i], DPY[i], rr, 0, 6.2832);
      }
      ctx.fillStyle = 'rgba(' + MAIN + ',' + (0.1 + (b / BANDS) * 0.65).toFixed(3) + ')';
      ctx.fill();
    }

    /* sparkles — sirf front wale */
    for (i = 0; i < sparkIdx.length; i++) {
      var si = sparkIdx[i];
      if (DPD[si] < 0.55) continue;
      var sz = 12 * DPK[si];
      ctx.globalAlpha = (DPD[si] - 0.55) / 0.45;
      ctx.drawImage(sprite, DPX[si] - sz / 2, DPY[si] - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    /* skill nodes project karo */
    for (i = 0; i < nodes.length; i++) {
      var v = nodes[i].v;
      x = v.x * cosY + v.z * sinY;
      z0 = -v.x * sinY + v.z * cosY;
      y = v.y * cosP - z0 * sinP;
      z = v.y * sinP + z0 * cosP;
      k = CAM / (CAM - z);
      nodes[i].sx = cx + x * R * k;
      nodes[i].sy = cy + y * R * k;
      nodes[i].d = (z + 1) * 0.5;
      nodes[i].k = k;
    }

    /* nodes ko chain se jodne wali lines */
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      var n1 = nodes[i], n2 = nodes[(i + 1) % nodes.length];
      var da = (n1.d + n2.d) * 0.5;
      ctx.strokeStyle = 'rgba(' + MAIN + ',' + (0.05 + da * 0.28).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(n1.sx, n1.sy);
      ctx.lineTo(n2.sx, n2.sy);
      ctx.stroke();
    }

    /* hexagons ko DOM mein position karo */
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var sc = 0.6 + n.d * 0.55;
      n.el.style.transform =
        'translate3d(' + (n.sx - nodeW / 2).toFixed(1) + 'px,' +
        (n.sy - nodeH / 2).toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
      n.el.style.opacity = (0.18 + n.d * 0.82).toFixed(3);
    }
  }

  /* ---------- Cursor ---------- */
  window.addEventListener('pointermove', function (e) {
    tYaw = (e.clientX / window.innerWidth - 0.5) * 1.7;
    var p = (e.clientY / window.innerHeight - 0.5) * -1.0;
    tPitch = Math.max(-0.6, Math.min(0.6, p));
  }, { passive: true });

  /* ---------- Loop ---------- */
  function frame() {
    if (running && inView) {
      if (!reduce) spin += 0.0016;
      yaw += ((tYaw + spin) - yaw) * 0.06;
      pitch += (tPitch - pitch) * 0.06;
      draw();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Lifecycle ---------- */
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(home);
  }

  resize();
  requestAnimationFrame(frame);
})();