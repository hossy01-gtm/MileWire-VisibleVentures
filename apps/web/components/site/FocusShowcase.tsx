import { ProductShot } from "./ProductShot";

/** Screenshot of the 3D replay beside a short description and the three camera modes. */
export function FocusShowcase({
  title,
  body,
  modes,
}: {
  title: string;
  body: string;
  modes: readonly { name: string; note: string }[];
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14">
      <ProductShot
        src="/landing/focus-street.webp"
        alt="MileWire 3D focus view: a recorded drive replayed over photorealistic 3D city tiles, with the route trail and vehicle marker"
        width={1600}
        height={1022}
        sizes="(min-width: 1024px) 58vw, 100vw"
      />
      <div>
        <h3 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h3>
        <p className="mt-4 leading-relaxed text-muted">{body}</p>
        <dl className="mt-8 divide-y divide-border border-y border-border">
          {modes.map((mode) => (
            <div key={mode.name} className="flex items-baseline gap-6 py-3">
              <dt className="mono w-20 shrink-0 text-sm text-primary">{mode.name}</dt>
              <dd className="text-sm text-muted">{mode.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
