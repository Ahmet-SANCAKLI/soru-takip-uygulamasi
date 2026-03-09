import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  const today = new Date().toLocaleDateString("tr-TR");

  return (
    <main className={styles.container}>
      <header className={styles.topbar}>
        <span className={styles.date}>{today}</span>
        <Link className={styles.familyButton} href="/aile">
          Aile
        </Link>
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
        <p className={styles.footerText}>Bugün Kaç Soru Çözdünüz Kızlar!</p>
        <p className={styles.copyright}>© Sancaklı</p>
      </footer>
    </main>
  );
}
