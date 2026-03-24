export interface Translation {
  id: number;
  locale: string;
  title: string;
  category_id?: number;
}

export interface Category {
  id: number;
  title: string;
  slug?: string;
  image?: string;
  translations?: Translation[];
}
