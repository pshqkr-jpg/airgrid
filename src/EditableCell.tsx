// 인라인 편집 가능한 cell. blur 또는 Enter 시 commit, Esc 는 revert.
//
// 항상 input 으로 표시 (Airtable 의 click-to-edit 보다 단순). 컬럼 정의의
// editable: true 면 DataGrid 가 이 컴포넌트로 cell wrap.

import { useState, useEffect, useRef } from "react";

export type EditableCellProps = {
  value: unknown;
  /** "text" | "number". 자동 추론은 호출자 책임 (initial value type). */
  inputType?: "text" | "number";
  onCommit: (next: unknown) => void;
  align?: "left" | "right";
};

export function EditableCell({
  value, inputType, onCommit, align = "left",
}: EditableCellProps) {
  const initial = value == null ? "" : String(value);
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  // 외부 value 변경 (예: 다른 사용자 update) 반영. 단 사용자가 입력 중이면 ✗.
  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setDraft(initial);
    }
  }, [initial]);

  const commit = () => {
    if (draft === initial) return;
    if (inputType === "number") {
      const n = draft === "" ? null : Number(draft);
      if (n != null && !Number.isFinite(n)) return;
      onCommit(n);
    } else {
      onCommit(draft);
    }
  };

  return (
    <input
      ref={ref}
      type={inputType ?? "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(initial);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        background: "transparent",
        padding: "0 4px",
        fontSize: "inherit",
        fontFamily: "inherit",
        textAlign: align === "right" ? "right" : "left",
        outline: "none",
        color: "inherit",
      }}
    />
  );
}
