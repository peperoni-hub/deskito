// The Event type and sticky notes, for every language
const NOTE_KEYS = [
  "Event", "📝 Notes", "+ New note", "Title", "Write your note…", "Edit note", "Delete note",
  "Added {date}", "Edited {date}", "Edited once", "Edited {count} times", "No notes yet.", "Note deleted.",
  "+ NEW NOTE", "Open notes",
];

const NOTE_TEXTS = {
  bs: ["Događaj", "📝 Bilješke", "+ Nova bilješka", "Naslov", "Napiši bilješku…", "Uredi bilješku", "Obriši bilješku", "Dodano {date}", "Uređeno {date}", "Uređeno jednom", "Uređeno {count} puta", "Još nema bilješki.", "Bilješka je obrisana.", "+ NOVA BILJEŠKA", "Otvori bilješke"],
  hr: ["Događaj", "📝 Bilješke", "+ Nova bilješka", "Naslov", "Napiši bilješku…", "Uredi bilješku", "Izbriši bilješku", "Dodano {date}", "Uređeno {date}", "Uređeno jednom", "Uređeno {count} puta", "Još nema bilješki.", "Bilješka je izbrisana.", "+ NOVA BILJEŠKA", "Otvori bilješke"],
  sr: ["Догађај", "📝 Белешке", "+ Нова белешка", "Наслов", "Напиши белешку…", "Уреди белешку", "Обриши белешку", "Додато {date}", "Уређено {date}", "Уређено једном", "Уређено {count} пута", "Још нема белешки.", "Белешка је обрисана.", "+ НОВА БЕЛЕШКА", "Отвори белешке"],
  tr: ["Etkinlik", "📝 Notlar", "+ Yeni not", "Başlık", "Notunu yaz…", "Notu düzenle", "Notu sil", "Eklendi: {date}", "Düzenlendi: {date}", "Bir kez düzenlendi", "{count} kez düzenlendi", "Henüz not yok.", "Not silindi.", "+ YENİ NOT", "Notları aç"],
  de: ["Ereignis", "📝 Notizen", "+ Neue Notiz", "Titel", "Schreib deine Notiz…", "Notiz bearbeiten", "Notiz löschen", "Hinzugefügt {date}", "Bearbeitet {date}", "Einmal bearbeitet", "{count}-mal bearbeitet", "Noch keine Notizen.", "Notiz gelöscht.", "+ NEUE NOTIZ", "Notizen öffnen"],
  fr: ["Événement", "📝 Notes", "+ Nouvelle note", "Titre", "Écris ta note…", "Modifier la note", "Supprimer la note", "Ajoutée le {date}", "Modifiée le {date}", "Modifiée une fois", "Modifiée {count} fois", "Pas encore de notes.", "Note supprimée.", "+ NOUVELLE NOTE", "Ouvrir les notes"],
  it: ["Evento", "📝 Note", "+ Nuova nota", "Titolo", "Scrivi la tua nota…", "Modifica nota", "Elimina nota", "Aggiunta il {date}", "Modificata il {date}", "Modificata una volta", "Modificata {count} volte", "Ancora nessuna nota.", "Nota eliminata.", "+ NUOVA NOTA", "Apri le note"],
  zh: ["活动", "📝 便签", "+ 新便签", "标题", "写下你的便签…", "编辑便签", "删除便签", "添加于 {date}", "编辑于 {date}", "编辑过 1 次", "编辑过 {count} 次", "还没有便签。", "便签已删除。", "+ 新便签", "打开便签"],
  ja: ["イベント", "📝 メモ", "+ 新しいメモ", "タイトル", "メモを書く…", "メモを編集", "メモを削除", "{date} に追加", "{date} に編集", "1回編集", "{count}回編集", "まだメモはありません。", "メモを削除しました。", "+ 新しいメモ", "メモを開く"],
  ko: ["이벤트", "📝 메모", "+ 새 메모", "제목", "메모를 작성하세요…", "메모 편집", "메모 삭제", "{date} 추가됨", "{date} 편집됨", "1번 편집됨", "{count}번 편집됨", "아직 메모가 없습니다.", "메모가 삭제되었습니다.", "+ 새 메모", "메모 열기"],
  ar: ["حدث", "📝 الملاحظات", "+ ملاحظة جديدة", "العنوان", "اكتب ملاحظتك…", "تعديل الملاحظة", "حذف الملاحظة", "أُضيفت {date}", "عُدّلت {date}", "عُدّلت مرة واحدة", "عُدّلت {count} مرات", "لا توجد ملاحظات بعد.", "حُذفت الملاحظة.", "+ ملاحظة جديدة", "فتح الملاحظات"],
};

for (const [code, values] of Object.entries(NOTE_TEXTS)) {
  NOTE_KEYS.forEach((key, i) => {
    TRANSLATIONS[code].texts[key] = values[i];
  });
}

// Sharing notes
const NOTE_SHARE_KEYS = [
  "You share with", "All my notes", "Stop sharing with {email}?", "Share with", "Everyone I share with",
  "gets all your notes", "To share notes, first share with someone in Settings → Sharing.", "Shared with {names}", "From {name}",
];

const NOTE_SHARE_TEXTS = {
  bs: ["Dijeliš s", "Sve moje bilješke", "Prestati dijeliti s {email}?", "Podijeli s", "Svima s kojima dijelim", "dobija sve tvoje bilješke", "Da dijeliš bilješke, prvo podijeli s nekim u Postavke → Dijeljenje.", "Podijeljeno s: {names}", "Od: {name}"],
  hr: ["Dijeliš s", "Sve moje bilješke", "Prestati dijeliti s {email}?", "Podijeli s", "Svima s kojima dijelim", "dobiva sve tvoje bilješke", "Za dijeljenje bilješki prvo podijeli s nekim u Postavke → Dijeljenje.", "Podijeljeno s: {names}", "Od: {name}"],
  sr: ["Делиш са", "Све моје белешке", "Престати делити са {email}?", "Подели са", "Свима са којима делим", "добија све твоје белешке", "Да делиш белешке, прво подели са неким у Подешавања → Дељење.", "Подељено са: {names}", "Од: {name}"],
  tr: ["Paylaştıkların", "Tüm notlarım", "{email} ile paylaşım durdurulsun mu?", "Şununla paylaş", "Paylaştığım herkes", "tüm notlarını görür", "Not paylaşmak için önce Ayarlar → Paylaşım bölümünden biriyle paylaş.", "Paylaşılan: {names}", "Gönderen: {name}"],
  de: ["Du teilst mit", "Alle meine Notizen", "Teilen mit {email} beenden?", "Teilen mit", "Allen, mit denen ich teile", "bekommt alle deine Notizen", "Um Notizen zu teilen, teile zuerst unter Einstellungen → Teilen mit jemandem.", "Geteilt mit {names}", "Von {name}"],
  fr: ["Tu partages avec", "Toutes mes notes", "Arrêter de partager avec {email} ?", "Partager avec", "Tous ceux avec qui je partage", "reçoit toutes tes notes", "Pour partager des notes, partage d'abord avec quelqu'un dans Paramètres → Partage.", "Partagée avec {names}", "De {name}"],
  it: ["Condividi con", "Tutte le mie note", "Smettere di condividere con {email}?", "Condividi con", "Tutti quelli con cui condivido", "riceve tutte le tue note", "Per condividere note, prima condividi con qualcuno in Impostazioni → Condivisione.", "Condivisa con {names}", "Da {name}"],
  zh: ["你与以下人分享", "我的全部便签", "停止与 {email} 分享吗？", "分享给", "所有我分享的人", "会收到你的全部便签", "要分享便签，请先在 设置 → 分享 中与某人分享。", "已分享给 {names}", "来自 {name}"],
  ja: ["共有している相手", "すべてのメモ", "{email} との共有をやめますか？", "共有する相手", "共有しているすべての人", "すべてのメモを受け取ります", "メモを共有するには、まず 設定 → 共有 で相手を追加してください。", "{names} と共有中", "{name} から"],
  ko: ["공유 중인 사람", "내 모든 메모", "{email}님과 공유를 중단할까요?", "공유 대상", "내가 공유하는 모든 사람", "모든 메모를 받습니다", "메모를 공유하려면 먼저 설정 → 공유에서 누군가와 공유하세요.", "{names}님과 공유됨", "{name}님이 보냄"],
  ar: ["تشارك مع", "كل ملاحظاتي", "هل تريد إيقاف المشاركة مع {email}؟", "شارك مع", "كل من أشارك معهم", "يحصل على كل ملاحظاتك", "لمشاركة الملاحظات، شارك أولًا مع شخص ما من الإعدادات ← المشاركة.", "تمت مشاركتها مع {names}", "من {name}"],
};

for (const [code, values] of Object.entries(NOTE_SHARE_TEXTS)) {
  NOTE_SHARE_KEYS.forEach((key, i) => {
    TRANSLATIONS[code].texts[key] = values[i];
  });
}
