export const PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&display=swap');

:host {
  all: initial;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e8e4dc;
  font-size: 13px;
  line-height: 1.5;
}

#bd-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 360px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  z-index: 2147483647;
  border-radius: 16px;
  background: rgba(26, 24, 20, 0.85);
  border: 1px solid rgba(61, 56, 50, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(43, 220, 210, 0.05);
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

#bd-panel.bd-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Scrollbar */
#bd-panel::-webkit-scrollbar { width: 4px; }
#bd-panel::-webkit-scrollbar-track { background: transparent; }
#bd-panel::-webkit-scrollbar-thumb { background: rgba(61, 56, 50, 0.5); border-radius: 2px; }

/* Header */
.bd-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(61, 56, 50, 0.4);
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(26, 24, 20, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px 16px 0 0;
  cursor: grab;
  user-select: none;
}
.bd-header:active { cursor: grabbing; }

.bd-logo {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

.bd-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 14px;
  font-weight: 700;
  flex: 1;
  color: #e8e4dc;
  text-decoration: none;
}
.bd-title:hover { color: #2bdcd2; }

.bd-btn {
  background: none;
  border: none;
  color: #e8e4dc;
  opacity: 0.4;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s, color 0.15s;
}

.bd-btn:hover { opacity: 0.9; color: #2bdcd2; }
.bd-btn.spinning svg { animation: bd-spin 0.6s linear infinite; }

/* Body */
.bd-body { padding: 16px; }

/* Loading */
.bd-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
}

.bd-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(61, 56, 50, 0.4);
  border-top-color: #2bdcd2;
  border-radius: 50%;
  animation: bd-spin 0.8s linear infinite;
}

.bd-status-text {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 12px;
  font-style: italic;
  opacity: 0.5;
}

@keyframes bd-spin { to { transform: rotate(360deg); } }
@keyframes bd-fade-in { from { opacity: 0; } to { opacity: 1; } }

/* Error */
.bd-error { text-align: center; padding: 16px 0; }
.bd-error-text { color: #fbbf24; margin-bottom: 12px; font-size: 13px; }

.bd-retry-btn {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  background: #2bdcd2;
  color: #0c0c0c;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.bd-retry-btn:hover { opacity: 0.9; }

/* Verdict */
.bd-result { animation: bd-fade-in 0.3s ease-in forwards; }

.bd-verdict {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(23, 23, 23, 0.5);
  border: 1px solid rgba(61, 56, 50, 0.3);
}

.bd-verdict-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
.bd-verdict-body { flex: 1; min-width: 0; }
.bd-verdict-reason { font-size: 13px; line-height: 1.5; }

.bd-verdict-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.bd-verdict-sources a {
  font-size: 11px;
  color: #2bdcd2;
  opacity: 0.8;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  text-decoration-thickness: 1px;
}
.bd-verdict-sources a:hover { opacity: 1; }

/* Alternatives */
.bd-alternatives { margin-top: 16px; }
.bd-alternatives h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}

.bd-alt-card {
  background: rgba(23, 23, 23, 0.5);
  border: 1px solid rgba(61, 56, 50, 0.3);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: bd-fade-in 0.3s ease-in forwards;
}

.bd-alt-card img {
  width: 100%;
  height: 120px;
  object-fit: contain;
  background: #252220;
  border-bottom: 1px solid rgba(61, 56, 50, 0.4);
}

.bd-img-placeholder {
  width: 100%;
  height: 120px;
  background: #252220;
  border-bottom: 1px solid rgba(61, 56, 50, 0.4);
}

.bd-alt-info { padding: 12px; }

.bd-alt-name {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bd-alt-name a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  text-decoration-thickness: 1.5px;
}
.bd-alt-name a:hover { color: #2bdcd2; }

.bd-alt-price {
  font-size: 12px;
  color: #2bdcd2;
  font-weight: 800;
  margin-bottom: 4px;
}

.bd-alt-pros, .bd-alt-cons {
  font-size: 11px;
  line-height: 1.6;
  opacity: 0.8;
}
.bd-alt-pros .bd-icon { color: #34d399; }
.bd-alt-cons .bd-icon { color: #fbbf24; }

.bd-label {
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.bd-alt-pros .bd-label { color: #34d399; }
.bd-alt-cons .bd-label { color: #fbbf24; }

.bd-amazon-link {
  display: inline-block;
  margin-top: 8px;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 11px;
  color: #0c0c0c;
  background: #2bdcd2;
  border-radius: 8px;
  padding: 5px 12px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.bd-amazon-link:hover { opacity: 0.85; }

/* Mini verdict badge in header */
.bd-mini-verdict {
  display: none;
  font-size: 16px;
  line-height: 1;
}

/* Minimized state */
#bd-panel.bd-minimized .bd-body { display: none; }
#bd-panel.bd-minimized {
  max-height: none;
  overflow: hidden;
}
#bd-panel.bd-minimized .bd-header {
  border-bottom: none;
  border-radius: 16px;
}
#bd-panel.bd-minimized .bd-mini-verdict { display: inline; }

/* More options button */
.bd-more-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 12px;
  color: #e8e4dc;
  background: rgba(43, 220, 210, 0.1);
  border: 1px solid rgba(43, 220, 210, 0.25);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.bd-more-btn:hover { background: rgba(43, 220, 210, 0.2); border-color: rgba(43, 220, 210, 0.4); }
.bd-more-btn[disabled] { opacity: 0.5; cursor: default; }

/* Go Diving button */
.bd-go-btn {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 14px;
  background: #2bdcd2;
  color: #0c0c0c;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.bd-go-btn:hover { opacity: 0.9; }
`
