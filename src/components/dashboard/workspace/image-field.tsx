"use client";

import { useRef, useTransition } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_BYTES } from "@/lib/media";

/** Ô đường dẫn ảnh kèm nút tải ảnh lên Storage (FE-05). */
export function ImageField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();

  function upload(picked: File) {
    // Checked again on the server; this only avoids sending a file that will be rejected.
    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error("Ảnh tối đa 5 MB.");
      return;
    }
    startUpload(async () => {
      const form = new FormData();
      form.set("file", picked);
      const result = await uploadImage(form);
      if ("error" in result) toast.error(result.error);
      else onChange(result.url);
    });
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-1.5">
        <Input
          id={id}
          type="url"
          value={value}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => file.current?.click()}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {uploading ? "Đang tải…" : "Tải ảnh"}
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
            if (picked) upload(picked);
          }}
        />
      </div>
    </div>
  );
}
