// 인라인 편집 cell — view/edit 이중 모드.
//
// view: 평범한 텍스트 표시 (점선 hover indicator 로 편집 가능 시그널).
//       click 은 stopPropagation — 행 클릭(모달) 트리거 ✗.
// edit: 더블클릭 시 진입. input 으로 교체, autoFocus.
//       Enter / blur 로 commit, Esc 로 revert. commit 시 view 로 복귀.
//
// Airtable 패턴 — 의도적 더블클릭으로만 편집해서 행 클릭과 분리.

import { useEffect, useRef, useState, type ReactNode } from "react";

export type EditableCellProps = {
  value: unknown;
  /** "text" | "number". */
  inputType?: "text" | "number";
  onCommit: (next: unknown) => void;
  align?: "left" | "right";
  /** view 모드 커스텀 렌더 (예: 배열 → chip). 없으면 String(value) 표시. */
  display?: ReactNode;
};

export function EditableCell({
  value, inputType, onCommit, align = "left", display,
}: EditableCellProps) {
  const initial = value == null ? "" : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 value 변경 시 view 동기화 (사용자가 입력 중이면 ✗).
  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [initial, editing]);

  // edit 진입 시 input focus.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft === initial) return;
    if (inputType === "number") {
      const n = draft === "" ? null : Number(draft);
      if (n != null && !Number.isFinite(n)) return;
      onCommit(n);
    } else {
      onCommit(draft);
    }
  };

  if (!editing) {
    const fallback = display ?? (initial === "" ? <span style={{ opacity: 0.4 }}>-</span> : initial);
    return (
      <span
        // 행 클릭(모달) 으로 bubble 막기 — 편집 가능 cell 은 행 click 무관.
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="더블클릭으로 편집"
        style={{
          display: "inline-block",
          width: "100%",
          padding: "0 4px",
          textAlign: align === "right" ? "right" : "left",
          cursor: "text",
          borderRadius: 2,
          // 시각적 hover indicator — 사용자가 편집 가능함을 인지.
          outline: "1px dashed transparent",
          outlineOffset: -1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.outline = "1px dashed var(--airgrid-border, #d1d5db)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.outline = "1px dashed transparent"; }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type={inputType ?? "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(initial);
          setEditing(false);
        }
      }}
      style={{
        width: "100%",
        height: "auto",
        border: "1px solid var(--airgrid-active-fg, #4338ca)",
        borderRadius: 2,
        background: "var(--airgrid-bg, #ffffff)",
        padding: "1px 4px",
        fontSize: "inherit",
        fontFamily: "inherit",
        textAlign: align === "right" ? "right" : "left",
        outline: "none",
        color: "var(--airgrid-fg, #1f2937)",
      }}
    />
  );
}
