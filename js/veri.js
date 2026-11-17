/* Veri katmanı.
   - js/config.js dolu ise gerçek veritabanını (Supabase) kullanır.
   - Boşsa ÖNİZLEME MODU: her şey yalnızca bu tarayıcıda, sahte verilerle çalışır (siteyi denemek için).
   Sayfalar yalnızca V.* fonksiyonlarını çağırır; hangisinin çalıştığını bilmez. */
(function () {
  'use strict';
  var C = window.OZLER_CONFIG || {};
  var V = window.V = {};
  V.gercek = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  V.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  };

  /* ======================= GERÇEK (SUPABASE) ======================= */
  if (V.gercek) {
    var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    var ok = function (r) { if (r && r.error) { var e = new Error(r.error.message || 'İşlem yapılamadı'); e.kod = r.error.code; throw e; } return r; };
    V.oturum = async function () {
      var r = await sb.auth.getSession(), s = r.data && r.data.session; if (!s) return null;
      var y = false; try { var q = await sb.rpc('is_yonetici'); y = q.data === true; } catch (e) {}
      return { id: s.user.id, email: s.user.email, yonetici: y };
    };
    V.giris = async function (e, p) {
      var r = await sb.auth.signInWithPassword({ email: e, password: p });
      if (r.error) throw new Error('E-posta ya da şifre hatalı.');
      return V.oturum();
    };
    V.kayit = async function (e, p) {
      var r = await sb.auth.signUp({ email: e, password: p });
      if (r.error) { var m = r.error.message || ''; throw new Error(/registered|already/i.test(m) ? 'Bu e-posta ile zaten üyelik var. Giriş yapın.' : (/password/i.test(m) ? 'Şifre en az 6 karakter olmalı.' : 'Üyelik oluşturulamadı.')); }
      if (!r.data.session) throw new Error('E-posta doğrulaması gerekiyor. Gelen kutunuzu kontrol edin.');
      return V.oturum();
    };
    V.cikis = async function () { await sb.auth.signOut(); };
    V.liste = async function (t, o) {
      o = o || {}; var q = sb.from(t).select('*');
      if (o.f) for (var k in o.f) q = q.eq(k, o.f[k]);
      if (o.sira) q = q.order(o.sira, { ascending: !!o.artan });
      if (o.limit) q = q.limit(o.limit);
      return ok(await q).data || [];
    };
    V.ekle = async function (t, obj) { ok(await sb.from(t).insert(obj)); return obj; };
    V.guncelle = async function (t, k, v, obj) { ok(await sb.from(t).update(obj).eq(k, v)); };
    V.upsert = async function (t, obj, c) { ok(await sb.from(t).upsert(obj, { onConflict: c })); };
    V.sil = async function (t, k, v) { ok(await sb.from(t).delete().eq(k, v)); };
    V.yukle = async function (kova, yol, blob, tip, degistir) { ok(await sb.storage.from(kova).upload(yol, blob, { contentType: tip, upsert: !!degistir })); };
    V.url = async function (kova, yol, indirAd) {
      if (kova === 'medya') return sb.storage.from('medya').getPublicUrl(yol).data.publicUrl;
      var r = ok(await sb.storage.from(kova).createSignedUrl(yol, 120, indirAd ? { download: indirAd } : undefined));
      return r.data.signedUrl;
    };
    V.dosyaSil = async function (kova, yol) { try { await sb.storage.from(kova).remove([yol]); } catch (e) {} };
  }

  /* ======================= ÖNİZLEME (SAHTE VERİ) ======================= */
  else {
    var KEY = 'ozler_demo_v3', bellek = {}, durum = null;
    var gun = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    var simdi = function (dk) { return new Date(Date.now() - (dk || 0) * 60000).toISOString(); };
    var tohum = function () {
      var E = 'demo-ogrenci', M = 'demo-mehmet', Z = 'demo-zeynep';
      return {
        oturum: null,
        basvurular: [
          { id: V.uuid(), olusturma: simdi(25), ad_soyad: 'Zeynep Aydın', telefon: '0533 000 00 02', eposta: 'zeynep@ornek.com', sanziman: 'otomatik', notu: 'Akşam saatlerinde ders almak istiyorum.', evraklar: { foto: 'demo:img/logo-ikon.png', diploma: 'demo:img/logo-ikon.png' }, kvkk_onay: true, ozel_veri_riza: false, durum: 'yeni', yonetici_notu: null },
          { id: V.uuid(), olusturma: simdi(1500), ad_soyad: 'Mehmet Demir', telefon: '0532 000 00 01', eposta: null, sanziman: 'manuel', notu: null, evraklar: {}, kvkk_onay: true, ozel_veri_riza: false, durum: 'arandi', yonetici_notu: 'Cuma günü kayda gelecek.' },
          { id: V.uuid(), olusturma: simdi(4000), ad_soyad: 'Can Yıldız', telefon: '0534 000 00 03', eposta: 'can@ornek.com', sanziman: 'manuel', notu: null, evraklar: { saglik: 'demo:img/logo-ikon.png' }, kvkk_onay: true, ozel_veri_riza: true, durum: 'kayit', yonetici_notu: null }
        ],
        arama_talepleri: [
          { id: V.uuid(), olusturma: simdi(70), ad_soyad: 'Selin Kara', telefon: '0535 000 00 05', kvkk_onay: true, durum: 'yeni' },
          { id: V.uuid(), olusturma: simdi(2600), ad_soyad: 'Burak Şen', telefon: '0536 000 00 06', kvkk_onay: true, durum: 'arandi' }
        ],
        ogrenciler: [
          { id: E, olusturma: simdi(9000), ad_soyad: 'Elif Kaya', telefon: '0535 000 00 04', eposta: 'ogrenci@ornek.com', sanziman: 'manuel' },
          { id: M, olusturma: simdi(8000), ad_soyad: 'Mehmet Demir', telefon: '0532 000 00 01', eposta: 'mehmet@ornek.com', sanziman: 'manuel' },
          { id: Z, olusturma: simdi(300), ad_soyad: 'Zeynep Aydın', telefon: '0533 000 00 02', eposta: 'zeynep@ornek.com', sanziman: 'otomatik' }
        ],
        ogrenci_evraklari: [
          { id: V.uuid(), ogrenci_id: E, tur: 'foto', yol: 'demo:img/logo-ikon.png', dosya_adi: 'foto.jpg', olusturma: simdi(8000) },
          { id: V.uuid(), ogrenci_id: E, tur: 'nufus', yol: 'demo:img/logo-ikon.png', dosya_adi: 'nufus.png', olusturma: simdi(8000) },
          { id: V.uuid(), ogrenci_id: E, tur: 'saglik', yol: 'demo:img/logo-ikon.png', dosya_adi: 'saglik.pdf', olusturma: simdi(7000) }
        ],
        randevular: [
          { id: V.uuid(), olusturma: simdi(600), ogrenci_id: E, tur: 'direksiyon', tarih: gun(1), saat: '10:00', notu: null, durum: 'onaylandi' },
          { id: V.uuid(), olusturma: simdi(500), ogrenci_id: E, tur: 'teorik', tarih: gun(3), saat: '14:00', notu: null, durum: 'onaylandi' },
          { id: V.uuid(), olusturma: simdi(30), ogrenci_id: M, tur: 'direksiyon', tarih: gun(2), saat: '15:00', notu: 'Akşama yakın olursa iyi olur.', durum: 'bekliyor' }
        ],
        odemeler: [
          { id: V.uuid(), olusturma: simdi(9000), ogrenci_id: E, aciklama: '1. taksit', tutar: 5000, vade: gun(-60), odendi: true },
          { id: V.uuid(), olusturma: simdi(9000), ogrenci_id: E, aciklama: '2. taksit', tutar: 5000, vade: gun(-30), odendi: true },
          { id: V.uuid(), olusturma: simdi(9000), ogrenci_id: E, aciklama: '3. taksit', tutar: 5000, vade: gun(3), odendi: false },
          { id: V.uuid(), olusturma: simdi(9000), ogrenci_id: E, aciklama: '4. taksit', tutar: 5000, vade: gun(33), odendi: false },
          { id: V.uuid(), olusturma: simdi(8000), ogrenci_id: M, aciklama: '1. taksit', tutar: 5000, vade: gun(-25), odendi: true },
          { id: V.uuid(), olusturma: simdi(8000), ogrenci_id: M, aciklama: '2. taksit', tutar: 5000, vade: gun(-2), odendi: false }
        ],
        videolar: [
          { id: V.uuid(), olusturma: simdi(900), baslik: 'Trafik işaretleri: ilk bakışta tanı', kategori: 'Trafik', tur: 'youtube', adres: 'https://www.youtube.com/results?search_query=trafik+i%C5%9Faretleri+e%C4%9Fitim', yol: null },
          { id: V.uuid(), olusturma: simdi(800), baslik: 'İlk yardım: ilk 5 dakika', kategori: 'İlk yardım', tur: 'youtube', adres: 'https://www.youtube.com/results?search_query=temel+ilk+yard%C4%B1m+e%C4%9Fitimi', yol: null },
          { id: V.uuid(), olusturma: simdi(700), baslik: 'Motor bilgisi: göstergeler ne anlatır?', kategori: 'Motor bilgisi', tur: 'youtube', adres: 'https://www.youtube.com/results?search_query=ara%C3%A7+g%C3%B6stergeleri+ne+anlat%C4%B1r', yol: null },
          { id: V.uuid(), olusturma: simdi(600), baslik: 'Direksiyon: ilk kalkış ve park', kategori: 'Direksiyon', tur: 'youtube', adres: 'https://www.youtube.com/results?search_query=direksiyon+dersi+ilk+kalk%C4%B1%C5%9F', yol: null }
        ],
        galeri: [
          { id: V.uuid(), olusturma: simdi(500), baslik: 'Eğitim aracımız', yol: 'demo:img/arac-ozler.jpg' },
          { id: V.uuid(), olusturma: simdi(400), baslik: 'Şehir içi eğitim', yol: 'demo:img/arac-sehir.jpg' },
          { id: V.uuid(), olusturma: simdi(300), baslik: 'Direksiyon başında', yol: 'demo:img/direksiyon-1.jpg' },
          { id: V.uuid(), olusturma: simdi(200), baslik: 'Binamız', yol: 'demo:img/on-cephe.jpg' }
        ],
        ayarlar: []
      };
    };
    var yukleDurum = function () {
      if (durum) return durum;
      try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.basvurular) { durum = s; return s; } } catch (e) {}
      durum = tohum(); kaydet(); return durum;
    };
    var kaydet = function () { try { localStorage.setItem(KEY, JSON.stringify(durum)); } catch (e) {} };
    var tablo = function (t) { var s = yukleDurum(); if (!s[t]) s[t] = []; return s[t]; };
    var kopya = function (x) { return JSON.parse(JSON.stringify(x)); };
    var bekle = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 120); }); };

    V.demoSifirla = function () { try { localStorage.removeItem(KEY); } catch (e) {} durum = null; };
    V.oturum = async function () { var s = yukleDurum(); return bekle(s.oturum ? kopya(s.oturum) : null); };
    V.giris = async function (e, p) {
      e = String(e).trim().toLowerCase();
      if (p !== 'demo') throw new Error('Önizleme modunda şifre "demo" yazılmalı.');
      var y = /^yonetici/.test(e), s = yukleDurum(), o = tablo('ogrenciler').filter(function (x) { return String(x.eposta).toLowerCase() === e; })[0];
      s.oturum = { id: o ? o.id : (y ? 'demo-yonetici' : 'demo-' + e.replace(/\W/g, '')), email: e, yonetici: y }; kaydet();
      return bekle(kopya(s.oturum));
    };
    V.kayit = async function (e, p) {
      e = String(e).trim().toLowerCase(); if (String(p).length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
      var s = yukleDurum(); s.oturum = { id: 'demo-' + e.replace(/\W/g, ''), email: e, yonetici: false }; kaydet(); return bekle(kopya(s.oturum));
    };
    V.cikis = async function () { var s = yukleDurum(); s.oturum = null; kaydet(); return bekle(); };
    V.liste = async function (t, o) {
      o = o || {}; var l = tablo(t).slice();
      if (o.f) l = l.filter(function (x) { for (var k in o.f) if (x[k] !== o.f[k]) return false; return true; });
      if (o.sira) l.sort(function (a, b) { var x = a[o.sira], y = b[o.sira]; return (x > y ? 1 : x < y ? -1 : 0) * (o.artan ? 1 : -1); });
      if (o.limit) l = l.slice(0, o.limit);
      return bekle(kopya(l));
    };
    V.ekle = async function (t, obj) { var x = kopya(obj); if (!x.olusturma) x.olusturma = simdi(0); if (!x.id && t !== 'ayarlar') x.id = V.uuid(); tablo(t).push(x); kaydet(); return bekle(x); };
    V.guncelle = async function (t, k, v, obj) { tablo(t).forEach(function (x) { if (x[k] === v) for (var a in obj) x[a] = obj[a]; }); kaydet(); return bekle(); };
    V.upsert = async function (t, obj, c) {
      var l = tablo(t), cs = String(c).split(','), x = l.filter(function (r) { return cs.every(function (k) { return r[k] === obj[k]; }); })[0];
      if (x) for (var a in obj) x[a] = obj[a]; else { var n = kopya(obj); if (!n.olusturma) n.olusturma = simdi(0); if (!n.id && t !== 'ayarlar') n.id = V.uuid(); l.push(n); }
      kaydet(); return bekle();
    };
    V.sil = async function (t, k, v) { var s = yukleDurum(); s[t] = tablo(t).filter(function (x) { return x[k] !== v; }); kaydet(); return bekle(); };
    V.yukle = async function (kova, yol, blob) { bellek[kova + '/' + yol] = URL.createObjectURL(blob); return bekle(); };
    V.url = async function (kova, yol) {
      if (!yol) return '';
      if (String(yol).indexOf('demo:') === 0) return String(yol).slice(5);
      return bellek[kova + '/' + yol] || '';
    };
    V.dosyaSil = async function (kova, yol) { delete bellek[kova + '/' + yol]; return bekle(); };
  }
})();
