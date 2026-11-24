import { templates, templateIds } from "@/templates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const layouts = { center: "Một cột", split: "Chia đôi", grid: "Dạng lưới" };

/** Lưới chọn template dùng chung cho mọi người: tạo trang mới và tab thiết kế. */
export function TemplatePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="group" aria-label="Template" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {templateIds.map((id) => (
        <Button
          variant="ghost"
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex h-auto flex-col items-start gap-1 rounded-[22px] border-thick border-transparent bg-muted p-3 text-left text-sm font-semibold",
            value === id && "border-olive bg-accent",
          )}
        >
          <span className="template-sample" data-layout={templates[id].desktop} aria-hidden>
            <i />
            <span>
              <b />
              <b />
              <b />
              <b />
            </span>
          </span>
          {templates[id].name}
          <small className="text-2xs leading-snug font-normal text-muted-foreground">
            {layouts[templates[id].desktop]}
          </small>
        </Button>
      ))}
    </div>
  );
}
