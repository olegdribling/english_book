import { useFontSize, FONT_SIZES } from '../hooks/useFontSize';
import { usePageNumbers } from '../hooks/usePageNumbers';
import { useKeepAwakeSetting } from '../hooks/useKeepAwakeSetting';
import { wakeLockSupported } from '../hooks/useKeepAwake';
import { useBgColor, BG_COLORS } from '../hooks/useBgColor';
import { useTextColor, TEXT_COLORS } from '../hooks/useTextColor';
import styles from './Settings.module.css';

// Страница настроек приложения
export default function Settings() {
  const [fontSize, setFontSize]               = useFontSize();
  const [showPageNumbers, setShowPageNumbers] = usePageNumbers();
  const [keepAwake, setKeepAwake]             = useKeepAwakeSetting();
  const [bgColor, setBgColor]                 = useBgColor();
  const [textColor, setTextColor]             = useTextColor();

  return (
    <div className={styles.page}>

      {/* Секция: размер шрифта читалки */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Font Size</p>
        <div className={styles.options}>
          {FONT_SIZES.map(({ label, value }) => (
            <button
              key={value}
              className={`${styles.option} ${fontSize === value ? styles.optionActive : ''}`}
              onClick={() => setFontSize(value)}
            >
              <span className={styles.optionPreview} style={{ fontSize: value }}>Aa</span>
              <span className={styles.optionLabel}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Секция: цвет фона и цвет текста */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Appearance</p>

        <p className={styles.colorLabel}>Background</p>
        <div className={styles.colorRow}>
          {BG_COLORS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              className={`${styles.colorSwatch} ${bgColor === value ? styles.colorSwatchActive : ''}`}
              style={{ background: value }}
              onClick={() => setBgColor(value)}
              aria-label={label}
            />
          ))}
        </div>

        <p className={styles.colorLabel}>Text color</p>
        <div className={styles.colorRow}>
          {TEXT_COLORS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              className={`${styles.colorSwatch} ${textColor === value ? styles.colorSwatchActive : ''}`}
              style={{ background: value }}
              onClick={() => setTextColor(value)}
              aria-label={label}
            />
          ))}
        </div>
      </div>

      {/* Секция: нумерация страниц */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Reading</p>
        <div className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>Show page numbers</p>
            <p className={styles.toggleDesc}>Display current page and total count while reading</p>
          </div>
          <button
            className={`${styles.toggle} ${showPageNumbers ? styles.toggleOn : ''}`}
            onClick={() => setShowPageNumbers(!showPageNumbers)}
            role="switch"
            aria-checked={showPageNumbers}
          />
        </div>
        {/* Wake Lock доступен только по HTTPS — если API нет, тумблер отключён */}
        <div className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>Keep screen on</p>
            <p className={styles.toggleDesc}>
              {wakeLockSupported
                ? 'Prevent the screen from dimming while a book or lesson is open'
                : 'Not supported by this browser'}
            </p>
          </div>
          <button
            className={`${styles.toggle} ${keepAwake ? styles.toggleOn : ''}`}
            onClick={() => setKeepAwake(!keepAwake)}
            role="switch"
            aria-checked={keepAwake}
            disabled={!wakeLockSupported}
          />
        </div>
      </div>

    </div>
  );
}
