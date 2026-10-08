import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ninja-keys": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          placeholder?: string;
          theme?: string;
          hotkey?: string;
          noAutoLoadMdIcons?: boolean;
          hideBreadcrumbs?: boolean;
          openHotkey?: string;
          ref?: React.Ref<any>;
        },
        HTMLElement
      >;
    }
  }
}
