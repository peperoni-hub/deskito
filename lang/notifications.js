// Notification test and tips in Settings, for every language
const NOTIFY_KEYS = [
  "Send a test in 10 seconds",
  "Press the test, then switch to another app (like Discord). If nothing pops up:",
  "Windows: Settings → System → Notifications → turn on your browser, and turn off Do not disturb.",
  "Windows may hide pop-ups while a game or full-screen app is open (Settings → System → Notifications → Turn on do not disturb automatically).",
  "Edge puts background tabs to sleep: install Deskito as an app, or add it under Settings → System and performance → Never put these sites to sleep.",
  "Deskito has to stay open, even minimised; closed apps can't ring.",
  "Switch to another app now. The test arrives in 10 seconds.",
  "This is a test. Notifications work!",
];

const NOTIFY_TEXTS = {
  bs: [
    "Pošalji probu za 10 sekundi",
    "Pritisni probu, pa pređi u drugu aplikaciju (npr. Discord). Ako se ništa ne pojavi:",
    "Windows: Postavke → Sistem → Obavještenja → uključi svoj preglednik i isključi Ne ometaj.",
    "Windows može sakriti obavještenja dok je otvorena igra ili aplikacija preko cijelog ekrana (Postavke → Sistem → Obavještenja → Automatski uključi Ne ometaj).",
    "Edge uspavljuje kartice u pozadini: instaliraj Deskito kao aplikaciju ili ga dodaj pod Postavke → Sistem i performanse → Nikad ne uspavljuj ove stranice.",
    "Deskito mora ostati otvoren, makar i smanjen; zatvorene aplikacije ne mogu zvoniti.",
    "Pređi sada u drugu aplikaciju. Proba stiže za 10 sekundi.",
    "Ovo je proba. Obavještenja rade!",
  ],
  hr: [
    "Pošalji probu za 10 sekundi",
    "Pritisni probu, pa prijeđi u drugu aplikaciju (npr. Discord). Ako se ništa ne pojavi:",
    "Windows: Postavke → Sustav → Obavijesti → uključi svoj preglednik i isključi Ne ometaj.",
    "Windows može sakriti obavijesti dok je otvorena igra ili aplikacija preko cijelog zaslona (Postavke → Sustav → Obavijesti → Automatski uključi Ne ometaj).",
    "Edge uspavljuje kartice u pozadini: instaliraj Deskito kao aplikaciju ili ga dodaj pod Postavke → Sustav i performanse → Nikad ne uspavljuj ove web-stranice.",
    "Deskito mora ostati otvoren, makar i smanjen; zatvorene aplikacije ne mogu zvoniti.",
    "Prijeđi sada u drugu aplikaciju. Proba stiže za 10 sekundi.",
    "Ovo je proba. Obavijesti rade!",
  ],
  sr: [
    "Пошаљи пробу за 10 секунди",
    "Притисни пробу, па пређи у другу апликацију (нпр. Discord). Ако се ништа не појави:",
    "Windows: Подешавања → Систем → Обавештења → укључи свој прегледач и искључи Не узнемиравај.",
    "Windows може сакрити обавештења док је отворена игра или апликација преко целог екрана (Подешавања → Систем → Обавештења → Аутоматски укључи Не узнемиравај).",
    "Edge успављује картице у позадини: инсталирај Deskito као апликацију или га додај под Подешавања → Систем и перформансе → Никад не успављуј ове сајтове.",
    "Deskito мора остати отворен, макар и умањен; затворене апликације не могу да звоне.",
    "Пређи сада у другу апликацију. Проба стиже за 10 секунди.",
    "Ово је проба. Обавештења раде!",
  ],
  tr: [
    "10 saniye içinde test gönder",
    "Teste bas, sonra başka bir uygulamaya geç (ör. Discord). Hiçbir şey çıkmazsa:",
    "Windows: Ayarlar → Sistem → Bildirimler → tarayıcını aç ve Rahatsız etmeyin'i kapat.",
    "Windows, bir oyun veya tam ekran uygulama açıkken bildirimleri gizleyebilir (Ayarlar → Sistem → Bildirimler → Rahatsız etmeyin'i otomatik olarak aç).",
    "Edge arka plandaki sekmeleri uyutur: Deskito'yu uygulama olarak yükle veya Ayarlar → Sistem ve performans → Bu siteleri asla uyku moduna alma altına ekle.",
    "Deskito küçültülmüş olsa bile açık kalmalı; kapalı uygulamalar çalamaz.",
    "Şimdi başka bir uygulamaya geç. Test 10 saniye içinde gelecek.",
    "Bu bir test. Bildirimler çalışıyor!",
  ],
  de: [
    "Test in 10 Sekunden senden",
    "Drück auf Test und wechsle dann in eine andere App (z. B. Discord). Wenn nichts erscheint:",
    "Windows: Einstellungen → System → Benachrichtigungen → deinen Browser einschalten und Nicht stören ausschalten.",
    "Windows blendet Benachrichtigungen bei Spielen oder Vollbild-Apps eventuell aus (Einstellungen → System → Benachrichtigungen → Nicht stören automatisch aktivieren).",
    "Edge versetzt Hintergrund-Tabs in den Ruhezustand: Installiere Deskito als App oder füge es hinzu unter Einstellungen → System und Leistung → Diese Websites nie in den Standbymodus versetzen.",
    "Deskito muss geöffnet bleiben, auch minimiert; geschlossene Apps können nicht klingeln.",
    "Wechsle jetzt in eine andere App. Der Test kommt in 10 Sekunden.",
    "Das ist ein Test. Benachrichtigungen funktionieren!",
  ],
  fr: [
    "Envoyer un test dans 10 secondes",
    "Appuie sur le test, puis passe à une autre application (comme Discord). Si rien n'apparaît :",
    "Windows : Paramètres → Système → Notifications → active ton navigateur et désactive Ne pas déranger.",
    "Windows peut masquer les notifications pendant un jeu ou une application en plein écran (Paramètres → Système → Notifications → Activer automatiquement Ne pas déranger).",
    "Edge met en veille les onglets en arrière-plan : installe Deskito comme application, ou ajoute-le dans Paramètres → Système et performances → Ne jamais mettre ces sites en veille.",
    "Deskito doit rester ouvert, même réduit ; une application fermée ne peut pas sonner.",
    "Passe maintenant à une autre application. Le test arrive dans 10 secondes.",
    "Ceci est un test. Les notifications fonctionnent !",
  ],
  it: [
    "Invia una prova tra 10 secondi",
    "Premi la prova, poi passa a un'altra app (come Discord). Se non compare nulla:",
    "Windows: Impostazioni → Sistema → Notifiche → attiva il tuo browser e disattiva Non disturbare.",
    "Windows può nascondere le notifiche mentre è aperto un gioco o un'app a schermo intero (Impostazioni → Sistema → Notifiche → Attiva automaticamente Non disturbare).",
    "Edge mette in sospensione le schede in background: installa Deskito come app, oppure aggiungilo in Impostazioni → Sistema e prestazioni → Non sospendere mai questi siti.",
    "Deskito deve restare aperto, anche ridotto a icona; le app chiuse non possono suonare.",
    "Passa ora a un'altra app. La prova arriva tra 10 secondi.",
    "Questa è una prova. Le notifiche funzionano!",
  ],
  zh: [
    "10 秒后发送测试通知",
    "点击测试，然后切换到其他应用（如 Discord）。如果没有弹出：",
    "Windows：设置 → 系统 → 通知 → 打开你的浏览器，并关闭“请勿打扰”。",
    "玩游戏或使用全屏应用时，Windows 可能会隐藏通知（设置 → 系统 → 通知 → 自动打开“请勿打扰”）。",
    "Edge 会让后台标签页休眠：把 Deskito 安装为应用，或在 设置 → 系统和性能 → 从不让这些站点进入睡眠状态 中添加它。",
    "Deskito 必须保持打开（最小化也可以）；关闭的应用无法响铃。",
    "现在切换到其他应用。测试将在 10 秒后到达。",
    "这是一条测试。通知正常！",
  ],
  ja: [
    "10秒後にテスト通知を送る",
    "テストを押してから、別のアプリ（Discord など）に切り替えてください。何も表示されない場合：",
    "Windows：設定 → システム → 通知 → ブラウザーをオンにし、応答不可をオフにします。",
    "ゲームや全画面アプリの使用中は、Windows が通知を隠すことがあります（設定 → システム → 通知 → 応答不可を自動的にオンにする）。",
    "Edge はバックグラウンドのタブをスリープさせます：Deskito をアプリとしてインストールするか、設定 → システムとパフォーマンス → これらのサイトをスリープ状態にしない に追加してください。",
    "Deskito は最小化してもよいので開いたままにしてください。閉じたアプリは鳴りません。",
    "今すぐ別のアプリに切り替えてください。10秒後にテストが届きます。",
    "これはテストです。通知は正常に動作しています！",
  ],
  ko: [
    "10초 후 테스트 알림 보내기",
    "테스트를 누른 뒤 다른 앱(예: Discord)으로 전환하세요. 아무것도 뜨지 않으면:",
    "Windows: 설정 → 시스템 → 알림 → 사용 중인 브라우저를 켜고 방해 금지를 끄세요.",
    "게임이나 전체 화면 앱을 사용하는 동안 Windows가 알림을 숨길 수 있습니다 (설정 → 시스템 → 알림 → 자동으로 방해 금지 켜기).",
    "Edge는 백그라운드 탭을 절전 모드로 전환합니다: Deskito를 앱으로 설치하거나 설정 → 시스템 및 성능 → 이 사이트를 절전 모드로 전환하지 않음 에 추가하세요.",
    "Deskito는 최소화해도 되지만 열려 있어야 합니다. 닫힌 앱은 울릴 수 없습니다.",
    "지금 다른 앱으로 전환하세요. 10초 후 테스트가 도착합니다.",
    "테스트입니다. 알림이 잘 작동합니다!",
  ],
  ar: [
    "أرسل تجربة بعد 10 ثوانٍ",
    "اضغط على التجربة ثم انتقل إلى تطبيق آخر (مثل Discord). إذا لم يظهر شيء:",
    "Windows: الإعدادات ← النظام ← الإعلامات ← شغّل متصفحك وأوقف عدم الإزعاج.",
    "قد يخفي Windows الإعلامات أثناء تشغيل لعبة أو تطبيق بملء الشاشة (الإعدادات ← النظام ← الإعلامات ← تشغيل عدم الإزعاج تلقائيًا).",
    "يضع Edge علامات التبويب في الخلفية في وضع السكون: ثبّت Deskito كتطبيق، أو أضفه في الإعدادات ← النظام والأداء ← عدم وضع هذه المواقع في وضع السكون أبدًا.",
    "يجب أن يبقى Deskito مفتوحًا، ولو مصغّرًا؛ التطبيقات المغلقة لا يمكنها الرنين.",
    "انتقل الآن إلى تطبيق آخر. ستصل التجربة بعد 10 ثوانٍ.",
    "هذه تجربة. الإشعارات تعمل!",
  ],
};

for (const [code, values] of Object.entries(NOTIFY_TEXTS)) {
  NOTIFY_KEYS.forEach((key, i) => {
    TRANSLATIONS[code].texts[key] = values[i];
  });
}

// Notifications while Deskito is closed (push.js)
const PUSH_KEYS = [
  "Signed in? Then alarms and reminders also arrive when Deskito is closed. Not signed in, Deskito has to stay open (minimised is fine).",
  "Signed in, alarms pop up even when Deskito is closed. Otherwise keep it open or minimised.",
  "{title} is starting. Open Deskito and the timer will start.",
];

const PUSH_TEXTS = {
  bs: ["Prijavljen/a? Onda alarmi i podsjetnici stižu i kad je Deskito zatvoren. Bez prijave Deskito mora ostati otvoren (može biti smanjen).", "Kad si prijavljen/a, alarmi se pojavljuju i kad je Deskito zatvoren. Inače ga drži otvorenim ili smanjenim.", "{title} počinje. Otvori Deskito i tajmer će se pokrenuti."],
  hr: ["Prijavljen/a? Onda alarmi i podsjetnici stižu i kad je Deskito zatvoren. Bez prijave Deskito mora ostati otvoren (može biti smanjen).", "Kad si prijavljen/a, alarmi se pojavljuju i kad je Deskito zatvoren. Inače ga drži otvorenim ili smanjenim.", "{title} počinje. Otvori Deskito i mjerač će se pokrenuti."],
  sr: ["Пријављен/а? Онда аларми и подсетници стижу и кад је Deskito затворен. Без пријаве Deskito мора остати отворен (може бити умањен).", "Кад си пријављен/а, аларми се појављују и кад је Deskito затворен. Иначе га држи отвореним или умањеним.", "{title} почиње. Отвори Deskito и тајмер ће се покренути."],
  tr: ["Giriş yaptın mı? O zaman alarmlar ve hatırlatmalar Deskito kapalıyken de gelir. Giriş yapmadıysan Deskito açık kalmalı (küçültülmüş olabilir).", "Giriş yaptıysan alarmlar Deskito kapalıyken de çıkar. Aksi halde açık veya küçültülmüş tut.", "{title} başlıyor. Deskito'yu aç, zamanlayıcı başlayacak."],
  de: ["Angemeldet? Dann kommen Wecker und Erinnerungen auch, wenn Deskito geschlossen ist. Ohne Anmeldung muss Deskito geöffnet bleiben (minimiert reicht).", "Angemeldet klingeln Wecker auch, wenn Deskito geschlossen ist. Sonst lass es geöffnet oder minimiert.", "{title} beginnt. Öffne Deskito, dann startet der Timer."],
  fr: ["Connecté·e ? Alors les alarmes et rappels arrivent même quand Deskito est fermé. Sans connexion, Deskito doit rester ouvert (réduit, ça suffit).", "Connecté·e, les alarmes s'affichent même quand Deskito est fermé. Sinon, garde-le ouvert ou réduit.", "{title} commence. Ouvre Deskito et le chronomètre démarrera."],
  it: ["Hai effettuato l'accesso? Allora sveglie e promemoria arrivano anche con Deskito chiuso. Senza accesso Deskito deve restare aperto (anche ridotto a icona).", "Con l'accesso, le sveglie compaiono anche con Deskito chiuso. Altrimenti tienilo aperto o ridotto a icona.", "{title} sta iniziando. Apri Deskito e il timer partirà."],
  zh: ["已登录？那么即使 Deskito 已关闭，闹钟和提醒也会送达。未登录时，Deskito 必须保持打开（最小化也可以）。", "登录后，即使 Deskito 已关闭，闹钟也会弹出。否则请保持打开或最小化。", "{title} 即将开始。打开 Deskito，计时就会启动。"],
  ja: ["ログインしていれば、Deskito を閉じていてもアラームとリマインダーが届きます。ログインしていない場合は Deskito を開いたままにしてください（最小化で OK）。", "ログインしていれば、Deskito を閉じていてもアラームが表示されます。そうでなければ開いたまま、または最小化してください。", "{title} が始まります。Deskito を開くとタイマーが開始します。"],
  ko: ["로그인했나요? 그러면 Deskito가 닫혀 있어도 알람과 알림이 도착합니다. 로그인하지 않았다면 Deskito를 열어 두어야 합니다 (최소화해도 됩니다).", "로그인하면 Deskito가 닫혀 있어도 알람이 뜹니다. 그렇지 않으면 열어 두거나 최소화하세요.", "{title}이(가) 시작됩니다. Deskito를 열면 타이머가 시작됩니다."],
  ar: ["هل سجّلت الدخول؟ إذن تصل المنبّهات والتذكيرات حتى عندما يكون Deskito مغلقًا. بدون تسجيل الدخول يجب أن يبقى Deskito مفتوحًا (يكفي أن يكون مصغّرًا).", "عند تسجيل الدخول تظهر المنبّهات حتى عندما يكون Deskito مغلقًا. وإلا فأبقه مفتوحًا أو مصغّرًا.", "يبدأ {title} الآن. افتح Deskito وسيبدأ المؤقت."],
};

for (const [code, values] of Object.entries(PUSH_TEXTS)) {
  PUSH_KEYS.forEach((key, i) => {
    TRANSLATIONS[code].texts[key] = values[i];
  });
}

// "1h" on its own (e.g. "starts in 1h"), taken from each language's "1h 30m" format
for (const language of Object.values(TRANSLATIONS)) {
  const both = language.texts["{hours}h {minutes}m"];
  if (both && !language.texts["{hours}h"]) language.texts["{hours}h"] = both.split("{minutes}")[0].trim();
}

// Stopping the timer when the computer was off (away.js)
const AWAY_KEYS = [
  "Stop the timer when my computer turns off or goes to sleep",
  "When it was away for more than",
  "minutes",
  "It stops at the moment the computer went away. Not on phones and tablets, since they pause apps all the time.",
  "Your computer was off or asleep, so the timer stopped at {time}.",
  "Keep counting",
];

const AWAY_TEXTS = {
  bs: ["Zaustavi tajmer kad se računar ugasi ili ode u stanje mirovanja", "Kad je bio odsutan duže od", "minuta", "Zaustavlja se u trenutku kad je računar otišao. Ne na telefonima i tabletima, jer oni stalno pauziraju aplikacije.", "Računar je bio ugašen ili u mirovanju, pa je tajmer zaustavljen u {time}.", "Nastavi brojati"],
  hr: ["Zaustavi mjerač kad se računalo ugasi ili ode u stanje mirovanja", "Kad je bilo odsutno dulje od", "minuta", "Zaustavlja se u trenutku kad je računalo otišlo. Ne na mobitelima i tabletima, jer oni stalno pauziraju aplikacije.", "Računalo je bilo ugašeno ili u mirovanju, pa je mjerač zaustavljen u {time}.", "Nastavi brojati"],
  sr: ["Заустави тајмер кад се рачунар угаси или оде у стање мировања", "Кад је био одсутан дуже од", "минута", "Зауставља се у тренутку кад је рачунар отишао. Не на телефонима и таблетима, јер они стално паузирају апликације.", "Рачунар је био угашен или у мировању, па је тајмер заустављен у {time}.", "Настави бројати"],
  tr: ["Bilgisayarım kapanınca veya uyku moduna geçince zamanlayıcıyı durdur", "Şu süreden uzun süre uzakta kaldıysa:", "dakika", "Bilgisayarın uzaklaştığı anda durur. Telefon ve tabletlerde değil, çünkü onlar uygulamaları sürekli duraklatır.", "Bilgisayarın kapalıydı veya uykudaydı, bu yüzden zamanlayıcı {time} saatinde durdu.", "Saymaya devam et"],
  de: ["Timer stoppen, wenn mein Computer ausgeht oder in den Ruhezustand wechselt", "Wenn er länger weg war als", "Minuten", "Er stoppt in dem Moment, in dem der Computer weg war. Nicht auf Handys und Tablets, weil die Apps ständig pausieren.", "Dein Computer war aus oder im Ruhezustand, deshalb wurde der Timer um {time} gestoppt.", "Weiterzählen"],
  fr: ["Arrêter le chronomètre quand mon ordinateur s'éteint ou se met en veille", "S'il a été absent plus de", "minutes", "Il s'arrête au moment où l'ordinateur s'est absenté. Pas sur les téléphones et tablettes, qui mettent sans cesse les apps en pause.", "Ton ordinateur était éteint ou en veille, le chronomètre s'est donc arrêté à {time}.", "Continuer à compter"],
  it: ["Ferma il timer quando il computer si spegne o va in sospensione", "Se è rimasto assente per più di", "minuti", "Si ferma nel momento in cui il computer si è assentato. Non su telefoni e tablet, che mettono continuamente in pausa le app.", "Il computer era spento o in sospensione, quindi il timer si è fermato alle {time}.", "Continua a contare"],
  zh: ["电脑关机或进入睡眠时停止计时", "离开超过", "分钟", "计时会停在电脑离开的那一刻。手机和平板不适用，因为它们经常暂停应用。", "你的电脑已关机或处于睡眠状态，所以计时在 {time} 停止了。", "继续计时"],
  ja: ["パソコンの電源が切れたりスリープしたりしたらタイマーを止める", "離れていた時間がこれ以上なら：", "分", "パソコンが離れた時点で止まります。スマホやタブレットはアプリを頻繁に一時停止するため対象外です。", "パソコンが電源オフかスリープだったため、タイマーは {time} に止まりました。", "カウントを続ける"],
  ko: ["컴퓨터가 꺼지거나 절전 모드가 되면 타이머 멈추기", "다음 시간보다 오래 떨어져 있었을 때:", "분", "컴퓨터가 떠난 순간에 멈춥니다. 휴대폰과 태블릿은 앱을 자주 일시 중지하므로 제외됩니다.", "컴퓨터가 꺼져 있었거나 절전 모드여서 타이머가 {time}에 멈췄습니다.", "계속 세기"],
  ar: ["أوقف المؤقت عندما يُطفأ حاسوبي أو يدخل في وضع السكون", "إذا غاب أكثر من", "دقيقة", "يتوقف في اللحظة التي غاب فيها الحاسوب. لا ينطبق على الهواتف والأجهزة اللوحية لأنها توقف التطبيقات مؤقتًا باستمرار.", "كان حاسوبك مطفأً أو في وضع السكون، لذلك توقف المؤقت عند {time}.", "تابع العدّ"],
};

for (const [code, values] of Object.entries(AWAY_TEXTS)) {
  AWAY_KEYS.forEach((key, i) => {
    if (!(key in TRANSLATIONS[code].texts)) TRANSLATIONS[code].texts[key] = values[i];
  });
}
