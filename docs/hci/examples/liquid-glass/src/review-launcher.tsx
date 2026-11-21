"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@ui-sdk/react/button";
import { LiquidReviewOverlay } from "@quantitative-hci/liquid-glass/review";
import "@quantitative-hci/liquid-glass/review.css";

export function ReviewLauncher() {
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState(false);
  useEffect(() => {
    const restore = () => setOpen(new URL(location.href).searchParams.get("review") === "1");
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const root = useCallback(() => document.querySelector<HTMLElement>(example ? "[data-review-example-surface]" : "#kit-main"), [example]);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    const url = new URL(location.href);
    if (next) url.searchParams.set("review", "1");
    else url.searchParams.delete("review");
    history.replaceState(history.state, "", url);
  };
  return <>
    <LiquidReviewOverlay open={open} onOpenChange={changeOpen} root={root} tools={<Button onClick={() => setExample(value => !value)}>{example ? "Review actual page" : "Show lint example"}</Button>} />
    {open && example && createPortal(<aside className="qgr-example" data-review-example="" aria-label="Deliberate lint example">
      <h2>Lint example</h2><p>Deliberately flawed sample. Its findings are separate from the page you are building.</p>
      <div id="qgr-example-surface" className="qgr-example-surface" data-review-example-surface="" data-review-scope="lint-example" aria-label="Deliberate lint example">
        <h3>Account</h3><p>Account</p><Button>Click here</Button><Button className="qgr-example-unnamed"><span aria-hidden="true">✶</span></Button>
      </div>
    </aside>, document.body)}
  </>;
}
