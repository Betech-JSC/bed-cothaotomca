import { redirect } from "@/i18n/routing";

export default function PolicyIndexPage() {
  redirect({
    pathname: '/policy/[slug]',
    params: { slug: 'chinh-sach-giao-hang' }
  });
}
