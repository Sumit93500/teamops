// A React-owned container whose children are DOM nodes built by the old ui/ helpers (rows, badges with their reason lines,
// list items, the approval card's Review links): <Nodes as="tbody" build={() => [...]} />. The helpers stay the one place
// that knows those pieces' markup, words and behaviour (the old pages and their exports use them too), so the pages ported
// here draw exactly what the old ones drew. React never renders children into the container; build() runs again whenever
// the props change (pass the data the nodes are built from as deps). A tbody's table gets the phone cards at 560px and
// under (ui/phone.jsx labelTable, as ui/phone.js marked the old tables).
import { createElement, useLayoutEffect, useRef } from "react";
import { usePhone, labelTable } from "./phone.jsx";

export default function Nodes({ as = "div", build, deps = [], ...props }) {
  const ref = useRef(null);
  const phone = usePhone();
  useLayoutEffect(() => {
    ref.current.replaceChildren(...build());
    if (as === "tbody") labelTable(ref.current.closest("table"), phone);
  }, [...deps, phone]);   // eslint-disable-line react-hooks/exhaustive-deps
  return createElement(as, { ...props, ref });
}
