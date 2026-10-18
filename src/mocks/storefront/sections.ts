import type { StoreSection } from "@/lib/schemas/store-config";

/**
 * `sections[]` of `noor`'s `/api/v1/config/` (M09 US-09.1 Independent Test): all eight
 * `section_type`s, listed OUT of order on purpose (the page must sort by `order`), one
 * inactive row (must vanish without a gap) and one `show_on_mobile=false` row (hidden < md).
 * Links are store-relative; images are absent because the fixture catalogue has none —
 * the sections render their text-first state, which is the documented look without images.
 */
export const NOOR_SECTIONS: StoreSection[] = [
  {
    id: 41,
    section_type: "product_grid",
    label: "شبكة منتجات: عطور وبخور",
    order: 5,
    is_active: true,
    settings: { title: "عطور", show_on_mobile: true },
    content_data: { category_id: 5, limit: 4, title: "عطور وبخور" },
  },
  {
    id: 37,
    section_type: "hero",
    label: "البانر الرئيسي",
    order: 1,
    is_active: true,
    settings: { show_on_mobile: true },
    content_data: {
      title: "عطور وهدايا يمنية تُختار بعناية",
      subtitle: "عود ومسك وبخور أصلي، وقهوة حراز، بتوصيل داخل اليمن والسعودية.",
      cta_text: "تسوّق العطور",
      link: "/c/5",
    },
  },
  {
    id: 44,
    section_type: "latest_products",
    label: "أحدث المنتجات",
    order: 8,
    is_active: true,
    settings: { title: "وصل حديثاً", limit: 8, show_on_mobile: true },
    content_data: {},
  },
  {
    id: 38,
    section_type: "category_strip",
    label: "شريط تصفّح الأقسام",
    order: 2,
    is_active: true,
    settings: { title: "تسوّق حسب القسم", show_on_mobile: true },
    content_data: {},
  },
  {
    id: 43,
    section_type: "promotional_offers",
    label: "العروض",
    order: 7,
    is_active: true,
    settings: { title: "عروض المتجر", show_on_mobile: true },
    content_data: {},
  },
  {
    id: 39,
    section_type: "featured_products",
    label: "المنتجات المميزة",
    order: 3,
    is_active: true,
    settings: { title: "مختارات المتجر", limit: 8, show_on_mobile: true },
    content_data: {},
  },
  {
    id: 40,
    section_type: "banner_grid",
    label: "شبكة بنرات",
    order: 4,
    is_active: true,
    settings: { show_on_mobile: true },
    content_data: {
      items: [
        { image: null, title: "هدايا العيد", link: "/products?collection=1" },
        { image: null, title: "قهوة حراز اليمنية", link: "/c/11" },
        { image: null, title: "تصفية الصيف", link: "/products?collection=3" },
      ],
    },
  },
  {
    id: 42,
    section_type: "slider",
    label: "سلايدر",
    order: 6,
    is_active: true,
    settings: { show_on_mobile: true },
    content_data: {
      items: [
        { image: null, title: "تمور القصيم الفاخرة", link: "/c/10" },
        { image: null, title: "سماعات وإكسسوارات الجوال", link: "/c/6" },
        { image: null, title: "أدوات القهوة العربية", link: "/c/13" },
      ],
    },
  },
  {
    id: 45,
    section_type: "product_grid",
    label: "شبكة منتجات: قهوة وشاي",
    order: 9,
    is_active: true,
    settings: { show_on_mobile: false },
    content_data: { category_id: 11, limit: 4, title: "قهوة وشاي" },
  },
  {
    id: 46,
    section_type: "slider",
    label: "سلايدر رمضان (موقوف)",
    order: 10,
    is_active: false,
    settings: { show_on_mobile: true },
    content_data: { items: [{ image: null, title: "عروض رمضان", link: "/products?tag=3" }] },
  },
];
