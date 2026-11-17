/* Kurs yönetim paneli: başvurular, öğrenciler (evrak, randevu, ödeme), videolar, fotoğraflar, aramalar, ayarlar */
(function () {
  'use strict';
  var OZ = window.OZ, $ = OZ.$, $$ = OZ.$$, esc = OZ.esc;
  var RT = { direksiyon: 'Direksiyon dersi', teorik: 'Teorik ders', deneme: 'Deneme sınavı', sinav: 'Sınav günü' };
  var DURUM = { yeni: 'Yeni', arandi: 'Arandı', kayit: 'Kayıt oldu', vazgecti: 'Vazgeçti' };
  var RDURUM = { bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', iptal: 'İptal' };
  var SEKMELER = [['bas', 'Başvurular'], ['ogr', 'Öğrenciler'], ['rnd', 'Randevular'], ['vid', 'Videolar'], ['gal', 'Fotoğraflar'], ['ara', 'Aramalar'], ['ayr', 'Ayarlar']];
  var kok, oturum, D = {}, sekme = 'bas', seciliOgr = null, suz = { bas: 'hepsi', ara: '', rnd: 'bekliyor' };
  var SAATLER = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  function mesaj(id, t, c) { var m = $(id); if (!m) return; m.className = 'mesaj ' + c; m.textContent = t; m.hidden = !t; }
  function slug(s) { return String(s).toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function wa(tel, metin) { return 'https://wa.me/' + OZ.rakam(tel) + (metin ? '?text=' + encodeURIComponent(metin) : ''); }
  function ogrAd(id) { var o = D.ogr.filter(function (x) { return x.id === id; })[0]; return o ? o.ad_soyad : 'Silinmiş öğrenci'; }

  OZ.sayfa.yonetim = async function () {
    kok = $('#ynAlan'); if (!kok) return;
    kok.innerHTML = '<p class="yukleniyor">Yükleniyor…</p>';
    try { oturum = await V.oturum(); } catch (e) { oturum = null; }
    if (!oturum) return girisCiz();
    if (!oturum.yonetici) return yetkisiz();
    await yukle(); cizPanel();
  };

  function girisCiz() {
    kok.innerHTML = '<div class="giris-kutu"><h2>Yönetici girişi</h2><form class="form" id="ygForm" novalidate><div><label for="ygE">E-posta</label><input id="ygE" type="email" autocomplete="username" required></div><div><label for="ygS">Şifre</label><input id="ygS" type="password" autocomplete="current-password" required></div><div id="ygM" class="mesaj" hidden role="status"></div><button class="dugme d-kirmizi" type="submit">Giriş yap</button></form></div>';
    $('#ygForm').addEventListener('submit', async function (e) {
      e.preventDefault(); var b = $('button[type=submit]', kok); b.disabled = true; b.textContent = 'Giriş yapılıyor…';
      try { oturum = await V.giris($('#ygE').value.trim(), $('#ygS').value); if (!oturum.yonetici) return yetkisiz(); await yukle(); cizPanel(); }
      catch (er) { mesaj('#ygM', er.message || 'Giriş yapılamadı.', 'kotu'); b.disabled = false; b.textContent = 'Giriş yap'; }
    });
  }
  function yetkisiz() {
    kok.innerHTML = '<div class="giris-kutu"><h2>Yetkiniz yok</h2><p>Bu hesap yönetici olarak tanımlı değil.</p><button type="button" class="dugme d-cerceve" id="ycik">Çıkış yap</button></div>';
    $('#ycik').addEventListener('click', async function () { await V.cikis(); girisCiz(); });
  }

  async function yukle() {
    var r = await Promise.all([V.liste('basvurular', { sira: 'olusturma', artan: false }), V.liste('arama_talepleri', { sira: 'olusturma', artan: false }), V.liste('ogrenciler', { sira: 'ad_soyad', artan: true }),
      V.liste('ogrenci_evraklari'), V.liste('randevular', { sira: 'tarih', artan: true }), V.liste('odemeler', { sira: 'vade', artan: true }), V.liste('videolar', { sira: 'olusturma', artan: false }), V.liste('galeri', { sira: 'olusturma', artan: false }), V.liste('ayarlar')]);
    D.bas = r[0]; D.ara = r[1]; D.ogr = r[2]; D.evr = r[3]; D.rnd = r[4]; D.ode = r[5]; D.vid = r[6]; D.gal = r[7]; D.ayr = r[8];
  }
  async function yenile() { await yukle(); cizIc(); sayilar(); }

  /* ---- iskelet ---- */
  function cizPanel() {
    kok.innerHTML = '<div class="yn-ust"><div><h2>Kurs paneli</h2><p>' + esc(oturum.email) + '</p></div><button type="button" class="dugme d-cerceve" id="yCikis">Çıkış yap</button></div><div class="yn-say" id="ySay"></div><div class="yn-sek" id="ySek" role="tablist"></div><div id="ynIc"></div>';
    $('#yCikis').addEventListener('click', async function () { await V.cikis(); oturum = null; girisCiz(); });
    $('#ySek').addEventListener('click', function (e) { var b = e.target.closest('[data-sek]'); if (b) { sekme = b.getAttribute('data-sek'); seciliOgr = null; sayilar(); cizIc(); } });
    var ic = $('#ynIc'); ic.addEventListener('click', tikla); ic.addEventListener('change', degis); ic.addEventListener('submit', gonder); ic.addEventListener('input', yaz);
    sayilar(); cizIc();
  }
  function sayilar() {
    var yb = D.bas.filter(function (x) { return x.durum === 'yeni'; }).length, ya = D.ara.filter(function (x) { return x.durum === 'yeni'; }).length, rb = D.rnd.filter(function (x) { return x.durum === 'bekliyor'; }).length;
    var gec = D.ode.filter(function (x) { return !x.odendi && x.vade < OZ.bugun(0); }).length;
    $('#ySay').innerHTML = [[yb, 'Yeni başvuru'], [ya, 'Aranmayı bekleyen'], [rb, 'Onay bekleyen randevu'], [gec, 'Geciken ödeme']].map(function (s) { return '<div class="sy"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
    var rozet = { bas: yb, rnd: rb, ara: ya };
    $('#ySek').innerHTML = SEKMELER.map(function (s) { return '<button type="button" role="tab" data-sek="' + s[0] + '" class="' + (s[0] === sekme ? 'ac' : '') + '">' + s[1] + (rozet[s[0]] ? '<b>' + rozet[s[0]] + '</b>' : '') + '</button>'; }).join('');
  }
  function cizIc() { var f = { bas: sBas, ogr: sOgr, rnd: sRnd, vid: sVid, gal: sGal, ara: sAra, ayr: sAyr }[sekme]; $('#ynIc').innerHTML = f(); }

  /* ---- Başvurular ---- */
  function sBas() {
    var q = (suz.basQ || '').toLowerCase(), l = D.bas.filter(function (x) { return (suz.bas === 'hepsi' || x.durum === suz.bas) && (!q || (x.ad_soyad + ' ' + x.telefon).toLowerCase().indexOf(q) > -1); });
    var h = '<div class="yn-arac"><select data-f="bas" aria-label="Duruma göre süz"><option value="hepsi">Tüm başvurular</option>' + Object.keys(DURUM).map(function (k) { return '<option value="' + k + '"' + (suz.bas === k ? ' selected' : '') + '>' + DURUM[k] + '</option>'; }).join('') + '</select><input type="search" data-q="bas" placeholder="Ad ya da telefon ara" value="' + esc(suz.basQ || '') + '"><button type="button" class="dugme-k" data-act="csv">Excel için CSV indir</button></div>';
    if (!l.length) return h + '<p class="bos">Bu görünümde başvuru yok.</p>';
    return h + l.map(function (b) {
      var ev = Object.keys(b.evraklar || {});
      return '<article class="yn-kart' + (b.durum === 'yeni' ? ' yeni' : '') + '"><div class="yn-baslik"><div><b>' + esc(b.ad_soyad) + (b.durum === 'yeni' ? '<span class="rozet-s">YENİ</span>' : '') + '</b><small>' + OZ.tarihSaat(b.olusturma) + ' · ' + (b.sanziman === 'otomatik' ? 'Otomatik' : 'Manuel') + ' vites</small></div>' +
        '<div class="yn-dg"><a class="dugme-k" href="tel:+' + OZ.rakam(b.telefon) + '">' + esc(b.telefon) + '</a><a class="dugme-k wa" href="' + wa(b.telefon) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>' +
        (b.eposta ? '<p class="yn-s">' + esc(b.eposta) + '</p>' : '') + (b.notu ? '<p class="yn-s">“' + esc(b.notu) + '”</p>' : '') +
        '<div class="yn-evrak">' + (ev.length ? ev.map(function (t) { return '<button type="button" class="dugme-k" data-act="indir" data-yol="' + esc(b.evraklar[t]) + '" data-ad="' + esc(slug(b.ad_soyad) + '-' + t) + '">⬇ ' + esc(OZ.EVRAK_AD[t] || t) + '</button>'; }).join('') : '<small>Evrak yüklenmedi.</small>') + '</div>' +
        '<div class="yn-alt"><select data-bdurum="' + b.id + '" aria-label="Durum">' + Object.keys(DURUM).map(function (k) { return '<option value="' + k + '"' + (b.durum === k ? ' selected' : '') + '>' + DURUM[k] + '</option>'; }).join('') + '</select><input type="text" data-bnot="' + b.id + '" maxlength="300" placeholder="Not (sadece kurs görür)" value="' + esc(b.yonetici_notu || '') + '"><button type="button" class="dugme-k kirmizi" data-act="bsil" data-id="' + b.id + '">Sil</button></div></article>';
    }).join('');
  }

  /* ---- Öğrenciler ---- */
  function ogrOzet(o) {
    var ev = D.evr.filter(function (x) { return x.ogrenci_id === o.id; }).length, od = D.ode.filter(function (x) { return x.ogrenci_id === o.id; });
    var kalan = od.filter(function (x) { return !x.odendi; }).reduce(function (a, x) { return a + Number(x.tutar); }, 0), gec = od.some(function (x) { return !x.odendi && x.vade < OZ.bugun(0); });
    return { ev: ev, kalan: kalan, gec: gec, var_: od.length > 0 };
  }
  function sOgr() {
    if (seciliOgr) return sOgrDetay(D.ogr.filter(function (x) { return x.id === seciliOgr; })[0]);
    var q = (suz.ogrQ || '').toLowerCase(), l = D.ogr.filter(function (x) { return !q || (x.ad_soyad + ' ' + x.telefon).toLowerCase().indexOf(q) > -1; });
    var h = '<div class="yn-arac"><input type="search" data-q="ogr" placeholder="Öğrenci ara" value="' + esc(suz.ogrQ || '') + '"><span class="yn-ipucu">Öğrenciler siteden kendileri üye olur. Evrak, randevu ve ödemeleri buradan yönetirsin.</span></div>';
    if (!l.length) return h + '<p class="bos">Henüz üye öğrenci yok.</p>';
    return h + '<div class="yn-tablo">' + l.map(function (o) {
      var z = ogrOzet(o);
      return '<div class="yn-satir"><div><b>' + esc(o.ad_soyad) + '</b><small>' + esc(o.telefon) + '</small></div><div>Evrak<small class="' + (z.ev < 5 ? 'kirmizi' : 'yesil') + '">' + z.ev + ' / 5</small></div><div>Kalan borç<small class="' + (z.gec ? 'kirmizi' : '') + '">' + (z.var_ ? OZ.para(z.kalan) + (z.gec ? ' · GECİKMİŞ' : '') : '—') + '</small></div><div><button type="button" class="dugme-k kirmizi" data-act="ogracik" data-id="' + o.id + '">Aç</button></div></div>';
    }).join('') + '</div>';
  }
  function sOgrDetay(o) {
    if (!o) { seciliOgr = null; return sOgr(); }
    var ev = D.evr.filter(function (x) { return x.ogrenci_id === o.id; }), rn = D.rnd.filter(function (x) { return x.ogrenci_id === o.id; }), od = D.ode.filter(function (x) { return x.ogrenci_id === o.id; });
    var top = od.reduce(function (a, x) { return a + Number(x.tutar); }, 0), odn = od.filter(function (x) { return x.odendi; }).reduce(function (a, x) { return a + Number(x.tutar); }, 0);
    var h = '<button type="button" class="dugme-k" data-act="geri">← Öğrenci listesi</button><div class="yn-baslik" style="margin:1rem 0"><div><h3 style="margin:0">' + esc(o.ad_soyad) + '</h3><small>' + esc(o.telefon) + ' · ' + esc(o.eposta || '') + ' · ' + (o.sanziman === 'otomatik' ? 'Otomatik' : 'Manuel') + ' vites</small></div><div class="yn-dg"><a class="dugme-k wa" href="' + wa(o.telefon) + '" target="_blank" rel="noopener">WhatsApp</a><button type="button" class="dugme-k" data-act="ogrsil" data-id="' + o.id + '">Öğrenciyi sil</button></div></div>';
    h += '<div class="yn-ikili"><section class="kart"><div class="kart-bas"><h3>Evraklar</h3><span class="rozet-s">' + ev.length + ' / 5</span></div><ul class="evrak-satir">' + OZ.EVRAK.map(function (e) { var x = ev.filter(function (z) { return z.tur === e[0]; })[0]; return '<li class="' + (x ? 'tm' : '') + '"><span class="ik-d">' + (x ? '✓' : '') + '</span><div><b>' + esc(e[1]) + '</b><small>' + (x ? esc(x.dosya_adi || '') : 'Eksik') + '</small></div>' + (x ? '<div class="satir-dg"><button type="button" class="dugme-k" data-act="indir" data-yol="' + esc(x.yol) + '" data-ad="' + esc(slug(o.ad_soyad) + '-' + e[0]) + '">⬇ İndir</button></div>' : '') + '</li>'; }).join('') + '</ul></section>';
    h += '<section class="kart"><div class="kart-bas"><h3>Randevular</h3></div>' + (rn.length ? rn.map(function (r) { return '<div class="rnd"><div class="tarih-k">' + OZ.tarihKisa(r.tarih) + '<small>' + OZ.gunEtiket(r.tarih) + '</small></div><div class="rnd-b"><b>' + esc(RT[r.tur] || r.tur) + '</b><span>' + esc(r.saat) + (r.notu ? ' · ' + esc(r.notu) : '') + '</span></div><select data-rdurum="' + r.id + '">' + Object.keys(RDURUM).map(function (k) { return '<option value="' + k + '"' + (r.durum === k ? ' selected' : '') + '>' + RDURUM[k] + '</option>'; }).join('') + '</select><button type="button" class="dugme-k" data-act="rsil" data-id="' + r.id + '">Sil</button></div>'; }).join('') : '<p class="bos">Randevu yok.</p>') +
      '<form data-form="randevu" data-ogr="' + o.id + '" class="rnd-form"><b>Randevu ekle</b><div class="satir"><select name="tur">' + Object.keys(RT).map(function (k) { return '<option value="' + k + '">' + RT[k] + '</option>'; }).join('') + '</select><input type="date" name="tarih" value="' + OZ.bugun(1) + '"></div><div class="satir"><select name="saat">' + SAATLER.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select><input type="text" name="not" maxlength="120" placeholder="Not"></div><button class="dugme d-kirmizi" type="submit">Onaylı randevu ekle</button></form></section></div>';
    h += '<section class="kart"><div class="kart-bas"><h3>Ödeme planı</h3>' + (top ? '<span class="rozet-s">' + OZ.para(odn) + ' / ' + OZ.para(top) + '</span>' : '') + '</div>' + (od.length ? '<ul class="ode-liste">' + od.map(function (x) { var gec = !x.odendi && x.vade < OZ.bugun(0); return '<li class="' + (x.odendi ? 'tm' : '') + '"><label class="ode-ad"><input type="checkbox" data-odendi="' + x.id + '"' + (x.odendi ? ' checked' : '') + '> ' + esc(x.aciklama) + '<small>' + OZ.tarih(x.vade) + '</small></label><b class="' + (x.odendi ? 'yesil' : gec ? 'kirmizi' : '') + '">' + OZ.para(x.tutar) + (gec ? ' · Gecikti' : '') + '</b>' + (gec ? '<a class="dugme-k wa" target="_blank" rel="noopener" href="' + wa(o.telefon, 'Merhaba ' + o.ad_soyad.split(' ')[0] + ', ' + OZ.para(x.tutar) + ' tutarındaki ' + x.aciklama + ' ödemeniz için hatırlatma yapmak istedik. Batıkent Özler Sürücü Kursu') + '">Hatırlat</a>' : '') + '<button type="button" class="dugme-k" data-act="osil" data-id="' + x.id + '">Sil</button></li>'; }).join('') + '</ul>' : '<p class="bos">Ödeme planı yok.</p>') +
      '<div class="yn-ikili" style="margin-top:1rem"><form data-form="taksit" data-ogr="' + o.id + '" class="rnd-form"><b>Taksit planı oluştur</b><div class="satir"><input type="number" name="toplam" min="1" step="1" placeholder="Toplam tutar (₺)" required><input type="number" name="adet" min="1" max="24" value="4" required></div><label class="alt-et">İlk taksit tarihi</label><input type="date" name="vade" value="' + OZ.bugun(30) + '" required><button class="dugme d-kirmizi" type="submit">Planı oluştur</button></form>' +
      '<form data-form="odeme" data-ogr="' + o.id + '" class="rnd-form"><b>Tek ödeme ekle</b><input type="text" name="aciklama" maxlength="80" placeholder="Açıklama (ör. Kayıt ücreti)" required><div class="satir"><input type="number" name="tutar" min="1" step="1" placeholder="Tutar (₺)" required><input type="date" name="vade" value="' + OZ.bugun(0) + '" required></div><button class="dugme d-kirmizi" type="submit">Ekle</button></form></div></section>';
    return h;
  }

  /* ---- Randevular ---- */
  function sRnd() {
    var bg = OZ.bugun(0), l = D.rnd.filter(function (r) { return suz.rnd === 'hepsi' || (suz.rnd === 'bekliyor' ? r.durum === 'bekliyor' : r.tarih >= bg && r.durum !== 'iptal'); });
    var h = '<div class="yn-arac"><select data-f="rnd" aria-label="Randevu süzgeci"><option value="bekliyor"' + (suz.rnd === 'bekliyor' ? ' selected' : '') + '>Onay bekleyenler</option><option value="yaklasan"' + (suz.rnd === 'yaklasan' ? ' selected' : '') + '>Yaklaşan randevular</option><option value="hepsi"' + (suz.rnd === 'hepsi' ? ' selected' : '') + '>Hepsi</option></select></div>';
    if (!l.length) return h + '<p class="bos">Bu görünümde randevu yok.</p>';
    return h + '<div class="yn-tablo">' + l.map(function (r) { return '<div class="rnd"><div class="tarih-k">' + OZ.tarihKisa(r.tarih) + '<small>' + OZ.gunEtiket(r.tarih) + '</small></div><div class="rnd-b"><b>' + esc(ogrAd(r.ogrenci_id)) + '</b><span>' + esc(RT[r.tur] || r.tur) + ' · ' + esc(r.saat) + (r.notu ? ' · ' + esc(r.notu) : '') + '</span></div><select data-rdurum="' + r.id + '">' + Object.keys(RDURUM).map(function (k) { return '<option value="' + k + '"' + (r.durum === k ? ' selected' : '') + '>' + RDURUM[k] + '</option>'; }).join('') + '</select></div>'; }).join('') + '</div>';
  }

  /* ---- Videolar ---- */
  function sVid() {
    return '<form data-form="video" class="kart rnd-form" style="max-width:40rem"><h3>Ders videosu ekle</h3><input type="text" name="baslik" maxlength="100" placeholder="Video başlığı" required><div class="satir"><select name="kategori"><option>Trafik</option><option>İlk yardım</option><option>Motor bilgisi</option><option>Direksiyon</option><option>Genel</option></select><input type="url" name="adres" placeholder="YouTube bağlantısı"></div><label class="alt-et">ya da video dosyası yükle (MP4 veya WebM, en fazla 50 MB)</label><input type="file" name="dosya" accept="video/mp4,video/webm"><div id="vMesaj" class="mesaj" hidden role="status"></div><button class="dugme d-kirmizi" type="submit">Videoyu ekle</button><p class="kucuk-not">Büyük videolar için YouTube\'a yükleyip bağlantısını yapıştırmak daha hızlıdır. Bağlantıyı "listelenmemiş" olarak yükleyebilirsin.</p></form>' +
      '<h3 style="margin:2rem 0 .8rem">Eklenen videolar (' + D.vid.length + ')</h3>' + (D.vid.length ? '<div class="yn-tablo">' + D.vid.map(function (v) { return '<div class="yn-satir"><div><b>' + esc(v.baslik) + '</b><small>' + esc(v.kategori || '') + ' · ' + (v.tur === 'youtube' ? 'YouTube' : 'Yüklenen dosya') + '</small></div><div></div><div></div><div><button type="button" class="dugme-k" data-act="vsil" data-id="' + v.id + '">Sil</button></div></div>'; }).join('') + '</div>' : '<p class="bos">Henüz video yok.</p>');
  }

  /* ---- Fotoğraflar ---- */
  function sGal() {
    return '<form data-form="foto" class="kart rnd-form" style="max-width:40rem"><h3>Fotoğraf ekle</h3><input type="file" name="dosya" accept="image/jpeg,image/png" multiple required><input type="text" name="baslik" maxlength="80" placeholder="Alt yazı (isteğe bağlı)"><div id="fMesaj" class="mesaj" hidden role="status"></div><button class="dugme d-kirmizi" type="submit">Fotoğrafları yükle</button><p class="kucuk-not">Fotoğraflar ana sayfadaki galeride görünür. Fotoğrafı yüklemeden önce kişilerin yüzünü ve plakaları göstermemeye dikkat et.</p></form>' +
      '<h3 style="margin:2rem 0 .8rem">Yüklenen fotoğraflar (' + D.gal.length + ')</h3>' + (D.gal.length ? '<div class="yn-galeri" id="ynGaleri">' + D.gal.map(function (g) { return '<figure data-gid="' + g.id + '"><img alt="' + esc(g.baslik || '') + '" data-yol="' + esc(g.yol) + '"><figcaption>' + esc(g.baslik || '') + '</figcaption><button type="button" class="dugme-k" data-act="gsil" data-id="' + g.id + '">Sil</button></figure>'; }).join('') + '</div>' : '<p class="bos">Henüz fotoğraf yok.</p>');
  }
  async function galeriResimleri() { var imgs = $$('#ynGaleri img[data-yol]'); for (var i = 0; i < imgs.length; i++) { try { imgs[i].src = await V.url('medya', imgs[i].getAttribute('data-yol')); } catch (e) {} } }

  /* ---- Aramalar ---- */
  function sAra() {
    if (!D.ara.length) return '<p class="bos">"Sizi arayalım" talebi yok.</p>';
    return '<div class="yn-tablo">' + D.ara.map(function (a) { return '<div class="yn-satir' + (a.durum === 'yeni' ? ' yeni' : '') + '"><div><b>' + esc(a.ad_soyad) + (a.durum === 'yeni' ? '<span class="rozet-s">YENİ</span>' : '') + '</b><small>' + OZ.tarihSaat(a.olusturma) + '</small></div><div><a class="dugme-k" href="tel:+' + OZ.rakam(a.telefon) + '">' + esc(a.telefon) + '</a></div><div><a class="dugme-k wa" href="' + wa(a.telefon) + '" target="_blank" rel="noopener">WhatsApp</a></div><div><button type="button" class="dugme-k" data-act="adurum" data-id="' + a.id + '" data-d="' + (a.durum === 'yeni' ? 'arandi' : 'yeni') + '">' + (a.durum === 'yeni' ? 'Arandı işaretle' : 'Geri al') + '</button> <button type="button" class="dugme-k" data-act="asil" data-id="' + a.id + '">Sil</button></div></div>'; }).join('') + '</div>';
  }

  /* ---- Ayarlar ---- */
  function sAyr() {
    var K = window.KURS || {};
    var al = [['instagram', 'Instagram bağlantısı', 'https://www.instagram.com/...'], ['youtube', 'YouTube kanal bağlantısı', 'https://www.youtube.com/@...'], ['facebook', 'Facebook sayfa bağlantısı', 'https://www.facebook.com/...'], ['whatsapp', 'WhatsApp numarası', '0551 461 62 66'], ['saatler', 'Çalışma saatleri', 'Hafta içi 09:00-18:00']];
    return '<form data-form="ayar" class="kart rnd-form" style="max-width:40rem"><h3>Site ayarları</h3><p class="kucuk-not">Sitedeki sosyal medya düğmeleri ve çalışma saatleri buradan değişir. Boş bırakılan bağlantı sitede görünmez.</p>' + al.map(function (a) { return '<label class="alt-et" for="ay_' + a[0] + '">' + a[1] + '</label><input id="ay_' + a[0] + '" name="' + a[0] + '" type="text" maxlength="200" placeholder="' + esc(a[2]) + '" value="' + esc(K[a[0]] || '') + '">'; }).join('') + '<div id="aMesaj2" class="mesaj" hidden role="status"></div><button class="dugme d-kirmizi" type="submit">Kaydet</button></form>';
  }

  /* ---- olaylar ---- */
  function yaz(e) {
    var q = e.target.getAttribute('data-q'); if (q) { suz[q + 'Q'] = e.target.value; var pos = e.target.selectionStart; cizIc(); var n = $('[data-q="' + q + '"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
    var bn = e.target.getAttribute('data-bnot'); if (bn) { clearTimeout(yaz._z); var v = e.target.value; yaz._z = setTimeout(function () { V.guncelle('basvurular', 'id', bn, { yonetici_notu: v || null }).then(function () { var x = D.bas.filter(function (z) { return z.id === bn; })[0]; if (x) x.yonetici_notu = v; }).catch(function () { toast('Not kaydedilemedi'); }); }, 700); }
  }
  async function degis(e) {
    var t = e.target, f = t.getAttribute('data-f');
    try {
      if (f) { suz[f] = t.value; return cizIc(); }
      var b = t.getAttribute('data-bdurum'); if (b) { await V.guncelle('basvurular', 'id', b, { durum: t.value }); D.bas.forEach(function (x) { if (x.id === b) x.durum = t.value; }); sayilar(); toast('Durum güncellendi'); return; }
      var r = t.getAttribute('data-rdurum'); if (r) { await V.guncelle('randevular', 'id', r, { durum: t.value }); D.rnd.forEach(function (x) { if (x.id === r) x.durum = t.value; }); sayilar(); toast('Randevu güncellendi'); if (suz.rnd === 'bekliyor') cizIc(); return; }
      var o = t.getAttribute('data-odendi'); if (o) { await V.guncelle('odemeler', 'id', o, { odendi: t.checked }); D.ode.forEach(function (x) { if (x.id === o) x.odendi = t.checked; }); sayilar(); cizIc(); toast(t.checked ? 'Ödendi işaretlendi' : 'Ödeme geri alındı'); }
    } catch (er) { toast('İşlem yapılamadı.'); if (window.console) console.error(er); }
  }
  async function tikla(e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    try {
      if (a === 'csv') return csv();
      if (a === 'indir') { var u = await V.url('evraklar', b.getAttribute('data-yol'), b.getAttribute('data-ad')); if (!u) return toast('Önizleme modunda yüklenen dosya yeniden açılamaz.'); var l = document.createElement('a'); l.href = u; l.target = '_blank'; l.rel = 'noopener'; l.download = b.getAttribute('data-ad'); document.body.appendChild(l); l.click(); l.remove(); return; }
      if (a === 'ogracik') { seciliOgr = id; return cizIc(); }
      if (a === 'geri') { seciliOgr = null; return cizIc(); }
      var onay = { bsil: 'Bu başvuru ve evrakları silinsin mi? Geri alınamaz.', ogrsil: 'Bu öğrenci kaydı, evrakları, randevuları ve ödemeleri silinsin mi? Geri alınamaz.', rsil: 'Randevu silinsin mi?', osil: 'Ödeme kaydı silinsin mi?', vsil: 'Video silinsin mi?', gsil: 'Fotoğraf silinsin mi?', asil: 'Kayıt silinsin mi?' }[a];
      if (onay && !window.confirm(onay)) return;
      if (a === 'bsil') { var bs = D.bas.filter(function (x) { return x.id === id; })[0]; for (var t in (bs.evraklar || {})) await V.dosyaSil('evraklar', bs.evraklar[t]); await V.sil('basvurular', 'id', id); }
      else if (a === 'ogrsil') { var ev = D.evr.filter(function (x) { return x.ogrenci_id === id; }); for (var i = 0; i < ev.length; i++) await V.dosyaSil('evraklar', ev[i].yol); await V.sil('odemeler', 'ogrenci_id', id); await V.sil('randevular', 'ogrenci_id', id); await V.sil('ogrenci_evraklari', 'ogrenci_id', id); await V.sil('ogrenciler', 'id', id); seciliOgr = null; }
      else if (a === 'rsil') await V.sil('randevular', 'id', id);
      else if (a === 'osil') await V.sil('odemeler', 'id', id);
      else if (a === 'vsil') { var v = D.vid.filter(function (x) { return x.id === id; })[0]; if (v && v.yol) await V.dosyaSil('medya', v.yol); await V.sil('videolar', 'id', id); }
      else if (a === 'gsil') { var g = D.gal.filter(function (x) { return x.id === id; })[0]; if (g) await V.dosyaSil('medya', g.yol); await V.sil('galeri', 'id', id); }
      else if (a === 'asil') await V.sil('arama_talepleri', 'id', id);
      else if (a === 'adurum') await V.guncelle('arama_talepleri', 'id', id, { durum: b.getAttribute('data-d') });
      await yenile(); toast('Tamam');
    } catch (er) { toast('İşlem yapılamadı.'); if (window.console) console.error(er); }
  }
  async function gonder(e) {
    var f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    var tur = f.getAttribute('data-form'), oid = f.getAttribute('data-ogr'), x = f.elements, btn = $('button[type=submit]', f);
    btn.disabled = true;
    try {
      if (tur === 'randevu') await V.ekle('randevular', { ogrenci_id: oid, tur: x.tur.value, tarih: x.tarih.value, saat: x.saat.value, notu: x.not.value.trim() || null, durum: 'onaylandi' });
      else if (tur === 'odeme') await V.ekle('odemeler', { ogrenci_id: oid, aciklama: x.aciklama.value.trim(), tutar: Number(x.tutar.value), vade: x.vade.value, odendi: false });
      else if (tur === 'taksit') {
        var top = Number(x.toplam.value), n = Math.max(1, Math.min(24, parseInt(x.adet.value, 10) || 1)), p = Math.floor(top / n * 100) / 100, d0 = new Date(x.vade.value + 'T00:00:00'), s = [];
        for (var i = 0; i < n; i++) { var d = new Date(d0.getFullYear(), d0.getMonth() + i, d0.getDate()); var tt = i === n - 1 ? Math.round((top - p * (n - 1)) * 100) / 100 : p; s.push({ ogrenci_id: oid, aciklama: (i + 1) + '. taksit', tutar: tt, vade: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), odendi: false }); }
        for (var k = 0; k < s.length; k++) await V.ekle('odemeler', s[k]);
      }
      else if (tur === 'video') {
        var baslik = x.baslik.value.trim(), adres = x.adres.value.trim(), dosya = x.dosya.files && x.dosya.files[0];
        if (!dosya && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(adres)) { mesaj('#vMesaj', 'Geçerli bir YouTube bağlantısı yapıştır ya da video dosyası seç.', 'kotu'); btn.disabled = false; return; }
        if (dosya) {
          if (dosya.size > 50 * 1024 * 1024) { mesaj('#vMesaj', 'Dosya 50 MB sınırını aşıyor. YouTube bağlantısı kullan.', 'kotu'); btn.disabled = false; return; }
          mesaj('#vMesaj', 'Yükleniyor…', 'bilgi'); var yol = 'videolar/' + V.uuid() + (dosya.type === 'video/webm' ? '.webm' : '.mp4');
          await V.yukle('medya', yol, dosya, dosya.type || 'video/mp4', false); await V.ekle('videolar', { baslik: baslik, kategori: x.kategori.value, tur: 'dosya', adres: null, yol: yol });
        } else await V.ekle('videolar', { baslik: baslik, kategori: x.kategori.value, tur: 'youtube', adres: adres, yol: null });
      }
      else if (tur === 'foto') {
        var fl = Array.prototype.slice.call(x.dosya.files); mesaj('#fMesaj', 'Yükleniyor…', 'bilgi');
        for (var j = 0; j < fl.length; j++) {
          var son = await OZ.kucult(fl[j], 1600, 300 * 1024), tip = son.type || fl[j].type;
          if (!/^image\/(jpeg|png)$/.test(tip)) continue; var yl = 'galeri/' + V.uuid() + '.' + OZ.uzanti(tip);
          await V.yukle('medya', yl, son, tip, false); await V.ekle('galeri', { baslik: x.baslik.value.trim() || null, yol: yl });
        }
      }
      else if (tur === 'ayar') { var ks = ['instagram', 'youtube', 'facebook', 'whatsapp', 'saatler']; for (var q = 0; q < ks.length; q++) { await V.upsert('ayarlar', { anahtar: ks[q], deger: x[ks[q]].value.trim() }, 'anahtar'); window.KURS[ks[q]] = x[ks[q]].value.trim(); } mesaj('#aMesaj2', 'Kaydedildi. Siteye hemen yansır.', 'iyi'); btn.disabled = false; return; }
      await yenile(); toast('Kaydedildi');
    } catch (er) { toast('İşlem yapılamadı.'); if (window.console) console.error(er); btn.disabled = false; }
  }
  var yenileEski = cizIc;
  cizIc = function () { yenileEski(); if (sekme === 'gal') galeriResimleri(); };

  function csv() {
    var r = [['Tarih', 'Ad soyad', 'Telefon', 'E-posta', 'Vites', 'Durum', 'Not', 'Evrak sayısı']];
    D.bas.forEach(function (b) { r.push([OZ.tarihSaat(b.olusturma), b.ad_soyad, b.telefon, b.eposta || '', b.sanziman, DURUM[b.durum] || b.durum, b.notu || '', Object.keys(b.evraklar || {}).length]); });
    var s = '﻿' + r.map(function (x) { return x.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var bl = new Blob([s], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = 'basvurular.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
})();
