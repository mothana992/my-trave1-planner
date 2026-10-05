/* Foreign visitor gate prices checked 6 October 2026; never infer unknown prices. */
(function(){
const ministry='https://dosim.ktb.gov.tr/TR-218202/muze-ve-oren-yeri-ucretleri.html';
const p=(amount,currency,source,note='')=>({amount,currency,source,note,checked:'2026-10-06',audience:'foreign-adult'});
globalThis.VenueCosts={
'Topkapi Palace Museum':p(2750,'TRY','https://www.millisaraylar.gov.tr/Lokasyon/2/Topkapi-Sarayi?culture=en','تذكرة القصر + الحريم + آيا إيريني؛ الأطفال 0–6 مجانًا.'),
'Dolmabahçe Palace':p(2000,'TRY','https://millisaraylar.gov.tr/Lokasyon/3/Dolmabahce-Sarayi','السلاملك + الحريم + متحف الرسم؛ الأطفال 0–6 مجانًا.'),
'Beylerbeyi Palace':{...p(800,'TRY','https://millisaraylar.gov.tr/Lokasyon/4/Beylerbeyi-Sarayi','الحديقة وحدها 100 ليرة؛ الأطفال 0–6 مجانًا.'),options:[{label:'الحديقة فقط',amount:100,currency:'TRY'}]},
'Galata Tower':p(30,'EUR',ministry),
"Maiden's Tower":{...p(27,'EUR',ministry,'قارب الوصول منفصل عن دخول المتحف وعن الكرت.'),extra:{amount:110,currency:'TRY',label:'قارب الوصول',source:'https://muze.gov.tr/muze-detay?distId=MRK&sectionId=KZK02'}},
'Istanbul Archaeological Museums':p(15,'EUR',ministry),
'Turkish & Islamic Arts Museum':p(17,'EUR',ministry),
'Museum of the History of Science and Technology in Islam':p(10,'EUR',ministry),
'Galata Mevlevihanesi Museum':p(7,'EUR',ministry,'إغلاق معلن 29 سبتمبر–5 أكتوبر فقط؛ راجع حالة الأقسام قبل زيارتك.'),
'Rumeli Fortress':p(6,'EUR',ministry),
'Hagia Sophia Grand Mosque':p(25,'EUR','https://www.tursab.org.tr/duyurular/ayasofya-i-kebir-cami-i-serifi-ziyaretleri-hakkinda-duyuru','سعر زيارة معرض الطابق العلوي؛ ليس متحف تاريخ وتجربة آيا صوفيا المنفصل.'),
'Rahmi M. Koç Museum':p(550,'TRY','https://www.rmk-museum.org.tr/istanbul/ziyaret-plani/saatler-ve-ucretler','قارب المتحف الاختياري 250 ليرة إضافية.'),
'Istanbul Toy Museum':p(420,'TRY','https://istanbuloyuncakmuzesi.com/pages/iletisim','السعر السياحي الكامل المنشور؛ تحت 3 سنوات مجانًا.'),
'Pelit Chocolate Museum':p(700,'TRY','https://www.pelitcikolatamuse.com/sss','تحت 3 سنوات مجانًا.'),
'Istanbul Aquarium':p(1500,'TRY','https://www.istanbulakvaryum.com/plan-your-visit/buyticket','الدخول العادي من الصفحة الإنجليزية الرسمية؛ 2–12 سنة 1350 ليرة، 0–24 شهر مجانًا.'),
'Basilica Cistern':{source:'https://www.yerebatan.com',note:'تنبيه إغلاق مؤقت في قائمة المصدر. لم نثبت سعرًا رسميًا حاليًا بعد تغيير الإدارة؛ لا تعتمد أسعار الوسطاء القديمة.',checked:'2026-10-06'},
'Vialand':{source:'https://www.vialand.com/en/biletler',note:'السعر يعتمد على تاريخ الزيارة وفئة تذكرة الزائر؛ راجع السعر الرسمي قبل اختيار اليوم.',checked:'2026-10-06'},
'Kariye Mosque':{source:'https://www.kulturportali.gov.tr/turkiye/istanbul/gezilecekyer/kariye-muzesi',note:'تذكرة منفصلة؛ سعر الأجنبي الحالي يحتاج تأكيدًا من الشباك. مغلق للسياح الجمعة.',checked:'2026-10-06'},
'Teleferik Pierreloti':{source:'https://www.metro.istanbul/Hatlarimiz/HatDetay?hat=TF2',note:'رسوم مواصلات TF2 عبر İstanbulkart، وليست تذكرة متحف؛ التعرفة الحالية تُراجع قبل الركوب.',checked:'2026-10-06'}
};
})();
