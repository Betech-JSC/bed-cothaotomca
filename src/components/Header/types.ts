export type NavItem = {
  label: string;
  href?: string;
  isExternal?: boolean;
  children?: NavItem[];
};

export type CtaButton = {
  label: string;
  href: string;
  emphasis?: "primary" | "secondary";
};

