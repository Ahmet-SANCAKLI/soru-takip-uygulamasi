"use client";

import Link from "next/link";
import type { FormEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTurkishDate, getDaysUntilDate, getTurkeyDateISO } from "@/lib/date";
import styles from "./page.module.css";

const FAMILY_PASSWORD = "1234";
const LGS_EXAM_DATE = "2026-06-14";
const YKS_EXAM_DATE = "2027-06-21";

export default function LandingPage() {
  const router = useRouter();
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const today = useMemo(() => getTurkeyDateISO(), []);
  const formattedToday = useMemo(() => formatTurkishDate(today), [today]);
  const lgsRemainingDays = useMemo(() => getDaysUntilDate(today, LGS_EXAM_DATE), [today]);
  const yksRemainingDays = useMemo(() => getDaysUntilDate(today, YKS_EXAM_DATE), [today]);

  function handleFamilyOpen(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPassword("");
    setPasswordError("");
    setShowFamilyModal(true);
  }

  function handleFamilySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== FAMILY_PASSWORD) {
      setPasswordError("Şifre yanlış.");
      return;
    }

    window.sessionStorage.setItem("family-access", "granted");
    setShowFamilyModal(false);
    router.push("/aile");
  }

  function handleExit() {
    window.close();
    window.location.href = "about:blank";
  }

  return (
    <main className={styles.container}>
      <header className={styles.topbar}>
        <span className={styles.date}>{formattedToday}</span>
        <button className={styles.familyButton} onClick={handleFamilyOpen} type="button">
          Aile
        </button>
      </header>

      <section className={styles.hero}>
        <h1>Soru Takip Uygulaması</h1>
        <p>Kızlar Giriş Yapın</p>
      </section>

      <section className={styles.grid}>
        <Link className={styles.card} href="/leyla">
          Leyla
        </Link>
        <Link className={styles.card} href="/bahar">
          Bahar
        </Link>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          LGS sınavına <span className={styles.dayCount}>{lgsRemainingDays} gün</span> kaldı.
        </p>
        <p className={styles.footerText}>
          YKS sınavına <span className={styles.dayCount}>{yksRemainingDays} gün</span> kaldı.
        </p>
        <p className={styles.copyright}>© Sancaklı</p>
      </footer>

      <button className={styles.exitButton} onClick={handleExit} type="button">
        Çıkış
      </button>

      {showFamilyModal ? (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Aile Girişi</h2>
            <form className={styles.modalForm} onSubmit={handleFamilySubmit}>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Şifre"
                type="password"
                value={password}
              />
              {passwordError ? <p className={styles.modalError}>{passwordError}</p> : null}
              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={() => setShowFamilyModal(false)} type="button">
                  Vazgeç
                </button>
                <button className={styles.confirmButton} type="submit">
                  Giriş Yap
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
