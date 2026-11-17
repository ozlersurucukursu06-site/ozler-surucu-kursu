/* Ortak: yardımcılar, bilgi doldurma, menü, paylaşma, video penceresi, önizleme bandı */
(function () {
  'use strict';
  var OZ = window.OZ = { sayfa: {}, _kuruldu: false };
  var K = window.KURS || {};

  OZ.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  OZ.rakam = function (v) { var d = String(v).replace(/\D/g, ''); if (d.charAt(0) === '0') d = '90' + d.slice(1); return d; };
  OZ.tarih = function (s) { if (!s) return ''; var d = new Date(s.length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); };
  OZ.tarihKisa = function (s) { if (!s) return ''; var d = new Date(s.length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); };
  OZ.tarihSaat = function (s) { var d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  OZ.gunEtiket = function (s) {
    var b = new Date(); b.setHours(0, 0, 0, 0); var d = new Date(s + 'T00:00:00'), f = Math.round((d - b) / 864e5);
    return f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f === -1 ? 'Dün' : d.toLocaleDateString('tr-TR', { weekday: 'long' });
  };
  OZ.para = function (n) { return Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺'; };
  OZ.bugun = function (n) { var d = new Date(); d.setDate(d.getDate() + (n || 0)); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  OZ.$ = function (s, r) { return (r || document).querySelector(s); };
  OZ.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  OZ.uzanti = function (t) { return t === 'application/pdf' ? 'pdf' : (t === 'image/png' ? 'png' : 'jpg'); };

  /* Büyük fotoğrafı küçültür (telefon fotoğrafları 5-10 MB olabilir) */
  OZ.kucult = function (file, enPx, esikBayt) {
    enPx = enPx || 2200; esikBayt = esikBayt || 1.5 * 1024 * 1024;
    return new Promise(function (ok) {
      if (file.type.indexOf('image/') !== 0 || file.size < esikBayt) return ok(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, enPx / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); ok(b && b.size < file.size ? b : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
      img.src = url;
    });
  };

  /* Bilgi doldurma: data-k="telefon1" gibi etiketler */
  OZ.doldur = function (kok) {
    OZ.$$('[data-k]', kok).forEach(function (el) {
      var k = el.getAttribute('data-k'), v = K[k], h = el.getAttribute('data-h'), t = el.getAttribute('data-t');
      if (v == null) return;
      if (v === '' && h === 'url') { el.hidden = true; if (el.parentNode && el.parentNode.tagName === 'LI') el.parentNode.hidden = true; return; }
      if (h === 'url') { el.hidden = false; if (el.parentNode && el.parentNode.tagName === 'LI') el.parentNode.hidden = false; }
      if (h === 'tel') el.setAttribute('href', 'tel:+' + OZ.rakam(v));
      else if (h === 'wa') { var m = el.getAttribute('href') || '', q = m.indexOf('?') > -1 ? m.slice(m.indexOf('?')) : ''; el.setAttribute('href', 'https://wa.me/' + OZ.rakam(v) + q); }
      else if (h === 'mail') el.setAttribute('href', 'mailto:' + v);
      else if (h === 'url') el.setAttribute('href', v);
      if (t) { if (el.children.length === 0) el.textContent = t; }
      else if (el.children.length === 0) el.textContent = v;
    });
  };

  /* Panelden değiştirilen ayarları (sosyal medya, saatler) siteye yansıt */
  OZ.ayarlariYukle = async function () {
    try {
      var l = await V.liste('ayarlar'), g = { instagram: 1, youtube: 1, facebook: 1, whatsapp: 1, saatler: 1 };
      l.forEach(function (a) { if (g[a.anahtar] && a.deger != null && String(a.deger).trim() !== '') K[a.anahtar] = a.deger; });
      OZ.doldur();
    } catch (e) {}
  };

  /* Video: YouTube bağlantısından kimlik çıkar */
  OZ.ytId = function (u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
  OZ.videoKarti = function (v) {
    var id = v.tur === 'youtube' ? OZ.ytId(v.adres) : null;
    var arka = id ? ' style="background-image:url(https://img.youtube.com/vi/' + id + '/hqdefault.jpg)"' : '';
    return '<button type="button" class="vk" data-vid="' + OZ.esc(v.id) + '"><span class="vt"' + arka + '><i aria-hidden="true">▶</i></span><b>' + OZ.esc(v.baslik) + '</b><small>' + OZ.esc(v.kategori || '') + '</small></button>';
  };
  OZ.videoAc = async function (v) {
    var id = v.tur === 'youtube' ? OZ.ytId(v.adres) : null;
    if (v.tur === 'youtube' && !id) { window.open(v.adres, '_blank', 'noopener'); return; }
    var m = document.getElementById('vmod');
    if (!m) {
      m = document.createElement('div'); m.id = 'vmod'; m.className = 'vmod'; m.hidden = true;
      m.innerHTML = '<div class="vmod-ic"><button type="button" class="vmod-kapat" aria-label="Kapat">×</button><div class="vmod-alan"></div></div>';
      document.body.appendChild(m);
      var kapat = function () { m.hidden = true; m.querySelector('.vmod-alan').innerHTML = ''; };
      m.addEventListener('click', function (e) { if (e.target === m || e.target.classList.contains('vmod-kapat')) kapat(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) kapat(); });
    }
    var a = m.querySelector('.vmod-alan');
    if (id) a.innerHTML = '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1" title="' + OZ.esc(v.baslik) + '" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
    else { var u = await V.url('medya', v.yol); if (!u) { toast('Önizleme modunda yüklenen video yeniden açılamaz.'); return; } a.innerHTML = '<video src="' + OZ.esc(u) + '" controls autoplay playsinline></video>'; }
    m.hidden = false;
  };
  OZ.videolariBagla = function (kok, liste) {
    kok.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-vid]'); if (!b) return;
      var v = liste().filter(function (x) { return x.id === b.getAttribute('data-vid'); })[0]; if (v) OZ.videoAc(v);
    });
  };

  window.toast = function (m) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('goster'); clearTimeout(t._z); t._z = setTimeout(function () { t.classList.remove('goster'); }, 3000);
  };

  OZ.demoBandi = function () {
    if (V.gercek || document.getElementById('demoBant')) return;
    var b = document.createElement('div'); b.id = 'demoBant'; b.className = 'demo-bant';
    b.innerHTML = '<b>ÖNİZLEME MODU</b> Burada yapılanlar yalnızca bu tarayıcıda kalır, kursa ulaşmaz. Öğrenci girişi: <code>ogrenci@ornek.com</code> / <code>demo</code> · Yönetici girişi: <code>yonetici@ornek.com</code> / <code>demo</code> <button type="button" id="demoSifirla">Sahte verileri sıfırla</button>';
    document.body.insertBefore(b, document.body.firstChild);
    document.getElementById('demoSifirla').addEventListener('click', function () { V.demoSifirla(); location.reload(); });
  };

  /* Bir kez kurulanlar: menü, paylaşma kutuları (olay dinleyicileri belgeye bağlı) */
  OZ.kur = function () {
    if (OZ._kuruldu) return; OZ._kuruldu = true;
    document.addEventListener('click', function (e) {
      var h = e.target.closest && e.target.closest('.hamb');
      if (h) {
        var menu = document.getElementById('menu'); if (!menu) return;
        var a = menu.classList.toggle('acik'); h.setAttribute('aria-expanded', a ? 'true' : 'false'); h.setAttribute('aria-label', a ? 'Menüyü kapat' : 'Menüyü aç'); return;
      }
      var kb = e.target.closest && e.target.closest('[data-p="kopya"]');
      if (kb) { var url = location.href.split('#')[0]; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast('Bağlantı kopyalandı'); }, function () { toast(url); }); else toast(url); return; }
      var nb = e.target.closest && e.target.closest('[data-p="native"]');
      if (nb && navigator.share) navigator.share({ title: document.title, url: location.href.split('#')[0] }).catch(function () {});
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return; var menu = document.getElementById('menu'), h = document.querySelector('.hamb');
      if (menu && menu.classList.contains('acik')) { menu.classList.remove('acik'); if (h) { h.setAttribute('aria-expanded', 'false'); h.focus(); } }
    });
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
  };

  /* Her sayfa açılışında */
  OZ.boot = function () {
    OZ.kur(); OZ.demoBandi(); OZ.doldur();
    OZ.$$('[data-paylas]').forEach(function (kutu) {
      var url = location.href.split('#')[0], baslik = kutu.getAttribute('data-baslik') || document.title, b = encodeURIComponent(baslik + ' ' + url);
      var wa = kutu.querySelector('[data-p="wa"]'), fb = kutu.querySelector('[data-p="fb"]'), nb = kutu.querySelector('[data-p="native"]');
      if (wa) wa.href = 'https://wa.me/?text=' + b;
      if (fb) fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
      if (nb && navigator.share) nb.hidden = false;
    });
    var ad = document.body.getAttribute('data-sayfa');
    if (ad && OZ.sayfa[ad]) OZ.sayfa[ad]();
    OZ.ayarlariYukle();
  };
  document.addEventListener('DOMContentLoaded', function () { if (!window.__OZ_PAKET) OZ.boot(); });
})();
