"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuestionEntry, Student } from "@/lib/types";
import "./tracker-view.css";

const LESSONS: Record<Student, string[]> = {
  Bahar: ["Matematik", "Fen", "Türkçe", "İnkılap", "Din", "Paragraf"],
  Leyla: ["Paragraf", "Problem", "Geometri", "Fizik", "Kimya", "Biyoloji"]
};

const STEPS = [1, 5, 10, 20];

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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function TrackerView(props: Props) {
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [entries, setEntries] = useState<QuestionEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>(buildInitialDrafts());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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
          loadEntries();
          return nowDate;
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const baharEntries = useMemo(() => entries.filter((entry) => entry.student === "Bahar"), [entries]);
  const leylaEntries = useMemo(() => entries.filter((entry) => entry.student === "Leyla"), [entries]);

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
    setNotice({ type: "error", text: "Kayıt Yapılmadı." });
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
      setNotice({ type: "error", text: "Kayıt Yapılmadı." });
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("question_entries").insert(records);

    if (insertError) {
      setError("Kayıt kaydedilemedi.");
      setNotice({ type: "error", text: "Kayıt Yapılamadı." });
      setSaving(false);
      return;
    }

    clearDraft(student);
    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: "Kayıt Başarılı." });
  }

  async function clearFamilyWeek(student: Student) {
    const start = weekStartISO(currentDate);
    const end = weekEndISO(currentDate);

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
      setError("Haftalık kayıtlar temizlenemedi.");
      setNotice({ type: "error", text: "Kayıt Yapılamadı." });
      setSaving(false);
      return;
    }

    await loadEntries();
    setSaving(false);
    setNotice({ type: "success", text: `${student} haftalık kayıtları temizlendi.` });
  }

  if (props.mode === "family") {
    return (
      <main className="tracker-container">
        <header className="tracker-header">
          <Link href="/">Ana Sayfaya Dön</Link>
          <h1>Aile Paneli</h1>
          <span>{new Date(`${currentDate}T00:00:00`).toLocaleDateString("tr-TR")}</span>
        </header>

        {loading ? <p className="panel">Yükleniyor...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className={notice.type === "success" ? "success" : "error"}>{notice.text}</p> : null}

        {!loading ? (
          <section className="family-grid">
            <article className="panel">
              <h2>Bahar</h2>
              <p>Günlük toplam: {sumByDate(baharEntries, currentDate)}</p>
              <p>Haftalık toplam: {sumByWeek(baharEntries, currentDate)}</p>
              <button className="secondary" disabled={saving} onClick={() => clearFamilyWeek("Bahar")} type="button">
                Temizle
              </button>
            </article>

            <article className="panel">
              <h2>Leyla</h2>
              <p>Günlük toplam: {sumByDate(leylaEntries, currentDate)}</p>
              <p>Haftalık toplam: {sumByWeek(leylaEntries, currentDate)}</p>
              <button className="secondary" disabled={saving} onClick={() => clearFamilyWeek("Leyla")} type="button">
                Temizle
              </button>
            </article>
          </section>
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
        <span className="header-spacer" />
      </header>

      <section className="panel date-panel">
        <span>Tarih</span>
        <strong>{new Date(`${currentDate}T00:00:00`).toLocaleDateString("tr-TR")}</strong>
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
          </section>
        </>
      ) : null}
    </main>
  );
}
