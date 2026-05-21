import { useState, useCallback } from "react";
import type { PaletteState } from "../../palette.js";
import { updatePaletteQuery, moveSelection } from "../../palette.js";
import { decidePaletteAction } from "../../palette.js";

interface UseCommandPaletteResult {
  palette: PaletteState;
  onInputChange: (value: string) => void;
  onUp: () => void;
  onDown: () => void;
  onTab: () => PaletteCommandResult;
  onEnter: () => PaletteCommandResult;
  onEscape: () => string;
}

export interface PaletteCommandResult {
  type: "complete" | "execute" | "none";
  input: string;
}

const CLOSED_PALETTE: PaletteState = { open: false, query: "", filtered: [], selectedIndex: 0 };

export function useCommandPalette(): UseCommandPaletteResult {
  const [palette, setPalette] = useState<PaletteState>(CLOSED_PALETTE);

  const onInputChange = useCallback((value: string) => {
    if (value.startsWith("/")) {
      setPalette(updatePaletteQuery(value));
    } else {
      setPalette(CLOSED_PALETTE);
    }
  }, []);

  const onUp = useCallback(() => {
    setPalette((prev: PaletteState) => (prev.open ? moveSelection(prev, "up") : prev));
  }, []);

  const onDown = useCallback(() => {
    setPalette((prev: PaletteState) => (prev.open ? moveSelection(prev, "down") : prev));
  }, []);

  const onTab = useCallback((): PaletteCommandResult => {
    const result: PaletteCommandResult = { type: "none", input: "" };
    setPalette((prev: PaletteState) => {
      if (!prev.open) return prev;
      const decision = decidePaletteAction(prev, { kind: "tab" });
      result.type = decision.type;
      result.input = decision.input;
      return CLOSED_PALETTE;
    });
    return result;
  }, []);

  const onEnter = useCallback((): PaletteCommandResult => {
    const result: PaletteCommandResult = { type: "none", input: "" };
    setPalette((prev: PaletteState) => {
      if (!prev.open) return prev;
      const decision = decidePaletteAction(prev, { kind: "enter" });
      result.type = decision.type;
      result.input = decision.input;
      return CLOSED_PALETTE;
    });
    return result;
  }, []);

  const onEscape = useCallback((): string => {
    let preserved = "";
    setPalette((prev: PaletteState) => {
      preserved = "/" + prev.query;
      return CLOSED_PALETTE;
    });
    return preserved;
  }, []);

  return { palette, onInputChange, onUp, onDown, onTab, onEnter, onEscape };
}
