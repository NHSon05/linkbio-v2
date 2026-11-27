"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  CATEGORY_SLUG,
  type Category,
  type ProductDb,
  type Site,
  type Subcategory,
} from "@/lib/schemas/site";
import { catalogFor } from "@/templates/catalog";
import { randomSuffix, slugify, withSuffix } from "@/lib/slug";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UpdateDraft } from "./products";

// ---------- Draft edits (V2-30c): each takes the draft Site, like attachProduct() in products.tsx ----------

type Fields = { name: string; slug: string };

function editable(site: Site) {
  const catalog = structuredClone(catalogFor(site));
  site.catalog = catalog;
  return catalog;
}

const everyCategory = (catalog: ProductDb) =>
  catalog.categories.flatMap((c): (Category | Subcategory)[] => [
    c,
    ...c.children,
  ]);

/** Slugs already used next to a category with this parent (top level when parentId is undefined). */
export function siblingSlugs(site: Site, parentId?: string, selfId?: string) {
  const { categories } = catalogFor(site);
  const list = parentId
    ? (categories.find((c) => c.id === parentId)?.children ?? [])
    : categories;
  return list.filter((c) => c.id !== selfId).map((c) => c.slug);
}

/** Slug to pre-fill from a name; suffixed when the plain one is empty or taken by a sibling. */
export function categorySlug(
  name: string,
  taken: string[],
  suffix = randomSuffix(),
) {
  const base = slugify(name).slice(0, 40).replace(/-+$/, "");
  return CATEGORY_SLUG.test(base) && !taken.includes(base)
    ? base
    : withSuffix(base, suffix);
}

/** Inline error for a slug, or "" when it can be saved. */
export function slugProblem(slug: string, taken: string[]) {
  if (!CATEGORY_SLUG.test(slug))
    return "Slug dùng 1–40 ký tự a-z, 0-9 hoặc -, bắt đầu bằng chữ hoặc số.";
  if (taken.includes(slug)) return "Slug này đã có ở cùng cấp.";
  return "";
}

export function addCategory(site: Site, fields: Fields, parentId?: string) {
  const { categories } = editable(site);
  const entry = { id: crypto.randomUUID(), ...fields, items: [] };
  if (!parentId) categories.push({ ...entry, children: [] });
  else categories.find((c) => c.id === parentId)?.children.push(entry);
}

export function editCategory(site: Site, id: string, fields: Fields) {
  const found = everyCategory(editable(site)).find((c) => c.id === id);
  if (found) Object.assign(found, fields);
}

/** Removes a category (with its subcategories) or a subcategory; products stay in the catalog. */
export function removeCategory(site: Site, id: string) {
  const catalog = editable(site);
  catalog.categories = catalog.categories.filter((c) => c.id !== id);
  for (const c of catalog.categories)
    c.children = c.children.filter((s) => s.id !== id);
}

/** Puts a product in exactly the given categories and subcategories (new ones go last). */
export function assignProduct(
  site: Site,
  productId: string,
  categoryIds: string[],
) {
  for (const c of everyCategory(editable(site))) {
    const wanted = categoryIds.includes(c.id);
    if (wanted && !c.items.includes(productId)) c.items.push(productId);
    if (!wanted) c.items = c.items.filter((item) => item !== productId);
  }
}

/** Deletes a product and every reference to it, so the draft still passes PageConfigSchema. */
export function removeProduct(site: Site, productId: string) {
  const catalog = editable(site);
  catalog.products = catalog.products.filter((p) => p.id !== productId);
  for (const list of [...catalog.collections, ...everyCategory(catalog)])
    list.items = list.items.filter((item) => item !== productId);
}

// ---------- UI ----------

/** Category checkboxes for the product form; checked ids arrive in its FormData as "categories". */
export function CategoryChecks({
  categories,
  productId,
}: {
  categories: Category[];
  productId: string;
}) {
  if (!categories.length) return null;
  const box = (c: Category | Subcategory, parent?: Category) => (
    <label
      key={c.id}
      className={"flex items-center gap-2 text-sm" + (parent ? " pl-6" : "")}
    >
      <input
        type="checkbox"
        name="categories"
        value={c.id}
        defaultChecked={c.items.includes(productId)}
        aria-label={parent ? `${parent.name} / ${c.name}` : undefined}
        className="size-4 accent-primary"
      />
      {c.name}
    </label>
  );
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Danh mục</legend>
      {categories.flatMap((c) => [box(c), ...c.children.map((s) => box(s, c))])}
    </fieldset>
  );
}

type Modal = {
  mode: "add" | "edit" | "delete";
  parent?: Category;
  category?: Category | Subcategory;
};

export function CategoryManager({
  site,
  update,
  locked,
}: {
  site: Site;
  update: UpdateDraft;
  locked: boolean;
}) {
  const { categories } = catalogFor(site);
  const [modal, setModal] = useState<Modal | null>(null);
  const close = () => setModal(null);
  const target = modal?.category;
  const pathOf = (...slugs: string[]) => "/" + [site.slug, ...slugs].join("/");

  const row = (c: Category | Subcategory, parent?: Category) => (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 px-2">
        <span className="block truncate font-semibold">{c.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {parent ? pathOf(parent.slug, c.slug) : pathOf(c.slug)} ·{" "}
          {c.items.length} sản phẩm
        </span>
      </span>
      {!locked && (
        <>
          {!parent && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={"Thêm danh mục con vào " + c.name}
              title="Thêm danh mục con"
              onClick={() => setModal({ mode: "add", parent: c as Category })}
            >
              <Plus />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={"Sửa danh mục " + c.name}
            title="Sửa danh mục"
            onClick={() => setModal({ mode: "edit", parent, category: c })}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={"Xóa danh mục " + c.name}
            title="Xóa danh mục"
            onClick={() => setModal({ mode: "delete", parent, category: c })}
          >
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <Panel
      title="Danh mục"
      hint="Mỗi danh mục có trang riêng sau khi xuất bản. Tối đa 2 cấp: danh mục và danh mục con."
      actions={
        !locked && (
          <Button size="sm" onClick={() => setModal({ mode: "add" })}>
            <Plus />
            Thêm danh mục
          </Button>
        )
      }
    >
      <ul aria-label="Danh sách danh mục" className="grid gap-2">
        {categories.map((c) => (
          <li
            key={c.id}
            aria-label={c.name}
            className="rounded-[22px] bg-muted p-2"
          >
            {row(c)}
            {!!c.children.length && (
              <ul className="mt-1 ml-4 grid gap-1 border-l pl-2">
                {c.children.map((s) => (
                  <li key={s.id} aria-label={s.name}>
                    {row(s, c)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {!categories.length && (
        <p className="py-5 text-center text-sm text-muted-foreground">
          Chưa có danh mục.
        </p>
      )}
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {modal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {modal.mode === "delete"
                    ? "Xóa danh mục?"
                    : modal.mode === "edit"
                      ? "Sửa danh mục"
                      : modal.parent
                        ? "Thêm danh mục con"
                        : "Thêm danh mục"}
                </DialogTitle>
                <DialogDescription>
                  {modal.mode === "delete"
                    ? (modal.parent
                        ? "Danh mục con"
                        : "Danh mục và các danh mục con của nó") +
                      " sẽ bị xóa khỏi bản nháp. Sản phẩm vẫn được giữ lại."
                    : modal.parent
                      ? `Thuộc danh mục ${modal.parent.name}.`
                      : "Danh mục cấp 1 của trang."}
                </DialogDescription>
              </DialogHeader>
              {modal.mode === "delete" && target ? (
                <>
                  <p>{target.name}</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={close}>
                      Hủy
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        update((d) => removeCategory(d, target.id));
                        close();
                      }}
                    >
                      Xác nhận xóa
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <CategoryForm
                  initial={target}
                  taken={siblingSlugs(site, modal.parent?.id, target?.id)}
                  prefix={pathOf(...(modal.parent ? [modal.parent.slug] : []))}
                  cancel={close}
                  save={(fields) => {
                    const parentId = modal.parent?.id;
                    update((d) =>
                      target
                        ? editCategory(d, target.id, fields)
                        : addCategory(d, fields, parentId),
                    );
                    close();
                  }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/** Name and slug fields. For a new category the slug follows the name until the user edits it. */
function CategoryForm({
  initial,
  taken,
  prefix,
  cancel,
  save,
}: {
  initial?: Fields;
  taken: string[];
  prefix: string;
  cancel: () => void;
  save: (fields: Fields) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [typed, setTyped] = useState(initial?.slug);
  const [suffix] = useState(randomSuffix);
  const slug = typed ?? (name.trim() ? categorySlug(name, taken, suffix) : "");
  const problem = typed !== undefined || slug ? slugProblem(slug, taken) : "";
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!problem && name.trim()) save({ name: name.trim(), slug });
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor="category-name">Tên danh mục</Label>
        <Input
          id="category-name"
          value={name}
          maxLength={80}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="category-slug">Slug danh mục</Label>
        <Input
          id="category-slug"
          value={slug}
          maxLength={40}
          aria-invalid={!!problem}
          aria-describedby={
            problem ? "category-path category-slug-error" : "category-path"
          }
          onChange={(e) => setTyped(e.target.value)}
        />
        <p id="category-path" className="text-xs text-muted-foreground">
          Địa chỉ: {prefix}/{slug}
          {initial &&
            " · Đổi slug sẽ đổi địa chỉ công khai từ lần xuất bản sau."}
        </p>
        {problem && (
          <p
            id="category-slug-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {problem}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={cancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={!!problem}>
          {initial ? "Cập nhật bản nháp" : "Thêm vào bản nháp"}
        </Button>
      </DialogFooter>
    </form>
  );
}
