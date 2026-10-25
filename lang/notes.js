// The Event type and sticky notes, for every language
const NOTE_KEYS = [
  "Event", "📝 Notes", "+ New note", "Title", "Write your note…", "Edit note", "Delete note",
  "Added {date}", "Edited {date}", "Edited once", "Edited {count} times", "No notes yet.", "Note deleted.",
];

const NOTE_TEXTS = {
  bs: ["Događaj", "📝 Bilješke", "+ Nova bilješka", "Naslov", "Napiši bilješku…", "Uredi bilješku", "Obriši bilješku", "Dodano {date}", "Uređeno {date}", "Uređeno jednom", "Uređeno {count} puta", "Još nema bilješki.", "Bilješka je obrisana."],
  hr: ["Događaj", "📝 Bilješke", "+ Nova bilješka", "Naslov", "Napiši bilješku…", "Uredi bilješku", "Izbriši bilješku", "Dodano {date}", "Uređeno {date}", "Uređeno jednom", "Uređeno {count} puta", "Još nema bilješki.", "Bilješka je izbrisana."],
  sr: ["Догађај", "📝 Белешке", "+ Нова белешка", "Наслов", "Напиши белешку…", "Уреди белешку", "Обриши белешку", "Додато {date}", "Уређено {date}", "Уређено једном", "Уређено {count} пута", "Још нема белешки.", "Белешка је обрисана."],
  tr: ["Etkinlik", "📝 Notlar", "+ Yeni not", "Başlık", "Notunu yaz…", "Notu düzenle", "Notu sil", "Eklendi: {date}", "Düzenlendi: {date}", "Bir kez düzenlendi", "{count} kez düzenlendi", "Henüz not yok.", "Not silindi."],
  de: ["Ereignis", "📝 Notizen", "+ Neue Notiz", "Titel", "Schreib deine Notiz…", "Notiz bearbeiten", "Notiz löschen", "Hinzugefügt {date}", "Bearbeitet {date}", "Einmal bearbeitet", "{count}-mal bearbeitet", "Noch keine Notizen.", "Notiz gelöscht."],
  fr: ["Événement", "📝 Notes", "+ Nouvelle note", "Titre", "Écris ta note…", "Modifier la note", "Supprimer la note", "Ajoutée le {date}", "Modifiée le {date}", "Modifiée une fois", "Modifiée {count} fois", "Pas encore de notes.", "Note supprimée."],
  it: ["Evento", "📝 Note", "+ Nuova nota", "Titolo", "Scrivi la tua nota…", "Modifica nota", "Elimina nota", "Aggiunta il {date}", "Modificata il {date}", "Modificata una volta", "Modificata {count} volte", "Ancora nessuna nota.", "Nota eliminata."],
  zh: ["活动", "📝 便签", "+ 新便签", "标题", "写下你的便签…", "编辑便签", "删除便签", "添加于 {date}", "编辑于 {date}", "编辑过 1 次", "编辑过 {count} 次", "还没有便签。", "便签已删除。"],
  ja: ["イベント", "📝 メモ", "+ 新しいメモ", "タイトル", "メモを書く…", "メモを編集", "メモを削除", "{date} に追加", "{date} に編集", "1回編集", "{count}回編集", "まだメモはありません。", "メモを削除しました。"],
  ko: ["이벤트", "📝 메모", "+ 새 메모", "제목", "메모를 작성하세요…", "메모 편집", "메모 삭제", "{date} 추가됨", "{date} 편집됨", "1번 편집됨", "{count}번 편집됨", "아직 메모가 없습니다.", "메모가 삭제되었습니다."],
  ar: ["حدث", "📝 الملاحظات", "+ ملاحظة جديدة", "العنوان", "اكتب ملاحظتك…", "تعديل الملاحظة", "حذف الملاحظة", "أُضيفت {date}", "عُدّلت {date}", "عُدّلت مرة واحدة", "عُدّلت {count} مرات", "لا توجد ملاحظات بعد.", "حُذفت الملاحظة."],
};

for (const [code, values] of Object.entries(NOTE_TEXTS)) {
  NOTE_KEYS.forEach((key, i) => {
    TRANSLATIONS[code].texts[key] = values[i];
  });
}
