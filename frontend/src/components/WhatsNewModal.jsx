import { useEffect } from 'react';
import styles from './WhatsNewModal.module.css';

// Модалка-анонс новой функции. Показывается один раз, кнопка только закрывает.
// icon — React-элемент иконки, title — заголовок, children — текст объяснения
export default function WhatsNewModal({ open, icon, title, onClose, children }) {
  // Закрытие по Escape — для десктопа
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      {/* Клик по самой карточке не должен закрывать модалку */}
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <span className={styles.badge}>New</span>
        {icon && <div className={styles.icon}>{icon}</div>}
        <p className={styles.title}>{title}</p>
        <div className={styles.text}>{children}</div>
        <button className={styles.okBtn} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
