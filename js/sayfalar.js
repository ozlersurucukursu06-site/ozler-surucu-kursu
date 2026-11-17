/* Herkese açık sayfaların betikleri: ön kayıt, arama formu, deneme sınavı, ders videoları, fotoğraflar */
(function () {
  'use strict';
  var OZ = window.OZ, $ = OZ.$, $$ = OZ.$$, esc = OZ.esc;

  OZ.EVRAK = [
    ['foto', '2 adet biyometrik fotoğraf', 'Tek dosyada iki fotoğraf ya da ayrı ayrı çekilmiş görsel olabilir.'],
    ['diploma', 'Diploma', 'Öğrenci belgesi ya da tastikname de olur.'],
    ['saglik', 'Sağlık raporu', 'Aile hekiminden ücretsiz alınır.'],
    ['nufus', 'Nüfus cüzdanı', 'Ön ve arka yüzü.'],
    ['sabika', 'Adli sicil kaydı', "e-Devlet'ten alınabilir."]
  ];
  OZ.EVRAK_AD = {}; OZ.EVRAK.forEach(function (e) { OZ.EVRAK_AD[e[0]] = e[1]; });

  /* ---------- fotoğraf galerisi (ana sayfa, hakkımızda) ---------- */
  OZ.galeriCiz = async function (kutu) {
    if (!kutu) return;
    try {
      var l = await V.liste('galeri', { sira: 'olusturma', artan: false, limit: 12 }), h = '';
      for (var i = 0; i < l.length; i++) {
        var u = await V.url('medya', l[i].yol); if (!u) continue;
        h += '<figure><a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" loading="lazy" alt="' + esc(l[i].baslik || 'Kurs fotoğrafı') + '"></a>' + (l[i].baslik ? '<figcaption>' + esc(l[i].baslik) + '</figcaption>' : '') + '</figure>';
      }
      kutu.innerHTML = h; var bolum = kutu.closest('[data-galeri-bolum]'); if (bolum) bolum.hidden = !h;
    } catch (e) { var b = kutu.closest('[data-galeri-bolum]'); if (b) b.hidden = true; }
  };
  OZ.sayfa.anasayfa = function () { OZ.galeriCiz($('#galeriKutu')); };
  OZ.sayfa.hakkimizda = function () { OZ.galeriCiz($('#galeriKutu')); };

  /* ---------- Ön kayıt ---------- */
  OZ.sayfa.basvuru = function () {
    var f = $('#basvuruForm'); if (!f) return;
    var msg = $('#mesaj'), btn = $('#gonder'), ilerleme = $('#ilerleme'), cubuk = ilerleme.querySelector('i');
    var MAX = 8 * 1024 * 1024, dosyalar = {}, acilis = Date.now();
    function goster(t, c) { msg.className = 'mesaj ' + c; msg.textContent = t; if (t) msg.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    function onayGuncelle() { var g = !!(dosyalar.saglik || dosyalar.sabika); $('#onay2kutu').hidden = !g; $('#onay2').required = g; }
    OZ.EVRAK.forEach(function (e) {
      var tur = e[0], kutu = $('.dosya[data-tur="' + tur + '"]'), inp = $('#f_' + tur), durum = kutu.querySelector('.durum');
      inp.addEventListener('change', async function () {
        var file = inp.files && inp.files[0]; delete dosyalar[tur]; kutu.classList.remove('dolu'); durum.hidden = true;
        if (!file) return onayGuncelle();
        if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(file.type)) { inp.value = ''; onayGuncelle(); return goster('Yalnızca JPG, PNG veya PDF yükleyebilirsiniz.', 'kotu'); }
        var son = await OZ.kucult(file);
        if (son.size > MAX) { inp.value = ''; onayGuncelle(); return goster('Dosya çok büyük (en fazla 8 MB). Daha küçük bir dosya seçin.', 'kotu'); }
        dosyalar[tur] = { blob: son, tip: son.type || file.type, ad: file.name };
        kutu.classList.add('dolu'); durum.hidden = false; durum.textContent = '✓ ' + file.name + ' (' + Math.max(1, Math.round(son.size / 1024)) + ' KB)';
        msg.className = ''; msg.textContent = ''; onayGuncelle();
      });
    });
    f.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if ($('#bal').value) return;
      var ad = $('#ad').value.trim(), tel = $('#tel').value.trim(), eposta = $('#eposta').value.trim();
      if (ad.length < 3) return goster('Lütfen adınızı ve soyadınızı yazın.', 'kotu');
      if (tel.replace(/\D/g, '').length < 10) return goster('Lütfen geçerli bir telefon numarası yazın.', 'kotu');
      if (eposta && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return goster('E-posta adresi geçerli görünmüyor.', 'kotu');
      if (!$('#onay1').checked) return goster('Devam etmek için aydınlatma metni onayını işaretleyin.', 'kotu');
      var gerek = !!(dosyalar.saglik || dosyalar.sabika), riza = $('#onay2').checked;
      if (gerek && !riza) return goster('Sağlık raporu ya da adli sicil yüklemek için açık rıza kutusunu işaretleyin.', 'kotu');
      if (Date.now() - acilis < 3000) return goster('Lütfen formu kontrol edip tekrar gönderin.', 'kotu');
      btn.disabled = true; btn.textContent = 'Gönderiliyor…'; msg.className = ''; msg.textContent = '';
      var id = V.uuid(), yollar = {}, anahtarlar = Object.keys(dosyalar), yapilan = 0;
      ilerleme.style.display = anahtarlar.length ? 'block' : 'none'; cubuk.style.width = '0';
      try {
        for (var i = 0; i < anahtarlar.length; i++) {
          var tur = anahtarlar[i], d = dosyalar[tur], yol = id + '/' + tur + '.' + OZ.uzanti(d.tip);
          await V.yukle('evraklar', yol, d.blob, d.tip, false);
          yollar[tur] = yol; yapilan++; cubuk.style.width = Math.round(yapilan / anahtarlar.length * 100) + '%';
        }
        var v = f.querySelector('input[name="vites"]:checked');
        await V.ekle('basvurular', { id: id, ad_soyad: ad, telefon: tel, eposta: eposta || null, sanziman: v ? v.value : 'manuel', notu: $('#not').value.trim() || null, evraklar: yollar, kvkk_onay: true, ozel_veri_riza: gerek && riza });
        f.reset(); dosyalar = {}; $$('.dosya').forEach(function (x) { x.classList.remove('dolu'); x.querySelector('.durum').hidden = true; });
        onayGuncelle(); ilerleme.style.display = 'none';
        goster('Başvurunuz alındı. Teşekkürler! Kurs en kısa sürede sizi arayacak.', 'iyi');
      } catch (err) {
        ilerleme.style.display = 'none'; goster('Başvuru gönderilemedi. İnternetinizi kontrol edip tekrar deneyin ya da bizi arayın.', 'kotu');
        if (window.console) console.error(err);
      }
      btn.disabled = false; btn.textContent = 'Ön kaydı gönder';
    });
  };

  /* ---------- Sizi arayalım ---------- */
  OZ.sayfa.iletisim = function () {
    var f = $('#aramaForm'); if (!f) return;
    var msg = $('#aMesaj'), btn = $('#aGonder'), acilis = Date.now();
    function goster(t, c) { msg.className = 'mesaj ' + c; msg.textContent = t; }
    f.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if ($('#aBal').value) return;
      var ad = $('#aAd').value.trim(), tel = $('#aTel').value.trim();
      if (ad.length < 3) return goster('Lütfen adınızı ve soyadınızı yazın.', 'kotu');
      if (tel.replace(/\D/g, '').length < 10) return goster('Lütfen geçerli bir telefon numarası yazın.', 'kotu');
      if (!$('#aOnay').checked) return goster('Devam etmek için onay kutusunu işaretleyin.', 'kotu');
      if (Date.now() - acilis < 3000) return goster('Lütfen formu kontrol edip tekrar gönderin.', 'kotu');
      btn.disabled = true; btn.textContent = 'Gönderiliyor…';
      try { await V.ekle('arama_talepleri', { ad_soyad: ad, telefon: tel, kvkk_onay: true }); f.reset(); goster('Talebiniz alındı. Kurs sizi en kısa sürede arayacak.', 'iyi'); }
      catch (e) { goster('Gönderilemedi. Lütfen tekrar deneyin ya da bizi arayın.', 'kotu'); }
      btn.disabled = false; btn.textContent = 'Beni arayın';
    });
  };

  /* ---------- Deneme sınavı ---------- */
  var SORULAR = [
    { q: 'Kırmızı ışık yanan bir trafik ışığında sürücü ne yapmalıdır?', o: ['Yavaşlayıp geçmeli', 'Durmalı ve yeşil ışığı beklemeli', 'Korna çalarak geçmeli', 'Sağa çekip geçmeli'], d: 1, a: 'Kırmızı ışıkta durulur ve ışık yeşile dönene kadar beklenir.' },
    { q: 'Yaya geçidine yaklaşan sürücü ne yapmalıdır?', o: ['Hızını artırmalı', 'Yavaşlayıp yayalara yol vermeli', 'Korna çalıp geçmeli', 'Yalnızca kırmızıda durmalı'], d: 1, a: 'Yaya geçidinde yayalara geçiş önceliği tanınır.' },
    { q: 'Araçta emniyet kemerini kimler takmak zorundadır?', o: ['Yalnızca sürücü', 'Sürücü ve ön yolcu', 'Araçtaki herkes (ön ve arka)', 'Yalnızca şehir dışında sürücü'], d: 2, a: 'Emniyet kemeri araçtaki herkes için zorunludur.' },
    { q: 'Motosiklet sürücüsünün kask takması nasıldır?', o: ['İsteğe bağlıdır', 'Yalnızca şehir dışında zorunludur', 'Zorunludur', 'Yalnızca gece zorunludur'], d: 2, a: 'Motosiklet sürücüleri ve yolcuları için koruyucu kask zorunludur.' },
    { q: 'Dur levhasının şekli nedir?', o: ['Üçgen', 'Daire', 'Sekizgen', 'Kare'], d: 2, a: 'Dur levhası sekizgendir, kırmızı zemin üzerine beyaz yazılıdır.' },
    { q: 'Kırmızı çerçeveli üçgen biçimindeki trafik işaretleri neyi bildirir?', o: ['Yasaklama', 'Zorunluluk', 'Tehlike uyarısı', 'Park yeri'], d: 2, a: 'Üçgen biçimindeki işaretler önde bir tehlike olduğunu bildirir.' },
    { q: 'Sürüş sırasında cep telefonunu elle tutarak konuşmak için ne söylenebilir?', o: ['Serbesttir', 'Yalnızca şehir içinde serbesttir', 'Yasaktır, dikkat dağıtır', 'Yalnızca gece yasaktır'], d: 2, a: 'Sürüş sırasında telefonu elle tutmak yasaktır ve kaza riskini artırır.' },
    { q: 'Önünüzdeki araçla takip mesafesi nasıl olmalıdır?', o: ['Mümkün olduğunca yakın', 'Hız ve yol koşuluna göre güvenle durabileceğiniz kadar', 'Her zaman 1 metre', 'Mesafe önemli değildir'], d: 1, a: 'Takip mesafesi, ani frende çarpmadan durabilecek kadar olmalıdır. Hız arttıkça, yol kaygan oldukça artar.' },
    { q: 'Sürücü yorgunluk ve uyku hissederse ne yapmalıdır?', o: ['Camı açıp devam etmeli', 'Müzik sesini açmalı', 'Güvenli bir yerde durup dinlenmeli', 'Hızını artırıp bir an önce varmalı'], d: 2, a: 'Yorgun sürüş çok tehlikelidir. Güvenli bir yerde durup dinlenmek gerekir.' },
    { q: 'Sisli havada hangi lamba kullanılır?', o: ['Yalnızca park lambası', 'Sis lambası ve gerekirse kısa huzmeli far', 'Uzun huzmeli far', 'Hiçbiri'], d: 1, a: 'Sisli havada sis lambası ve kısa huzmeli far kullanılır. Uzun huzmeli far sisi yansıtıp görüşü azaltır.' },
    { q: 'Acil durumlarda aranacak ulusal acil çağrı numarası hangisidir?', o: ['110', '112', '155', '190'], d: 1, a: '112 Acil Çağrı Merkezi; sağlık, polis ve itfaiye için ortak numaradır.' },
    { q: 'Yetişkinde kalp masajı ve yapay solunumda oran hangisidir?', o: ['15 masaj, 1 solunum', '30 masaj, 2 solunum', '5 masaj, 5 solunum', '2 masaj, 30 solunum'], d: 1, a: 'Temel yaşam desteğinde 30 göğüs basısı ve 2 yapay solunum uygulanır.' },
    { q: 'Kanayan bir yaraya ilk müdahalede ne yapılır?', o: ['Yara yıkanmadan üzerine toz serpilir', 'Temiz bir bezle doğrudan baskı uygulanır', 'Yaraya hiç dokunulmaz', 'Yaraya buz bağlanır'], d: 1, a: 'Kanamada temiz bezle yaraya doğrudan baskı yapılır, mümkünse yara kalp seviyesinin üstüne kaldırılır.' },
    { q: 'Yanık bölgeye ilk müdahalede ne yapılır?', o: ['Diş macunu sürülür', 'Akan soğuk su ile soğutulur', 'Buz konur', 'Kabarcıklar patlatılır'], d: 1, a: 'Yanık, buz değil akan soğuk musluk suyuyla 10-20 dakika soğutulur. Üzerine bir şey sürülmez.' },
    { q: 'Burun kanamasında baş nasıl tutulmalıdır?', o: ['Geriye atılmalı', 'Hafifçe öne eğilmeli', 'Yatay yatırılmalı', 'Fark etmez'], d: 1, a: 'Baş hafifçe öne eğilir, burun kanatları birkaç dakika sıkılır. Baş asla geriye atılmaz.' },
    { q: 'Egzoz gazındaki zehirli gaz hangisidir?', o: ['Oksijen', 'Karbonmonoksit', 'Azot', 'Helyum'], d: 1, a: 'Karbonmonoksit renksiz, kokusuz ve çok zehirlidir. Kapalı garajda motor çalıştırılmamalıdır.' },
    { q: 'Lastik basıncı ne zaman kontrol edilmelidir?', o: ['Uzun yolculuktan hemen sonra', 'Lastikler soğukken', 'Yalnızca yazın', 'Hiç gerek yoktur'], d: 1, a: 'Lastik basıncı soğukken ölçülür; sürüşten sonra ısınan lastikte değer yüksek çıkar.' },
    { q: 'Araçta ısınma ışığı (motor sıcaklığı uyarısı) yandığında ne yapılmalıdır?', o: ['Yola devam edilmeli', 'Güvenli bir yerde durup motor kapatılmalı', 'Hızla gidip servise ulaşılmalı', 'Radyatör kapağı hemen açılmalı'], d: 1, a: 'Güvenli yere çekip motoru durdurmak gerekir. Sıcak motorda radyatör kapağı açılmaz, haşlanma riski vardır.' },
    { q: 'Hangi durumda araç sürülmemelidir?', o: ['Yorgunken veya uykusuzken', 'Gündüz', 'Yakıt doluyken', 'Yağmursuz havada'], d: 0, a: 'Yorgunluk ve uykusuzluk refleksleri ciddi biçimde yavaşlatır.' },
    { q: 'Trafikte araçlar ve yayalar için "geçiş önceliği" ne anlama gelir?', o: ['Hızlı olanın geçmesi', 'Önce geçme hakkının kime ait olduğu', 'Korna çalanın geçmesi', 'Büyük aracın her zaman geçmesi'], d: 1, a: 'Geçiş önceliği, bir kavşakta ya da geçitte ilk geçme hakkının kimde olduğunu belirler.' }
  ];
  OZ.sayfa.sinav = function () {
    var alan = $('#sinavAlan'); if (!alan) return;
    var ADET = 10, set, i, puan, yanlis;
    function karistir(a) { a = a.slice(); for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = a[k]; a[k] = a[j]; a[j] = t; } return a; }
    function basla() { set = karistir(SORULAR).slice(0, ADET); i = 0; puan = 0; yanlis = []; soru(); }
    function soru() {
      if (i >= set.length) return bitir();
      var s = set[i], sec = karistir(s.o.map(function (m, ix) { return { m: m, ok: ix === s.d }; }));
      alan.innerHTML = '<div class="sn-ust"><span>Soru ' + (i + 1) + ' / ' + set.length + '</span><span>Doğru: ' + puan + '</span></div><div class="sn-cubuk"><i style="width:' + (i / set.length * 100) + '%"></i></div>' +
        '<h2 class="sn-soru">' + esc(s.q) + '</h2><div class="sn-sec">' + sec.map(function (x, k) { return '<button type="button" data-k="' + k + '">' + esc(x.m) + '</button>'; }).join('') + '</div><div id="snGeri" class="sn-geri" role="status"></div>';
      var kilit = false, dugmeler = $$('.sn-sec button', alan);
      dugmeler.forEach(function (b) {
        b.addEventListener('click', function () {
          if (kilit) return; kilit = true; var x = sec[+b.getAttribute('data-k')];
          dugmeler.forEach(function (d, k) { if (sec[k].ok) d.classList.add('dogru'); });
          if (x.ok) { puan++; $('#snGeri').textContent = 'Doğru. ' + s.a; } else { b.classList.add('yanlis'); yanlis.push(s); $('#snGeri').textContent = 'Yanlış. ' + s.a; }
          $('#snGeri').className = 'sn-geri ' + (x.ok ? 'iyi' : 'kotu');
          var n = document.createElement('button'); n.type = 'button'; n.className = 'dugme d-kirmizi'; n.textContent = i + 1 < set.length ? 'Sonraki soru' : 'Sonucu gör';
          n.addEventListener('click', function () { i++; soru(); }); $('#snGeri').parentNode.appendChild(n); n.focus();
        });
      });
    }
    function bitir() {
      var y = Math.round(puan / set.length * 100), yorum = puan >= 9 ? 'Harika, sınava hazır görünüyorsun.' : puan >= 7 ? 'İyi gidiyorsun. Yanlışlarına bir göz at.' : 'Biraz daha çalışmakta fayda var. Ders notları sana yardımcı olacak.';
      alan.innerHTML = '<div class="sn-sonuc"><div class="sn-puan">' + puan + ' / ' + set.length + '</div><p>' + yorum + '</p></div>' +
        (yanlis.length ? '<h3 class="sn-bas">Yanlış yaptıkların</h3><ul class="sn-yanlis">' + yanlis.map(function (s) { return '<li><b>' + esc(s.q) + '</b><span>Doğru cevap: ' + esc(s.o[s.d]) + '</span><small>' + esc(s.a) + '</small></li>'; }).join('') + '</ul>' : '') +
        '<div class="dugmeler"><button type="button" class="dugme d-kirmizi" id="snTekrar">Yeni sınav</button><a class="dugme d-cerceve" href="ders-notlari.html">Ders notlarına git</a></div>';
      $('#snTekrar').addEventListener('click', basla);
    }
    basla();
  };

  /* ---------- Ders notları sayfası: videolar ---------- */
  OZ.sayfa.notlar = async function () {
    var kutu = $('#videoKutu'); if (!kutu) return;
    var l = []; try { l = await V.liste('videolar', { sira: 'olusturma', artan: false }); } catch (e) {}
    var suz = $('#videoSuz'), sec = 'Tümü';
    function ciz() {
      var kats = ['Tümü']; l.forEach(function (v) { if (v.kategori && kats.indexOf(v.kategori) < 0) kats.push(v.kategori); });
      suz.innerHTML = kats.length > 2 ? kats.map(function (k) { return '<button type="button" class="' + (k === sec ? 'ac' : '') + '" data-kat="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') : '';
      var g = l.filter(function (v) { return sec === 'Tümü' || v.kategori === sec; });
      kutu.innerHTML = g.length ? g.map(OZ.videoKarti).join('') : '<p class="bos">Henüz ders videosu eklenmedi. Kurs yeni video eklediğinde burada görünecek.</p>';
    }
    suz.addEventListener('click', function (e) { var b = e.target.closest('[data-kat]'); if (b) { sec = b.getAttribute('data-kat'); ciz(); } });
    OZ.videolariBagla(kutu, function () { return l; }); ciz();
  };
})();
