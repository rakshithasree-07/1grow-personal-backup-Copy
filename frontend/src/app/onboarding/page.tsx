"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import {
  Building2,
  Users,
  Briefcase,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronRight,
  Save,
  Search,
  MapPin,
  AlertCircle,
  Phone,
  Mail,
  MapPinned,
  User,
  UserCheck,
  LogOut,
  ArrowRight,
  Sparkles,
  Check,
  BookOpen,
  Package,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  FloatingInput,
  ProgressStepper,
  SearchOrg,
  PremiumButton,
  SuccessAnimation,
  AnimatedFrame,
} from "@/components/onboarding";
import {
  getOnboardingProgress,
  selectRole,
  setupProfile,
  setupTenant,
  saveSection,
  searchTenants,
  requestAccess,
  inviteBusinessOwner,
  completeClientOnboarding,
  getMyTenantInvitations,
  type SearchTenantResult,
  type TenantClaimRequest,
  type TenantInvitationResult,
  getMyInviteRequests,
} from "@/services/onboarding";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { useAuthStore } from "@/store/auth.store";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Business Owner", desc: "Create and manage your business, staff, and students", icon: Building2, accent: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  { value: "BRANCH_MANAGER", label: "Branch Manager", desc: "Manage daily operations at a branch location", icon: Users, accent: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
  { value: "STAFF", label: "Staff", desc: "Conduct classes, manage students, and support operations", icon: Briefcase, accent: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
  { value: "STUDENT", label: "Student", desc: "Enroll in courses, track progress, and learn", icon: GraduationCap, accent: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  { value: "CLIENT", label: "Client", desc: "Access quotations, bookings, and invoices", icon: FileText, accent: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" },
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Chandigarh", "Puducherry",
];

const BUSINESS_TYPES = [
  { value: "TRAINING", label: "Training Institute", icon: BookOpen, description: "Courses, batches, students, attendance" },
  { value: "RENTAL", label: "Rental Business", icon: Package, description: "Inventory, bookings, dispatch, returns" },
  { value: "EVENT", label: "Event Management", icon: CalendarDays, description: "Events, proposals, vendors, execution" },
];

const DOB_MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const DOB_DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: String(i + 1),
}));

function getDOBYearOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 100; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

function getDaysInMonth(month: string, year: string): number {
  if (!month || !year) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length !== 3) return null;
  const birth = new Date(parseInt(parts[0]!), parseInt(parts[1]!) - 1, parseInt(parts[2]!));
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getStepsForRole(role: string | null): { id: string; label: string; description: string }[] {
  if (!role) return [{ id: "role-selection", label: "Select Role", description: "Choose your primary role to personalize your platform experience." }];
  const base = [
    { id: "role-selection", label: "Role Selection", description: "Choose your primary role to personalize the platform experience. This step configures features, permissions, workflows, and recommendations based on whether you are an Owner, Trainer, Staff, or Student, ensuring a tailored dashboard and onboarding journey." },
    { id: "profile-setup", label: "Profile Setup", description: "Complete your personal profile by adding your name, contact details, and professional information. A verified and complete profile builds credibility, improves collaboration, enables secure communication, and enhances visibility within the platform." },
  ];
  if (role === "OWNER") return [...base, { id: "tenant-setup", label: "Organization Details", description: "Add your business or organization information, including company name, registration details, GST, address, branding, and contact information. This creates a verified business identity, unlocks organization-specific features, simplifies management, and establishes trust with members and partners." }];
  if (role === "CLIENT") return [...base, { id: "complete", label: "Done", description: "Your account is ready. You can now start exploring the platform." }];
  return [...base, { id: "org-search", label: "Organization", description: "Search and join your existing organization to connect with your team, access shared resources, and start collaborating immediately." }];
}

function normalizeSectionId(backendSection: string): string {
  return backendSection.toLowerCase().replace(/_/g, "-");
}

function markOnboardingComplete() {
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, onboardingRequired: false });
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;
  if (digits.length < 10) return `Enter ${10 - digits.length} more digit${10 - digits.length !== 1 ? "s" : ""}`;
  if (!/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit Indian mobile number";
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutFn = useAuthStore((s) => s.logout);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [loading, setLoading] = React.useState(true);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [completedSections, setCompletedSections] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [autoSaving, setAutoSaving] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const [profileForm, setProfileForm] = React.useState({
    fullName: user?.name || "",
    mobileNumber: user?.phone || "",
    whatsappNumber: "",
    dateOfBirth: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    gender: "",
  });

  const [profileErrors, setProfileErrors] = React.useState<{
    fullName?: string;
    mobileNumber?: string;
    whatsappNumber?: string;
    dobDay?: string;
    dobMonth?: string;
    dobYear?: string;
  }>({});

  const validateProfileField = React.useCallback((field: string, value: string, extraA?: string, extraB?: string) => {
    setProfileErrors((prev) => {
      const next = { ...prev };
      if (field === "fullName") {
        next.fullName = !value.trim() ? "Full name is required" : value.trim().length < 2 ? "Name must be at least 2 characters" : undefined;
      } else if (field === "mobileNumber") {
        next.mobileNumber = validatePhone(value) || undefined;
      } else if (field === "whatsappNumber") {
        next.whatsappNumber = value ? (validatePhone(value) || undefined) : undefined;
      } else if (field === "dobDay") {
        const month = extraA || "";
        const year = extraB || "";
        if (!value) { next.dobDay = undefined; return next; }
        const num = parseInt(value);
        if (isNaN(num) || num < 1) { next.dobDay = "Invalid day"; return next; }
        if (month && year) {
          const maxDays = getDaysInMonth(month, year);
          if (num > maxDays) { next.dobDay = `Max ${maxDays} days`; return next; }
        } else if (num > 31) { next.dobDay = "Invalid day"; return next; }
        next.dobDay = undefined;
      } else if (field === "dobMonth") {
        const year = extraA || "";
        if (!value) { next.dobMonth = undefined; return next; }
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 12) { next.dobMonth = "Enter 1-12"; return next; }
        if (year) {
          const maxDays = getDaysInMonth(value, year);
          const day = parseInt(prev.dobDay || "0");
          if (day > maxDays) { next.dobDay = `Max ${maxDays} days`; }
        }
        next.dobMonth = undefined;
      } else if (field === "dobYear") {
        const month = extraA || "";
        if (!value) { next.dobYear = undefined; return next; }
        const num = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(num) || num < 1900 || num > currentYear) { next.dobYear = `Enter 1900-${currentYear}`; return next; }
        if (month) {
          const maxDays = getDaysInMonth(month, value);
          const day = parseInt(prev.dobDay || "0");
          if (day > maxDays) { next.dobDay = `Max ${maxDays} days`; }
        }
        next.dobYear = undefined;
      }
      return next;
    });
  }, []);

  const [tenantForm, setTenantForm] = React.useState({
    businessName: "",
    legalName: "",
    businessTypes: ["TRAINING"] as string[],
    tagline: "",
    description: "",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    phone: "",
    email: "",
    whatsapp: "",
    website: "",
    gstin: "",
    pan: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    addressLine1: "",
  });

  const [orgSearchQuery, setOrgSearchQuery] = React.useState("");
  const [orgSearchResults, setOrgSearchResults] = React.useState<SearchTenantResult[]>([]);
  const [selectedOrg, setSelectedOrg] = React.useState<SearchTenantResult | null>(null);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [orgSearching, setOrgSearching] = React.useState(false);

  const [inviteForm, setInviteForm] = React.useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    notes: "",
  });
  const [myInvites, setMyInvites] = React.useState<TenantClaimRequest[]>([]);
  const [invitedTenants, setInvitedTenants] = React.useState<TenantInvitationResult[]>([]);
  const [invitedTenantsLoading, setInvitedTenantsLoading] = React.useState(false);

  const monthInputRef = React.useRef<HTMLInputElement>(null);
  const yearInputRef = React.useRef<HTMLInputElement>(null);

  // ── GSAP entrance ──
  React.useEffect(() => {
    if (!loading && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          containerRef.current!,
          { opacity: 0, scale: 0.98 },
          { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
        );
      }, containerRef);
      return () => ctx.revert();
    }
  }, [loading]);

  // ── Initialize ──
  React.useEffect(() => {
    let redirected = false;
    (async () => {
      try {
        const res = await getOnboardingProgress();
        const { session, user: userData } = res.data;

        if (userData.role === "SUPER_ADMIN") {
          redirected = true;
          router.replace(getDashboardRoute(userData.role));
          return;
        }

        if (session.isCompleted) {
          redirected = true;
          router.replace(getDashboardRoute(userData.role));
          return;
        }

        if (session.selectedRole) {
          setSelectedRole(session.selectedRole);
          const normalizedSections = (session.completedSections || []).map(normalizeSectionId);
          setCompletedSections(normalizedSections);

          const rawPhone = (userData.phone || "").replace(/\D/g, "").replace(/^0+/, "");
          setProfileForm((prev) => ({
            ...prev,
            fullName: prev.fullName || userData.name || "",
            mobileNumber: prev.mobileNumber || rawPhone,
            whatsappNumber: prev.whatsappNumber || rawPhone,
          }));

          const profile = (userData as Record<string, unknown>).profile as Record<string, string> | null | undefined;
          if (profile) {
            const dob = profile.dateOfBirth || "";
            let dobDay = "", dobMonth = "", dobYear = "";
            if (dob) {
              const parts = dob.split("T")[0]!.split("-");
              dobYear = parts[0] || "";
              dobMonth = parts[1] || "";
              dobDay = parts[2] || "";
            }
            setProfileForm((prev) => ({
              ...prev,
              gender: profile.gender || prev.gender,
              dateOfBirth: dob, dobDay, dobMonth, dobYear,
              whatsappNumber: profile.whatsappNumber || prev.whatsappNumber,
            }));
          }

          const sections = getSectionsForRole(session.selectedRole);
          const nextSection = sections.find((s) => !normalizedSections.includes(s));
          if (nextSection) setActiveSection(nextSection);
        }
      } catch {
        // New user
      } finally {
        if (!redirected) setLoading(false);
      }
    })();
  }, [router]);

  // ── GSAP step transition ──
  React.useEffect(() => {
    if (activeSection && containerRef.current) {
      const formArea = containerRef.current.querySelector("[data-form-area]");
      if (formArea) {
        gsap.fromTo(formArea, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
      }
    }
  }, [activeSection]);

  // ── Load invited tenants when org-search step is active ──
  React.useEffect(() => {
    if (activeSection !== "org-search") return;
    let cancelled = false;
    (async () => {
      try {
        setInvitedTenantsLoading(true);
        const res = await getMyTenantInvitations();
        if (!cancelled) setInvitedTenants(res.data);
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setInvitedTenantsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSection]);

  // ── Auto-save debounce ──
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const triggerAutoSave = React.useCallback(
    (section: string, data: Record<string, unknown>) => {
      const clean = { ...data };
      if (section === "profile-setup") {
        delete clean.dobDay; delete clean.dobMonth; delete clean.dobYear;
        if (!clean.dateOfBirth) delete clean.dateOfBirth;
      }
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try { setAutoSaving(true); await saveSection(section, clean); } catch {} finally { setAutoSaving(false); }
      }, 1000);
    },
    [],
  );

  const getSectionsForRole = (role: string): string[] => {
    const base = ["role-selection", "profile-setup"];
    if (role === "OWNER") return [...base, "tenant-setup"];
    if (role === "CLIENT") return [...base, "complete"];
    return [...base, "org-search"];
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    setSaving(true);
    try {
      await selectRole({ role });
      setCompletedSections(["role-selection"]);
      setActiveSection("profile-setup");
      toast.success("Role selected! Complete your profile to continue.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to select role. Please try again."); }
    finally { setSaving(false); }
  };

  const handleProfileSubmit = async () => {
    const nameError = !profileForm.fullName.trim() ? "Full name is required" : profileForm.fullName.trim().length < 2 ? "Name must be at least 2 characters" : undefined;
    const mobileError = validatePhone(profileForm.mobileNumber) || undefined;
    const whatsappError = profileForm.whatsappNumber ? (validatePhone(profileForm.whatsappNumber) || undefined) : undefined;

    setProfileErrors({
      fullName: nameError,
      mobileNumber: mobileError,
      whatsappNumber: whatsappError,
    });

    if (nameError || mobileError) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    setSaving(true);
    try {
      const { dobDay: _d, dobMonth: _m, dobYear: _y, ...rest } = profileForm;
      void _d; void _m; void _y;
      const payload = { ...rest, dateOfBirth: rest.dateOfBirth || undefined };
      const result = await setupProfile(payload);
      setCompletedSections((prev) => [...prev, "profile-setup"]);
      if (result.data.completed) {
        setCompleted(true); setActiveSection(null);
        toast.success("Onboarding completed!");
        markOnboardingComplete();
        setTimeout(() => router.replace(result.data.redirectTo || getDashboardRoute("CLIENT")), 2500);
        return;
      }
      if (selectedRole === "OWNER") setActiveSection("tenant-setup");
      else if (selectedRole === "CLIENT") {
        await completeClientOnboarding(); setCompleted(true); setActiveSection(null);
        markOnboardingComplete();
        setTimeout(() => router.replace("/client/dashboard"), 2500);
      } else setActiveSection("org-search");
      toast.success("Profile saved successfully!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save profile. Please try again."); }
    finally { setSaving(false); }
  };

  const handleTenantSubmit = async () => {
    if (!tenantForm.businessName) { toast.error("Please enter your business name"); return; }
    if (tenantForm.businessTypes.length === 0) { toast.error("Please select at least one business type"); return; }
    setSaving(true);
    try {
      const result = await setupTenant({
        ...tenantForm,
        businessType: tenantForm.businessTypes[0],
        businessTypes: tenantForm.businessTypes,
      });
      setCompletedSections((prev) => [...prev, "tenant-setup", "complete"]);
      setActiveSection(null); setCompleted(true);
      toast.success("Business created with 15-day free trial!");
      if (result.data.token) {
        localStorage.setItem("accessToken", result.data.token.accessToken);
        const { user: currentUser, setUser } = useAuthStore.getState();
        if (currentUser && result.data.token.user) {
          setUser({ ...currentUser, ...result.data.token.user, onboardingRequired: false });
        }
      }
      markOnboardingComplete();
      setTimeout(() => router.replace(result.data.redirectTo || "/owner/dashboard"), 2500);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create business. Please try again."); }
    finally { setSaving(false); }
  };

  const handleOrgSearch = async () => {
    if (!orgSearchQuery.trim()) return;
    setOrgSearching(true);
    try { const result = await searchTenants({ name: orgSearchQuery }); setOrgSearchResults(result.data); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Search failed. Please try again."); }
    finally { setOrgSearching(false); }
  };

  const handleSelectOrg = (org: SearchTenantResult | null) => {
    setSelectedOrg(org);
    if (org && org.branches.length === 1) setSelectedBranch(org.branches[0].id);
    else setSelectedBranch("");
  };

  const handleSelectInvitedTenant = (invitation: TenantInvitationResult) => {
    setSelectedOrg(invitation.tenant);
    if (invitation.tenant.branches.length === 1) setSelectedBranch(invitation.tenant.branches[0].id);
    else setSelectedBranch("");
  };

  const handleRequestAccess = async () => {
    if (!selectedOrg) { toast.error("Please select an organization"); return; }
    setSaving(true);
    try {
      await requestAccess({ tenantId: selectedOrg.id, preferredBranchId: selectedBranch || undefined });
      setCompletedSections((prev) => [...prev, "org-search", "complete"]);
      setActiveSection(null); setCompleted(true);
      toast.success("Access request submitted! Waiting for approval.");
      markOnboardingComplete();
      setTimeout(() => router.replace(getDashboardRoute(selectedRole || "STAFF")), 2500);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to submit access request."); }
    finally { setSaving(false); }
  };

  const handleInviteOwner = async () => {
    if (!inviteForm.businessName || !inviteForm.ownerName || !inviteForm.ownerEmail) {
      toast.error("Please fill in all required fields"); return;
    }
    setSaving(true);
    try {
      await inviteBusinessOwner(inviteForm);
      toast.success("Invitation request submitted to platform administrators.");
      setInviteForm({ businessName: "", ownerName: "", ownerEmail: "", ownerPhone: "", notes: "" });
      const res = await getMyInviteRequests(); setMyInvites(res.data);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to submit invitation request."); }
    finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  const steps = getStepsForRole(selectedRole);
  const currentStepId = activeSection || "role-selection";
  const currentRoleMeta = selectedRole ? ROLE_OPTIONS.find((r) => r.value === selectedRole) : null;

  const bottomCta = (() => {
    if (activeSection === "profile-setup") {
      const hasErrors = !!profileErrors.fullName || !!profileErrors.mobileNumber || !!profileErrors.whatsappNumber || !!profileErrors.dobDay || !!profileErrors.dobMonth || !!profileErrors.dobYear;
      const hasRequiredFields = !!profileForm.fullName.trim() && !!profileForm.mobileNumber.replace(/\D/g, "").length;
      return { label: "Save & Continue", onClick: handleProfileSubmit, loading: saving, disabled: hasErrors || !hasRequiredFields };
    }
    if (activeSection === "tenant-setup") return { label: "Create Business", onClick: handleTenantSubmit, loading: saving, disabled: !tenantForm.businessName };
    if (activeSection === "org-search" && selectedOrg) return { label: "Request Access", onClick: handleRequestAccess, loading: saving, disabled: false };
    return null;
  })();

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F1117] dark:bg-[#080a0e] overflow-hidden">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Completed ──
  if (completed) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F1117] dark:bg-[#080a0e] overflow-hidden">
        <AnimatedFrame className="min-h-[400px]">
          <div className="flex items-center justify-center h-full min-h-[350px]">
            <SuccessAnimation />
          </div>
        </AnimatedFrame>
      </div>
    );
  }

  return (
      <div className="flex flex-col h-screen overflow-hidden bg-[#0F1117] dark:bg-[#080a0e]">
      <AnimatedFrame className="flex-1 flex flex-col">
        <div ref={containerRef} className="flex flex-col h-full min-h-0">
          {/* ── Header Bar ── */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-border-subtle shrink-0">
            <button
              type="button"
              onClick={async () => { await logoutFn(); router.replace("/login"); }}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors font-medium"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <AnimatePresence>
                {autoSaving && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-xs text-text-disabled"
                  >
                    <Save size={11} className="animate-pulse" />
                    Saving
                  </motion.span>
                )}
              </AnimatePresence>
              <ThemeToggle />
            </div>
          </header>

          {/* ── Stepper Bar ── */}
          {selectedRole && (
            <div className="px-6 sm:px-8 py-4 border-b border-border-subtle shrink-0 bg-surface/50 backdrop-blur-sm">
              <ProgressStepper steps={steps} currentStep={currentStepId} completedSteps={completedSections} />
            </div>
          )}

          {/* ── Scrollable Content Area ── */}
          <div className="flex-1 overflow-y-auto scrollbar-none" data-form-area>
            <div className="mx-auto max-w-2xl px-6 sm:px-10 py-8 lg:py-10">
              {/* ── Page Title ── */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-text-primary tracking-tight lg:text-3xl">
                  {selectedRole
                    ? currentRoleMeta ? `Setup ${currentRoleMeta.label}` : "Continue Setup"
                    : "Welcome to 1Grow"}
                </h1>
                <p className="mt-1.5 text-sm text-text-secondary">
                  {selectedRole
                    ? "Complete the steps below to finish onboarding"
                    : "Select your role to get started"}
                </p>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP: Role Selection                          */}
              {/* ═══════════════════════════════════════════════ */}
              {!completedSections.includes("role-selection") && (
                <RoleSelectStep
                  selectedRole={selectedRole}
                  onSelectRole={setSelectedRole}
                  onContinue={handleRoleSelect}
                  saving={saving}
                />
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP: Profile Setup                           */}
              {/* ═══════════════════════════════════════════════ */}
              {activeSection === "profile-setup" && (
                <div className="space-y-5">
                  <SectionHeader icon={UserCheck} title="Profile Setup" subtitle="Tell us about yourself" />

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FloatingInput
                        label="Full Name"
                        value={profileForm.fullName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProfileForm((p) => ({ ...p, fullName: v }));
                          validateProfileField("fullName", v);
                          triggerAutoSave("profile-setup", { ...profileForm, fullName: v });
                        }}
                        onBlur={() => validateProfileField("fullName", profileForm.fullName)}
                        required
                        leftIcon={<User size={16} />}
                        error={profileErrors.fullName}
                      />
                      <FloatingInput
                        label="Mobile Number"
                        value={formatPhoneDisplay(profileForm.mobileNumber)}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setProfileForm((p) => ({ ...p, mobileNumber: d }));
                          validateProfileField("mobileNumber", d);
                          triggerAutoSave("profile-setup", { ...profileForm, mobileNumber: d });
                        }}
                        onBlur={() => validateProfileField("mobileNumber", profileForm.mobileNumber)}
                        required
                        leftIcon={<Phone size={16} />}
                        placeholder="98765 43210"
                        inputMode="numeric"
                        error={profileErrors.mobileNumber}
                        hint={!profileErrors.mobileNumber ? "10-digit Indian mobile number" : undefined}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FloatingInput
                        label="WhatsApp Number"
                        value={formatPhoneDisplay(profileForm.whatsappNumber)}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setProfileForm((p) => ({ ...p, whatsappNumber: d }));
                          validateProfileField("whatsappNumber", d);
                          triggerAutoSave("profile-setup", { ...profileForm, whatsappNumber: d });
                        }}
                        onBlur={() => validateProfileField("whatsappNumber", profileForm.whatsappNumber)}
                        leftIcon={<Phone size={16} />}
                        placeholder="98765 43210"
                        inputMode="numeric"
                        error={profileErrors.whatsappNumber}
                        hint={!profileErrors.whatsappNumber ? "Optional for WhatsApp updates" : undefined}
                      />
                      <Select label="Gender" required value={profileForm.gender}
                        onChange={(val) => { setProfileForm((p) => ({ ...p, gender: val })); triggerAutoSave("profile-setup", { ...profileForm, gender: val }); }}
                        options={[{ value: "", label: "Select gender" }, { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} />
                    </div>

                    {/* DOB */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-text-primary">
                        Date of Birth
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <DOBField
                          label="DD"
                          value={profileForm.dobDay}
                          maxLength={2}
                          options={DOB_DAYS.filter((d) => {
                            if (!profileForm.dobMonth || !profileForm.dobYear) return true;
                            return parseInt(d.value) <= getDaysInMonth(profileForm.dobMonth, profileForm.dobYear);
                          })}
                          error={profileErrors.dobDay}
                          onChange={(val) => {
                            const y = profileForm.dobYear;
                            const m = profileForm.dobMonth;
                            const dob = y && m && val ? `${y}-${m}-${val.padStart(2, "0")}` : "";
                            setProfileForm((p) => ({ ...p, dobDay: val, dateOfBirth: dob }));
                            validateProfileField("dobDay", val, m, y);
                            triggerAutoSave("profile-setup", { ...profileForm, dobDay: val, dateOfBirth: dob });
                          }}
                          onAutoAdvance={() => monthInputRef.current?.focus()}
                          placeholder="DD"
                        />
                        <DOBField
                          ref={monthInputRef}
                          label="MM"
                          value={profileForm.dobMonth}
                          maxLength={2}
                          options={DOB_MONTHS}
                          error={profileErrors.dobMonth}
                          onChange={(val) => {
                            const y = profileForm.dobYear;
                            const maxDays = getDaysInMonth(val, y || String(new Date().getFullYear()));
                            let day = profileForm.dobDay;
                            if (day && parseInt(day) > maxDays) day = String(maxDays).padStart(2, "0");
                            const dob = y && val ? `${y}-${val}-${(day || "01").padStart(2, "0")}` : "";
                            setProfileForm((p) => ({ ...p, dobMonth: val, dobDay: day || "", dateOfBirth: dob }));
                            validateProfileField("dobMonth", val, y, day);
                            triggerAutoSave("profile-setup", { ...profileForm, dobMonth: val, dobDay: day || "", dateOfBirth: dob });
                          }}
                          onAutoAdvance={() => yearInputRef.current?.focus()}
                          placeholder="MM"
                        />
                        <DOBField
                          ref={yearInputRef}
                          label="YYYY"
                          value={profileForm.dobYear}
                          maxLength={4}
                          options={getDOBYearOptions()}
                          error={profileErrors.dobYear}
                          onChange={(val) => {
                            const m = profileForm.dobMonth;
                            const maxDays = getDaysInMonth(m || "01", val);
                            let day = profileForm.dobDay;
                            if (day && parseInt(day) > maxDays) day = String(maxDays).padStart(2, "0");
                            const dob = m && val ? `${val}-${m}-${(day || "01").padStart(2, "0")}` : "";
                            setProfileForm((p) => ({ ...p, dobYear: val, dobDay: day || "", dateOfBirth: dob }));
                            validateProfileField("dobYear", val, m, day);
                            triggerAutoSave("profile-setup", { ...profileForm, dobYear: val, dobDay: day || "", dateOfBirth: dob });
                            if (["OWNER", "STAFF", "BRANCH_MANAGER"].includes(selectedRole || "") && dob) {
                              const age = computeAge(dob);
                              if (age !== null && age < 10) toast.warning("Age must be at least 10 years for this role", { duration: 5000 });
                            }
                          }}
                          placeholder="YYYY"
                        />
                      </div>
                      {profileErrors.dobDay && <p className="text-xs text-danger flex items-center gap-1"><AlertCircle size={11} />{profileErrors.dobDay}</p>}
                      {profileErrors.dobMonth && <p className="text-xs text-danger flex items-center gap-1"><AlertCircle size={11} />{profileErrors.dobMonth}</p>}
                      {profileErrors.dobYear && <p className="text-xs text-danger flex items-center gap-1"><AlertCircle size={11} />{profileErrors.dobYear}</p>}
                      {!profileErrors.dobDay && !profileErrors.dobMonth && !profileErrors.dobYear && profileForm.dobDay && profileForm.dobMonth && profileForm.dobYear && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <Check size={11} />
                          {(() => {
                            const dob = `${profileForm.dobYear}-${profileForm.dobMonth.padStart(2, "0")}-${profileForm.dobDay.padStart(2, "0")}`;
                            const age = computeAge(dob);
                            return age !== null ? `Age: ${age} years` : "";
                          })()}
                        </p>
                      )}
                      {!profileErrors.dobDay && !profileErrors.dobMonth && !profileErrors.dobYear && !profileForm.dobDay && !profileForm.dobMonth && !profileForm.dobYear && (
                        <p className="text-xs text-text-secondary">Optional helps personalize your experience</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP: Tenant Setup (Owner)                    */}
              {/* ═══════════════════════════════════════════════ */}
              {activeSection === "tenant-setup" && (
                <div className="space-y-5">
                  <SectionHeader icon={Building2} title="Business Setup" subtitle="Create your organization with a 15-day free trial" />
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs text-blue-700">
                    <AlertCircle size={14} />
                    All modules enabled. No credit card required.
                  </div>

                  <div className="space-y-4">
                    <FloatingInput label="Business Name" value={tenantForm.businessName}
                      onChange={(e) => setTenantForm((p) => ({ ...p, businessName: e.target.value }))}
                      required leftIcon={<Building2 size={16} />} placeholder="Your business or institute name" />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FloatingInput label="Legal Name" value={tenantForm.legalName}
                        onChange={(e) => setTenantForm((p) => ({ ...p, legalName: e.target.value }))}
                        leftIcon={<FileText size={16} />} placeholder="Official registered name" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Business Type (select all that apply)</label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {BUSINESS_TYPES.map((bt) => {
                          const Icon = bt.icon;
                          const isSelected = tenantForm.businessTypes.includes(bt.value);
                          return (
                            <button
                              key={bt.value}
                              type="button"
                              onClick={() => {
                                setTenantForm((p) => ({
                                  ...p,
                                  businessTypes: isSelected
                                    ? p.businessTypes.filter((t) => t !== bt.value)
                                    : [...p.businessTypes, bt.value],
                                }));
                              }}
                              className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-border hover:bg-surface-overlay",
                              )}
                            >
                              <Icon size={24} className={isSelected ? "text-primary" : "text-text-secondary"} />
                              <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-text-primary")}>
                                {bt.label}
                              </span>
                              <span className="text-xs text-text-secondary">{bt.description}</span>
                              {isSelected && (
                                <div className="absolute top-2 right-2">
                                  <Check size={14} className="text-primary" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <FloatingInput label="Tagline" value={tenantForm.tagline}
                      onChange={(e) => setTenantForm((p) => ({ ...p, tagline: e.target.value }))}
                      placeholder="A short description of your business" />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FloatingInput label="Phone" value={tenantForm.phone}
                        onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); setTenantForm((p) => ({ ...p, phone: d })); }}
                        leftIcon={<Phone size={16} />} placeholder="9876543210" inputMode="numeric" maxLength={10} />
                      <FloatingInput label="Email" type="email" value={tenantForm.email}
                        onChange={(e) => setTenantForm((p) => ({ ...p, email: e.target.value }))}
                        leftIcon={<Mail size={16} />} placeholder="Business email" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FloatingInput label="City" value={tenantForm.city}
                        onChange={(e) => setTenantForm((p) => ({ ...p, city: e.target.value }))}
                        leftIcon={<MapPinned size={16} />} placeholder="City" />
                      <Select label="State" value={tenantForm.state}
                        onChange={(val) => setTenantForm((p) => ({ ...p, state: val }))}
                        options={[{ value: "", label: "Select state" }, ...INDIAN_STATES.map((s) => ({ value: s, label: s }))]} />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-text-secondary">Brand Color</label>
                        <input type="color" value={tenantForm.primaryColor}
                          onChange={(e) => setTenantForm((p) => ({ ...p, primaryColor: e.target.value }))}
                          className="h-8 w-8 cursor-pointer rounded-lg border border-border" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-text-secondary">Secondary</label>
                        <input type="color" value={tenantForm.secondaryColor}
                          onChange={(e) => setTenantForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                          className="h-8 w-8 cursor-pointer rounded-lg border border-border" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP: Org Search                              */}
              {/* ═══════════════════════════════════════════════ */}
              {activeSection === "org-search" && (
                <div className="space-y-5">
                  <SectionHeader icon={Search} title="Find Your Organization" subtitle="Search and join your organization to get started" />

                  {/* Suggested tenants (invitations) */}
                  {invitedTenantsLoading && invitedTenants.length === 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-overlay/50 px-4 py-3 text-xs text-text-secondary">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Checking for invitations...
                    </div>
                  )}

                  {!invitedTenantsLoading && invitedTenants.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                          <Sparkles size={11} className="text-primary" />
                        </div>
                        <h3 className="text-xs font-semibold text-text-primary">Suggested for you</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {invitedTenants.length} invitation{invitedTenants.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {invitedTenants.map((inv) => {
                          const isSelected = selectedOrg?.id === inv.tenant.id;
                          return (
                            <motion.button
                              key={inv.invitationId}
                              type="button"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => handleSelectInvitedTenant(inv)}
                              className={cn(
                                "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border-subtle bg-surface-overlay/30 hover:border-primary/30 hover:bg-surface-overlay/50",
                              )}
                            >
                              <div className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                                isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                              )}>
                                {isSelected ? <Check size={16} /> : <Building2 size={16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-text-primary truncate">{inv.tenant.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {inv.tenant.city && (
                                    <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                                      <MapPin size={9} /> {inv.tenant.city}
                                    </span>
                                  )}
                                  {inv.tenant.branches.length > 0 && (
                                    <span className="text-xs text-text-disabled">
                                      {inv.tenant.branches.length} branch{inv.tenant.branches.length !== 1 ? "es" : ""}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                    Invited
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={14} className={cn("shrink-0", isSelected ? "text-primary" : "text-text-disabled")} />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Divider between suggested and search */}
                  {invitedTenants.length > 0 && !invitedTenantsLoading && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
                      <div className="relative flex justify-center text-xs"><span className="bg-surface px-3 text-text-disabled">or search manually</span></div>
                    </div>
                  )}

                  <SearchOrg
                    searchQuery={orgSearchQuery}
                    onSearchQueryChange={setOrgSearchQuery}
                    onSearch={handleOrgSearch}
                    searching={orgSearching}
                    results={orgSearchResults}
                    selectedOrg={selectedOrg}
                    onSelectOrg={handleSelectOrg}
                  />

                  {selectedOrg && selectedOrg.branches.length > 1 && (
                    <Select label="Select Branch" value={selectedBranch}
                      onChange={(val) => setSelectedBranch(val)}
                      options={[
                        { value: "", label: "Choose a branch" },
                        ...selectedOrg.branches.map((b) => ({ value: b.id, label: `${b.name}${b.city ? ` - ${b.city}` : ""}` })),
                      ]} />
                  )}

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-surface px-3 text-text-disabled">or</span></div>
                  </div>

                  <InviteSection
                    inviteForm={inviteForm}
                    onInviteFormChange={setInviteForm}
                    onInviteOwner={handleInviteOwner}
                    saving={saving}
                    myInvites={myInvites}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Footer CTA Bar ── */}
          {bottomCta && (
            <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-border-subtle shrink-0">
              <PremiumButton
                onClick={bottomCta.onClick}
                loading={bottomCta.loading}
                disabled={bottomCta.disabled}
                icon={<ChevronRight size={16} />}
                className="!h-11 !w-auto !rounded-lg !text-sm !px-6"
              >
                {bottomCta.label}
              </PremiumButton>
            </div>
          )}
        </div>
      </AnimatedFrame>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROLE SELECT STEP — Animated dropdown with visual preview
// ═══════════════════════════════════════════════════════════════

const ROLE_SVGS: Record<string, React.ReactNode> = {
  OWNER: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  BRANCH_MANAGER: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  STAFF: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  STUDENT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  CLIENT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

const ROLE_FEATURES: Record<string, string[]> = {
  OWNER: ["Full dashboard with analytics", "Staff & student management", "Branch & location control", "Branding & subscription", "Invoice & payment tools", "15-day free trial included"],
  BRANCH_MANAGER: ["Branch-level dashboard", "Staff oversight & scheduling", "Student attendance tracking", "Daily operations reports", "Branch performance metrics"],
  STAFF: ["Class scheduling & management", "Student progress tracking", "Attendance marking", "Resource sharing", "Team collaboration tools"],
  STUDENT: ["Course enrollment & schedule", "Progress & performance tracking", "Assignment submissions", "Resource access", "Payment & receipts"],
  CLIENT: ["Quotation requests", "Booking management", "Invoice downloads", "Direct communication", "Service history"],
};

function RoleSelectStep({
  selectedRole,
  onSelectRole,
  onContinue,
  saving,
}: {
  selectedRole: string | null;
  onSelectRole: (role: string | null) => void;
  onContinue: (role: string) => void;
  saving: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const currentMeta = selectedRole ? ROLE_OPTIONS.find((r) => r.value === selectedRole) : null;

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Choose the role that best describes how you&apos;ll use the platform. You can always change this later.
      </p>

      {/* ── Animated Dropdown Trigger ── */}
      <div className="relative" ref={dropdownRef}>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Select Role <span className="ml-0.5 text-danger" aria-hidden>*</span>
        </label>
        <motion.button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.985 }}
          className={cn(
            "flex h-14 w-full items-center gap-3 rounded-2xl border-2 bg-surface px-4 text-left transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            open ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-border hover:shadow-md",
          )}
        >
          {currentMeta ? (
            <>
              <motion.div
                key={currentMeta.value}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${currentMeta.accent}`}
              >
                <currentMeta.icon size={18} />
              </motion.div>
              <motion.span
                key={`label-${currentMeta.value}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 text-sm font-semibold text-text-primary"
              >
                {currentMeta.label}
              </motion.span>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-overlay text-text-disabled">
                <User size={18} />
              </div>
              <span className="flex-1 text-sm text-text-secondary">Choose a role...</span>
            </>
          )}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-secondary"
          >
            <ChevronDown size={16} />
          </motion.div>
        </motion.button>

        {/* ── Animated Dropdown Menu ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-2)]"
            >
              <div className="p-1.5">
                {ROLE_OPTIONS.map((role, index) => {
                  const isSelected = selectedRole === role.value;
                  return (
                    <motion.button
                      key={role.value}
                      type="button"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      onClick={() => {
                        onSelectRole(role.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-150 cursor-pointer",
                        "hover:bg-surface-overlay focus-visible:outline-none focus-visible:bg-surface-overlay",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                          isSelected ? role.accent : "bg-surface-overlay text-text-secondary",
                        )}
                      >
                        <role.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text-primary">{role.label}</div>
                        <div className="text-xs text-text-secondary leading-relaxed mt-0.5">{role.desc}</div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Animated Visual Preview ── */}
      <AnimatePresence mode="wait">
        {selectedRole && currentMeta && (
          <motion.div
            key={selectedRole}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
          >
            {/* Role visual header */}
            <div className={`relative overflow-hidden bg-gradient-to-br ${
              selectedRole === "OWNER" ? "from-blue-500/10 to-blue-600/5 dark:from-blue-500/5 dark:to-blue-600/2" :
              selectedRole === "BRANCH_MANAGER" ? "from-purple-500/10 to-purple-600/5 dark:from-purple-500/5 dark:to-purple-600/2" :
              selectedRole === "STAFF" ? "from-teal-500/10 to-teal-600/5 dark:from-teal-500/5 dark:to-teal-600/2" :
              selectedRole === "STUDENT" ? "from-amber-500/10 to-amber-600/5 dark:from-amber-500/5 dark:to-amber-600/2" :
              "from-rose-500/10 to-rose-600/5 dark:from-rose-500/5 dark:to-rose-600/2"
            } px-6 py-8 text-center`}>
              {/* Floating decorative dots */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/5"
                  animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-primary/5"
                  animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
              </div>

              <div className="relative z-10">
                {/* Animated role icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="relative mx-auto mb-4"
                >
                  <motion.div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${currentMeta.accent} shadow-lg`}
                    animate={{
                      boxShadow: [
                        `0 0 0 0 ${selectedRole === "OWNER" ? "rgba(59,130,246,0.15)" : selectedRole === "BRANCH_MANAGER" ? "rgba(168,85,247,0.15)" : selectedRole === "STAFF" ? "rgba(20,184,166,0.15)" : selectedRole === "STUDENT" ? "rgba(245,158,11,0.15)" : "rgba(244,63,94,0.15)"}`,
                        `0 0 0 16px transparent`,
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <currentMeta.icon size={28} />
                  </motion.div>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-lg font-bold text-text-primary"
                >
                  {currentMeta.label}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-1 text-sm text-text-secondary"
                >
                  {currentMeta.desc}
                </motion.p>
              </div>
            </div>

            {/* Features list */}
            <div className="px-6 py-5">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-2 mb-3"
              >
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">What you&apos;ll get</span>
              </motion.div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ROLE_FEATURES[selectedRole]?.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-2 text-xs text-text-secondary"
                  >
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check size={10} className="text-primary" />
                    </div>
                    {feature}
                  </motion.div>
                ))}
              </div>

              {/* Continue button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-5 flex justify-end"
              >
                <PremiumButton
                  onClick={() => onContinue(selectedRole)}
                  loading={saving}
                  disabled={saving}
                  icon={<ArrowRight size={16} />}
                  className="!h-11 !w-auto !rounded-xl !text-sm !px-6"
                >
                  Continue as {currentMeta.label}
                </PremiumButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-secondary">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVITE SECTION
// ═══════════════════════════════════════════════════════════════

function InviteSection({
  inviteForm, onInviteFormChange, onInviteOwner, saving, myInvites,
}: {
  inviteForm: { businessName: string; ownerName: string; ownerEmail: string; ownerPhone: string; notes: string };
  onInviteFormChange: React.Dispatch<React.SetStateAction<{ businessName: string; ownerName: string; ownerEmail: string; ownerPhone: string; notes: string }>>;
  onInviteOwner: () => void;
  saving: boolean;
  myInvites: TenantClaimRequest[];
}) {
  const [showInvite, setShowInvite] = React.useState(false);

  return (
    <div>
      <button type="button" onClick={() => setShowInvite(!showInvite)}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
        {showInvite ? "Hide invitation form" : "Can't find your organization? Invite the owner"}
      </button>

      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="mt-3 space-y-3 rounded-xl border border-border-subtle bg-surface-overlay/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FloatingInput label="Business Name" value={inviteForm.businessName}
                  onChange={(e) => onInviteFormChange((prev) => ({ ...prev, businessName: e.target.value }))}
                  leftIcon={<Building2 size={14} />} />
                <FloatingInput label="Owner Name" value={inviteForm.ownerName}
                  onChange={(e) => onInviteFormChange((prev) => ({ ...prev, ownerName: e.target.value }))}
                  leftIcon={<User size={14} />} />
                <FloatingInput label="Owner Email" type="email" value={inviteForm.ownerEmail}
                  onChange={(e) => onInviteFormChange((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                  leftIcon={<Mail size={14} />} />
                <FloatingInput label="Owner Phone" value={inviteForm.ownerPhone}
                  onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); onInviteFormChange((prev) => ({ ...prev, ownerPhone: d })); }}
                  leftIcon={<Phone size={14} />} inputMode="numeric" maxLength={10} />
              </div>
              <Textarea value={inviteForm.notes}
                onChange={(e) => onInviteFormChange((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes (optional)" rows={2} />
              <div className="flex justify-end">
                <PremiumButton onClick={onInviteOwner} loading={saving}
                  className="!h-9 !w-auto !rounded-lg !text-xs !px-4" icon={<Mail size={14} />}>
                  Send Invitation
                </PremiumButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {myInvites.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-secondary mb-2">Your pending invitations</p>
          {myInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-overlay/30 p-2.5 text-xs">
              <span className="font-medium text-text-primary">{invite.businessName}</span>
              <span className="text-text-secondary">{invite.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOB FIELD — Input + Dropdown hybrid for day/month/year
// ═══════════════════════════════════════════════════════════════

const DOBField = React.forwardRef<HTMLInputElement, {
  label: string;
  value: string;
  maxLength: number;
  error?: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  onAutoAdvance?: () => void;
  placeholder: string;
}>(({ label, value, maxLength, error, options, onChange, onAutoAdvance, placeholder }, ref) => {
  const [focused, setFocused] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const internalRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const hasError = !!error;

  React.useImperativeHandle(ref, () => internalRef.current!, []);

  const mergedRef = React.useCallback((node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
  }, [ref]);

  const filteredOptions = options.filter((o) => {
    if (!o.value) return true;
    return o.value.startsWith(value) || value === "";
  });

  const matchedOption = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          internalRef.current && !internalRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary text-center">
        {label}
      </label>
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <input
            ref={mergedRef}
            type="text"
            inputMode="numeric"
            maxLength={maxLength}
            value={matchedOption ? matchedOption.label : value}
            onFocus={() => { setFocused(true); setShowDropdown(true); }}
            onBlur={() => {
              setFocused(false);
              setTimeout(() => setShowDropdown(false), 150);
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, maxLength);
              onChange(raw);
              setShowDropdown(true);
              if (raw.length === maxLength && onAutoAdvance) {
                onAutoAdvance();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "Tab") {
                const input = e.currentTarget;
                if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
                  if (onAutoAdvance) { e.preventDefault(); onAutoAdvance(); }
                }
              }
              if (e.key === "Escape") {
                setShowDropdown(false);
                internalRef.current?.blur();
              }
            }}
            placeholder={placeholder}
            className={cn(
              "w-full h-11 rounded-xl border bg-surface px-3 py-2 text-center text-sm font-semibold tabular-nums text-text-primary",
              "placeholder-text-placeholder placeholder:font-normal placeholder:text-xs",
              "transition-all duration-200 ease-out pr-8",
              "focus:outline-none focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-40",
              hasError
                ? "border-danger/60 focus:border-danger"
                : focused
                  ? "border-primary/60"
                  : "border-border hover:border-border/80",
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (showDropdown) {
                setShowDropdown(false);
              } else {
                internalRef.current?.focus();
                setShowDropdown(true);
              }
            }}
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              showDropdown ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-overlay",
            )}
          >
            <ChevronDown size={14} className={cn("transition-transform duration-200", showDropdown && "rotate-180")} />
          </button>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {showDropdown && filteredOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1.5 w-full max-h-48 overflow-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-2)]"
            >
              <div className="p-1">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt.value);
                      setShowDropdown(false);
                      if (onAutoAdvance && opt.value.length === maxLength) onAutoAdvance();
                    }}
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer",
                      "hover:bg-surface-overlay",
                      value === opt.value ? "bg-primary/5 text-primary font-semibold" : "text-text-primary",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasError && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <div className="h-1 w-1 rounded-full bg-danger" />
          </div>
        )}
      </div>
    </div>
  );
});
DOBField.displayName = "DOBField";
