import type { Site } from "@/lib/schemas/site";
import { Panel } from "@/components/dashboard/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "./image-field";
import type { UpdateDraft } from "./products";

export function Profile({ draft, update }: { draft: Site; update: UpdateDraft }) {
  return (
    <Panel title="Hồ sơ">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="profile-title">Tên</Label>
          <Input
            id="profile-title"
            value={draft.profile.title}
            onChange={(e) =>
              update((d) => {
                d.profile.title = e.target.value;
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-subtitle">Mô tả ngắn</Label>
          <Input
            id="profile-subtitle"
            value={draft.profile.subtitle ?? ""}
            onChange={(e) =>
              update((d) => {
                d.profile.subtitle = e.target.value;
              })
            }
          />
        </div>
        <ImageField
          id="profile-avatar"
          label="Ảnh đại diện"
          slug={draft.slug}
          value={draft.profile.avatar ?? ""}
          onChange={(url) =>
            update((d) => {
              d.profile.avatar = url || undefined;
            })
          }
        />
        <ImageField
          id="profile-cover"
          label="Ảnh bìa"
          slug={draft.slug}
          value={draft.profile.cover ?? ""}
          onChange={(url) =>
            update((d) => {
              d.profile.cover = url || undefined;
            })
          }
        />
        <div className="col-span-2 grid gap-1.5">
          <Label htmlFor="profile-about">Giới thiệu (chỉ hiện trên desktop)</Label>
          <Textarea
            id="profile-about"
            rows={2}
            value={draft.profile.about ?? ""}
            onChange={(e) =>
              update((d) => {
                d.profile.about = e.target.value;
              })
            }
          />
        </div>
      </div>
    </Panel>
  );
}
