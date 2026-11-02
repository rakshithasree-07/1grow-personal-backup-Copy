"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useRolePrefix } from "@/hooks/useRolePrefix";
import {
  User, Mail, Loader2, Lock, Settings,
  KeyRound, Shield, History, Smartphone, Globe, Eye, EyeOff,
  Moon, Sun, Bell, BellOff, Check, X, Trash2,
  AlertTriangle, Pencil, Fingerprint, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ConfirmModal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { LocationPicker, type LocationResult } from "@/components/ui/LocationPicker";
import { authService, type UserProfileData, type UpdateProfilePayload, type LinkedAccount } from "@/services/auth.service";
import { uploadToStorage } from "@/services/upload";
import { useAuthStore } from "@/store/auth.store";

const PHONE_REGEX = /^\d{10}$/;

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().optional().refine((v) => !v || PHONE_REGEX.test(v), "Phone must be 10 digits"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z.string().optional().refine((v) => !v || /^\d{4,10}$/.test(v), "Enter a valid pincode"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  formattedAddress: z.string().max(500).optional(),
  emergencyName: z.string().max(100).optional(),
  emergencyPhone: z.string().optional().refine((v) => !v || PHONE_REGEX.test(v), "Phone must be 10 digits"),
  bio: z.string().max(500).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

const TABS = [
  { key: "info" as const, label: "Profile", icon: User },
  { key: "security" as const, label: "Security", icon: Shield },
  { key: "preferences" as const, label: "Settings", icon: Settings },
];
const GENDER_OPTIONS = [
  { value: "", label: "Select" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

function InlineEditableField({
  label,
  value,
  isEditing,
  onEdit,
  onCancel,
  children,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl py-3 px-1 border-b border-border/30 last:border-b-0 transition-colors hover:bg-surface-overlay/30">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 mb-1">{label}</p>
        {isEditing ? (
          <div className="space-y-2">
            {children}
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-text-secondary hover:text-danger transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-[15px] font-semibold text-text-primary truncate">
            {value || <span className="text-text-secondary/50 italic font-normal">Not set</span>}
          </p>
        )}
      </div>
      {!isEditing && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border-2 border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
          aria-label={`Edit ${label}`}
        >
          <Pencil size={11} strokeWidth={2.5} />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
    </div>
  );
}

const tabContentVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  const strengthLabel = score <= 1 ? "Weak" : score <= 2 ? "Fair" : score <= 3 ? "Strong" : "Very Strong";
  const strengthColor = score <= 1 ? "text-danger" : score <= 2 ? "text-warning" : "text-success";
  if (!password) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">Password strength</span>
        <span className={cn("text-xs font-semibold", strengthColor)}>{strengthLabel}</span>
      </div>
      <div className="flex gap-1">
        {[0,1,2,3].map((i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={cn("h-1.5 flex-1 rounded-full origin-left transition-colors",
              i < score ? score <= 1 ? "bg-danger" : score <= 2 ? "bg-warning" : "bg-success" : "bg-border")}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((c) => (
          <motion.span
            key={c.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("flex items-center gap-1 text-xs font-medium", c.met ? "text-success" : "text-text-secondary")}
          >
            {c.met ? <Check size={11} className="text-success" /> : <X size={11} />} {c.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function toFormValues(p: UserProfileData | null): ProfileForm {
  return {
    name: p?.name ?? "",
    phone: p?.phone ?? "",
    dateOfBirth: p?.profile?.dateOfBirth ?? "",
    gender: p?.profile?.gender ?? "",
    addressLine1: p?.profile?.addressLine1 ?? "",
    addressLine2: p?.profile?.addressLine2 ?? "",
    city: p?.profile?.city ?? "",
    district: p?.profile?.district ?? "",
    state: p?.profile?.state ?? "",
    country: p?.profile?.country ?? "",
    pincode: p?.profile?.pincode ?? "",
    latitude: p?.profile?.latitude ?? undefined,
    longitude: p?.profile?.longitude ?? undefined,
    formattedAddress: p?.profile?.formattedAddress ?? "",
    emergencyName: p?.profile?.emergencyName ?? "",
    emergencyPhone: p?.profile?.emergencyPhone ?? "",
    bio: p?.profile?.bio ?? "",
  };
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-overlay">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      {[1,2,3].map((s) => (
        <div key={s} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityInfoItem({ icon: Icon, label, value, variant = "default" }: { icon: React.ElementType; label: string; value: string; variant?: "default" | "success" | "warning" | "danger" }) {
  const iconBg = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-surface-overlay/60 px-4 py-3.5 border border-border/40">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconBg[variant])}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm font-medium text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}


export function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rolePrefix = useRolePrefix();
  const initialTab = (searchParams.get("tab") as "info" | "security" | "preferences") ?? "info";
  const [tab, setTab] = React.useState<"info" | "security" | "preferences">(initialTab);

  const [profile, setProfile] = React.useState<UserProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [avatarDeleting, setAvatarDeleting] = React.useState(false);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = React.useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = React.useState(false);
  const [pendingTab, setPendingTab] = React.useState<"info" | "security" | "preferences" | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const retryRef = React.useRef(0);
  const [retryCount, setRetryCount] = React.useState(0);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordErrors, setPasswordErrors] = React.useState<Record<string, string>>({});

  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();
  const [themePref, setThemePref] = React.useState("system");
  const [notifEnabled, setNotifEnabled] = React.useState(true);
  const [pushEnabled, setPushEnabled] = React.useState(false);

  const [linkedAccounts, setLinkedAccounts] = React.useState<LinkedAccount[]>([]);
  const [linkedAccountsLoading, setLinkedAccountsLoading] = React.useState(false);
  const [connectingProvider, setConnectingProvider] = React.useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = React.useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = React.useState<LinkedAccount | null>(null);
  const [unlinkError, setUnlinkError] = React.useState<string | null>(null);
  const [linkBanner, setLinkBanner] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: toFormValues(null),
  });
  const isDirty = form.formState.isDirty;

  const load = React.useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const res = await authService.getProfile();
      retryRef.current = 0;
      setProfile(res);
      form.reset(toFormValues(res));
      const prefs = res.preferences as Record<string, unknown> | null;
      if (prefs) { setThemePref((prefs.theme as string) || "system"); setNotifEnabled(prefs.notificationsEnabled !== false); setPushEnabled(prefs.pushNotifications === true); }
      setIsEditing(false); setLoading(false);
    } catch {
      retryRef.current += 1; setRetryCount(retryRef.current);
      if (retryRef.current < 3) setTimeout(() => load(), Math.min(1000 * Math.pow(2, retryRef.current - 1), 4000));
      else { setLoadError(true); setLoading(false); toast.error("Failed to load profile"); }
    }
  }, [form]);

  React.useEffect(() => { retryRef.current = 0; load(); }, [load]);

  const loadLinkedAccounts = React.useCallback(async () => {
    setLinkedAccountsLoading(true);
    try {
      const accounts = await authService.getLinkedAccounts();
      setLinkedAccounts(accounts);
    } catch {
      toast.error("Failed to load linked accounts");
    } finally {
      setLinkedAccountsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadLinkedAccounts(); }, [loadLinkedAccounts]);

  React.useEffect(() => {
    const googleLinked = searchParams.get("googleLinked");
    const oauthError = searchParams.get("error");
    if (googleLinked === "1") {
      setLinkBanner({ type: "success", message: "Google account connected successfully." });
      toast.success("Google account connected successfully");
      loadLinkedAccounts();
    }
    if (oauthError) {
      const msg = decodeURIComponent(oauthError);
      setLinkBanner({ type: "error", message: msg });
      toast.error(msg);
    }
    if (googleLinked || oauthError) {
      const cleanUrl = `${window.location.pathname}?tab=security`;
      window.history.replaceState({}, "", cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationChange = React.useCallback((result: LocationResult) => {
    form.setValue("latitude", result.latitude, { shouldDirty: true });
    form.setValue("longitude", result.longitude, { shouldDirty: true });
    form.setValue("formattedAddress", result.formattedAddress, { shouldDirty: true });
    if (result.addressLine1) form.setValue("addressLine1", result.addressLine1, { shouldDirty: true });
    if (result.city) form.setValue("city", result.city, { shouldDirty: true });
    if (result.district) form.setValue("district", result.district, { shouldDirty: true });
    if (result.state) form.setValue("state", result.state, { shouldDirty: true });
    if (result.country) form.setValue("country", result.country, { shouldDirty: true });
    if (result.pincode) form.setValue("pincode", result.pincode, { shouldDirty: true });
  }, [form]);

  const handleConnectGoogle = async () => {
    const googleAccount = linkedAccounts.find((a) => a.provider === "GOOGLE");
    if (googleAccount?.connected) {
      setLinkBanner({ type: "error", message: "Google account is already connected." });
      return;
    }
    setConnectingProvider("GOOGLE");
    setLinkBanner(null);
    try {
      const returnTo = window.location.pathname;
      const url = await authService.getGoogleLinkUrl(returnTo);
      window.location.href = url;
    } catch {
      toast.error("Failed to start Google connection");
      setConnectingProvider(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!unlinkTarget) return;
    setDisconnectingProvider(unlinkTarget.provider);
    setUnlinkError(null);
    try {
      const accounts = await authService.unlinkProvider(unlinkTarget.provider);
      setLinkedAccounts(accounts);
      setUnlinkTarget(null);
      toast.success("Google account disconnected");
    } catch (e) {
      setUnlinkError(e instanceof Error ? e.message : "Failed to disconnect account");
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleTabChange = (newTab: "info" | "security" | "preferences") => {
    if (tab === "info" && isEditing && isDirty) { setShowUnsavedConfirm(true); setPendingTab(newTab); return; }
    setTab(newTab);
  };


  const handleProfileSubmit = async (values: ProfileForm) => {
    setSaving(true);
    try {
      const payload: UpdateProfilePayload = {};
      if (values.name !== profile?.name) payload.name = values.name;
      if (values.phone !== (profile?.phone ?? "")) payload.phone = values.phone || undefined;
      if (values.dateOfBirth !== (profile?.profile?.dateOfBirth ?? "")) payload.dateOfBirth = values.dateOfBirth || undefined;
      if (values.gender !== (profile?.profile?.gender ?? "")) payload.gender = values.gender || undefined;
      if (values.addressLine1 !== (profile?.profile?.addressLine1 ?? "")) payload.addressLine1 = values.addressLine1 || undefined;
      if (values.addressLine2 !== (profile?.profile?.addressLine2 ?? "")) payload.addressLine2 = values.addressLine2 || undefined;
      if (values.city !== (profile?.profile?.city ?? "")) payload.city = values.city || undefined;
      if (values.district !== (profile?.profile?.district ?? "")) payload.district = values.district || undefined;
      if (values.state !== (profile?.profile?.state ?? "")) payload.state = values.state || undefined;
      if (values.country !== (profile?.profile?.country ?? "")) payload.country = values.country || undefined;
      if (values.pincode !== (profile?.profile?.pincode ?? "")) payload.pincode = values.pincode || undefined;
      if (values.latitude !== (profile?.profile?.latitude ?? undefined)) payload.latitude = values.latitude;
      if (values.longitude !== (profile?.profile?.longitude ?? undefined)) payload.longitude = values.longitude;
      if (values.formattedAddress !== (profile?.profile?.formattedAddress ?? "")) payload.formattedAddress = values.formattedAddress || undefined;
      if (values.emergencyName !== (profile?.profile?.emergencyName ?? "")) payload.emergencyName = values.emergencyName || undefined;
      if (values.emergencyPhone !== (profile?.profile?.emergencyPhone ?? "")) payload.emergencyPhone = values.emergencyPhone || undefined;
      if (values.bio !== (profile?.profile?.bio ?? "")) payload.bio = values.bio || undefined;
      if (Object.keys(payload).length === 0) { toast.info("No changes to save"); return; }
      const updated = await authService.updateProfile(payload);
      setProfile(updated);
      useAuthStore.getState().setUser({ ...useAuthStore.getState().user!, name: updated.name, avatarUrl: updated.avatarUrl });
      form.reset(toFormValues(updated));
      setIsEditing(false); toast.success("Profile updated successfully");
    } catch { toast.error("Failed to update profile"); } finally { setSaving(false); }
  };

  const handlePasswordSave = async () => {
    setPasswordErrors({});
    const result = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) { const errs: Record<string, string> = {}; result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; }); setPasswordErrors(errs); return; }
    setPasswordSaving(true);
    try {
      if (profile?.hasPassword) { if (!currentPassword) { setPasswordErrors({ currentPassword: "Required" }); return; } await authService.changePassword({ currentPassword, newPassword }); }
      else { await authService.setPassword({ newPassword }); }
      toast.success("Password updated"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setProfile((p) => p ? { ...p, hasPassword: true } : p);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setPasswordSaving(false); }
  };

  const handleAvatarSave = async (file: File) => {
    setAvatarSaving(true); setUploadProgress(0);
    const iv = setInterval(() => setUploadProgress((p) => Math.min(p + 15, 90)), 200);
    try {
      const uploaded = await uploadToStorage(file, "profile", "avatar");
      setUploadProgress(95);
      const updated = await authService.updateProfile({ avatarUrl: uploaded.url });
      setUploadProgress(100); setProfile(updated);
      useAuthStore.getState().setUser({ ...useAuthStore.getState().user!, name: updated.name, avatarUrl: updated.avatarUrl });
      toast.success("Photo updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update photo"); } finally { clearInterval(iv); setAvatarSaving(false); setUploadProgress(0); }
  };

  const handleDeleteAvatar = async () => {
    setAvatarDeleting(true);
    try {
      const updated = await authService.updateProfile({ avatarUrl: "" });
      setProfile(updated); useAuthStore.getState().setUser({ ...useAuthStore.getState().user!, name: updated.name, avatarUrl: updated.avatarUrl });
      toast.success("Photo removed"); setShowDeleteAvatarConfirm(false);
    } catch { toast.error("Failed to remove photo"); } finally { setAvatarDeleting(false); }
  };

  const handleThemeChange = async (t: string) => {
    setThemePref(t); setNextTheme(t);
    try { await authService.updatePreferences({ theme: t, notificationsEnabled: notifEnabled, pushNotifications: pushEnabled }); } catch { toast.error("Failed to save theme"); }
  };
  const handleNotifToggle = async (v: boolean) => { setNotifEnabled(v); try { await authService.updatePreferences({ theme: themePref, notificationsEnabled: v, pushNotifications: pushEnabled }); } catch { toast.error("Failed"); } };
  const handlePushToggle = async (v: boolean) => {
    setPushEnabled(v);
    try { await authService.updatePreferences({ theme: themePref, notificationsEnabled: notifEnabled, pushNotifications: v }); if (v && "Notification" in window) { const p = await Notification.requestPermission(); if (p !== "granted") { setPushEnabled(false); toast.error("Permission denied"); } } } catch { toast.error("Failed"); }
  };


  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Tab bar */}
      <div className="relative flex rounded-2xl border border-border/60 bg-surface p-1 shadow-[var(--shadow-1)]">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => handleTabChange(t.key)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
              tab === t.key
                ? "text-primary bg-primary/10 shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50"
            )}>
            <t.icon size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <motion.div
          className="absolute top-1 bottom-1 rounded-xl bg-primary/10 border border-primary/20"
          layoutId="profileTabBg"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            width: `calc(${100 / TABS.length}% - 8px)`,
            left: `calc(${TABS.findIndex((t) => t.key === tab) * (100 / TABS.length)}% + 4px)`,
          }}
        />
      </div>

      {loading ? <ProfileSkeleton /> : loadError ? (
        <div className="py-8">
          <ErrorState code={500} title="Failed to load profile"
            description="We couldn't load your profile. Please try again."
            action={{ label: `Retry${retryCount > 0 ? ` (${retryCount})` : ""}`, onClick: () => { retryRef.current = 0; setRetryCount(0); load(); } }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
          {/* ── Profile Info tab ── */}
          {tab === "info" && (
            <form onSubmit={form.handleSubmit(handleProfileSubmit)} className="space-y-5 py-2">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-border/40">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent" />
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
                <div className="relative p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="relative shrink-0 group">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-sm opacity-60" />
                      <Avatar
                        src={profile?.avatarUrl ?? null}
                        name={profile?.name ?? "User"}
                        size="xl"
                        className="relative ring-2 ring-primary/25 ring-offset-2 ring-offset-surface"
                      />
                      {avatarSaving ? (
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground">
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                      ) : isEditing && <ImageCropper currentAvatar={profile?.avatarUrl ?? null} onSave={handleAvatarSave} />}
                      {profile?.avatarUrl && !avatarSaving && isEditing && (
                        <button type="button" onClick={() => setShowDeleteAvatarConfirm(true)} disabled={avatarDeleting}
                          className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-danger text-white hover:bg-danger/90 transition-colors" aria-label="Remove photo">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <h2 className="text-lg font-bold text-text-primary truncate">{profile?.name}</h2>
                      <p className="text-sm text-text-secondary truncate flex items-center gap-1.5 justify-center sm:justify-start mt-0.5">
                        <Mail size={12} className="text-text-secondary/60" />
                        {profile?.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        <Badge variant="brand" size="sm">{profile?.role}</Badge>
                        <Badge variant={profile?.status === "ACTIVE" ? "success" : "warning"} size="sm">
                          {profile?.status === "ACTIVE" ? <Check size={10} /> : <AlertTriangle size={10} />}
                          {profile?.status}
                        </Badge>
                        {profile?.emailVerified && (
                          <Badge variant="success" size="sm"><ShieldCheck size={10} /> Verified</Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="xs" onClick={() => { setIsEditing(false); setEditingField(null); form.reset(); }} disabled={saving}>Cancel</Button>
                          <Button type="submit" loading={saving} disabled={!isDirty || saving} size="xs">
                            <Check size={12} className="mr-1" /> Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 rounded-2xl border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 active:scale-95 transition-all duration-200"
                        >
                          <Pencil size={13} strokeWidth={2.5} />
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-1">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Personal Information</h3>
                <div className="divide-y divide-border/30">
                  <InlineEditableField
                    label="Full Name"
                    value={form.watch("name")}
                    isEditing={editingField === "name"}
                    onEdit={() => { setIsEditing(true); setEditingField("name"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input
                      placeholder="Enter your full name"
                      error={form.formState.errors.name?.message}
                      {...form.register("name")}
                    />
                  </InlineEditableField>

                  <div className="flex items-center justify-between gap-4 py-3 px-1 border-b border-border/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 mb-1">Email</p>
                      <p className="text-[15px] font-semibold text-text-primary truncate">{profile?.email}</p>
                      {!profile?.emailVerified && (
                        <p className="text-[11px] text-warning mt-0.5 font-medium">Not verified</p>
                      )}
                    </div>
                    {profile?.emailVerified && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success border border-success/20">
                        <Check size={10} /> Verified
                      </span>
                    )}
                  </div>

                  <InlineEditableField
                    label="Phone"
                    value={form.watch("phone") || ""}
                    isEditing={editingField === "phone"}
                    onEdit={() => { setIsEditing(true); setEditingField("phone"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input
                      type="tel"
                      placeholder="10-digit number"
                      error={form.formState.errors.phone?.message}
                      {...form.register("phone")}
                    />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Date of Birth"
                    value={form.watch("dateOfBirth") || ""}
                    isEditing={editingField === "dateOfBirth"}
                    onEdit={() => { setIsEditing(true); setEditingField("dateOfBirth"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input type="date" {...form.register("dateOfBirth")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Gender"
                    value={GENDER_OPTIONS.find((g) => g.value === form.watch("gender"))?.label || ""}
                    isEditing={editingField === "gender"}
                    onEdit={() => { setIsEditing(true); setEditingField("gender"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Select
                      options={GENDER_OPTIONS}
                      value={form.watch("gender")}
                      onChange={(val) => form.setValue("gender", val, { shouldValidate: true })}
                    />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Bio"
                    value={form.watch("bio") || ""}
                    isEditing={editingField === "bio"}
                    onEdit={() => { setIsEditing(true); setEditingField("bio"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Textarea rows={3} placeholder="Tell us about yourself" error={form.formState.errors.bio?.message} {...form.register("bio")} />
                    <p className="text-[11px] text-text-secondary">{form.watch("bio")?.length ?? 0}/500</p>
                  </InlineEditableField>
                </div>
              </section>

              {/* Address */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-1">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Address</h3>
                <div className="divide-y divide-border/30">
                  {isEditing && (
                    <div className="py-3 px-1">
                      <LocationPicker
                        latitude={form.watch("latitude") ?? null}
                        longitude={form.watch("longitude") ?? null}
                        disabled={!isEditing}
                        onLocationChange={handleLocationChange}
                      />
                    </div>
                  )}
                  {form.watch("formattedAddress") && (
                    <div className="py-3 px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 mb-1">Pinned Location</p>
                      <p className="text-[15px] font-semibold text-text-primary">{form.watch("formattedAddress")}</p>
                    </div>
                  )}

                  <InlineEditableField
                    label="Address Line 1"
                    value={form.watch("addressLine1") || ""}
                    isEditing={editingField === "addressLine1"}
                    onEdit={() => { setIsEditing(true); setEditingField("addressLine1"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input placeholder="Street address" {...form.register("addressLine1")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Address Line 2"
                    value={form.watch("addressLine2") || ""}
                    isEditing={editingField === "addressLine2"}
                    onEdit={() => { setIsEditing(true); setEditingField("addressLine2"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input placeholder="Apartment, suite, etc." {...form.register("addressLine2")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="City"
                    value={form.watch("city") || ""}
                    isEditing={editingField === "city"}
                    onEdit={() => { setIsEditing(true); setEditingField("city"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input {...form.register("city")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="District"
                    value={form.watch("district") || ""}
                    isEditing={editingField === "district"}
                    onEdit={() => { setIsEditing(true); setEditingField("district"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input {...form.register("district")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="State"
                    value={form.watch("state") || ""}
                    isEditing={editingField === "state"}
                    onEdit={() => { setIsEditing(true); setEditingField("state"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input {...form.register("state")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Country"
                    value={form.watch("country") || ""}
                    isEditing={editingField === "country"}
                    onEdit={() => { setIsEditing(true); setEditingField("country"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input {...form.register("country")} />
                  </InlineEditableField>

                  <InlineEditableField
                    label="Pincode"
                    value={form.watch("pincode") || ""}
                    isEditing={editingField === "pincode"}
                    onEdit={() => { setIsEditing(true); setEditingField("pincode"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input placeholder="000000" error={form.formState.errors.pincode?.message} {...form.register("pincode")} />
                  </InlineEditableField>
                </div>
              </section>

              {/* Emergency Contact */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-1">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Emergency Contact</h3>
                <div className="divide-y divide-border/30">
                  <InlineEditableField
                    label="Contact Name"
                    value={form.watch("emergencyName") || ""}
                    isEditing={editingField === "emergencyName"}
                    onEdit={() => { setIsEditing(true); setEditingField("emergencyName"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input placeholder="Emergency contact name" {...form.register("emergencyName")} />
                  </InlineEditableField>
                  <InlineEditableField
                    label="Contact Phone"
                    value={form.watch("emergencyPhone") || ""}
                    isEditing={editingField === "emergencyPhone"}
                    onEdit={() => { setIsEditing(true); setEditingField("emergencyPhone"); }}
                    onCancel={() => setEditingField(null)}
                  >
                    <Input type="tel" placeholder="10-digit number" error={form.formState.errors.emergencyPhone?.message} {...form.register("emergencyPhone")} />
                  </InlineEditableField>
                </div>
              </section>

              {/* Save bar */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-primary/20 bg-surface/95 backdrop-blur-sm px-4 py-3 shadow-lg"
                >
                  <p className="text-xs text-text-secondary">
                    {isDirty ? "You have unsaved changes" : "No changes yet"}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="xs" onClick={() => { setIsEditing(false); setEditingField(null); form.reset(); }} disabled={saving}>Cancel</Button>
                    <Button type="submit" loading={saving} disabled={!isDirty || saving} size="xs">
                      <Check size={12} className="mr-1" /> Save All
                    </Button>
                  </div>
                </motion.div>
              )}
            </form>
          )}


          {/* ── Security tab ── */}
          {tab === "security" && (
            <div className="space-y-5 py-2">
               {/* Linked Accounts */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-3.5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Linked Accounts</h3>
                    <p className="text-xs text-text-secondary">Connect external accounts for faster sign-in</p>
                  </div>
                </div>

                {linkBanner && (
                  <div className={cn(
                    "flex items-start gap-2 rounded-xl px-4 py-3 text-sm border",
                    linkBanner.type === "success"
                      ? "bg-success/5 border-success/20 text-success"
                      : "bg-danger/5 border-danger/20 text-danger",
                  )}>
                    {linkBanner.type === "success" ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                    <span className="flex-1">{linkBanner.message}</span>
                    <button type="button" onClick={() => setLinkBanner(null)} className="shrink-0 text-current opacity-60 hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {linkedAccountsLoading ? (
                  <Skeleton className="h-16 w-full rounded-xl" />
                ) : (
                  <div className="space-y-2.5">
                    {linkedAccounts.map((account) => (
                      <div key={account.provider} className="space-y-2">
                        <div className="flex items-center justify-between rounded-xl bg-surface-overlay/60 px-4 py-3.5 border border-border/40">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-text-secondary font-semibold text-sm">
                              G
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary">Google</p>
                              <p className="text-xs text-text-secondary">
                                {account.connected ? account.email : "Not connected"}
                              </p>
                            </div>
                          </div>
                          {account.connected ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="success" size="sm">
                                <Check size={10} /> Connected
                              </Badge>
                              <Button
                                type="button" variant="outline" size="xs"
                                disabled={!account.canUnlink || disconnectingProvider === account.provider}
                                onClick={() => { setUnlinkError(null); setUnlinkTarget(account); }}
                              >
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button" size="xs"
                              loading={connectingProvider === account.provider}
                              onClick={handleConnectGoogle}
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                        {account.connected && !account.canUnlink && (
                          <div className="flex items-start gap-2 rounded-xl bg-warning/5 border border-warning/20 px-4 py-2.5 text-xs text-warning">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span>Set a password before disconnecting your only sign-in method to avoid losing access.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              
              {/* Password Section */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{profile?.hasPassword ? "Change Password" : "Set Password"}</h3>
                    <p className="text-xs text-text-secondary">
                      {profile?.hasPassword ? "Update your password to keep your account secure." : "Set a password to log in with email."}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {profile?.hasPassword && (
                    <div className="relative">
                      <Input label="Current Password" type={showCurrent ? "text" : "password"} placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} error={passwordErrors.currentPassword} leftAddon={<Lock size={14} />}
                        rightAddon={<button type="button" onClick={() => setShowCurrent((v) => !v)} className="text-text-secondary hover:text-primary transition-colors" tabIndex={-1}>{showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}</button>} />
                    </div>
                  )}
                  <div>
                    <Input label="New Password" type={showNew ? "text" : "password"} placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={passwordErrors.newPassword} leftAddon={<Lock size={14} />}
                      rightAddon={<button type="button" onClick={() => setShowNew((v) => !v)} className="text-text-secondary hover:text-primary transition-colors" tabIndex={-1}>{showNew ? <EyeOff size={14} /> : <Eye size={14} />}</button>} />
                    <div className="mt-2.5"><PasswordStrength password={newPassword} /></div>
                  </div>
                  <Input label="Confirm New Password" type={showConfirm ? "text" : "password"} placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={passwordErrors.confirmPassword} leftAddon={<Lock size={14} />}
                    rightAddon={<button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-text-secondary hover:text-primary transition-colors" tabIndex={-1}>{showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}</button>} />
                  <div className="flex justify-end pt-1">
                    <Button type="button" size="sm" loading={passwordSaving} onClick={handlePasswordSave}>
                      <KeyRound size={14} className="mr-1.5" />{profile?.hasPassword ? "Update Password" : "Set Password"}
                    </Button>
                  </div>
                </div>
              </section>

              {/* Account Security Info */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-3.5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-info">
                    <Fingerprint size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Account Details</h3>
                    <p className="text-xs text-text-secondary">Your account activity and verification status</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <SecurityInfoItem
                    icon={History}
                    label="Last Login"
                    value={profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "First login"}
                    variant="default"
                  />
                  <SecurityInfoItem
                    icon={Smartphone}
                    label="Account Created"
                    value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                    variant="default"
                  />
                  <SecurityInfoItem
                    icon={profile?.emailVerified ? ShieldCheck : ShieldAlert}
                    label="Email Verification"
                    value={profile?.emailVerified ? "Verified" : "Not verified"}
                    variant={profile?.emailVerified ? "success" : "warning"}
                  />
                </div>
              </section>

             
            </div>
          )}

          {/* ── Preferences tab ── */}
          {tab === "preferences" && (
            <div className="space-y-5 py-2">
              {/* Appearance */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sun size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Appearance</h3>
                    <p className="text-xs text-text-secondary">Choose your preferred theme</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Light", icon: Sun, desc: "Always light" },
                    { value: "dark", label: "Dark", icon: Moon, desc: "Always dark" },
                    { value: "system", label: "System", icon: Settings, desc: "Auto-detect" },
                  ].map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleThemeChange(value)}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-xs font-medium transition-all border-2",
                        themePref === value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-surface-overlay/40 text-text-secondary hover:border-primary/40 hover:bg-surface-overlay"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                        themePref === value
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-raised text-text-secondary group-hover:text-primary group-hover:bg-primary/5"
                      )}>
                        <Icon size={18} />
                      </div>
                      <span className="font-semibold">{label}</span>
                      <span className="text-[10px] text-text-secondary/70">{desc}</span>
                      {themePref === value && (
                        <motion.div
                          layoutId="themeCheck"
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Check size={11} strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Notifications */}
              <section className="rounded-2xl border border-border/60 bg-surface p-5 space-y-3.5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                    <p className="text-xs text-text-secondary">Manage how you receive updates</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    {
                      icon: Bell,
                      label: "In-App Notifications",
                      desc: "Receive notifications within the app",
                      checked: notifEnabled,
                      onToggle: handleNotifToggle,
                      badge: notifEnabled ? "On" : "Off",
                      badgeVariant: notifEnabled ? "success" as const : "default" as const,
                    },
                    {
                      icon: BellOff,
                      label: "Push Notifications",
                      desc: "Receive push notifications on your device",
                      checked: pushEnabled,
                      onToggle: handlePushToggle,
                      badge: pushEnabled ? "On" : "Off",
                      badgeVariant: pushEnabled ? "success" as const : "default" as const,
                    },
                  ].map(({ icon: Icon, label, desc, checked, onToggle, badge, badgeVariant }) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-surface-overlay/60 px-4 py-3.5 border border-border/40">
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          checked ? "bg-primary/10 text-primary" : "bg-surface-raised text-text-secondary"
                        )}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{label}</p>
                          <p className="text-xs text-text-secondary">{desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Badge variant={badgeVariant} size="sm">{badge}</Badge>
                        <Switch checked={checked} onCheckedChange={onToggle} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          </motion.div>
        </AnimatePresence>
      )}

      <ConfirmModal open={showDeleteAvatarConfirm} onClose={() => setShowDeleteAvatarConfirm(false)} onConfirm={handleDeleteAvatar}
        title="Remove profile photo" description="Are you sure you want to remove your profile photo?" intent="warning" confirmLabel="Remove" loading={avatarDeleting} />
      <ConfirmModal open={showUnsavedConfirm} onClose={() => { setShowUnsavedConfirm(false); setPendingTab(null); }}
        onConfirm={() => { setShowUnsavedConfirm(false); setIsEditing(false); form.reset(); if (pendingTab) setTab(pendingTab); setPendingTab(null); }}
        title="Unsaved changes" description="You have unsaved changes. Discard them?" intent="warning" confirmLabel="Discard" cancelLabel="Keep editing" />
      <ConfirmModal open={!!unlinkTarget} onClose={() => { setUnlinkTarget(null); setUnlinkError(null); }} onConfirm={handleDisconnectGoogle}
        title="Disconnect Google account" description="You will no longer be able to sign in using Google. You can reconnect it at any time." intent="warning" confirmLabel="Disconnect" loading={!!disconnectingProvider}>
        {unlinkError && (
          <div className="flex items-start gap-2 rounded-xl bg-danger/5 border border-danger/20 px-3 py-2.5 text-xs text-danger mt-3">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>{unlinkError}</span>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
