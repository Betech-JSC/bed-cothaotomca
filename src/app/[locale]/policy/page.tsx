import { redirect } from "@/i18n/routing";

export default function PolicyIndexPage() {
  redirect({
    href: {
      pathname: '/policy/[slug]',
      params: { slug: 'chinh-sach-giao-hang' }
    },
    locale: 'vi'
  });
}
