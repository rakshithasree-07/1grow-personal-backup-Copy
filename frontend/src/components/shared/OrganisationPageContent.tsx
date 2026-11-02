"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2, Save, MapPin, Phone, Mail, Globe, Loader2, Plus, Edit3, X,
  Camera, Upload, FileText, CreditCard, Trash2, Palette, Link2,
  ExternalLink, Hash, Share2, Video, Clock, ChevronDown, Check,
  Sun, Moon, Monitor, MoreVertical, PowerOff, Users
} from "lucide-react";
import { useTheme } from "next-themes";
import { PageContainer } from "@/components/layout";
import { Button, Card, Input, Select, Badge, Skeleton, Modal, Switch, Textarea, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui";
import { AddressAutocomplete, type AddressResult } from "@/components/ui/AddressAutocomplete";
import { LocationPicker, type LocationResult } from "@/components/ui/LocationPicker";
import { getTenant, updateTenant, type Tenant } from "@/services/tenant";
import {
  getBranches, createBranch, updateBranch, updateBranchStatus,
  type Branch, type CreateBranchRequest,
} from "@/services/branches";
import { getBranding, updateBranding, type Branding, type BusinessHours, type UpdateBrandingRequest } from "@/services/branding";
import { getTenantUsers, type StaffMember } from "@/services/staff";
import { uploadToStorage } from "@/services/upload";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

interface OrganisationPageProps {
  isBranchManager?: boolean;
}

const industryOptions = [
  { value: "TRAINING", label: "Training / Coaching" },
  { value: "RENTAL", label: "Rental Business" },
  { value: "EVENT", label: "Event Management" },
];



const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "13:00", closed: false },
  sunday: { open: "09:00", close: "18:00", closed: true },
};

const statusConfig: Record<string, { label: string; variant: "info" | "brand" | "warning" | "success" | "danger" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  TRIAL: { label: "Trial", variant: "info" },
  INACTIVE: { label: "Inactive", variant: "danger" },
  SUSPENDED: { label: "Suspended", variant: "warning" },
};

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="group p-4 rounded-xl border border-border bg-surface flex items-start gap-4 transition-all hover:border-primary/40 hover:shadow-sm">
      {Icon && (
        <div className="w-10 h-10 shrink-0 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon size={18} className="text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium mb-1">{label}</p>
        <p className="text-sm font-medium text-text-primary truncate whitespace-pre-wrap">{value || "\u2014"}</p>
      </div>
    </div>
  );
}

function ImageUpload({
  currentUrl,
  onUpload,
  onRemove,
  label,
  aspect = "square",
  uploading,
  readonly = false,
}: {
  currentUrl: string | null;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  label?: string;
  aspect?: "square" | "wide";
  uploading: boolean;
  readonly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      {label && <p className="text-sm font-medium text-text-primary mb-2">{label}</p>}
      <div
        className={`relative group overflow-hidden rounded-xl border-2 border-dashed border-border transition-colors ${
          !readonly ? "cursor-pointer hover:border-primary/50" : ""
        } ${aspect === "wide" ? (currentUrl ? "w-fit max-w-full" : "aspect-[4/1] w-full") : "aspect-square w-32"}`}
        onClick={() => !readonly && inputRef.current?.click()}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt={label} className={aspect === "wide" ? "max-h-[300px] w-auto max-w-full object-contain block" : "h-full w-full object-contain"} />
            {!readonly && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Camera size={20} className="text-white" />
                <span className="text-xs font-medium text-white">Change</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-text-secondary">
            {uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : !readonly ? (
              <Upload size={20} />
            ) : (
              <Camera size={20} className="opacity-50" />
            )}
            <span className="text-xs">{readonly ? "No Image" : "Upload"}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      {currentUrl && onRemove && !readonly && (
        <div className="mt-3 flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger h-8 px-3 text-xs rounded-lg"
          >
            <Trash2 size={12} className="mr-1.5" /> Remove Image
          </Button>
        </div>
      )}
    </div>
  );
}

const extractColorsFromImage = async (url: string): Promise<string[]> => {
  const defaultPalette = ["#4F46E5", "#0D9488", "#E11D48", "#2563EB", "#D97706"];

  const processImage = (src: string, crossOrigin?: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return reject();
          
          const scale = Math.min(1, 100 / Math.max(img.width, img.height));
          canvas.width = Math.max(1, img.width * scale);
          canvas.height = Math.max(1, img.height * scale);
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          
          const colorCounts: Record<string, number> = {};
          for (let i = 0; i < data.length; i += 4) {
            if (data[i+3] < 128) continue;
            const r = Math.round(data[i] / 16) * 16;
            const g = Math.round(data[i+1] / 16) * 16;
            const b = Math.round(data[i+2] / 16) * 16;
            const hex = `#${Math.min(255, r).toString(16).padStart(2, '0')}${Math.min(255, g).toString(16).padStart(2, '0')}${Math.min(255, b).toString(16).padStart(2, '0')}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
          
          const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).map(([color]) => color);
          if (sorted.length === 0) return reject();
          
          const vibrant = sorted.filter(c => c !== '#000000' && c !== '#ffffff' && c !== '#101010' && c !== '#f0f0f0');
          
          const hexToRgb = (hex: string) => [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16),
          ];
          const colorDistance = (c1: string, c2: string) => {
            const [r1, g1, b1] = hexToRgb(c1);
            const [r2, g2, b2] = hexToRgb(c2);
            return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
          };

          const distinctColors: string[] = [];
          for (const c of vibrant) {
            if (distinctColors.length >= 5) break;
            if (distinctColors.every(selected => colorDistance(selected, c) > 40)) {
              distinctColors.push(c);
            }
          }
          if (distinctColors.length === 0 && sorted.length > 0) {
            distinctColors.push(sorted[0]);
          }

          const baseColor = distinctColors[0];
          const rHex = parseInt(baseColor.slice(1, 3), 16) / 255;
          const gHex = parseInt(baseColor.slice(3, 5), 16) / 255;
          const bHex = parseInt(baseColor.slice(5, 7), 16) / 255;
          const max = Math.max(rHex, gHex, bHex), min = Math.min(rHex, gHex, bHex);
          let h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case rHex: h = (gHex - bHex) / d + (gHex < bHex ? 6 : 0); break;
              case gHex: h = (bHex - rHex) / d + 2; break;
              case bHex: h = (rHex - gHex) / d + 4; break;
            }
            h /= 6;
          }

          const hslToHex = (hVal: number, sVal: number, lVal: number) => {
            let rVal, gVal, bVal;
            if (sVal === 0) { rVal = gVal = bVal = lVal; } else {
              const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
              };
              const q = lVal < 0.5 ? lVal * (1 + sVal) : lVal + sVal - lVal * sVal;
              const p = 2 * lVal - q;
              rVal = hue2rgb(p, q, hVal + 1/3);
              gVal = hue2rgb(p, q, hVal);
              bVal = hue2rgb(p, q, hVal - 1/3);
            }
            const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
            return `#${toHex(rVal)}${toHex(gVal)}${toHex(bVal)}`;
          };

          const generatedPalette = [
            baseColor,
            hslToHex(h, s, Math.min(0.9, l + 0.2)),
            hslToHex(h, s, Math.max(0.1, l - 0.2)),
            hslToHex((h + 0.5) % 1, s, l),
            hslToHex((h + 0.1) % 1, s, l),
            hslToHex((h + 0.9) % 1, s, l),
          ];

          const finalPalette = [...distinctColors];
          for (const genColor of generatedPalette) {
            if (finalPalette.length >= 5) break;
            if (!finalPalette.includes(genColor)) {
              finalPalette.push(genColor);
            }
          }
          
          resolve(finalPalette.slice(0, 5));
        } catch (e) {
          reject();
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  try {
    return await processImage(url, "Anonymous");
  } catch (e) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const colors = await processImage(objectUrl);
      URL.revokeObjectURL(objectUrl);
      return colors;
    } catch (err) {
      return defaultPalette;
    }
  }
};
const SETTINGS_TABS = [
  { id: "branding", label: "Branding", icon: Camera },
  { id: "theme", label: "Theme & Colors", icon: Palette },
  { id: "basic", label: "Basic Info", icon: Building2 },
  { id: "contact", label: "Contact Info", icon: Phone },
  { id: "address", label: "Address", icon: MapPin },
  { id: "branches", label: "Branches", icon: Building2 },
  { id: "social", label: "Social Media", icon: Link2 },
  { id: "legal", label: "Legal & Tax", icon: FileText },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "hours", label: "Business Hours", icon: Clock },
];

const DEFAULT_BRAND_COLORS = ["#4F46E5", "#0D9488", "#E11D48", "#2563EB", "#D97706", "#16A34A", "#9333EA", "#050505"];

export function OrganisationPageContent({ isBranchManager = false }: OrganisationPageProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const lastExtractedUrl = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("branding");
  const [moreTabsOpen, setMoreTabsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [stagedTheme, setStagedTheme] = useState<string | null>(null);
  const [stagedColor, setStagedColor] = useState<string | null>(null);

  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const { applyBrandTheme } = useBrandTheme();

  const [form, setForm] = useState({
    name: "", legalName: "", industry: [] as string[], tagline: "", description: "",
    phone: "", email: "", whatsapp: "", website: "",
    gstin: "", pan: "", msmeUdyamNumber: "", invoicePrefix: "",
    taxEnabled: false, taxPercentage: "",
    billingEmail: "", billingPhone: "",
    addressLine1: "", addressLine2: "", address: "", city: "", district: "",
    state: "", country: "India", pincode: "", latitude: null as number | null, longitude: null as number | null,
    logoUrl: "", coverImageUrl: "", legalDocumentUrl: "",
    socialFacebook: "", socialInstagram: "", socialTwitter: "", socialLinkedin: "", socialYoutube: "", customDomain: "",
  });

  const [branchModal, setBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<CreateBranchRequest>({
    name: "", code: "", managerId: undefined, addressLine1: "", addressLine2: "", address: "", city: "",
    district: "", state: "", country: "India", pincode: "", phone: "", email: "",
    whatsapp: "", latitude: undefined, longitude: undefined,
  });
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<StaffMember[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantRes, branchesRes, brandingRes, usersRes] = await Promise.all([
        getTenant(), getBranches(), getBranding(), getTenantUsers({ pageSize: 200 }),
      ]);
      const t = tenantRes.data as Tenant;
      const b = brandingRes.data as Branding;
      if (!mountedRef.current) return;
      setTenant(t);
      setBranches((branchesRes.data as Branch[]) ?? []);
      setBranding(b);
      setTenantUsers((usersRes as unknown as { data: StaffMember[] })?.data ?? []);
      setForm({
        name: t.name ?? "", legalName: t.legalName ?? "", industry: Array.isArray(t.industry) ? t.industry : (t.industry ? [t.industry] : []),
        tagline: t.tagline ?? "", description: t.description ?? "",
        phone: t.phone ?? "", email: t.email ?? "", whatsapp: t.whatsapp ?? "",
        website: t.website ?? "",
        gstin: t.gstin ?? "", pan: t.pan ?? "", msmeUdyamNumber: t.msmeUdyamNumber ?? "",
        invoicePrefix: t.invoicePrefix ?? "",
        taxEnabled: t.taxEnabled ?? false, taxPercentage: t.taxPercentage?.toString() ?? "",
        billingEmail: t.billingEmail ?? "", billingPhone: t.billingPhone ?? "",
        addressLine1: t.addressLine1 ?? "", addressLine2: t.addressLine2 ?? "",
        address: t.address ?? "", city: t.city ?? "", district: t.district ?? "",
        state: t.state ?? "", country: t.country ?? "India", pincode: t.pincode ?? "",
        latitude: t.latitude ?? null, longitude: t.longitude ?? null,
        logoUrl: t.logoUrl ?? "", coverImageUrl: t.coverImageUrl ?? "",
        legalDocumentUrl: t.legalDocumentUrl ?? "",
        socialFacebook: b?.socialFacebook ?? "", socialInstagram: b?.socialInstagram ?? "",
        socialTwitter: b?.socialTwitter ?? "", socialLinkedin: b?.socialLinkedin ?? "",
        socialYoutube: b?.socialYoutube ?? "", customDomain: b?.customDomain ?? "",
      });
      if (t.logoUrl && t.logoUrl !== lastExtractedUrl.current) {
        lastExtractedUrl.current = t.logoUrl;
        extractColorsFromImage(t.logoUrl).then(colors => {
          if (mountedRef.current) {
            setSuggestedColors(colors);
          }
        });
      }
    } catch {
      if (mountedRef.current) toast.error("Failed to load organisation details");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const handleImageUpload = async (file: File, field: "logoUrl" | "coverImageUrl") => {
    const setUpload = field === "logoUrl" ? setLogoUploading : setCoverUploading;
    setUpload(true);
    try {
      const category = field === "logoUrl" ? "logo" : "cover-image";
      const result = await uploadToStorage(file, category);
      setForm((prev) => ({ ...prev, [field]: result.url }));
      await updateTenant({ [field]: result.url });
      if (field === "logoUrl") {
        const localUrl = URL.createObjectURL(file);
        extractColorsFromImage(localUrl).then(colors => {
          setSuggestedColors(colors);
          if (colors.length > 0) {
            handleBrandingSave({ primaryColor: colors[0] }, "Brand color extracted from logo");
          }
          URL.revokeObjectURL(localUrl);
        });
        lastExtractedUrl.current = result.url;
      }
      toast.success(`${field === "logoUrl" ? "Logo" : "Cover image"} updated`);
      await loadData();
    } catch {
      toast.error(`Failed to upload ${field === "logoUrl" ? "logo" : "cover image"}`);
    } finally {
      setUpload(false);
    }
  };

  const handleRemoveImage = async (field: "logoUrl" | "coverImageUrl") => {
    try {
      await updateTenant({ [field]: "" });
      setForm((prev) => ({ ...prev, [field]: "" }));
      toast.success(`${field === "logoUrl" ? "Logo" : "Cover image"} removed`);
      await loadData();
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const handleSave = async (successMessage?: string) => {
    if (!form.name.trim()) { toast.error("Organisation name is required"); return; }
    setSaving(true);
    try {
      await updateTenant({
        name: form.name, legalName: form.legalName || undefined,
        industries: form.industry.length ? form.industry : undefined, tagline: form.tagline || undefined,
        description: form.description || undefined,
        phone: form.phone, email: form.email, whatsapp: form.whatsapp || undefined,
        website: form.website || undefined,
        gstin: form.gstin || undefined, pan: form.pan || undefined,
        msmeUdyamNumber: form.msmeUdyamNumber || undefined,
        invoicePrefix: form.invoicePrefix || undefined,
        taxEnabled: form.taxEnabled,
        taxPercentage: form.taxPercentage ? parseFloat(form.taxPercentage) : undefined,
        billingEmail: form.billingEmail || undefined, billingPhone: form.billingPhone || undefined,
        addressLine1: form.addressLine1 || undefined, addressLine2: form.addressLine2 || undefined,
        address: form.address || undefined, city: form.city || undefined,
        district: form.district || undefined, state: form.state || undefined,
        country: form.country || undefined, pincode: form.pincode || undefined,
        latitude: form.latitude ?? undefined, longitude: form.longitude ?? undefined,
      });
      toast.success(successMessage || "Organisation details updated");
      setEditSection(null);
      await loadData();
    } catch {
      toast.error("Failed to update organisation details");
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSelect = (result: AddressResult) => {
    setForm((prev) => ({
      ...prev,
      address: result.formatted,
      city: result.city || prev.city,
      state: result.state || prev.state,
      pincode: result.pincode || prev.pincode,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  };

  const handleLocationChange = useCallback((result: LocationResult) => {
    setForm((prev) => ({
      ...prev,
      address: result.formattedAddress,
      addressLine1: result.addressLine1 || prev.addressLine1,
      city: result.city || prev.city,
      district: result.district || prev.district,
      state: result.state || prev.state,
      country: result.country || prev.country,
      pincode: result.pincode || prev.pincode,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  }, []);

  const handleCancel = () => { if (tenant) loadData(); setEditSection(null); };

  const handleBrandingSave = async (updates: UpdateBrandingRequest, successMessage?: string) => {
    setBrandingSaving(true);
    try {
      const res = await updateBranding(updates);
      setBranding(res.data as Branding);
      if (updates.primaryColor && updates.secondaryColor) {
        applyBrandTheme(updates.primaryColor, updates.secondaryColor);
      } else if (updates.primaryColor) {
        applyBrandTheme(updates.primaryColor, branding?.secondaryColor ?? updates.primaryColor);
      }
      toast.success(successMessage || "Branding updated");
    } catch {
      toast.error("Failed to update branding");
    } finally {
      setBrandingSaving(false);
    }
  };

  const openBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name, code: branch.code ?? "", managerId: branch.managerId ?? undefined,
        addressLine1: branch.addressLine1 ?? "", addressLine2: branch.addressLine2 ?? "",
        address: branch.address ?? "", city: branch.city ?? "",
        district: branch.district ?? "", state: branch.state ?? "",
        country: branch.country ?? "India", pincode: branch.pincode ?? "",
        phone: branch.phone ?? "", email: branch.email ?? "",
        whatsapp: branch.whatsapp ?? "",
        latitude: branch.latitude ?? undefined, longitude: branch.longitude ?? undefined,
      });
    } else {
      setEditingBranch(null);
      setBranchForm({
        name: "", code: "", managerId: undefined, addressLine1: "", addressLine2: "", address: "", city: "",
        district: "", state: "", country: "India", pincode: "", phone: "", email: "",
        whatsapp: "", latitude: undefined, longitude: undefined,
      });
    }
    setBranchModal(true);
  };

  const handleBranchAddressSelect = (result: AddressResult) => {
    setBranchForm((prev) => ({
      ...prev,
      address: result.formatted,
      city: result.city || prev.city,
      state: result.state || prev.state,
      pincode: result.pincode || prev.pincode,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  };

  const handleBranchSubmit = async () => {
    if (!branchForm.name.trim()) { toast.error("Branch name is required"); return; }
    setBranchSubmitting(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, branchForm);
        toast.success("Branch updated");
      } else {
        await createBranch(branchForm);
        toast.success("Branch created");
      }
      setBranchModal(false);
      await loadData();
    } catch {
      toast.error("Failed to save branch");
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      await updateBranchStatus(branch.id, { isActive: !branch.isActive });
      toast.success(branch.isActive ? "Branch deactivated" : "Branch activated");
      await loadData();
    } catch {
      toast.error("Failed to update branch status");
    }
  };

  if (loading) {
    return (
      <PageContainer title="Organisation" subtitle="Manage your business profile and branch details">
        <div className="space-y-6">
          <Card><div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
            <Skeleton className="h-9 w-full" />
          </div></Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Organisation"
      subtitle="Manage your business profile and branch details"
      actions={undefined}
    >
      
      
      <div className="flex flex-col gap-6">
        {/* Settings Top Tabs */}
        <div className="w-full relative z-30">
          <div className="flex flex-row items-center gap-2">
            {SETTINGS_TABS.slice(0, 4).map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMoreTabsOpen(false); }}
                  className={`hidden sm:flex items-center whitespace-nowrap gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                      : "bg-surface text-text-secondary border border-border hover:bg-surface-raised hover:text-text-primary"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-primary-foreground" : "text-text-secondary"} />
                  {tab.label}
                </button>
              )
            })}
            
            {/* Mobile Select (Full Dropdown) */}
            <div className="sm:hidden w-full">
              <Select
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
                options={SETTINGS_TABS.map(t => ({ value: t.id, label: t.label }))}
              />
            </div>

            {/* More Dropdown (Desktop) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMoreTabsOpen(!moreTabsOpen)}
                className={`flex items-center whitespace-nowrap gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                  SETTINGS_TABS.slice(4).some(t => t.id === activeTab)
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-surface text-text-secondary border border-border hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                More <ChevronDown size={14} className={`transition-transform ${moreTabsOpen ? "rotate-180" : ""}`} />
              </button>

              {moreTabsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreTabsOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95">
                    {SETTINGS_TABS.slice(4).map(tab => {
                      const isActive = activeTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id); setMoreTabsOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive ? "bg-primary text-primary-foreground font-medium" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                          }`}
                        >
                          <Icon size={16} className={isActive ? "text-primary-foreground" : "text-text-secondary"} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings Content Area */}
        <div className="w-full bg-surface border border-border rounded-3xl p-6 md:p-10 shadow-sm relative min-h-[500px]">


        {/* ── Branding Section ── */}
        
        {activeTab === "branding" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Branding</h2>
                <p className="mt-2 text-sm text-text-secondary">Manage your organization logo, cover image, and tagline.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("branding")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex flex-col xl:flex-row gap-6">
              <div className="shrink-0">
                <ImageUpload
                  currentUrl={form.logoUrl || null}
                  onUpload={(f) => handleImageUpload(f, "logoUrl")}
                  onRemove={() => handleRemoveImage("logoUrl")}
                  label="Logo"
                  uploading={logoUploading}
                  readonly={editSection !== "branding"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <ImageUpload
                  currentUrl={form.coverImageUrl || null}
                  onUpload={(f) => handleImageUpload(f, "coverImageUrl")}
                  onRemove={() => handleRemoveImage("coverImageUrl")}
                  label="Cover Image"
                  aspect="wide"
                  uploading={coverUploading}
                  readonly={editSection !== "branding"}
                />
              </div>
            </div>
            {editSection === "branding" && (
              <div className="mt-4">
                <Input label="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Short tagline for your business" />
              </div>
            )}
            {editSection === "branding" && (
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                <Button size="sm" onClick={() => handleSave("Banner & Tagline updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
              </div>
            )}
            {editSection !== "branding" && form.tagline && (
              <p className="mt-3 text-sm text-text-secondary italic">&ldquo;{form.tagline}&rdquo;</p>
            )}
            </div>
          </div>
        )}

        {/* ── Theme & Colors Section ── */}
        
        {activeTab === "theme" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Theme & Colors</h2>
                <p className="mt-2 text-sm text-text-secondary">Customize the visual identity of your portal. Upload a logo to automatically generate themes.</p>
              </div>
              <div className="shrink-0 h-8">
                {editSection !== "theme" && (
                  <div className="mt-0">
                    <Button size="xs" variant="outline" onClick={() => {
                      setStagedTheme(theme || "system");
                      setStagedColor(branding?.primaryColor || DEFAULT_BRAND_COLORS[0]);
                      setEditSection("theme");
                    }} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                      <Edit3 size={14} className="mr-2" /> Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "theme" ? (
                <div className="space-y-8">
                  {/* Appearance Mode */}
                  {/* <div>
                    <label className="text-sm font-medium text-text-primary mb-3 block">Appearance</label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setStagedTheme("light")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${stagedTheme === "light" ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10" : "border-border text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}
                      >
                        <Sun size={16} /> Light Mode
                      </button>
                      <button
                        onClick={() => setStagedTheme("dark")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${stagedTheme === "dark" ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10" : "border-border text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}
                      >
                        <Moon size={16} /> Dark Mode
                      </button>
                      <button
                        onClick={() => setStagedTheme("system")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${stagedTheme === "system" ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10" : "border-border text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}
                      >
                        <Monitor size={16} /> System
                      </button>
                    </div>
                  </div> */}

                  {/* Brand Colors */}
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-3 block">Default Themes</label>
                    <div className="flex flex-wrap gap-3">
                      {DEFAULT_BRAND_COLORS.map((c) => {
                        // Calculate contrast for the checkmark
                        const hex = c.replace("#", "");
                        const r = parseInt(hex.substring(0, 2), 16) / 255;
                        const g = parseInt(hex.substring(2, 4), 16) / 255;
                        const b = parseInt(hex.substring(4, 6), 16) / 255;
                        const toL = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
                        const lum = 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
                        const checkColor = lum > 0.5 ? "#0f172a" : "#ffffff";
                        
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setStagedColor(c)}
                            className="h-10 w-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: c, borderColor: stagedColor === c ? 'var(--text-primary)' : 'transparent' }}
                            title={c}
                          >
                            {stagedColor === c && <Check size={16} style={{ color: checkColor }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {suggestedColors.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <label className="text-sm font-medium text-text-primary mb-3 block">Suggested from Logo</label>
                      <div className="flex flex-wrap gap-3">
                        {suggestedColors.map((c) => {
                          const hex = c.replace("#", "");
                          const r = parseInt(hex.substring(0, 2), 16) / 255;
                          const g = parseInt(hex.substring(2, 4), 16) / 255;
                          const b = parseInt(hex.substring(4, 6), 16) / 255;
                          const toL = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
                          const lum = 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
                          const checkColor = lum > 0.5 ? "#0f172a" : "#ffffff";
                          
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setStagedColor(c)}
                              className="h-10 w-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: c, borderColor: stagedColor === c ? 'var(--text-primary)' : 'transparent' }}
                              title={c}
                            >
                              {stagedColor === c && <Check size={16} style={{ color: checkColor }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (theme) setTheme(theme);
                      if (branding?.primaryColor) applyBrandTheme(branding.primaryColor, branding.primaryColor);
                      setEditSection(null);
                    }}>Cancel</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (stagedTheme) setTheme(stagedTheme);
                      if (stagedColor) applyBrandTheme(stagedColor, stagedColor);
                    }}>Preview Locally</Button>
                    <Button size="sm" onClick={() => {
                      if (stagedTheme && stagedTheme !== theme) setTheme(stagedTheme);
                      if (stagedColor && stagedColor !== branding?.primaryColor) handleBrandingSave({ primaryColor: stagedColor }, "Theme colors updated");
                      setEditSection(null);
                    }}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Appearance</p>
                      <p className="text-sm font-medium text-text-primary capitalize flex items-center gap-2">
                        {theme === "light" && <Sun size={14} className="text-text-secondary" />}
                        {theme === "dark" && <Moon size={14} className="text-text-secondary" />}
                        {theme === "system" && <Monitor size={14} className="text-text-secondary" />}
                        {theme || "system"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Brand Color</p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: branding?.primaryColor || "#4F46E5" }} />
                        <span className="text-sm font-medium text-text-primary uppercase">{branding?.primaryColor || "#4F46E5"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Basic Information Section ── */}
        
        {activeTab === "basic" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Basic Information</h2>
                <p className="mt-2 text-sm text-text-secondary">Core details about your registered entity.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("basicInfo")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                  <Edit3 size={14} className="mr-2" /> Edit
                </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
              
              
              {tenant?.status && (
                <Badge variant={statusConfig[tenant.status]?.variant ?? "outline"} size="sm">
                  {statusConfig[tenant.status]?.label ?? tenant.status}
                </Badge>
              )}
            </div>
            {editSection === "basicInfo" ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input label="Organisation Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <Input label="Legal Name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} placeholder="Registered legal name" />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Industry Types</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {industryOptions.map((opt) => {
                        const checked = form.industry.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              industry: checked
                                ? prev.industry.filter((v) => v !== opt.value)
                                : [...prev.industry, opt.value],
                            }))}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                              checked
                                ? "border-primary/50 bg-primary/5 text-text-primary"
                                : "border-border bg-surface text-text-secondary hover:bg-surface-raised",
                            )}
                          >
                            <Check size={14} className={cn("shrink-0", checked ? "text-primary" : "text-text-disabled")} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="About your business" rows={3} />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                  <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSave("Basic Information updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Organisation Name" value={form.name} icon={Building2} />
                <Field label="Legal Name" value={form.legalName} icon={FileText} />
                <Field label="Industry" value={(form.industry.map((i) => industryOptions.find((o) => o.value === i)?.label || i).join(", ")) || "\u2014"} icon={Building2} />
                {form.description && (
                  <div className="sm:col-span-2 group p-4 rounded-xl border border-border bg-surface flex items-start gap-4 transition-all hover:border-primary/40 hover:shadow-sm">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium mb-1">Description</p>
                      <p className="text-sm font-medium text-text-primary whitespace-pre-wrap">{form.description}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Contact Information Section ── */}
        
        {activeTab === "contact" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Contact Information</h2>
                <p className="mt-2 text-sm text-text-secondary">How customers and partners can reach you.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("contact")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "contact" ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-secondary shrink-0" />
                    <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit phone" inputMode="tel" maxLength={10} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-secondary shrink-0" />
                    <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-secondary shrink-0" />
                    <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit WhatsApp" inputMode="tel" maxLength={10} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-text-secondary shrink-0" />
                    <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                  <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSave("Contact Information updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone" value={form.phone} icon={Phone} />
                <Field label="Email" value={form.email} icon={Mail} />
                <Field label="WhatsApp" value={form.whatsapp} icon={Phone} />
                <Field label="Website" value={form.website} icon={Globe} />
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Address Section ── */}
        
        {activeTab === "address" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Address</h2>
                <p className="mt-2 text-sm text-text-secondary">Your primary operational location.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("address")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "address" ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <LocationPicker
                      latitude={form.latitude ?? null}
                      longitude={form.longitude ?? null}
                      disabled={false}
                      onLocationChange={handleLocationChange}
                    />
                    {form.address && (
                      <div className="mt-4 p-3 rounded-[var(--radius-sm)] bg-surface-raised border border-border">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 mb-1">Pinned Location</p>
                        <p className="text-[14px] font-medium text-text-primary">{form.address}</p>
                      </div>
                    )}
                  </div>
                  <Input label="Address Line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="Flat / House No." />
                  <Input label="Address Line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} placeholder="Building / Street" />
                  <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                  <Input label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="District" />
                  <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
                  <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" />
                  <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit pincode" inputMode="numeric" maxLength={6} />
                  {form.latitude && form.longitude && (
                    <div className="sm:col-span-2 p-3 rounded-[var(--radius-sm)] bg-surface-raised border border-border">
                      <p className="text-xs text-text-secondary font-medium">
                        Coordinates: <span className="text-text-primary">{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                  <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSave("Address updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <LocationPicker
                    latitude={form.latitude ?? null}
                    longitude={form.longitude ?? null}
                    disabled={true}
                    onLocationChange={() => {}}
                  />
                </div>
                <Field label="Address" value={`${form.addressLine1 ? form.addressLine1 + ", " : ""}${form.addressLine2 ? form.addressLine2 + ", " : ""}${form.address}`} icon={MapPin} />
                <Field label="City" value={form.city} icon={MapPin} />
                <Field label="District" value={form.district} icon={MapPin} />
                <Field label="State" value={form.state} icon={MapPin} />
                <Field label="Country" value={form.country} icon={Globe} />
                <Field label="Pincode" value={form.pincode} icon={MapPin} />
                {form.latitude && form.longitude && (
                  <Field label="Coordinates" value={`${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}`} icon={MapPin} />
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Branches Section ── */}
        
        {activeTab === "branches" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Branches</h2>
                <p className="mt-2 text-sm text-text-secondary">Manage your multi-location branches.</p>
              </div>
              <div className="shrink-0 h-8">
                
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">{branches.length} total</Badge>
                  <Button size="xs" onClick={() => openBranchModal()}>
                    <Plus size={12} /> Add Branch
                  </Button>
                </div>
              </div>
              {branches.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 size={32} className="mx-auto text-text-secondary mb-2" />
                  <p className="text-sm text-text-secondary">No branches configured yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                        branch.isDefault
                          ? "border-primary/40 bg-gradient-to-b from-primary/10 to-surface shadow-primary/5"
                          : "border-border/60 bg-surface/80 hover:border-primary/30 backdrop-blur-sm"
                      }`}
                    >
                      {branch.isDefault && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                      )}
                      
                      <div className="flex items-start justify-between p-5 pb-0 mb-4">
                        <div className="flex gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                              branch.isDefault
                                ? "bg-primary text-primary-foreground shadow-primary/30"
                                : "bg-surface-raised text-primary group-hover:bg-primary/10 transition-colors"
                            }`}
                          >
                            <Building2 size={22} className={branch.isDefault ? "opacity-90" : ""} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-text-primary text-[17px] tracking-tight">
                                {branch.name}
                              </h4>
                            </div>
                            {branch.code && (
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-text-secondary uppercase tracking-widest">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
                                {branch.code}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {branch.isDefault && (
                            <Badge variant="brand" size="sm" className="hidden sm:flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border-none mr-2">
                              Primary
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-2 -mr-2 -mt-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-all"
                                title="More options"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openBranchModal(branch)}>
                                <Edit3 size={14} className="mr-2" />
                                Edit Branch
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleBranchStatus(branch)} className={branch.isActive ? "text-warning" : "text-success"}>
                                {branch.isActive ? <X size={14} className="mr-2" /> : <Check size={14} className="mr-2" />}
                                {branch.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="px-5 space-y-3.5 mb-5">
                        {(branch.address || branch.addressLine1) && (
                          <div className="flex items-start gap-2.5 text-sm text-text-secondary">
                            <MapPin size={15} className="shrink-0 mt-0.5 text-text-secondary/70" />
                            <span className="leading-relaxed line-clamp-2">
                              {branch.addressLine1 && `${branch.addressLine1}, `}
                              {branch.address || ""}
                              {branch.city && `, ${branch.city}`}
                              {branch.state && `, ${branch.state}`}
                              {branch.pincode && ` - ${branch.pincode}`}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2.5">
                          {branch.phone && (
                            <span className="flex items-center gap-2.5 text-sm text-text-secondary">
                              <Phone size={14} className="text-text-secondary/70" /> {branch.phone}
                            </span>
                          )}
                          {branch.email && (
                            <span className="flex items-center gap-2.5 text-sm text-text-secondary truncate">
                              <Mail size={14} className="text-text-secondary/70" /> {branch.email}
                            </span>
                          )}
                          {branch.manager && (
                            <span className="flex items-center gap-2.5 text-sm text-text-secondary">
                              <Users size={14} className="text-text-secondary/70" /> {branch.manager.name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="px-5 py-3.5 bg-surface-raised/40 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            {branch.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-20"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${branch.isActive ? "bg-success" : "bg-text-secondary/40"}`}></span>
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                            {branch.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {branch.isDefault && <Badge variant="brand" size="sm" className="sm:hidden px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border-none">Primary</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Social Media Section ── */}
        
        {activeTab === "social" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Social Media</h2>
                <p className="mt-2 text-sm text-text-secondary">Links to your online profiles.</p>
              </div>
              <div className="shrink-0 h-8">
                {editSection !== "social" && (
                  <div className="mt-0">
                    <Button size="xs" variant="outline" onClick={() => setEditSection("social")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                      <Edit3 size={14} className="mr-2" /> Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "social" ? (
                <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      {/* <ExternalLink size={14} className="text-text-secondary shrink-0" /> */}
                      <Input
                        label="Facebook"
                        value={form.socialFacebook}
                        onChange={(e) => setForm({ ...form, socialFacebook: e.target.value })}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <Camera size={14} className="text-text-secondary shrink-0" /> */}
                      <Input
                        label="Instagram"
                        value={form.socialInstagram}
                        onChange={(e) => setForm({ ...form, socialInstagram: e.target.value })}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <Hash size={14} className="text-text-secondary shrink-0" /> */}
                      <Input
                        label="Twitter / X"
                        value={form.socialTwitter}
                        onChange={(e) => setForm({ ...form, socialTwitter: e.target.value })}
                        placeholder="https://x.com/..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <Share2 size={14} className="text-text-secondary shrink-0" /> */}
                      <Input
                        label="LinkedIn"
                        value={form.socialLinkedin}
                        onChange={(e) => setForm({ ...form, socialLinkedin: e.target.value })}
                        placeholder="https://linkedin.com/..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <Video size={14} className="text-text-secondary shrink-0" /> */}
                      <Input
                        label="YouTube"
                        value={form.socialYoutube}
                        onChange={(e) => setForm({ ...form, socialYoutube: e.target.value })}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <Input
                      label="Custom Domain"
                      value={form.customDomain}
                      onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                      placeholder="e.g. yourbrand.com"
                    />
                  </div>
                  <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                    <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={brandingSaving}>Cancel</Button>
                    <Button size="sm" onClick={() => {
                      handleBrandingSave({
                        socialFacebook: form.socialFacebook,
                        socialInstagram: form.socialInstagram,
                        socialTwitter: form.socialTwitter,
                        socialLinkedin: form.socialLinkedin,
                        socialYoutube: form.socialYoutube,
                        customDomain: form.customDomain,
                      }, "Social media updated");
                      setEditSection(null);
                    }} disabled={brandingSaving}>{brandingSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Facebook" value={branding?.socialFacebook || ""} />
                  <Field label="Instagram" value={branding?.socialInstagram || ""} />
                  <Field label="Twitter / X" value={branding?.socialTwitter || ""} />
                  <Field label="LinkedIn" value={branding?.socialLinkedin || ""} />
                  <Field label="YouTube" value={branding?.socialYoutube || ""} />
                  <Field label="Custom Domain" value={branding?.customDomain || ""} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Legal & Tax Section ── */}
        
        {activeTab === "legal" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Legal & Tax</h2>
                <p className="mt-2 text-sm text-text-secondary">GSTIN, PAN, and invoice configurations.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("legal")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "legal" ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase().slice(0, 15) })} placeholder="15-digit GSTIN" maxLength={15} />
                  <Input label="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase().slice(0, 10) })} placeholder="10-digit PAN" maxLength={10} />
                  <Input label="MSME / Udyam Number" value={form.msmeUdyamNumber} onChange={(e) => setForm({ ...form, msmeUdyamNumber: e.target.value })} placeholder="MSME registration number" />
                  <Input label="Invoice Prefix" value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase().slice(0, 20) })} placeholder="e.g. INV-" maxLength={20} />
                  <div className="sm:col-span-2 flex items-center gap-4 border-t border-border pt-6 mt-2">
                    <Switch checked={form.taxEnabled} onCheckedChange={(checked: boolean) => setForm({ ...form, taxEnabled: checked })} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Enable Tax</p>
                      <p className="text-xs text-text-secondary mt-0.5">Add tax to all generated invoices</p>
                    </div>
                  </div>
                  {form.taxEnabled && (
                    <Input label="Tax Percentage (%)" type="number" value={form.taxPercentage} onChange={(e) => setForm({ ...form, taxPercentage: e.target.value })} placeholder="e.g. 18" min="0" max="100" step="0.01" />
                  )}
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                  <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSave("Legal & Tax settings updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GSTIN" value={form.gstin} icon={FileText} />
                <Field label="PAN" value={form.pan} icon={FileText} />
                <Field label="MSME / Udyam" value={form.msmeUdyamNumber} icon={Building2} />
                <Field label="Invoice Prefix" value={form.invoicePrefix} icon={FileText} />
                <Field label="Tax" value={form.taxEnabled ? `Enabled (${form.taxPercentage}%)` : "Disabled"} icon={CreditCard} />
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Billing Section ── */}
        
        {activeTab === "billing" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Billing</h2>
                <p className="mt-2 text-sm text-text-secondary">Email and phone for subscription and billing.</p>
              </div>
              <div className="shrink-0 h-8">
                <div className="mt-0">
                <Button size="xs" variant="outline" onClick={() => setEditSection("billing")} className="rounded-full bg-surface-raised border-border text-text-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              </div>
              </div>
            </div>
            <div className="space-y-8">
              {editSection === "billing" ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-surface shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input label="Billing Email" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} placeholder="Billing email address" />
                  <Input label="Billing Phone" value={form.billingPhone} onChange={(e) => setForm({ ...form, billingPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit phone" inputMode="tel" maxLength={10} />
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-border pt-5 bg-surface-raised/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 pb-6 sm:px-8 sm:pb-8">
                  <Button variant="outline" size="sm" onClick={() => setEditSection(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSave("Billing settings updated")} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Billing Email" value={form.billingEmail} icon={Mail} />
                <Field label="Billing Phone" value={form.billingPhone} icon={Phone} />
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── Business Hours Section ── */}
        
        {activeTab === "hours" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8 group">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Business Hours</h2>
                <p className="mt-2 text-sm text-text-secondary">Set your weekly operating schedule.</p>
              </div>
              <div className="shrink-0 h-8">
                
              </div>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DAYS.map((day) => {
                  const hours = branding?.businessHours?.[day] ?? DEFAULT_BUSINESS_HOURS[day];
                  return (
                    <div key={day} className="group p-5 rounded-xl border border-border bg-surface flex flex-col gap-4 transition-all hover:border-primary/40 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${!hours.closed ? "bg-success shadow-sm" : "bg-text-secondary/30"}`} />
                          <p className={`text-sm font-semibold capitalize tracking-wide ${!hours.closed ? "text-text-primary" : "text-text-secondary"}`}>{day}</p>
                        </div>
                        <Switch
                          checked={!hours.closed}
                          onCheckedChange={(checked: boolean) => {
                            const newHours = { ...(branding?.businessHours ?? DEFAULT_BUSINESS_HOURS) };
                            newHours[day] = { ...newHours[day], closed: !checked };
                            handleBrandingSave({ businessHours: newHours }, "Business hours updated");
                          }}
                        />
                      </div>
                      {!hours.closed ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              const newHours = { ...(branding?.businessHours ?? DEFAULT_BUSINESS_HOURS) };
                              newHours[day] = { ...newHours[day], open: e.target.value };
                              handleBrandingSave({ businessHours: newHours }, "Business hours updated");
                            }}
                            className="flex-1 h-9 rounded-lg border border-border bg-surface-raised px-2 text-sm font-medium text-text-primary transition-all hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          />
                          <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              const newHours = { ...(branding?.businessHours ?? DEFAULT_BUSINESS_HOURS) };
                              newHours[day] = { ...newHours[day], close: e.target.value };
                              handleBrandingSave({ businessHours: newHours }, "Business hours updated");
                            }}
                            className="flex-1 h-9 rounded-lg border border-border bg-surface-raised px-2 text-sm font-medium text-text-primary transition-all hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                      ) : (
                        <div className="h-9 flex items-center justify-center rounded-lg border border-dashed border-border bg-surface-raised/50">
                          <span className="text-xs text-text-secondary font-medium tracking-wider uppercase">Closed</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ── Branch Modal ── */}
      <Modal
        open={branchModal}
        onClose={() => setBranchModal(false)}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Branch Name *" value={branchForm.name} onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))} placeholder="Branch name" />
            <Input label="Branch Code" value={branchForm.code} onChange={(e) => setBranchForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. MAIN" />
            <Select
              label="Branch Manager"
              value={branchForm.managerId ?? ""}
              onChange={(val) => setBranchForm((p) => ({ ...p, managerId: val || undefined }))}
              options={[
                { value: "", label: "No manager assigned" },
                ...tenantUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
              ]}
            />
          </div>

          <AddressAutocomplete
            value={branchForm.address}
            onChange={(val) => setBranchForm((p) => ({ ...p, address: val }))}
            onAddressSelect={handleBranchAddressSelect}
            label="Search Address"
            placeholder="Start typing to search..."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Address Line 1" value={branchForm.addressLine1 ?? ""} onChange={(e) => setBranchForm((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="Flat / House No." />
            <Input label="Address Line 2" value={branchForm.addressLine2 ?? ""} onChange={(e) => setBranchForm((p) => ({ ...p, addressLine2: e.target.value }))} placeholder="Building / Street" />
            <Input label="City" value={branchForm.city} onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
            <Input label="District" value={branchForm.district ?? ""} onChange={(e) => setBranchForm((p) => ({ ...p, district: e.target.value }))} placeholder="District" />
            <Input label="State" value={branchForm.state} onChange={(e) => setBranchForm((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
            <Input label="Country" value={branchForm.country ?? "India"} onChange={(e) => setBranchForm((p) => ({ ...p, country: e.target.value }))} placeholder="Country" />
            <Input label="Pincode" value={branchForm.pincode} onChange={(e) => setBranchForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="6-digit pincode" inputMode="numeric" maxLength={6} />
            <Input label="Phone" value={branchForm.phone} onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit phone" inputMode="tel" maxLength={10} />
            <Input label="Email" type="email" value={branchForm.email} onChange={(e) => setBranchForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address" />
            <Input label="WhatsApp" value={branchForm.whatsapp ?? ""} onChange={(e) => setBranchForm((p) => ({ ...p, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit WhatsApp" inputMode="tel" maxLength={10} />
          </div>

          {branchForm.latitude && branchForm.longitude && (
            <p className="text-xs text-text-secondary">
              Location: {branchForm.latitude.toFixed(4)}, {branchForm.longitude.toFixed(4)}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setBranchModal(false)}>Cancel</Button>
            <Button onClick={handleBranchSubmit} loading={branchSubmitting}>{editingBranch ? "Update" : "Create"} Branch</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}


