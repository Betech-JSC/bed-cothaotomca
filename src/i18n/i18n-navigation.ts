import Link from 'next/link';
import { redirect as nextRedirect, usePathname, useRouter } from 'next/navigation';

export const { Link: I18nLink, redirect, usePathname: useI18nPathname, useRouter: useI18nRouter } = {
  Link,
  redirect: nextRedirect,
  usePathname,
  useRouter,
};
