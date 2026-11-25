"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_SPECS, EDITABLE_TYPES, blockLabel } from "@/lib/renderer/blocks";
import {
  layoutOf,
  REGIONS,
  type Block,
  type RegionName,
  type Site,
} from "@/lib/schemas/site";
import { templates } from "@/templates";
import { cn } from "@/lib/utils";
import { ImageField } from "./image-field";
import type { UpdateDraft } from "./products";

/** Content editor: add, edit, reorder and delete blocks in each template region. */
export function BlockEditor({
  draft,
  update,
}: {
  draft: Site;
  update: UpdateDraft;
}) {
  const tpl = templates[draft.template] ?? templates.classic;
  const layout = layoutOf(draft);
  const byId = new Map(draft.blocks.map((b) => [b.id, b]));
  const [open, setOpen] = useState<string | null>(null);

  function add(region: RegionName, type: string) {
    const id = crypto.randomUUID();
    update((d) => {
      d.blocks.push({ id, type, ...BLOCK_SPECS[type].create() });
      const L = layoutOf(d);
      d.layout = {
        ...L,
        [region]: { ...L[region], blocks: [...L[region].blocks, id] },
      };
    });
    setOpen(id);
  }
  function move(region: RegionName, index: number, dir: -1 | 1) {
    update((d) => {
      const L = layoutOf(d);
      const ids = [...L[region].blocks];
      [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
      d.layout = { ...L, [region]: { ...L[region], blocks: ids } };
    });
  }
  function remove(id: string) {
    update((d) => {
      const L = layoutOf(d);
      d.blocks = d.blocks.filter((b) => b.id !== id);
      d.layout = Object.fromEntries(
        REGIONS.map((r) => [
          r,
          { ...L[r], blocks: L[r].blocks.filter((x) => x !== id) },
        ]),
      ) as typeof L;
    });
  }
  function setField(id: string, key: string, value: string) {
    update((d) => {
      const block = d.blocks.find((b) => b.id === id);
      if (block) block[key] = value;
    });
  }

  return (
    <Panel
      title="Nội dung trang"
      hint="Thêm khối, bấm ✎ để sửa. Thứ tự ở đây là thứ tự trên trang."
    >
      <div className="grid gap-3">
        {REGIONS.map((region) => {
          const spec = tpl.regions[region];
          const ids = layout[region].blocks.filter((id) => byId.has(id));
          const types = EDITABLE_TYPES.filter(
            (t) => !spec.allow || spec.allow.includes(t),
          );
          const full = !!spec.max && ids.length >= spec.max;
          return (
            <section
              key={region}
              className="rounded-3xl bg-muted p-3"
              aria-label={spec.label ?? region}
            >
              <div className="mx-1 mb-2 flex items-center gap-2">
                <h3 className="text-md font-semibold">
                  {spec.label ?? region}
                </h3>
                {spec.max && (
                  <Badge variant="outline" className="bg-card">
                    {ids.length} / {spec.max}
                  </Badge>
                )}
                {!!types.length && !full && (
                  <Select value="" onValueChange={(type) => add(region, type)}>
                    <SelectTrigger
                      size="sm"
                      aria-label={`Thêm khối vào ${spec.label ?? region}`}
                      className="ml-auto rounded-full bg-card text-xs"
                    >
                      <Plus />
                      <SelectValue placeholder="Thêm khối" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {BLOCK_SPECS[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ul className="grid gap-2">
                {ids.map((id, i) => (
                  <BlockRow
                    key={id}
                    block={byId.get(id)!}
                    open={open === id}
                    first={i === 0}
                    last={i === ids.length - 1}
                    onToggle={() => setOpen(open === id ? null : id)}
                    onMove={(dir) => move(region, i, dir)}
                    onRemove={() => remove(id)}
                    onField={(key, value) => setField(id, key, value)}
                  />
                ))}
                {!ids.length && (
                  <li className="rounded-2xl border-thick border-dashed px-3 py-3.5 text-center text-xs text-muted-foreground">
                    Trống
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

function BlockRow({
  block,
  open,
  first,
  last,
  onToggle,
  onMove,
  onRemove,
  onField,
}: {
  block: Block;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onField: (key: string, value: string) => void;
}) {
  const spec = BLOCK_SPECS[block.type];
  const label = blockLabel(block);
  return (
    <li
      className={cn(
        "rounded-2xl bg-card text-sm",
        block.hidden && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2">
        <Badge className="bg-olive text-[10px] tracking-[0.08em] text-olive-foreground uppercase">
          {spec?.label ?? block.type}
        </Badge>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={first}
          onClick={() => onMove(-1)}
          aria-label={`Đưa ${label} lên`}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={last}
          onClick={() => onMove(1)}
          aria-label={`Đưa ${label} xuống`}
        >
          <ArrowDown />
        </Button>
        {spec && (
          <Button
            variant={open ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`Sửa ${label}`}
          >
            <Pencil />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Xóa ${label}`}
        >
          <Trash2 />
        </Button>
      </div>
      {open && spec && (
        <div className="grid gap-3 border-t px-3 pt-3 pb-4">
          {spec.hint && (
            <p className="text-xs text-muted-foreground">{spec.hint}</p>
          )}
          {spec.fields.map((field) => {
            const id = `block-${block.id}-${field.key}`;
            const value =
              typeof block[field.key] === "string"
                ? (block[field.key] as string)
                : "";
            return field.kind === "image" ? (
              <ImageField
                key={field.key}
                id={id}
                label={field.label}
                value={value}
                onChange={(url) => onField(field.key, url)}
              />
            ) : (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={id}>{field.label}</Label>
                {field.kind === "textarea" ? (
                  <Textarea
                    id={id}
                    rows={2}
                    value={value}
                    onChange={(e) => onField(field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.kind === "url" ? "url" : "text"}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) => onField(field.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}
