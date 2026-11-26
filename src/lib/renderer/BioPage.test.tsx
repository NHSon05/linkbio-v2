import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { siteFromConfig, type Block } from "@/lib/schemas/site";
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
