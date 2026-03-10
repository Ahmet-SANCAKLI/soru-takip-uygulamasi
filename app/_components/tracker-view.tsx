"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTurkishDate, getTurkeyDateISO } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { QuestionEntry, Student } from "@/lib/types";
import "./tracker-view.css";

const LESSONS: Record<Student, string[]> = {
  Bahar: ["Matematik", "Fen", "Türkçe", "İnkılap", "Din", "Paragraf", "İngilizce"],
  Leyla: ["Paragraf", "Problem", "Geometri", "Fizik", "Kimya", "Biyoloji", "Matematik"]
};

const STEPS = [1, 5, 10, 20];
const FAMILY_PASSWORD = "1234";

type DraftState = {
  stepIndex: number;
  counters: Record<string, number>;
};

type DraftMap = Record<Student, DraftState>;

type Props =
  | { mode: "student"; student: Student }
  | { mode: "family" };

type Notice = {
  type: "success" | "error";
  text: string;
};

function todayISO() {
  return getTurkeyDateISO();
}

function weekStartISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

function weekEndISO(dateISO: string) {
  const start = new Date(`${weekStartISO(dateISO)}T00:00:00`);
  start.setDate(start.getDate() + 6);
  return start.toISOString().slice(0, 10);
}

function monthStartISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function monthEndISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function sumByDate(entries: QuestionEntry[], dateISO: string) {
  return entries
    .filter((entry) => entry.entry_date === dateISO)
    .reduce((total, entry) => total + entry.question_count, 0);
}

function sumByWeek(entries: QuestionEntry[], dateISO: string) {
  const start = weekStartISO(dateISO);
  const end = weekEndISO(dateISO);
  return entries
    .filter((entry) => entry.entry_date >= start && entry.entry_date <= end)
    .reduce((total, entry) => total + entry.question_count, 0);
}

function sumByMonth(entries: QuestionEntry[], dateISO: string) {
  const start = monthStartISO(dateISO);
  const end = monthEndISO(dateISO);
  return entries
    .filter((entry) => entry.entry_date >= start && entry.entry_date <= end)
    .reduce((total, entry) => total + entry.question_count, 0);
}

function sumLessonByDate(entries: QuestionEntry[], lesson: string, dateISO: string) {
  return entries
    .filter((entry) => entry.lesson === lesson && entry.entry_date === dateISO)
    .reduce((total, entry) => total + entry.question_count, 0);
}

function buildDraft(student: Student): DraftState {
  const counters = Object.fromEntries(LESSONS[student].map((lesson) => [lesson, 0]));
  return { stepIndex: 0, counters };
}

function buildInitialDrafts(): DraftMap {
  return {
    Bahar: buildDraft("Bahar"),
    Leyla: buildDraft("Leyla")
  };
}

function getLessonRows(entries: QuestionEntry[], student: Student, currentDate: string) {
  const weekStart = weekStartISO(currentDate);
  const weekEnd = weekEndISO(currentDate);
  const monthStart = monthStartISO(currentDate);
  const monthEnd = monthEndISO(currentDate);

  return LESSONS[student].map((lesson) => {
    const lessonEntries = entries.filter((entry) => entry.lesson === lesson);

    const daily = lessonEntries
      .filter((entry) => entry.entry_date === currentDate)
      .reduce((total, entry) => total + entry.question_count, 0);

    const weekly = lessonEntries
      .filter((entry) => entry.entry_date >= weekStart && entry.entry_date <= weekEnd)
      .reduce((total, entry) => total + entry.question_count, 0);

    const monthly = lessonEntries
      .filter((entry) => entry.entry_date >= monthStart && entry.entry_date <= monthEnd)
      .reduce((total, entry) => total + entry.question_count, 0);

    return { lesson, daily, weekly, monthly };
  });
}

function buildFamilyEditDraft(entries: QuestionEntry[], student: Student, currentDate: string) {
  return Object.fromEntries(
    LESSONS[student].map((lesson) => [lesson, sumLessonByDate(entries, lesson, currentDate)])
  ) as Record<string, number>;
}

export default function TrackerView(props: Props) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [entries, setEntries] = useState<QuestionEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>(buildInitialDrafts());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedFamilyStudent, setSelectedFamilyStudent] = useState<Student | null>(null);
  const [familyUnlocked, setFamilyUnlocked] = useState(props.mode !== "family");
  const [familyPassword, setFamilyPassword] = useState("");
  const [familyEditMode, setFamilyEditMode] = useState(false);
  const [familyEditDraft, setFamilyEditDraft] = useState<Record<string, number>>({});

  async function loadEntries() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("question_entries")
      .select("id,student,lesson,question_count,entry_date,created_at")
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false });

    if (fetchError) {
      setError("Veriler yüklenemedi. Supabase ayarlarını kontrol et.");
      setLoading(false);
      return;
    }

    setEntries((data ?? []) as QuestionEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowDate = todayISO();
      setCurrentDate((prev) => {
        if (prev !== nowDate) {
          setDrafts(buildInitialDrafts());
          setFamilyEditMode(false);
          loadEntries();
          return nowDate;
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (props.mode !== "family") {
      return;
    }

    const access = window.sessionStorage.getItem("family-access");
    setFamilyUnlocked(access === "granted");
  }, [props.mode]);

  useEffect(() => {
    setFamilyEditMode(false);
    setFamilyEditDraft({});
  }, [selectedFamilyStudent, currentDate]);

  function cycleStep(student: Student) {
    setDrafts((prev) => ({
      ...prev,
      [student]: {
        ...prev[student],
        stepIndex: (prev[student].stepIndex + 1) % STEPS.length
      }
    }));
  }

  function increaseLesson(student: Student, lesson: string) {
    setDrafts((prev) => {
      const step = STEPS[prev[student].stepIndex];

      return {
        ...prev,
        [student]: {
          ...prev[student],
          counters: {
            ...prev[student].counters,
            [lesson]: prev[student].counters[lesson] + step
          }
        }
      };
    });
  }

  function clearDraft(student: Student) {
    setDrafts((prev) => ({
      ...prev,
      [student]: buildDraft(student)
    }));
    setNotice({ type: "error", text: "Kayıt yapılmadı." });
  }

  async function saveDraft(student: Student) {
    const studentDraft = drafts[student];
    const records = Object.entries(studentDraft.counters)
      .filter(([, value]) => value > 0)
      .map(([lesson, value]) => ({
        student,
        lesson,
        question_count: value,
        entry_date: currentDate
      }));

    if (records.length === 0) {
      setError("Kaydetmek için önce derslere basarak sayı girin.");
      setNotice({ type: "error", text: "Kayıt yapılmadı." });
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("question_entries").insert(records);

    if (insertError) {
      setError("Kayıt kaydedilemedi.");
      setNotice({ type: "error", text: "Kayıt yapılamadı." });
      setSaving(false);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [student]: buildDraft(student)
    }));
    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: "Kayıt başarılı." });
  }

  async function clearFamilyRange(student: Student, start: string, end: string, label: string) {
    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("question_entries")
      .delete()
      .eq("student", student)
      .gte("entry_date", start)
      .lte("entry_date", end);

    if (deleteError) {
      setError(`${label} kayıtları temizlenemedi.`);
      setNotice({ type: "error", text: "Kayıt silinemedi." });
      setSaving(false);
      return;
    }

    setFamilyEditMode(false);
    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: `${student} için ${label.toLowerCase()} kayıtları temizlendi.` });
  }

  async function clearFamilyAll(student: Student) {
    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase.from("question_entries").delete().eq("student", student);

    if (deleteError) {
      setError("Tüm veriler temizlenemedi.");
      setNotice({ type: "error", text: "Kayıt silinemedi." });
      setSaving(false);
      return;
    }

    setFamilyEditMode(false);
    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: `${student} için tüm veriler temizlendi.` });
  }

  function startFamilyEdit(student: Student, studentEntries: QuestionEntry[]) {
    setFamilyEditDraft(buildFamilyEditDraft(studentEntries, student, currentDate));
    setFamilyEditMode(true);
    setNotice(null);
    setError(null);
  }

  function updateFamilyEditLesson(lesson: string, value: string) {
    const normalized = Number(value);
    setFamilyEditDraft((prev) => ({
      ...prev,
      [lesson]: Number.isFinite(normalized) && normalized >= 0 ? normalized : 0
    }));
  }

  async function saveFamilyEdit(student: Student) {
    const records = Object.entries(familyEditDraft)
      .filter(([, value]) => value > 0)
      .map(([lesson, value]) => ({
        student,
        lesson,
        question_count: value,
        entry_date: currentDate
      }));

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("question_entries")
      .delete()
      .eq("student", student)
      .eq("entry_date", currentDate);

    if (deleteError) {
      setError("Eski günlük kayıtlar silinemedi.");
      setNotice({ type: "error", text: "Düzeltme kaydedilemedi." });
      setSaving(false);
      return;
    }

    if (records.length > 0) {
      const { error: insertError } = await supabase.from("question_entries").insert(records);

      if (insertError) {
        setError("Düzeltilen kayıtlar kaydedilemedi.");
        setNotice({ type: "error", text: "Düzeltme kaydedilemedi." });
        setSaving(false);
        return;
      }
    }

    setFamilyEditMode(false);
    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: `${student} günlük kayıtları düzeltildi.` });
  }

  function unlockFamily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (familyPassword !== FAMILY_PASSWORD) {
      setNotice({ type: "error", text: "Şifre yanlış." });
      return;
    }

    window.sessionStorage.setItem("family-access", "granted");
    setFamilyUnlocked(true);
    setFamilyPassword("");
    setNotice(null);
  }

  if (props.mode === "family") {
    const baharEntries = entries.filter((entry) => entry.student === "Bahar");
    const leylaEntries = entries.filter((entry) => entry.student === "Leyla");
    const activeEntries =
      selectedFamilyStudent === "Bahar" ? baharEntries : selectedFamilyStudent === "Leyla" ? leylaEntries : [];
    const lessonRows = selectedFamilyStudent ? getLessonRows(activeEntries, selectedFamilyStudent, currentDate) : [];
    const formattedDate = formatTurkishDate(currentDate);

    if (!familyUnlocked) {
      return (
        <main className="tracker-container">
          <header className="tracker-header tracker-header-family">
            <Link className="header-link" href="/">
              Ana Sayfaya Dön
            </Link>
            <h1>Aile Paneli</h1>
            <span className="header-date">{formattedDate}</span>
          </header>

          <section className="panel family-lock">
            <h2>Aile Şifresi</h2>
            <form className="family-form" onSubmit={unlockFamily}>
              <input
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => setFamilyPassword(event.target.value)}
                placeholder="1234"
                type="password"
                value={familyPassword}
              />
              {notice ? <p className={notice.type === "success" ? "success" : "error"}>{notice.text}</p> : null}
              <button type="submit">Giriş Yap</button>
            </form>
          </section>
        </main>
      );
    }

    return (
      <main className="tracker-container">
        <header className="tracker-header tracker-header-family">
          <Link className="header-link" href="/">
            Ana Sayfaya Dön
          </Link>
          <h1>Aile Paneli</h1>
          <span className="header-date">{formattedDate}</span>
        </header>

        {loading ? <p className="panel">Yükleniyor...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className={notice.type === "success" ? "success" : "error"}>{notice.text}</p> : null}

        {!loading ? (
          <>
            <section className="family-grid">
              <article
                className={`panel family-card ${selectedFamilyStudent === "Bahar" ? "family-card-active" : ""}`}
                onClick={() => setSelectedFamilyStudent("Bahar")}
              >
                <h2>Bahar</h2>
                <p>Günlük toplam: {sumByDate(baharEntries, currentDate)}</p>
                <p>Haftalık toplam: {sumByWeek(baharEntries, currentDate)}</p>
                <p>Aylık toplam: {sumByMonth(baharEntries, currentDate)}</p>
              </article>

              <article
                className={`panel family-card ${selectedFamilyStudent === "Leyla" ? "family-card-active" : ""}`}
                onClick={() => setSelectedFamilyStudent("Leyla")}
              >
                <h2>Leyla</h2>
                <p>Günlük toplam: {sumByDate(leylaEntries, currentDate)}</p>
                <p>Haftalık toplam: {sumByWeek(leylaEntries, currentDate)}</p>
                <p>Aylık toplam: {sumByMonth(leylaEntries, currentDate)}</p>
              </article>
            </section>

            {selectedFamilyStudent ? (
              <>
                <section className="panel family-actions-panel">
                  <h2>{selectedFamilyStudent} İşlemleri</h2>
                  <div className="family-actions-grid">
                    <button
                      className="secondary"
                      disabled={saving}
                      onClick={() => clearFamilyRange(selectedFamilyStudent, currentDate, currentDate, "Günlük")}
                      type="button"
                    >
                      Günlük Temizle
                    </button>
                    <button
                      className="secondary"
                      disabled={saving}
                      onClick={() =>
                        clearFamilyRange(
                          selectedFamilyStudent,
                          weekStartISO(currentDate),
                          weekEndISO(currentDate),
                          "Haftalık"
                        )
                      }
                      type="button"
                    >
                      Haftalık Temizle
                    </button>
                    <button
                      className="secondary"
                      disabled={saving}
                      onClick={() =>
                        clearFamilyRange(
                          selectedFamilyStudent,
                          monthStartISO(currentDate),
                          monthEndISO(currentDate),
                          "Aylık"
                        )
                      }
                      type="button"
                    >
                      Aylık Temizle
                    </button>
                    <button
                      className="secondary danger-button"
                      disabled={saving}
                      onClick={() => clearFamilyAll(selectedFamilyStudent)}
                      type="button"
                    >
                      Tüm Veriyi Temizle
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => startFamilyEdit(selectedFamilyStudent, activeEntries)}
                      type="button"
                    >
                      Düzelt
                    </button>
                  </div>
                </section>

                <section className="panel lesson-table-panel">
                  <h2>{selectedFamilyStudent} Ders Dağılımı</h2>
                  <div className="lesson-table">
                    <div className="lesson-table-head">Ders</div>
                    <div className="lesson-table-head">Günlük</div>
                    <div className="lesson-table-head">Haftalık</div>
                    <div className="lesson-table-head">Aylık</div>

                    {lessonRows.map((row) => (
                      <div className="lesson-row" key={row.lesson}>
                        <span>{row.lesson}</span>
                        <strong>{row.daily}</strong>
                        <strong>{row.weekly}</strong>
                        <strong>{row.monthly}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                {familyEditMode ? (
                  <section className="panel family-edit-panel">
                    <h2>{selectedFamilyStudent} Günlük Düzeltme</h2>
                    <p>{formattedDate} tarihli günlük kayıtlar düzenlenir.</p>
                    <div className="family-edit-grid">
                      {LESSONS[selectedFamilyStudent].map((lesson) => (
                        <label className="family-edit-field" key={lesson}>
                          <span>{lesson}</span>
                          <input
                            min="0"
                            onChange={(event) => updateFamilyEditLesson(lesson, event.target.value)}
                            type="number"
                            value={familyEditDraft[lesson] ?? 0}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="actions-row">
                      <button className="secondary" onClick={() => setFamilyEditMode(false)} type="button">
                        Vazgeç
                      </button>
                      <button disabled={saving} onClick={() => saveFamilyEdit(selectedFamilyStudent)} type="button">
                        {saving ? "Kaydediliyor..." : "Düzeltmeyi Kaydet"}
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </main>
    );
  }

  const student = props.student;
  const studentEntries = entries.filter((entry) => entry.student === student);
  const savedDaily = sumByDate(studentEntries, currentDate);
  const savedWeekly = sumByWeek(studentEntries, currentDate);

  return (
    <main className="tracker-container">
      <header className="tracker-header tracker-header-student">
        <Link className="header-link" href="/">
          Ana Sayfaya Dön
        </Link>
        <h1>{student} Soru Giriş</h1>
      </header>

      <section className="panel date-panel">
        <span>Tarih</span>
        <strong>{formatTurkishDate(currentDate)}</strong>
      </section>

      {loading ? <p className="panel">Yükleniyor...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className={notice.type === "success" ? "success" : "error"}>{notice.text}</p> : null}

      {!loading ? (
        <>
          <section className="panel tap-panel">
            <div className="tap-grid">
              <button className="tap-btn say-btn" onClick={() => cycleStep(student)} type="button">
                <span>Sayaç</span>
                <strong>{STEPS[drafts[student].stepIndex]}</strong>
              </button>

              {LESSONS[student].map((lesson) => (
                <button key={lesson} className="tap-btn" onClick={() => increaseLesson(student, lesson)} type="button">
                  <span>{lesson}</span>
                  <strong>{drafts[student].counters[lesson]}</strong>
                </button>
              ))}
            </div>

            <div className="actions-row">
              <button className="secondary" onClick={() => clearDraft(student)} type="button">
                Temizle
              </button>
              <button disabled={saving} onClick={() => saveDraft(student)} type="button">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </section>

          <section className="summary panel">
            <span>Günlük toplam soru: {savedDaily}</span>
            <span>Haftalık toplam soru: {savedWeekly}</span>
            <button className="summary-exit" onClick={() => router.push("/")} type="button">
              Çıkış
            </button>
          </section>
        </>
      ) : null}
    </main>
  );
}
