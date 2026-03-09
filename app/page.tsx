"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuestionEntry, Role, Student } from "@/lib/types";
import "./page.css";

const LESSONS: Record<Student, string[]> = {
  Bahar: ["Mat", "Fen", "Tür", "İnkılap", "Din", "Paragraf"],
  Leyla: ["Parag", "Prob", "Geo", "Fizik", "Kimya", "Bio"]
};

const ROLES: Role[] = ["Bahar", "Leyla", "Aile"];
const STEPS = [1, 5, 10, 20];

type DraftState = {
  stepIndex: number;
  counters: Record<string, number>;
};

type DraftMap = Record<Student, DraftState>;

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

export default function HomePage() {
  const [role, setRole] = useState<Role>("Bahar");
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [entries, setEntries] = useState<QuestionEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>(buildInitialDrafts());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const activeStudent = role === "Aile" ? null : role;
  const activeEntries = useMemo(() => {
    if (!activeStudent) return [];
    return entries.filter((entry) => entry.student === activeStudent);
  }, [entries, activeStudent]);

  const activeDailySaved = useMemo(() => {
    if (!activeStudent) return 0;
    return sumByDate(activeEntries, currentDate);
  }, [activeEntries, activeStudent, currentDate]);

  const activeWeeklySaved = useMemo(() => {
    if (!activeStudent) return 0;
    return sumByWeek(activeEntries, currentDate);
  }, [activeEntries, activeStudent, currentDate]);

  const activeDraftTotal = useMemo(() => {
    if (!activeStudent) return 0;
    return Object.values(drafts[activeStudent].counters).reduce((total, value) => total + value, 0);
  }, [drafts, activeStudent]);

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
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("question_entries").insert(records);

    if (insertError) {
      setError("Kayıt kaydedilemedi.");
      setSaving(false);
      return;
    }

    clearDraft(student);
    await loadEntries();
    setSaving(false);
  }

  const activeStudentLabel = activeStudent ?? "";

  return (
    <main className="container">
      <header className="hero">
        <h1>Soru Takip App</h1>
        <p>Tarih otomatik bugündür. Say adımı ile ders butonlarına artış miktarı belirlenir.</p>
      </header>

      <section className="panel role-panel">
        {ROLES.map((item) => (
          <button
            key={item}
            className={`role-btn ${item === role ? "active" : ""}`}
            onClick={() => setRole(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      <section className="panel date-panel">
        <span>Tarih</span>
        <strong>{new Date(`${currentDate}T00:00:00`).toLocaleDateString("tr-TR")}</strong>
      </section>

      {error ? <p className="error">{error}</p> : null}

      {loading ? <p className="panel">Yükleniyor...</p> : null}

      {!loading && activeStudent ? (
        <>
          <section className="panel tap-panel">
            <h2>{activeStudentLabel} Günlük Giriş</h2>
            <div className="tap-grid">
              <button className="tap-btn say-btn" onClick={() => cycleStep(activeStudent)} type="button">
                <span>Say</span>
                <strong>{STEPS[drafts[activeStudent].stepIndex]}</strong>
              </button>

              {LESSONS[activeStudent].map((lesson) => (
                <button
                  key={lesson}
                  className="tap-btn"
                  onClick={() => increaseLesson(activeStudent, lesson)}
                  type="button"
                >
                  <span>{lesson}</span>
                  <strong>{drafts[activeStudent].counters[lesson]}</strong>
                </button>
              ))}
            </div>

            <div className="actions-row">
              <button className="secondary" onClick={() => clearDraft(activeStudent)} type="button">
                Temizle
              </button>
              <button disabled={saving} onClick={() => saveDraft(activeStudent)} type="button">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </section>

          <section className="summary panel">
            <span>Günlük kayıtlı toplam: {activeDailySaved}</span>
            <span>Günlük (taslak dahil): {activeDailySaved + activeDraftTotal}</span>
            <span>Haftalık toplam: {activeWeeklySaved}</span>
          </section>
        </>
      ) : null}

      {!loading && role === "Aile" ? (
        <section className="family-grid">
          <article className="panel">
            <h2>Bahar</h2>
            <p>Günlük toplam: {sumByDate(baharEntries, currentDate)}</p>
            <p>Haftalık toplam: {sumByWeek(baharEntries, currentDate)}</p>
          </article>

          <article className="panel">
            <h2>Leyla</h2>
            <p>Günlük toplam: {sumByDate(leylaEntries, currentDate)}</p>
            <p>Haftalık toplam: {sumByWeek(leylaEntries, currentDate)}</p>
          </article>
        </section>
      ) : null}
    </main>
  );
}
