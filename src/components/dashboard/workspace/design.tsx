import { ArrowDown, ArrowUp, Eye, EyeOff, Pin } from "lucide-react";
import { REGIONS, layoutOf, type Block, type RegionName, type Site } from "@/lib/schemas/site";
import { templates } from "@/templates";
import { TemplatePicker } from "@/components/dashboard/workspace/template-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/dashboard/panel";
import { Segmented } from "@/components/dashboard/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UpdateDraft } from "./products";

const NONE = "__none";
// V2-06: the middle option is the template default, stored as "no value".
const SCALES = [
  {
    key: "fontSize",
    label: "Cỡ chữ",
    options: [
      { value: "sm", label: "Nhỏ" },
      { value: "md", label: "Vừa" },
      { value: "lg", label: "Lớn" },
    ],
  },
  {
    key: "spacing",
    label: "Khoảng cách",
    options: [
      { value: "compact", label: "Gọn" },
      { value: "normal", label: "Vừa" },
      { value: "relaxed", label: "Thoáng" },
    ],
  },
  {
    key: "width",
    label: "Độ rộng nội dung",
    options: [
      { value: "narrow", label: "Hẹp" },
      { value: "normal", label: "Vừa" },
      { value: "wide", label: "Rộng" },
    ],
  },
] as const;
const FONTS = ["Sora", "Manrope", "Inter", "DM Sans", "Be Vietnam Pro"];

export function Design({ draft, update, locked }: { draft: Site; update: UpdateDraft; locked: boolean }) {
  const tpl = templates[draft.template] ?? templates.classic;
  const layout = layoutOf(draft);
  const placed = new Set(REGIONS.flatMap((r) => layout[r].blocks));
  const unplaced = draft.blocks.filter((b) => !placed.has(b.id));
  const byId = new Map(draft.blocks.map((b) => [b.id, b]));
  const allows = (r: RegionName, b: Block) => !tpl.regions[r].allow || tpl.regions[r].allow!.includes(b.type);

  function setRegion(r: RegionName, ids: string[]) {
    update((d) => {
      const L = layoutOf(d);
      d.layout = { ...L, [r]: { ...L[r], blocks: ids } };
    });
  }
  function move(r: RegionName, i: number, dir: -1 | 1) {
    const ids = [...layout[r].blocks];
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setRegion(r, ids);
  }
  function moveTo(id: string, from: RegionName | null, to: RegionName | "") {
    update((d) => {
      const L = layoutOf(d);
      const next = { ...L };
      if (from) next[from] = { ...L[from], blocks: L[from].blocks.filter((x) => x !== id) };
      if (to) next[to] = { ...next[to], blocks: [...next[to].blocks, id] };
      d.layout = next;
    });
  }
  function toggle(id: string, key: "pinned" | "hidden") {
    update((d) => {
      const b = d.blocks.find((x) => x.id === id);
      if (b) b[key] = !b[key];
    });
  }

  const blockRow = (b: Block, region: RegionName | null, i: number, total: number) => (
    <li
      key={b.id}
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-2xl bg-card px-3 py-2 text-sm",
        b.hidden && "opacity-50",
      )}
    >
      <Badge className="bg-olive text-[10px] tracking-[0.08em] text-olive-foreground uppercase">{b.type}</Badge>
      <span className="min-w-0 flex-1 truncate">{b.title || b.text || b.id}</span>
      {region && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={i === 0}
            onClick={() => move(region, i, -1)}
            aria-label="Lên"
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={i === total - 1}
            onClick={() => move(region, i, 1)}
            aria-label="Xuống"
          >
            <ArrowDown />
          </Button>
        </>
      )}
      <Button
        variant={b.pinned ? "olive" : "ghost"}
        size="icon-sm"
        onClick={() => toggle(b.id, "pinned")}
        aria-pressed={!!b.pinned}
        title="Ghim lên đầu vùng"
        aria-label="Ghim lên đầu vùng"
      >
        <Pin />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => toggle(b.id, "hidden")}
        aria-pressed={!!b.hidden}
        title={b.hidden ? "Hiện khối" : "Ẩn khối"}
        aria-label={b.hidden ? "Hiện khối" : "Ẩn khối"}
      >
        {b.hidden ? <EyeOff /> : <Eye />}
      </Button>
      <Select
        value={region ?? NONE}
        disabled={locked}
        onValueChange={(value) => moveTo(b.id, region, value === NONE ? "" : (value as RegionName))}
      >
        <SelectTrigger size="sm" aria-label="Chuyển vùng" className="w-28 rounded-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— không dùng —</SelectItem>
          {REGIONS.map((r) => (
            <SelectItem key={r} value={r} disabled={!allows(r, b)}>
              {tpl.regions[r].label ?? r}
              {allows(r, b) ? "" : " (không cho phép)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );

  return (
    <>
      <Panel title="Mẫu thiết kế" hint={tpl.description}>
        <TemplatePicker
          value={draft.template}
          onChange={(id) =>
            update((d) => {
              d.template = id;
            })
          }
        />
      </Panel>

      <Panel title="Giao diện" hint="Để trống = mặc định của template.">
        <div className="grid grid-cols-2 gap-3">
          {(["bg", "accent"] as const).map((k) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={`theme-${k}`}>{k === "bg" ? "Nền" : "Màu nhấn"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`theme-${k}`}
                  type="color"
                  className="h-9 w-16 rounded-full p-1"
                  value={draft.theme[k] || tpl.themeDefaults[k] || "#000000"}
                  onChange={(e) =>
                    update((d) => {
                      d.theme[k] = e.target.value;
                    })
                  }
                />
                {draft.theme[k] && (
                  <Button
                    variant="link"
                    size="xs"
                    onClick={() =>
                      update((d) => {
                        delete d.theme[k];
                      })
                    }
                  >
                    Đặt lại
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="grid gap-1.5">
            <Label>Phông chữ</Label>
            <Select
              value={draft.theme.font ?? NONE}
              disabled={locked}
              onValueChange={(value) =>
                update((d) => {
                  if (value === NONE) delete d.theme.font;
                  else d.theme.font = value;
                })
              }
            >
              <SelectTrigger aria-label="Font" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Mặc định ({tpl.themeDefaults.font})</SelectItem>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="theme-radius">Bo góc (px)</Label>
            <Input
              id="theme-radius"
              type="number"
              min={0}
              max={40}
              value={draft.theme.radius ?? ""}
              placeholder={String(tpl.themeDefaults.radius ?? 28)}
              onChange={(e) =>
                update((d) => {
                  if (e.target.value === "") delete d.theme.radius;
                  else d.theme.radius = Number(e.target.value);
                })
              }
            />
          </div>
          {SCALES.map(({ key, label, options }) => (
            <div key={key} className="col-span-2 grid gap-1.5">
              <Label id={`theme-${key}`}>{label}</Label>
              <Segmented
                aria-labelledby={`theme-${key}`}
                className="w-fit"
                options={[...options]}
                value={draft.theme[key] ?? options[1].value}
                onValueChange={(value) =>
                  update((d) => {
                    if (value === options[1].value) delete d.theme[key];
                    else (d.theme as Record<string, string>)[key] = value;
                  })
                }
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Vùng & block" hint="Chỉ chuyển block vào vùng mà template cho phép. Ghim để cố định vị trí.">
        <div className="flex flex-col gap-3">
          {REGIONS.map((r) => {
            const ids = layout[r].blocks;
            const spec = tpl.regions[r];
            return (
              <section key={r} className="rounded-3xl bg-muted p-3">
                <div className="mx-1 mb-2.5 flex flex-wrap items-center gap-2">
                  <h3 className="text-md font-semibold tracking-[-0.01em]">{spec.label ?? r}</h3>
                  <Badge variant="outline" className="bg-card">
                    {ids.length}
                    {spec.max ? ` / ${spec.max}` : ""}
                  </Badge>
                  <span className="text-2xs text-muted-foreground">
                    {(layout[r].rank ?? spec.rank ?? r === "main") ? "tự xếp theo viral" : "giữ thứ tự"}
                  </span>
                  {r === "main" && spec.variants && (
                    <Select
                      value={layout.main.variant ?? spec.defaultVariant ?? spec.variants[0]}
                      disabled={locked}
                      onValueChange={(value) =>
                        update((d) => {
                          const L = layoutOf(d);
                          d.layout = { ...L, main: { ...L.main, variant: value as never } };
                        })
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Kiểu hiển thị"
                        className="ml-auto rounded-full bg-card text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {spec.variants.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {ids.map((id, i) => byId.get(id) && blockRow(byId.get(id)!, r, i, ids.length))}
                  {!ids.length && (
                    <li className="rounded-2xl border-thick border-dashed px-3 py-3.5 text-center text-xs text-muted-foreground">
                      Trống
                    </li>
                  )}
                </ul>
              </section>
            );
          })}

          {unplaced.length > 0 && (
            <section className="rounded-3xl border-thick border-dashed p-3">
              <h3 className="mx-1 mb-2.5 text-md font-semibold">Block chưa dùng</h3>
              <ul className="flex flex-col gap-2">{unplaced.map((b, i) => blockRow(b, null, i, unplaced.length))}</ul>
            </section>
          )}
        </div>
      </Panel>
    </>
  );
}
