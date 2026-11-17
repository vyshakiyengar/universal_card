import { AtSign, BriefcaseBusiness, Camera, Globe2, MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import {
  cardLimits, destinationKinds, emailLabels, linkKinds, phoneLabels,
  type DestinationKind, type UniversalCard,
} from "@/lib/cards";

export const destinations = {
  linkedin: { label: "LinkedIn", hint: "https://www.linkedin.com/in/your-name", icon: BriefcaseBusiness, inputType: "text" },
  whatsapp: { label: "WhatsApp", hint: "+44 7700 900123", icon: MessageCircle, inputType: "tel" },
  email: { label: "Email", hint: "alex@example.com", icon: AtSign, inputType: "email" },
  phone: { label: "Phone", hint: "+44 7700 900123", icon: Phone, inputType: "tel" },
  instagram: { label: "Instagram", hint: "@yourname", icon: Camera, inputType: "text" },
  url: { label: "Website", hint: "https://example.com", icon: Globe2, inputType: "url" },
} as const;

const primaryOrder = ["linkedin", "whatsapp", "email", "phone", "instagram", "url"] as const satisfies ReadonlyArray<DestinationKind>;

export function DestinationPicker({ kind, onChange }: { kind: DestinationKind; onChange: (kind: DestinationKind) => void }) {
  return (
    <div className="destinations" aria-label="Choose a destination" role="group">
      {primaryOrder.filter((value) => destinationKinds.includes(value)).map((value) => {
        const { icon: Icon, label } = destinations[value];
        return (
          <button className="destination-chip" type="button" key={value} aria-pressed={kind === value} onClick={() => onChange(value)}>
            <Icon size={17} /> {label}
          </button>
        );
      })}
    </div>
  );
}

type Row<Label extends string> = { label: Label; value: string };
const labelText: Record<string, string> = { home: "Home", work: "Work", mobile: "Mobile", other: "Other" };

function ContactRows<Label extends string>({ labels, rows, onChange, type }: {
  labels: readonly Label[];
  rows: Row<Label>[];
  onChange: (rows: Row<Label>[]) => void;
  type: "email" | "phone";
}) {
  const name = type === "email" ? "email" : "phone";
  const defaultLabel = labels.find((label) => label === (type === "email" ? "work" : "mobile")) ?? labels[0];
  function update(index: number, change: Partial<Row<Label>>) {
    onChange(rows.map((row, position) => position === index ? { ...row, ...change } : row));
  }
  return (
    <div className="contact-group">
      <div className="group-heading">
        <h3>{type === "email" ? "Email addresses" : "Phone numbers"}</h3>
        <button type="button" className="text-button" disabled={rows.length >= cardLimits.rows} onClick={() => onChange([...rows, { label: defaultLabel, value: "" }])}>
          <Plus size={16} /> Add {name}
        </button>
      </div>
      {rows.map((row, index) => (
        <div className="field-row" key={index}>
          <select aria-label={`${name} ${index + 1} label`} value={row.label} onChange={(event) => update(index, { label: event.target.value as Label })}>
            {labels.map((label) => <option value={label} key={label}>{labelText[label]}</option>)}
          </select>
          <input aria-label={`${name} ${index + 1}`} type={type === "email" ? "email" : "tel"} autoComplete={type === "email" ? "email" : "tel"} value={row.value}
            maxLength={cardLimits[type]} placeholder={destinations[type].hint} onChange={(event) => update(index, { value: event.target.value })} />
          <button className="icon-button" type="button" aria-label={`Remove ${name} ${index + 1}`} onClick={() => onChange(rows.filter((_, position) => position !== index))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function UniversalFields({ draft, onChange }: { draft: UniversalCard; onChange: (draft: UniversalCard) => void }) {
  return (
    <>
      <div className="input-pair">
        <label className="field">Job title
          <input value={draft.jobTitle} maxLength={cardLimits.text} placeholder="Product designer" autoComplete="organization-title"
            onChange={(event) => onChange({ ...draft, jobTitle: event.target.value })} />
        </label>
        <label className="field">Company
          <input value={draft.company} maxLength={cardLimits.text} placeholder="Studio North" autoComplete="organization"
            onChange={(event) => onChange({ ...draft, company: event.target.value })} />
        </label>
      </div>
      <div className="contact-fields">
        <ContactRows labels={emailLabels} type="email" rows={draft.emails} onChange={(emails) => onChange({ ...draft, emails })} />
        <ContactRows labels={phoneLabels} type="phone" rows={draft.phones} onChange={(phones) => onChange({ ...draft, phones })} />
        <div className="contact-group">
          <div className="group-heading">
            <h3>Links</h3>
            <button className="text-button" type="button" disabled={draft.links.length >= cardLimits.rows}
              onClick={() => onChange({ ...draft, links: [...draft.links, { kind: "linkedin", value: "" }] })}>
              <Plus size={16} /> Add link
            </button>
          </div>
          {draft.links.map((link, index) => (
            <div className="field-row" key={index}>
              <select aria-label={`Link ${index + 1} type`} value={link.kind} onChange={(event) => onChange({
                ...draft, links: draft.links.map((entry, position) => position === index ? { ...entry, kind: event.target.value as typeof link.kind } : entry),
              })}>
                {linkKinds.map((kind) => <option key={kind} value={kind}>{destinations[kind].label}</option>)}
              </select>
              <input aria-label={`Link ${index + 1}`} maxLength={cardLimits.link} value={link.value}
                placeholder={destinations[link.kind].hint} onChange={(event) => onChange({
                  ...draft, links: draft.links.map((entry, position) => position === index ? { ...entry, value: event.target.value } : entry),
                })} />
              <button className="icon-button" type="button" aria-label={`Remove link ${index + 1}`}
                onClick={() => onChange({ ...draft, links: draft.links.filter((_, position) => index !== position) })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
