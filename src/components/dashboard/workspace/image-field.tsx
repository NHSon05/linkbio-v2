"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Ô đường dẫn ảnh kèm nút chọn ảnh. */
export function ImageField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  slug?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-1.5">
        <Input id={id} value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
        <Button type="button" variant="outline" onClick={() => file.current?.click()}>
          <Upload />
          Tải ảnh
        </Button>
        <input
          ref={file}
          type="file"
          hidden
          aria-label={`Tải ảnh cho ${label}`}
          accept="image/webp,image/avif,image/png,image/jpeg"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = "";
            // shortcut: ảnh chỉ xem trước trong trình duyệt (blob URL), thay bằng upload thật khi có API.
            if (picked) onChange(URL.createObjectURL(picked));
          }}
        />
      </div>
    </div>
  );
}
