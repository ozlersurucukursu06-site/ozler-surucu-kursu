/* Öğrenci paneli: üyelik/giriş, eksik evrak yükleme, randevu, ödemeler, videolar */
(function () {
  'use strict';
  var OZ = window.OZ, $ = OZ.$, $$ = OZ.$$, esc = OZ.esc;
  var RT = { direksiyon: 'Direksiyon dersi', teorik: 'Teorik ders', deneme: 'Deneme sınavı', sinav: 'Sınav günü' };
  var DURUM = { bekliyor: ['Onay bekliyor', 'bek'], onaylandi: ['Onaylandı', 'iyi'], iptal: ['İptal', 'kotu'] };
  var SAATLER = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  var kok, oturum, ogr, evr, rnd, ode, vid;

  function mesaj(el, t, c) { el.className = 'mesaj ' + c; el.textContent = t; el.hidden = !t; }

  OZ.sayfa.ogrenci = async function () {
    kok = $('#ogrAlan'); if (!kok) return;
    kok.innerHTML = '<p class="yukleniyor">Yükleniyor…</p>';
    try { oturum = await V.oturum(); } catch (e) { oturum = null; }
    if (!oturum) return girisCiz();
    await profilYukle();
  };

  /* ---- giriş / üyelik ---- */
  function girisCiz(sekme) {
    sekme = sekme || 'giris';
    kok.innerHTML = '<div class="giris-kutu"><div class="sekmeler" role="tablist"><button type="button" role="tab" data-s="giris" class="' + (sekme === 'giris' ? 'ac' : '') + '">Giriş yap</button><button type="button" role="tab" data-s="uye" class="' + (sekme === 'uye' ? 'ac' : '') + '">Üye ol</button></div>' +
      (sekme === 'giris' ?
        '<form class="form" id="gForm" novalidate><div><label for="gEposta">E-posta</label><input id="gEposta" type="email" autocomplete="email" required></div><div><label for="gSifre">Şifre</label><input id="gSifre" type="password" autocomplete="current-password" required></div><div id="gMesaj" class="mesaj" role="status" hidden></div><button class="dugme d-kirmizi" type="submit">Giriş yap</button><p class="kucuk-not">Şifreni unuttuysan kursu ara, yeni şifre tanımlanır.</p></form>' :
        '<form class="form" id="uForm" novalidate><p class="kucuk-not">Kayıt olduğunda sana verilen e-posta ile üye ol. Üye olduktan sonra eksik evraklarını yükleyebilir, randevu isteyebilir ve ödemelerini görebilirsin.</p><div class="satir"><div><label for="uAd">Ad soyad</label><input id="uAd" type="text" maxlength="80" autocomplete="name" required></div><div><label for="uTel">Telefon</label><input id="uTel" type="tel" maxlength="20" inputmode="tel" autocomplete="tel" required></div></div><div><label for="uEposta">E-posta</label><input id="uEposta" type="email" maxlength="120" autocomplete="email" required></div><div><label for="uSifre">Şifre <small>(en az 6 karakter)</small></label><input id="uSifre" type="password" minlength="6" autocomplete="new-password" required></div><div><label>Eğitim vitesi</label><div class="vites-sec"><label><input type="radio" name="uVites" value="manuel" checked> Manuel</label><label><input type="radio" name="uVites" value="otomatik"> Otomatik</label></div></div>' +
        '<label class="secenek"><input type="checkbox" id="uOnay" required><span><a href="kvkk.html" target="_blank">Aydınlatma metnini</a> okudum, kişisel verilerimin kurs işlemleri için işlenmesini kabul ediyorum.</span></label><div id="uMesaj" class="mesaj" role="status" hidden></div><button class="dugme d-kirmizi" type="submit">Üye ol</button></form>') + '</div>';
    $$('[data-s]', kok).forEach(function (b) { b.addEventListener('click', function () { girisCiz(b.getAttribute('data-s')); }); });
    var g = $('#gForm'), u = $('#uForm');
    if (g) g.addEventListener('submit', async function (e) {
      e.preventDefault(); var m = $('#gMesaj'), b = $('button[type=submit]', g);
      var em = $('#gEposta').value.trim(), sf = $('#gSifre').value;
      if (!em || !sf) return mesaj(m, 'E-posta ve şifreni yaz.', 'kotu');
      b.disabled = true; b.textContent = 'Giriş yapılıyor…';
      try { oturum = await V.giris(em, sf); await profilYukle(); } catch (er) { mesaj(m, er.message || 'Giriş yapılamadı.', 'kotu'); b.disabled = false; b.textContent = 'Giriş yap'; }
    });
    if (u) u.addEventListener('submit', async function (e) {
      e.preventDefault(); var m = $('#uMesaj'), b = $('button[type=submit]', u);
      var ad = $('#uAd').value.trim(), tel = $('#uTel').value.trim(), em = $('#uEposta').value.trim(), sf = $('#uSifre').value;
      if (ad.length < 3) return mesaj(m, 'Adını ve soyadını yaz.', 'kotu');
      if (tel.replace(/\D/g, '').length < 10) return mesaj(m, 'Telefon numaranı eksiksiz yaz.', 'kotu');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return mesaj(m, 'E-posta adresi geçerli görünmüyor.', 'kotu');
      if (sf.length < 6) return mesaj(m, 'Şifre en az 6 karakter olmalı.', 'kotu');
      if (!$('#uOnay').checked) return mesaj(m, 'Devam etmek için aydınlatma metni onayını işaretle.', 'kotu');
      b.disabled = true; b.textContent = 'Üyelik oluşturuluyor…';
      try {
        oturum = await V.kayit(em, sf);
        await V.ekle('ogrenciler', { id: oturum.id, ad_soyad: ad, telefon: tel, eposta: em, sanziman: $('input[name=uVites]:checked', u).value });
        await profilYukle();
      } catch (er) { mesaj(m, er.message || 'Üyelik oluşturulamadı.', 'kotu'); b.disabled = false; b.textContent = 'Üye ol'; }
    });
  }

  /* ---- veriler ---- */
  async function profilYukle() {
    var l = await V.liste('ogrenciler', { f: { id: oturum.id } });
    ogr = l[0];
    if (!ogr) return profilTamamla();
    await verileriYukle(); panelCiz();
  }
  function profilTamamla() {
    kok.innerHTML = '<div class="giris-kutu"><h2>Profilini tamamla</h2><form class="form" id="pForm" novalidate><div class="satir"><div><label for="pAd">Ad soyad</label><input id="pAd" type="text" maxlength="80" required></div><div><label for="pTel">Telefon</label><input id="pTel" type="tel" maxlength="20" required></div></div><div><label>Eğitim vitesi</label><div class="vites-sec"><label><input type="radio" name="pV" value="manuel" checked> Manuel</label><label><input type="radio" name="pV" value="otomatik"> Otomatik</label></div></div><div id="pMesaj" class="mesaj" hidden></div><button class="dugme d-kirmizi" type="submit">Kaydet</button> <button class="dugme d-cerceve" type="button" id="pCikis">Çıkış yap</button></form></div>';
    $('#pCikis').addEventListener('click', cikis);
    $('#pForm').addEventListener('submit', async function (e) {
      e.preventDefault(); var ad = $('#pAd').value.trim(), tel = $('#pTel').value.trim(), m = $('#pMesaj');
      if (ad.length < 3 || tel.replace(/\D/g, '').length < 10) return mesaj(m, 'Adını ve telefon numaranı eksiksiz yaz.', 'kotu');
      try { await V.ekle('ogrenciler', { id: oturum.id, ad_soyad: ad, telefon: tel, eposta: oturum.email, sanziman: $('input[name=pV]:checked').value }); await profilYukle(); } catch (er) { mesaj(m, 'Kaydedilemedi, tekrar dene.', 'kotu'); }
    });
  }
  async function verileriYukle() {
    var f = { ogrenci_id: oturum.id };
    var r = await Promise.all([V.liste('ogrenci_evraklari', { f: f }), V.liste('randevular', { f: f, sira: 'tarih', artan: true }), V.liste('odemeler', { f: f, sira: 'vade', artan: true }), V.liste('videolar', { sira: 'olusturma', artan: false })]);
    evr = r[0]; rnd = r[1]; ode = r[2]; vid = r[3];
  }
  async function cikis() { await V.cikis(); oturum = null; ogr = null; girisCiz(); }

  /* ---- panel ---- */
  function panelCiz() {
    var tamam = OZ.EVRAK.filter(function (e) { return evr.some(function (x) { return x.tur === e[0]; }); }).length;
    var eksik = OZ.EVRAK.filter(function (e) { return !evr.some(function (x) { return x.tur === e[0]; }); }).map(function (e) { return e[1]; });
    var h = '<div class="ogr-ust"><div><h2>Merhaba ' + esc(ogr.ad_soyad.split(' ')[0]) + '</h2><p>B sınıfı · ' + (ogr.sanziman === 'otomatik' ? 'Otomatik' : 'Manuel') + ' vites' + '</p></div><button type="button" class="dugme d-cerceve" id="oCikis">Çıkış yap</button></div>';
    if (eksik.length) h += '<div class="uyari-kutu"><b>Eksik evraklarını yükle.</b> Eksik: ' + esc(eksik.join(', ')) + '.</div>';
    h += '<div class="ogr-izgara">';

    /* evraklar */
    h += '<section class="kart" id="evrakKart"><div class="kart-bas"><h3>Evraklarım</h3><span class="rozet-s">' + tamam + ' / ' + OZ.EVRAK.length + ' tamam</span></div><div class="cubuk"><i style="width:' + (tamam / OZ.EVRAK.length * 100) + '%"></i></div><ul class="evrak-satir">';
    OZ.EVRAK.forEach(function (e) {
      var x = evr.filter(function (z) { return z.tur === e[0]; })[0];
      h += '<li class="' + (x ? 'tm' : '') + '"><span class="ik-d">' + (x ? '✓' : '') + '</span><div><b>' + esc(e[1]) + '</b><small>' + (x ? esc(x.dosya_adi || 'Yüklendi') : esc(e[2])) + '</small></div><div class="satir-dg">' + (x ? '<button type="button" class="dugme-k" data-gor="' + e[0] + '">Görüntüle</button>' : '') + '<label class="dugme-k kirmizi" for="ef_' + e[0] + '">' + (x ? 'Değiştir' : 'Yükle') + '</label><input class="gizli" id="ef_' + e[0] + '" type="file" data-tur="' + e[0] + '" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"></div></li>';
    });
    h += '</ul><label class="secenek"><input type="checkbox" id="ozelRiza"' + (ogr.ozel_veri_riza ? ' checked' : '') + '><span>Sağlık raporu ve adli sicil kaydı özel nitelikli kişisel verilerdir. Bunları kayıt işlemi için yüklememi ve işlenmesini kabul ediyorum. (<a href="kvkk.html" target="_blank">Aydınlatma metni</a>)</span></label><div id="evMesaj" class="mesaj" hidden role="status"></div><p class="kucuk-not">JPG, PNG veya PDF, en fazla 8 MB. Yalnızca kurs yetkilileri görebilir. E-Devlet şifreni buraya yazma.</p></section>';

    /* randevular */
    var yakin = rnd.filter(function (r) { return r.tarih >= OZ.bugun(0) && r.durum !== 'iptal'; });
    h += '<section class="kart"><div class="kart-bas"><h3>Randevularım</h3></div>';
    h += yakin.length ? yakin.map(function (r) { var d = DURUM[r.durum] || DURUM.bekliyor; return '<div class="rnd"><div class="tarih-k">' + OZ.tarihKisa(r.tarih) + '<small>' + OZ.gunEtiket(r.tarih) + '</small></div><div class="rnd-b"><b>' + esc(RT[r.tur] || r.tur) + '</b><span>' + esc(r.saat) + (r.notu ? ' · ' + esc(r.notu) : '') + '</span></div><span class="chip ' + d[1] + '">' + d[0] + '</span>' + (r.durum === 'bekliyor' ? '<button type="button" class="dugme-k" data-vaz="' + r.id + '">Vazgeç</button>' : '') + '</div>'; }).join('') : '<p class="bos">Yaklaşan randevun yok.</p>';
    h += '<form id="rForm" class="rnd-form"><b>Randevu iste</b><div class="satir"><select id="rTur" aria-label="Randevu türü">' + Object.keys(RT).map(function (k) { return '<option value="' + k + '">' + RT[k] + '</option>'; }).join('') + '</select><input id="rTarih" type="date" min="' + OZ.bugun(1) + '" value="' + OZ.bugun(1) + '" aria-label="Tarih"></div><div class="satir"><select id="rSaat" aria-label="Saat">' + SAATLER.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select><input id="rNot" type="text" maxlength="120" placeholder="Notun (isteğe bağlı)" aria-label="Not"></div><button class="dugme d-kirmizi" type="submit">Randevu iste</button><div id="rMesaj" class="mesaj" hidden role="status"></div><p class="kucuk-not">Randevu isteğin kursa iletilir. Kurs onayladığında burada "Onaylandı" yazar.</p></form></section>';

    /* ödemeler */
    var top = ode.reduce(function (a, x) { return a + Number(x.tutar); }, 0), odn = ode.filter(function (x) { return x.odendi; }).reduce(function (a, x) { return a + Number(x.tutar); }, 0);
    h += '<section class="kart"><div class="kart-bas"><h3>Ödemelerim</h3>' + (top ? '<span class="rozet-s">' + OZ.para(odn) + ' / ' + OZ.para(top) + '</span>' : '') + '</div>';
    if (ode.length) {
      h += '<div class="cubuk"><i style="width:' + (top ? odn / top * 100 : 0) + '%"></i></div><ul class="ode-liste">' + ode.map(function (x) { var gec = !x.odendi && x.vade < OZ.bugun(0); return '<li class="' + (x.odendi ? 'tm' : '') + '"><span class="ik-d">' + (x.odendi ? '✓' : '') + '</span><span class="ode-ad">' + esc(x.aciklama) + '<small>' + OZ.tarih(x.vade) + '</small></span><b class="' + (x.odendi ? 'yesil' : gec ? 'kirmizi' : '') + '">' + OZ.para(x.tutar) + (x.odendi ? ' · Ödendi' : gec ? ' · Gecikti' : '') + '</b></li>'; }).join('') + '</ul>';
    } else h += '<p class="bos">Ödeme planın kayıt sırasında kurs tarafından buraya girilir.</p>';
    h += '</section>';

    /* videolar */
    h += '<section class="kart genis"><div class="kart-bas"><h3>Ders videoları</h3><a class="dugme-k" href="ders-notlari.html">Ders notları</a> <a class="dugme-k" href="deneme-sinavi.html">Deneme sınavı</a></div>' + (vid.length ? '<div class="vgrid" id="oVideo">' + vid.map(OZ.videoKarti).join('') + '</div>' : '<p class="bos">Henüz video eklenmedi.</p>') + '</section>';
    h += '</div>';
    kok.innerHTML = h;

    $('#oCikis').addEventListener('click', cikis);
    var vk = $('#oVideo'); if (vk) OZ.videolariBagla(vk, function () { return vid; });
    $$('[data-gor]', kok).forEach(function (b) { b.addEventListener('click', async function () { var x = evr.filter(function (z) { return z.tur === b.getAttribute('data-gor'); })[0]; try { var u = await V.url('evraklar', x.yol); if (u) window.open(u, '_blank', 'noopener'); else toast('Önizleme modunda bu dosya açılamıyor.'); } catch (e) { toast('Dosya açılamadı.'); } }); });
    $$('input[type=file][data-tur]', kok).forEach(function (i) { i.addEventListener('change', function () { evrakYukle(i); }); });
    $$('[data-vaz]', kok).forEach(function (b) { b.addEventListener('click', async function () { try { await V.sil('randevular', 'id', b.getAttribute('data-vaz')); await verileriYukle(); panelCiz(); toast('Randevu isteği geri alındı'); } catch (e) { toast('İşlem yapılamadı.'); } }); });
    $('#rForm').addEventListener('submit', randevuIste);
  }

  async function evrakYukle(inp) {
    var tur = inp.getAttribute('data-tur'), file = inp.files && inp.files[0], m = $('#evMesaj'); if (!file) return;
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(file.type)) { inp.value = ''; return mesaj(m, 'Yalnızca JPG, PNG veya PDF yükleyebilirsin.', 'kotu'); }
    if ((tur === 'saglik' || tur === 'sabika') && !$('#ozelRiza').checked) { inp.value = ''; return mesaj(m, 'Sağlık raporu ya da adli sicil yüklemek için önce açık rıza kutusunu işaretle.', 'kotu'); }
    var son = await OZ.kucult(file);
    if (son.size > 8 * 1024 * 1024) { inp.value = ''; return mesaj(m, 'Dosya çok büyük (en fazla 8 MB).', 'kotu'); }
    mesaj(m, 'Yükleniyor…', 'bilgi');
    try {
      var tip = son.type || file.type, yol = 'ogrenci/' + oturum.id + '/' + tur + '.' + OZ.uzanti(tip), eski = evr.filter(function (z) { return z.tur === tur; })[0];
      if (eski && eski.yol !== yol) await V.dosyaSil('evraklar', eski.yol);
      await V.yukle('evraklar', yol, son, tip, true);
      await V.upsert('ogrenci_evraklari', { ogrenci_id: oturum.id, tur: tur, yol: yol, dosya_adi: file.name }, 'ogrenci_id,tur');
      if ((tur === 'saglik' || tur === 'sabika') && !ogr.ozel_veri_riza) { await V.guncelle('ogrenciler', 'id', oturum.id, { ozel_veri_riza: true }); ogr.ozel_veri_riza = true; }
      await verileriYukle(); panelCiz(); toast('Evrak yüklendi');
    } catch (e) { if (window.console) console.error(e); mesaj($('#evMesaj'), 'Yüklenemedi. Tekrar dene ya da kursa getir.', 'kotu'); }
  }

  async function randevuIste(e) {
    e.preventDefault(); var m = $('#rMesaj'), t = $('#rTarih').value;
    if (!t || t < OZ.bugun(1)) return mesaj(m, 'En erken yarın için randevu isteyebilirsin.', 'kotu');
    try { await V.ekle('randevular', { ogrenci_id: oturum.id, tur: $('#rTur').value, tarih: t, saat: $('#rSaat').value, notu: $('#rNot').value.trim() || null, durum: 'bekliyor' }); await verileriYukle(); panelCiz(); toast('Randevu isteğin kursa iletildi'); }
    catch (er) { mesaj(m, 'İstek gönderilemedi, tekrar dene.', 'kotu'); }
  }
})();
