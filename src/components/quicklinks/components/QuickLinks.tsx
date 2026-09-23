import React from "react";
import QuickLinksPalette from "./QuickLinksPalette";
import QuickLinksModals from "./QuickLinksModals";
import type { QuickLinksProps } from "../types/quicklinks.types";

const QuickLinks: React.FC<QuickLinksProps> = ({ moduleFlags, onSuccess, className }) => {
  return (
    <>
      <QuickLinksPalette moduleFlags={moduleFlags} className={className} />
      <QuickLinksModals onSuccess={onSuccess} />
    </>
  );
};

export default QuickLinks;
