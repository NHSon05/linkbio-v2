/* eslint-disable @next/next/no-img-element -- user images come from many hosts; next/image needs each host configured. */
import type { CSSProperties, ReactNode } from "react";
import {
  formatPrice,
  luminance,
  regionBlocks,
  themeOf,
  variantOf,
  type Block,
  type RegionName,
  type Site,
} from "@/lib/schemas/site";
import { templates } from "@/templates";
import { catalogFor } from "@/templates/catalog";
import { safeUrl, videoEmbed } from "./blocks";

const NETWORKS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "X",
  zalo: "Zalo",
  spotify: "Spotify",
  website: "Website",
};

/**
 * UI-01: renders a page config. Same component for the editor preview and (Sprint 3) the public page.
 * Pure: no hooks, no data fetching, so it renders on the server or client.
 */
export function BioPage({ site }: { site: Site }) {
  const tpl = templates[site.template] ?? templates.classic;
  const theme = themeOf(site, tpl);
  const dark = luminance(theme.bg) < 0.5;
  const radius = Number(theme.radius ?? 24);
  const style = {
    "--bio-accent": theme.accent ?? "#CBD77E",
    "--bio-radius": `${radius}px`,
    "--bio-button-radius":
      theme.button === "rounded" ? `${Math.min(radius, 16)}px` : "999px",
    "--bio-surface": dark ? "rgb(255 255 255 / 0.08)" : "#ffffff",
    "--bio-muted": dark ? "rgb(247 247 247 / 0.65)" : "rgb(40 40 40 / 0.6)",
    background: theme.bg,
    color: dark ? "#F7F7F7" : "#282828",
    // shortcut: only Sora is loaded (layout.tsx); other fonts fall back to the system font until a font loader exists.
    fontFamily: `"${theme.font ?? "Sora"}", var(--font-sora), system-ui, sans-serif`,
  } as CSSProperties;

  const region = (name: RegionName) => {
    const blocks = regionBlocks(site, tpl, name);
    if (!blocks.length) return null;
    const variant = name === "main" ? variantOf(site, tpl, name) : "list";
    return (
      <div
        data-region={name}
        className={
          variant === "grid-2"
            ? "grid grid-cols-2 gap-3"
            : variant === "carousel"
              ? "-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] *:w-[78%] *:shrink-0 *:snap-start"
              : "grid gap-3"
        }
      >
        {blocks.map((block) => (
          <BlockView key={block.id} block={block} site={site} />
        ))}
      </div>
    );
  };

  return (
    <div data-template={tpl.id} style={style} className="min-h-full w-full">
      <div className="mx-auto grid max-w-md gap-5 px-5 pt-8 pb-12">
        <ProfileHeader site={site} />
        {region("hero")}
        {region("main")}
        {region("footer")}
      </div>
    </div>
  );
}

function ProfileHeader({ site }: { site: Site }) {
  const { profile } = site;
  const cover = safeUrl(profile.cover);
  const avatar = safeUrl(profile.avatar);
  return (
    <header className="grid justify-items-center gap-2 text-center">
      {cover && (
        <img
          alt=""
          src={cover}
          className="mb-2 h-32 w-full rounded-[var(--bio-radius)] object-cover"
        />
      )}
      {avatar ? (
        <img
          alt=""
          src={avatar}
          className="size-20 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-20 place-items-center rounded-full bg-[var(--bio-accent)] text-2xl font-semibold text-[#282828]"
        >
          {profile.title.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <h1 className="text-xl font-semibold tracking-tight">{profile.title}</h1>
      {profile.subtitle && (
        <p className="text-sm text-[var(--bio-muted)]">{profile.subtitle}</p>
      )}
      {!!profile.socials.length && (
        <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
          {profile.socials.map((social, i) => {
            const href = safeUrl(social.url);
            return href ? (
              <li key={i}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block rounded-full bg-[var(--bio-surface)] px-3 py-1 text-xs font-medium"
                >
                  {NETWORKS[social.type] ?? social.type}
                </a>
              </li>
            ) : null;
          })}
        </ul>
      )}
    </header>
  );
}

/** Wraps content in a safe external link when the block has a valid URL. */
function MaybeLink({
  url,
  className,
  children,
}: {
  url: unknown;
  className: string;
  children: ReactNode;
}) {
  const href = safeUrl(url);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
    >
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}

function BlockView({ block, site }: { block: Block; site: Site }) {
  switch (block.type) {
    case "link":
      return (
        <MaybeLink
          url={block.url}
          className="block rounded-[var(--bio-button-radius)] bg-[var(--bio-accent)] px-5 py-3.5 text-center text-sm font-semibold text-[#282828]"
        >
          {block.text || block.title || "Liên kết"}
        </MaybeLink>
      );
    case "card": {
      const image = safeUrl(block.thumbnail);
      return (
        <MaybeLink
          url={block.url}
          className="block overflow-hidden rounded-[var(--bio-radius)] bg-[var(--bio-surface)]"
        >
          {image && (
            <img
              alt=""
              src={image}
              className="aspect-video w-full object-cover"
            />
          )}
          <span className="block p-4">
            <strong className="block text-sm font-semibold">
              {block.text || block.title}
            </strong>
            {block.subtext && (
              <span className="mt-1 block text-xs text-[var(--bio-muted)]">
                {block.subtext}
              </span>
            )}
          </span>
        </MaybeLink>
      );
    }
    case "banner": {
      const image = safeUrl(block.thumbnail);
      return (
        <MaybeLink
          url={block.url}
          className="relative block overflow-hidden rounded-[var(--bio-radius)] bg-[var(--bio-accent)] px-5 py-6 text-[#282828]"
        >
          {image && (
            <img
              alt=""
              src={image}
              className="absolute inset-0 size-full object-cover opacity-35"
            />
          )}
          <span className="relative block text-lg leading-snug font-semibold">
            {block.text || block.title}
          </span>
          {block.subtext && (
            <span className="relative mt-1 block text-sm">{block.subtext}</span>
          )}
        </MaybeLink>
      );
    }
    case "video": {
      const embed = videoEmbed(block.url);
      return (
        <figure className="overflow-hidden rounded-[var(--bio-radius)] bg-[var(--bio-surface)]">
          {embed ? (
            <iframe
              src={embed}
              title={block.title || "Video"}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video w-full border-0"
            />
          ) : (
            <div className="grid aspect-video place-items-center p-4 text-center text-xs text-[var(--bio-muted)]">
              Dán link YouTube hoặc TikTok để hiện video
            </div>
          )}
          {block.title && (
            <figcaption className="px-4 py-3 text-sm font-semibold">
              {block.title}
            </figcaption>
          )}
        </figure>
      );
    }
    case "shop": {
      const products = catalogFor(site).products.filter(
        (p) => p.visible !== false,
      );
      return (
        <section className="col-span-full grid gap-3">
          {block.title && (
            <h2 className="text-base font-semibold">{block.title}</h2>
          )}
          {products.length ? (
            <ul className="grid grid-cols-2 gap-3">
              {products.map((product) => {
                const image = safeUrl(product.image);
                return (
                  <li key={product.id}>
                    <MaybeLink
                      url={product.affiliateUrl || product.url}
                      className="block h-full overflow-hidden rounded-[var(--bio-radius)] bg-[var(--bio-surface)]"
                    >
                      {image && (
                        <img
                          alt=""
                          src={image}
                          className="aspect-square w-full bg-white object-contain p-3"
                        />
                      )}
                      <span className="block p-3">
                        <span className="line-clamp-2 block text-xs font-semibold">
                          {product.title}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--bio-muted)]">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </span>
                    </MaybeLink>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-[var(--bio-radius)] bg-[var(--bio-surface)] p-4 text-center text-xs text-[var(--bio-muted)]">
              Chưa có sản phẩm
            </p>
          )}
        </section>
      );
    }
    default:
      // Types outside the v1 set (carousel, events, …) are skipped instead of breaking the page.
      return null;
  }
}
