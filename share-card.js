// share-card.js — builds a branded 1080x1350 (4:5) referral image on a
// <canvas>, entirely client-side. 4:5 shows well in WhatsApp Status,
// Instagram feed and Stories without awkward cropping.
//
// Usage:
//   const blob = await JoyRiseShareCard.render({ code: 'FUNNY', link: 'https://…' });
//   await JoyRiseShareCard.share(blob, { code, link, text });   // native share sheet w/ image, else download
(function (window) {
  'use strict';

  const W = 1080, H = 1350;
  const t = (k, v) => (window.JoyRiseI18n ? window.JoyRiseI18n.t(k, v) : k);

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // logo is optional — never block the card on it
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Shrinks font until the text fits maxWidth.
  function fitText(ctx, text, maxWidth, startPx, weight) {
    let px = startPx;
    do { ctx.font = `${weight} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; px -= 2; }
    while (ctx.measureText(text).width > maxWidth && px > 20);
  }

  function wrap(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  async function render(opts) {
    const code = String(opts.code || '').toUpperCase();
    const link = String(opts.link || '');
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

    // Background gradient (brand purple)
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#5b4bd6'); bg.addColorStop(0.6, '#6c5ce7'); bg.addColorStop(1, '#8a7cff');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Decorative soft circles
    [[920, 140, 260, 0.10], [120, 1180, 320, 0.08], [980, 1100, 140, 0.10], [90, 260, 110, 0.08]].forEach(([x, y, r, a]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    });

    // Logo + wordmark
    const logo = await loadImage('icon-192.png');
    if (logo) {
      ctx.save(); roundRect(ctx, 80, 80, 120, 120, 28); ctx.clip(); ctx.drawImage(logo, 80, 80, 120, 120); ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `900 46px ${font}`; ctx.fillText('JOY-RISE HUB', 224, 128);
    ctx.font = `600 28px ${font}`; ctx.globalAlpha = 0.85; ctx.fillText('Daily live draws', 224, 172); ctx.globalAlpha = 1;

    // Headline
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    fitText(ctx, t('share.headline'), W - 160, 92, 900);
    const headLines = wrap(ctx, t('share.headline'), W - 160);
    const lineH = 104;
    headLines.forEach((l, i) => ctx.fillText(l, W / 2, 360 + i * lineH));
    const afterHead = 360 + headLines.length * lineH;

    ctx.font = `600 38px ${font}`; ctx.globalAlpha = 0.92;
    ctx.fillText(t('share.cta'), W / 2, afterHead + 30);
    ctx.globalAlpha = 1;

    // Code panel
    const panelY = afterHead + 110, panelH = 330;
    ctx.save();
    ctx.shadowColor = 'rgba(30,20,100,0.35)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#fff'; roundRect(ctx, 90, panelY, W - 180, panelH, 48); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#9089b0'; ctx.font = `700 30px ${font}`;
    ctx.fillText(t('share.codeLabel'), W / 2, panelY + 70);

    // Dashed code box
    ctx.setLineDash([16, 12]); ctx.lineWidth = 5; ctx.strokeStyle = '#6c5ce7';
    roundRect(ctx, 150, panelY + 120, W - 300, 150, 30); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(108,92,231,0.08)'; roundRect(ctx, 150, panelY + 120, W - 300, 150, 30); ctx.fill();
    ctx.fillStyle = '#4a3bc7'; ctx.textBaseline = 'middle';
    fitText(ctx, code, W - 380, 112, 900);
    ctx.fillText(code, W / 2, panelY + 197);

    // Link (short) + footer
    const shortLink = link.replace(/^https?:\/\//, '');
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.95;
    fitText(ctx, shortLink, W - 200, 34, 600);
    const linkLines = wrap(ctx, shortLink, W - 200).slice(0, 2);
    linkLines.forEach((l, i) => ctx.fillText(l, W / 2, panelY + panelH + 90 + i * 46));
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `600 26px ${font}`;
    ctx.fillText('18+ only · Play responsibly', W / 2, H - 70);

    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png');
    });
  }

  async function share(blob, opts) {
    const file = new File([blob], 'joy-rise-invite.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `${opts.text || ''} ${opts.link || ''}`.trim() });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
      }
    }
    // Fallback: download the PNG so they can post it manually.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'joy-rise-invite.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  window.JoyRiseShareCard = { render, share };
})(window);
