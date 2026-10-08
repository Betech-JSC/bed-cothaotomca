import { ApiKey, getApi, ApiResponse } from './apiService';

export interface Branch {
  id: number;
  sort_order?: number;
  title: string;
  address: string;
  address_link: string | null;
  phone: string | null;
  is_main: boolean;
  created_at: string;
  updated_at: string;
  image: string;
}

export const DEFAULT_FALLBACK_BRANCHES: Branch[] = [
  {
    id: 1,
    sort_order: 1,
    title: "Chi nhánh 1",
    address: "42/2 Trần Đình Xu, Phường Cầu Ông Lãnh, Quận 1, TP. Hồ Chí Minh",
    address_link: "https://maps.google.com",
    phone: "024.9999.7122",
    is_main: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    image: "/images/footer/showroom-1.jpg"
  },
  {
    id: 2,
    sort_order: 2,
    title: "Chi nhánh 2",
    address: "39 Thân Nhân Trung, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh",
    address_link: "https://maps.google.com",
    phone: "024.9999.7122",
    is_main: false,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    image: "/images/footer/showroom-2.jpg"
  }
];

export async function getBranches(lang?: string): Promise<Branch[]> {
  try {
    const params = lang ? { lang } : undefined;
    const response = await getApi<Branch>('branches', { params, revalidate: 60 });
    const list = response.data && response.data.length > 0 ? response.data : DEFAULT_FALLBACK_BRANCHES;
    return [...list].sort((a, b) => {
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return DEFAULT_FALLBACK_BRANCHES;
  }
}
