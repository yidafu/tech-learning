import React, { useState } from 'react';
import styles from './Playground.module.css';

// 演练场共享组件：示例切换 + 代码编辑 + 运行 + 输出。
// lang 是 src/playground/*.js 的默认导出：{ title, tagline, examples, run, … }。
export default function Playground({ lang }) {
  const { examples, run } = lang;
  const [code, setCode] = useState(examples[0].code);
  const [active, setActive] = useState(examples[0].name);
  const [lines, setLines] = useState(null); // null = 尚未运行
  const [status, setStatus] = useState(null); // { error, ms }

  function doRun() {
    const buffer = [];
    const write = (s) => buffer.push(String(s));
    const start = performance.now();
    let error = null;
    try {
      run(code, write);
    } catch (e) {
      error = `${e && e.name ? e.name : 'Error'}：${e && e.message ? e.message : e}`;
    }
    const ms = Math.max(1, Math.round(performance.now() - start));
    setLines(buffer);
    setStatus({ error, ms });
  }

  function onKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      setCode(`${code.slice(0, selectionStart)}  ${code.slice(selectionEnd)}`);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2;
      });
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      doRun();
    }
  }

  return (
    <section>
      <div className={styles.toolbar}>
        {examples.map((ex) => (
          <button
            key={ex.name}
            type="button"
            className={`button button--sm ${
              active === ex.name ? 'button--primary' : 'button--outline button--secondary'
            }`}
            onClick={() => {
              setCode(ex.code);
              setActive(ex.name);
            }}>
            {ex.name}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        <textarea
          className={styles.editor}
          spellCheck={false}
          aria-label="代码编辑区"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className={styles.outputWrap}>
          {lines === null ? (
            <p className={styles.placeholder}>按「运行」（或 ⌘/Ctrl + Enter）查看输出。</p>
          ) : (
            <pre className={styles.output}>
              {lines.map((l, i) => (
                <div key={i}>{l || '\u00a0'}</div>
              ))}
              {status && status.error && <div className={styles.error}>✗ {status.error}</div>}
            </pre>
          )}
          {status && (
            <div className={styles.status}>
              {status.error ? `运行出错 · ${status.ms} ms` : `运行完成 · ${status.ms} ms`}
            </div>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className="button button--primary" onClick={doRun}>
          ▶ 运行
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            setLines(null);
            setStatus(null);
          }}>
          清空输出
        </button>
        <span className={styles.hint}>Tab 缩进 · ⌘/Ctrl + Enter 运行 · 改完代码随时重跑</span>
      </div>
    </section>
  );
}
