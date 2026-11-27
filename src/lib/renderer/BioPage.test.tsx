import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { siteFromConfig, type Block, type Site } from "@/lib/schemas/site";
import { findCategory, type CategoryMatch } from "@/templates/catalog";
import { BioPage, FONT_SIZES, themeScaleVars } from "./BioPage";

const render = (config: object) =>
  renderToStaticMarkup(
    <BioPage site={siteFromConfig(config, "test")} />,
  );

const page = (blocks: Block[], extra: object = {}) =>
  render({
    schemaVersion: 1,
    template: "classic",
    profile: { title: "Son", socials: [] },
    blocks,
    layout: { main: { blocks: blocks.map((b) => b.id) } },
    ...extra,
  });

describe("BioPage", () => {
  it("renders each v1 block type", () => {
    const html = page([
      { id: "l", type: "link", text: "Shopee", url: "https://shopee.vn" },
      { id: "c", type: "card", text: "Card title", subtext: "Card body" },
      { id: "b", type: "banner", text: "Sale 50%" },
      {
        id: "v",
        type: "video",
        title: "Clip",
        url: "https://youtu.be/dQw4w9WgXcQ",
      },
      { id: "s", type: "shop", title: "Shop" },
    ]);
    expect(html).toContain(
      'href="https://shopee.vn/" data-block-id="l" target="_blank" rel="noopener noreferrer nofollow"',
    );
    for (const text of [
      "Card title",
      "Card body",
      "Sale 50%",
      "Clip",
      "Chưa có sản phẩm",
    ])
      expect(html).toContain(text);
    expect(html).toContain(
      'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"',
    );
  });

  it("escapes user text and drops unsafe links and embeds", () => {
    const html = page([
      {
        id: "x",
        type: "link",
        text: "<script>alert(1)</script>",
        url: "javascript:alert(1)",
      },
      { id: "y", type: "card", text: "img", thumbnail: "javascript:alert(1)" },
      {
        id: "z",
        type: "video",
        title: "v",
        url: "https://evil.com/watch?v=dQw4w9WgXcQ",
      },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toContain("<iframe");
  });

  it("skips hidden blocks and shows only the page's own products", () => {
    const html = page(
      [
        { id: "h", type: "link", text: "Hidden link", hidden: true },
        { id: "s", type: "shop", title: "Shop" },
      ],
      {
        catalog: {
          products: [
            { id: "p1", title: "Shown product", url: "https://a.vn" },
            {
              id: "p2",
              title: "Hidden product",
              url: "https://b.vn",
              visible: false,
            },
          ],
          collections: [],
        },
      },
    );
    expect(html).not.toContain("Hidden link");
    expect(html).toContain("Shown product");
    expect(html).not.toContain("Hidden product");
  });

  it("uses the template's desktop layout", () => {
    const html = render({
      schemaVersion: 1,
      template: "video-first",
      profile: { title: "Son", about: "Desktop intro", socials: [] },
      blocks: [],
    });
    expect(html).toContain('data-desktop="split"');
    expect(html).toContain("Desktop intro");
  });

  // UI-02: the preview and (Sprint 3) the public page render this exact markup.
  // Latest starter per template across all migrations (docs/template-authoring.md).
  const sql = readdirSync("supabase/migrations")
    .sort()
    .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"))
    .join("\n");
  const starters = new Map<string, string>();
  for (const [, json, key] of sql.matchAll(
    /'(\{.*?\})'::jsonb where key = '([\w-]+)'/g,
  ))
    starters.set(key, json);
  for (const [key, json] of starters)
    it(`matches the ${key} starter snapshot`, () => {
      expect(render(JSON.parse(json.replaceAll("''", "'")))).toMatchSnapshot();
    });
});

describe("theme scale (V2-06)", () => {
  it("adds no variables for the defaults", () => {
    expect(themeScaleVars({})).toEqual({});
    expect(
      themeScaleVars({ fontSize: "md", spacing: "normal", width: "normal" }),
    ).toEqual({});
  });

  it("scales text, spacing and width through the design-token variables", () => {
    const html = page([], {
      theme: { fontSize: "lg", spacing: "compact", width: "wide" },
    });
    expect(html).toContain("--font-size-sm:0.91rem");
    expect(html).toContain("--spacing:0.2rem");
    expect(html).toContain("--container-md:32rem");
  });

  it("mirrors the font sizes in tokens.css", () => {
    const css = readFileSync("src/styles/tokens.css", "utf8");
    for (const [step, rem] of Object.entries(FONT_SIZES))
      expect(css).toMatch(new RegExp(`--font-size-${step}: ${rem}rem;`));
  });
});

describe("catalog categories (V2-31a)", () => {
  const XSS = "<img src=x onerror=alert(1)>";
  const shop = (products: object[], categories: object[]) =>
    siteFromConfig(
      {
        schemaVersion: 1,
        template: "classic",
        profile: { title: "Son Shop", socials: [] },
        blocks: [],
        catalog: { products, collections: [], categories },
      },
      "son-shop",
    );
  const site = shop(
    [
      {
        id: "p1",
        title: "Son kem",
        url: "https://shopee.vn/p1",
        affiliateUrl: "https://s.shopee.vn/aff1",
        image: "https://cf.shopee.vn/p1.jpg",
      },
      { id: "p2", title: "Son thỏi", url: "https://shopee.vn/p2" },
      {
        id: "p3",
        title: "Hidden product",
        url: "https://shopee.vn/p3",
        visible: false,
      },
    ],
    [
      {
        id: "c1",
        slug: "lam-dep",
        name: "Làm đẹp",
        items: ["p1", "p3"],
        children: [{ id: "s1", slug: "son", name: "Son môi", items: ["p2"] }],
      },
      { id: "c2", slug: "trong", name: "Trống", items: [] },
    ],
  );
  const view = (s: Site, category: string, sub?: string) =>
    findCategory(s, category, sub) ?? undefined;
  const html = (s: Site, v?: CategoryMatch) =>
    renderToStaticMarkup(<BioPage site={s} view={v} />);

  it("links the root page to each top-level category", () => {
    const root = html(site);
    expect(root).toContain('<nav aria-label="Danh mục"');
    expect(root).toContain('href="/son-shop/lam-dep"');
    expect(root).toContain('href="/son-shop/trong"');
    expect(root).not.toContain("/son-shop/lam-dep/son");
    expect(root).toMatchSnapshot();
  });

  it("renders a category with breadcrumbs, subcategories and its products", () => {
    const out = html(site, view(site, "lam-dep"));
    expect(out).toContain('<nav aria-label="Breadcrumb">');
    expect(out).toMatch(/<a [^>]*href="\/son-shop"[^>]*>Son Shop<\/a>/);
    expect(out).toContain(
      '<a aria-current="page" class="font-semibold" href="/son-shop/lam-dep">Làm đẹp</a>',
    );
    expect(out).toContain("Làm đẹp</h1>");
    expect(out).toContain('href="/son-shop/lam-dep/son"');
    // Own items first, then the subcategory's; the affiliate link wins over the store URL.
    expect(out.indexOf("Son kem")).toBeLessThan(out.indexOf("Son thỏi"));
    expect(out).toContain(
      'href="https://s.shopee.vn/aff1" data-block-id="p1" target="_blank" rel="noopener noreferrer nofollow"',
    );
    expect(out).toContain('src="https://cf.shopee.vn/p1.jpg"');
    expect(out).not.toContain("Hidden product");
    expect(out).toMatchSnapshot();
  });

  it("renders a subcategory with the full breadcrumb trail", () => {
    const out = html(site, view(site, "lam-dep", "son"));
    const crumbs = [...out.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].filter(
      ([, attrs]) => !attrs.includes("target="),
    );
    expect(
      crumbs
        .slice(-3)
        .map(([, attrs, text]) => [
          attrs.match(/href="([^"]*)"/)?.[1],
          attrs.includes('aria-current="page"'),
          text,
        ]),
    ).toEqual([
      ["/son-shop", false, "Son Shop"],
      ["/son-shop/lam-dep", false, "Làm đẹp"],
      ["/son-shop/lam-dep/son", true, "Son môi"],
    ]);
    expect(out).toContain("Son môi</h1>");
    expect(out).not.toContain('aria-label="Danh mục con"');
    expect(out).toContain("Son thỏi");
    expect(out).not.toContain("Son kem");
    expect(out).toMatchSnapshot();
  });

  it("shows an empty state for a category without products", () => {
    expect(html(site, view(site, "trong"))).toContain("Chưa có sản phẩm");
  });

  it("escapes category and product names", () => {
    const evil = shop(
      [{ id: "p1", title: XSS, url: "https://shopee.vn/p1" }],
      [
        {
          id: "c1",
          slug: "x",
          name: XSS,
          items: ["p1"],
          children: [{ id: "s1", slug: "y", name: XSS, items: ["p1"] }],
        },
      ],
    );
    for (const out of [
      html(evil),
      html(evil, view(evil, "x")),
      html(evil, view(evil, "x", "y")),
    ]) {
      expect(out).not.toContain("<img src=x");
      expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
    }
  });

  it("drops unsafe product images and links, even when the schema was bypassed", () => {
    const unsafe = shop(
      [
        {
          id: "p1",
          title: "Bad",
          url: "https://shopee.vn/p1",
          image: "javascript:alert(1)",
        },
      ],
      [{ id: "c1", slug: "x", name: "X", items: ["p1"] }],
    );
    unsafe.catalog!.products[0].affiliateUrl = "javascript:alert(1)";
    const out = html(unsafe, view(unsafe, "x"));
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toContain("<img");
    expect(out).toContain("Bad");
  });
});
