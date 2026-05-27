import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { FormItemGroup, FormLabel, FormInput, FormError } from "wasp/client/auth";

const COUNTRIES = [
  { code: "LK", dial: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "IN", dial: "+91",  flag: "🇮🇳", name: "India" },
  { code: "US", dial: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "CA", dial: "+1",   flag: "🇨🇦", name: "Canada" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "SG", dial: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "MY", dial: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "PK", dial: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "NP", dial: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "MV", dial: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "DE", dial: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33",  flag: "🇫🇷", name: "France" },
  { code: "IT", dial: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "NL", dial: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "SE", dial: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "NO", dial: "+47",  flag: "🇳🇴", name: "Norway" },
  { code: "CH", dial: "+41",  flag: "🇨🇭", name: "Switzerland" },
  { code: "JP", dial: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "KR", dial: "+82",  flag: "🇰🇷", name: "South Korea" },
  { code: "CN", dial: "+86",  flag: "🇨🇳", name: "China" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "QA", dial: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "KW", dial: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "BH", dial: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "OM", dial: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "ZA", dial: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "NZ", dial: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "BR", dial: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "MX", dial: "+52",  flag: "🇲🇽", name: "Mexico" },
  { code: "PH", dial: "+63",  flag: "🇵🇭", name: "Philippines" },
  { code: "ID", dial: "+62",  flag: "🇮🇩", name: "Indonesia" },
  { code: "TH", dial: "+66",  flag: "🇹🇭", name: "Thailand" },
  { code: "VN", dial: "+84",  flag: "🇻🇳", name: "Vietnam" },
];

interface PhoneInputFieldProps {
  hookForm: UseFormReturn<any>;
}

export function PhoneInputField({ hookForm }: PhoneInputFieldProps) {
  const [dialCode, setDialCode] = useState("+94");
  const [localNumber, setLocalNumber] = useState("");

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^\d\s\-()]/g, "");
    setLocalNumber(val);
    const combined = val.trim() ? `${dialCode}${val.replace(/\s/g, "")}` : "";
    hookForm.setValue("phone", combined, { shouldValidate: true });
  }

  function handleDialChange(dial: string) {
    setDialCode(dial);
    const combined = localNumber.trim()
      ? `${dial}${localNumber.replace(/\s/g, "")}`
      : "";
    hookForm.setValue("phone", combined, { shouldValidate: true });
  }

  const selectedCountry = COUNTRIES.find((c) => c.dial === dialCode) ?? COUNTRIES[0];

  return (
    <FormItemGroup>
      <FormLabel>Phone Number <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>(optional)</span></FormLabel>
      <div style={{ display: "flex", gap: "8px" }}>
        <Select value={dialCode} onValueChange={handleDialChange}>
          <SelectTrigger
            className="rounded-xl border-border bg-background text-foreground"
            style={{ width: "108px", flexShrink: 0 }}
          >
            <SelectValue>
              <span style={{ fontSize: "1.1rem" }}>{selectedCountry.flag}</span>{" "}
              <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>{dialCode}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {COUNTRIES.map((c) => (
              <SelectItem key={`${c.code}-${c.dial}`} value={c.dial}>
                <span style={{ fontSize: "1.1rem", marginRight: "6px" }}>{c.flag}</span>
                <span style={{ fontSize: "0.85rem" }}>{c.name}</span>{" "}
                <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{c.dial}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormInput
          type="tel"
          placeholder="771 234 567"
          value={localNumber}
          onChange={handleNumberChange}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
      {hookForm.formState.errors.phone && (
        <FormError>{String(hookForm.formState.errors.phone.message)}</FormError>
      )}
      <input type="hidden" {...hookForm.register("phone")} />
    </FormItemGroup>
  );
}
