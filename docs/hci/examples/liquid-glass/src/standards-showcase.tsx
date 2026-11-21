import { StandardsWorkbench, type StandardsWorkbenchProps } from "@quantitative-hci/liquid-glass/standards";
import "@quantitative-hci/liquid-glass/standards.css";

export function StandardsShowcase(props: StandardsWorkbenchProps) {
  return <StandardsWorkbench {...props} />;
}
