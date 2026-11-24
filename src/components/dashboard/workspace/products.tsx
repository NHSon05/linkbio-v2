"use client";

import { useState, type FormEvent } from "react";
import { Copy, Link2, Eye, EyeOff, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatPrice, layoutOf, ProductSchema, type Product, type Site } from "@/lib/schemas/site";
import { catalogFor } from "@/components/dashboard/mock/templates/catalog";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type UpdateDraft = (change: (draft: Site) => void) => void;

export function ProductThumb({ product, landingUrl }: { product: Product; landingUrl: string }) {
  let image: URL | undefined;
  try {
    if (product.image) image = new URL(product.image, landingUrl);
  } catch {
    /* Ảnh cũ có thể thiếu URL hợp lệ. */
  }
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
      {image && ["http:", "https:"].includes(image.protocol) ? (
        /* eslint-disable-next-line @next/next/no-img-element -- Ảnh sản phẩm từ nhiều nhà bán hàng. */
        <img alt="" className="size-full object-contain p-1" src={image.href} />
      ) : (
        <ShoppingBag size={18} />
      )}
    </span>
  );
}

function attachProduct(site: Site, product: Product, collectionId: string) {
  const catalog = structuredClone(catalogFor(site));
  site.catalog = catalog;
  const index = catalog.products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    catalog.products[index] = product;
    return;
  }
  catalog.products.unshift(product);
  let collection = catalog.collections.find((c) => c.id === collectionId);
  if (!collection) {
    collection = { id: crypto.randomUUID(), name: "Sản phẩm của tôi", items: [] };
    catalog.collections.push(collection);
  }
  collection.items.unshift(product.id);
  if (!site.blocks.some((b) => b.type === "shop")) {
    const id = crypto.randomUUID();
    const layout = layoutOf(site);
    site.blocks.push({ id, type: "shop", title: "Sản phẩm affiliate", collections: [collection.id] });
    site.layout = { ...layout, main: { ...layout.main, blocks: [...layout.main.blocks, id] } };
  }
}

export function ProductManager({
  site,
  update,
  locked,
  landingUrl,
}: {
  site: Site;
  update: UpdateDraft;
  locked: boolean;
  landingUrl: string;
}) {
  const catalog = catalogFor(site);
  const [filter, setFilter] = useState("");
  const [link, setLink] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const collection = catalog.collections.find((c) => c.id === collectionId);
  const shown = catalog.products.filter((p) => p.visible !== false).length;
  const [modal, setModal] = useState<{ mode: "add" | "detail" | "edit" | "delete"; product: Product } | null>(null);
  const [error, setError] = useState("");
  const visible = catalog.products.filter(
    (p) =>
      (!collection || collection.items.includes(p.id)) &&
      p.title.toLocaleLowerCase("vi").includes(filter.trim().toLocaleLowerCase("vi")),
  );
  const close = () => {
    setModal(null);
    setError("");
  };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal || locked) return;
    const form = new FormData(e.currentTarget);
    const field = (k: string) => String(form.get(k) || "").trim();
    const parsed = ProductSchema.safeParse({
      ...modal.product,
      title: field("title"),
      url: field("url"),
      affiliateUrl: field("affiliateUrl") || undefined,
      image: field("image") || undefined,
      price: field("price") || undefined,
      currency: field("currency"),
      visible: field("visible") === "yes",
    });
    if (!parsed.success || !parsed.data.title) {
      setError("Nhập tên sản phẩm và đường dẫn HTTP hoặc HTTPS hợp lệ.");
      return;
    }
    update((d) => attachProduct(d, parsed.data, field("collection")));
    if (modal.mode === "add") setLink("");
    close();
  }
  function remove() {
    if (!modal || locked) return;
    const id = modal.product.id;
    update((d) => {
      const catalog = structuredClone(catalogFor(d));
      catalog.products = catalog.products.filter((p) => p.id !== id);
      for (const collection of catalog.collections) collection.items = collection.items.filter((item) => item !== id);
      d.catalog = catalog;
    });
    close();
  }
  function startAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setModal({ mode: "add", product: { id: crypto.randomUUID(), url: link.trim(), title: "" } });
  }
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Sản phẩm", count: catalog.products.length },
          { label: "Đang hiển thị", count: shown },
          { label: "Đã ẩn", count: catalog.products.length - shown },
          { label: "Bộ sưu tập", count: catalog.collections.length },
        ].map(({ label, count }, i) => (
          <Card key={label} className={"gap-2 rounded-[24px] px-4 py-4 " + (i === 0 ? "bg-olive text-ink" : "")}>
            <span className="text-xs">{label}</span>
            <strong className="text-3xl leading-none font-normal">{count}</strong>
          </Card>
        ))}
      </div>
      {!locked && (
        <Panel title="Thêm từ liên kết">
          <form
            onSubmit={startAdd}
            className="flex flex-wrap items-center gap-2 rounded-[24px] bg-muted p-2 sm:rounded-full"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card">
              <Link2 size={16} />
            </span>
            <Input
              type="url"
              pattern="https?://.+"
              aria-label="Đường dẫn sản phẩm"
              placeholder="Dán liên kết sản phẩm…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="min-w-24 flex-1 rounded-full border-0 bg-transparent px-1"
            />
            <Button type="submit">
              <Plus />
              Thêm sản phẩm
            </Button>
          </form>
        </Panel>
      )}
      <Panel title="Danh mục sản phẩm">
        <div aria-label="Lọc theo bộ sưu tập" className="mb-3 flex flex-wrap gap-1.5">
          <Button
            variant={!collection ? "default" : "secondary"}
            size="sm"
            aria-pressed={!collection}
            onClick={() => setCollectionId("")}
          >
            Tất cả · {catalog.products.length}
          </Button>
          {catalog.collections.map((c) => (
            <Button
              key={c.id}
              variant={collectionId === c.id ? "default" : "secondary"}
              size="sm"
              aria-pressed={collectionId === c.id}
              onClick={() => setCollectionId(c.id)}
            >
              {c.name} · {c.items.length}
            </Button>
          ))}
        </div>
        <Input
          type="search"
          aria-label="Tìm sản phẩm"
          placeholder="Tìm theo tên sản phẩm…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-3 rounded-full"
        />
        <ul className="grid gap-2">
          {visible.map((p) => (
            <li key={p.id} aria-label={p.title} className="flex min-w-0 items-center gap-1 rounded-[22px] bg-muted p-2">
              <Button
                variant="ghost"
                className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-md p-0 text-left"
                onClick={() => setModal({ mode: "detail", product: p })}
              >
                <ProductThumb product={p} landingUrl={landingUrl} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="outline" className="max-w-32 bg-card">
                      {new URL(p.url).hostname.replace(/^www\./, "")}
                    </Badge>
                    {formatPrice(p.price, p.currency)}
                    {p.visible === false && " · Đã ẩn"}
                  </span>
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Sao chép liên kết"
                title="Sao chép liên kết"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(p.affiliateUrl || p.url);
                    toast.success("Đã sao chép liên kết.");
                  } catch {
                    toast.error("Không sao chép được liên kết.");
                  }
                }}
              >
                <Copy />
              </Button>
              {!locked && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={p.visible === false ? "Hiện sản phẩm" : "Ẩn sản phẩm"}
                  title={p.visible === false ? "Hiện sản phẩm" : "Ẩn sản phẩm"}
                  onClick={() =>
                    update((d) => {
                      const db = structuredClone(catalogFor(d));
                      const item = db.products.find((item) => item.id === p.id);
                      if (item) item.visible = item.visible === false;
                      d.catalog = db;
                    })
                  }
                >
                  {p.visible === false ? <EyeOff /> : <Eye />}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {!visible.length && (
          <p className="py-7 text-center text-sm text-muted-foreground">
            {filter || collection ? "Không có sản phẩm phù hợp." : "Chưa có sản phẩm affiliate."}
          </p>
        )}
      </Panel>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          {modal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {modal.mode === "detail"
                    ? modal.product.title
                    : modal.mode === "add"
                      ? "Thêm sản phẩm"
                      : modal.mode === "edit"
                        ? "Sửa sản phẩm"
                        : "Xóa sản phẩm?"}
                </DialogTitle>
                <DialogDescription>
                  {modal.mode === "delete"
                    ? "Sản phẩm sẽ được gỡ khỏi các bộ sưu tập trong bản nháp."
                    : modal.mode === "detail"
                      ? "Chi tiết sản phẩm affiliate"
                      : "Thông tin hiển thị trên trang bio của bạn."}
                </DialogDescription>
              </DialogHeader>
              {modal.mode === "detail" ? (
                <>
                  <div className="flex items-center gap-3">
                    <ProductThumb product={modal.product} landingUrl={landingUrl} />
                    <div>
                      <p>{formatPrice(modal.product.price, modal.product.currency) || "Chưa có giá"}</p>
                      <p className="text-xs text-muted-foreground">
                        {modal.product.visible === false ? "Đã ẩn" : "Hiển thị"}
                      </p>
                    </div>
                  </div>
                  <dl className="grid gap-2 text-sm">
                    {[
                      ["Liên kết sản phẩm", modal.product.url],
                      ["Liên kết affiliate", modal.product.affiliateUrl],
                    ].map(
                      ([label, url]) =>
                        url && (
                          <div key={label}>
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd>
                              <a className="break-all underline" href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            </dd>
                          </div>
                        ),
                    )}
                  </dl>
                  {!locked && (
                    <DialogFooter>
                      <Button variant="destructive" onClick={() => setModal({ ...modal, mode: "delete" })}>
                        <Trash2 />
                        Xóa sản phẩm
                      </Button>
                      <Button onClick={() => setModal({ ...modal, mode: "edit" })}>
                        <Pencil />
                        Sửa sản phẩm
                      </Button>
                    </DialogFooter>
                  )}
                </>
              ) : modal.mode === "delete" ? (
                <>
                  <p>{modal.product.title}</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={close}>
                      Hủy
                    </Button>
                    <Button variant="destructive" onClick={remove}>
                      Xác nhận xóa
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <form onSubmit={submit} className="grid gap-3">
                  {(
                    [
                      { key: "title", label: "Tên sản phẩm" },
                      { key: "url", label: "Liên kết sản phẩm" },
                      { key: "affiliateUrl", label: "Liên kết affiliate" },
                      { key: "image", label: "Đường dẫn ảnh" },
                      { key: "price", label: "Giá" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key} className="grid gap-1">
                      <Label htmlFor={"product-" + key}>{label}</Label>
                      <Input
                        id={"product-" + key}
                        name={key}
                        type={key === "url" || key === "affiliateUrl" ? "url" : "text"}
                        defaultValue={modal.product[key]}
                        required={key === "url" || key === "title"}
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <Select name="currency" defaultValue={modal.product.currency || "VND"}>
                      <SelectTrigger aria-label="Đơn vị tiền">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set(["VND", "USD", modal.product.currency || "VND"])].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select name="visible" defaultValue={modal.product.visible === false ? "no" : "yes"}>
                      <SelectTrigger aria-label="Hiển thị sản phẩm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Hiển thị</SelectItem>
                        <SelectItem value="no">Ẩn sản phẩm</SelectItem>
                      </SelectContent>
                    </Select>
                    {modal.mode === "add" && !!catalog.collections.length && (
                      <Select name="collection" defaultValue={collection?.id ?? catalog.collections[0].id}>
                        <SelectTrigger aria-label="Bộ sưu tập">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.collections.map((c) => (
                            <SelectItem value={c.id} key={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="text-destructive">
                      {error}
                    </p>
                  )}
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={close}>
                      Hủy
                    </Button>
                    <Button type="submit">{modal.mode === "add" ? "Thêm vào bản nháp" : "Cập nhật bản nháp"}</Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
